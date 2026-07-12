import { CONFIG } from '../config.js';
import { CROP_MAP } from '../data/crops.js';
import { zoneOfPlot } from '../core/GameState.js';
import { remainingMs, stageIndex } from './CropSystem.js';
import { fmtTime } from '../utils/helpers.js';

export class FarmSystem {
  constructor(game) {
    this.game = game;
  }

  plot(i) {
    return this.game.state.plots[i];
  }

  // 依時間推進生長（線上 tick 與離線補算共用）；害蟲會暫停生長
  advanceGrowth(dt, mult = 1) {
    if (dt <= 0) return;
    for (const p of this.game.state.plots) {
      if (!p.cropId || !p.watered || p.mature || p.withered || p.pest) continue;
      const c = CROP_MAP[p.cropId];
      if (!c) { p.cropId = null; continue; }
      p.growth = Math.min(c.growthMs, p.growth + dt * mult);
      if (p.growth >= c.growthMs) {
        p.mature = true;
        p.maturedAt = Date.now();
        this.game.events.emit('crop:matured', p);
      }
    }
  }

  // 成熟後放置太久 → 枯萎（教學期間不觸發；離線豁免由 boot 重設 maturedAt 實現）
  witherTick(now) {
    const g = this.game;
    if (!g.state.tutorial.completed) return;
    const factor = CONFIG.WITHER.graceFactor;
    for (const p of g.state.plots) {
      if (!p.cropId || !p.mature || p.withered || !p.maturedAt) continue;
      const c = CROP_MAP[p.cropId];
      if (now - p.maturedAt > c.growthMs * factor) {
        p.withered = true;
        p.mature = false;
        p.pest = false;
        g.state.stats.withered++;
        g.toast(`🥀 ${c.name}枯萎了…用清理工具清除吧`, 'warn');
        g.events.emit('crop:withered', p);
        g.changed();
      }
    }
  }

  // 害蟲隨機出現在生長中的作物上（教學期間不觸發）
  pestTick(now, dt) {
    const g = this.game;
    if (!g.state.tutorial.completed) return;
    const conf = CONFIG.PEST;
    const active = g.state.plots.filter((p) => p.pest).length;
    if (active >= conf.maxActive) return;
    if (Math.random() >= (dt / 60000) * conf.chancePerMin) return;
    const candidates = g.state.plots.filter(
      (p) => p.cropId && p.watered && !p.mature && !p.withered && !p.pest,
    );
    if (!candidates.length) return;
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    p.pest = true;
    g.toast('🐛 害蟲出現！點擊作物驅趕，否則生長會暫停', 'warn');
    g.events.emit('pest:appeared', p);
    g.changed();
  }

  shooPest(p) {
    const g = this.game;
    if (!p.pest) return;
    p.pest = false;
    g.state.stats.pestsShooed++;
    g.progression.addXp(CONFIG.PEST.shooXp);
    g.audio.play('click');
    g.toast(`🐛 趕走害蟲！（+${CONFIG.PEST.shooXp} 經驗）`, 'success');
    g.events.emit('pest:shooed', p);
    g.changed();
  }

  neighbors(i) {
    const cols = CONFIG.GRID_COLS, rows = CONFIG.GRID_ROWS;
    const r = Math.floor(i / cols), c = i % cols, out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
      }
    }
    return out;
  }

  sprinklerTick() {
    for (const p of this.game.state.plots) {
      if (!p.hasSprinkler || !p.unlocked) continue;
      for (const ni of this.neighbors(p.id)) {
        const n = this.plot(ni);
        if (n.cropId && !n.watered && !n.mature) this.water(n, { auto: true, source: 'sprinkler' });
      }
    }
  }

  rainTick() {
    for (const p of this.game.state.plots) {
      if (p.cropId && !p.watered && !p.mature) this.water(p, { auto: true, source: 'rain' });
      if (p.pest) { p.pest = false; this.game.changed(); } // 雨水沖走害蟲
    }
  }

  async handleClick(i) {
    const g = this.game;
    const p = this.plot(i);
    if (!p) return;
    const tool = g.selectedTool;
    if (!p.unlocked) return this.promptUnlock(p);
    if (p.pest) return this.shooPest(p); // 害蟲優先：任何工具點擊都先驅趕
    if (tool === 'till') return this.till(p);
    if (tool && tool.startsWith('seed:')) return this.plant(p, tool.slice(5));
    if (tool === 'water') return this.waterManual(p);
    if (tool === 'harvest') return this.harvest(p);
    if (tool === 'clear') return this.clearPlot(p);
    if (tool === 'fertilizer') return this.fertilize(p);
    if (tool === 'sprinkler') return this.placeSprinkler(p);
    return this.describe(p);
  }

  till(p) {
    const g = this.game;
    if (p.hasSprinkler) return g.toast('這格放著灑水器，不能翻土', 'warn');
    if (p.cropId) return g.toast('這格已經有作物了', 'warn');
    if (p.tilled) return g.toast('這格已經翻好土了', 'info');
    p.tilled = true;
    g.audio.play('till');
    g.events.emit('plot:tilled', p);
    g.changed();
  }

  plant(p, cropId) {
    const g = this.game;
    const c = CROP_MAP[cropId];
    if (!c) return;
    if (p.hasSprinkler) return g.toast('這格放著灑水器，不能播種', 'warn');
    if (p.cropId) return g.toast('這格已經有作物，不能重複播種', 'warn');
    if (!p.tilled) return g.toast('要先翻土才能播種', 'warn');
    if (g.state.level < c.unlockLevel) return g.toast(`${c.name}需要等級 ${c.unlockLevel} 解鎖`, 'warn');
    if (!g.inventory.useSeed(cropId)) return g.toast(`沒有${c.name}種子了，到商店買一些吧`, 'warn');
    p.cropId = cropId;
    p.plantedAt = Date.now();
    p.watered = false;
    p.wateredAt = null;
    p.growth = 0;
    p.mature = false;
    p.maturedAt = null;
    p.withered = false;
    p.pest = false;
    p.fertilized = false;
    g.state.stats.planted++;
    g.progression.addXp(CONFIG.XP_PER_PLANT);
    g.audio.play('plant');
    g.events.emit('crop:planted', { plot: p, cropId });
    g.changed();
  }

  waterManual(p) {
    const g = this.game;
    if (!p.cropId) return g.toast('這格沒有作物需要澆水', 'info');
    if (p.mature) return g.toast('已經成熟了，快收成吧！', 'info');
    if (p.watered) return g.toast('這一輪已經澆過水囉', 'info');
    this.water(p, { auto: false });
  }

  water(p, { auto = false, source = 'manual' } = {}) {
    const g = this.game;
    p.watered = true;
    p.wateredAt = Date.now();
    if (!auto) {
      g.state.stats.watered++;
      g.progression.addXp(CONFIG.XP_PER_WATER);
      g.audio.play('water');
    }
    g.events.emit('crop:watered', { plot: p, auto, source });
    g.changed();
  }

  harvest(p) {
    const g = this.game;
    if (!p.cropId) return g.toast('這格沒有作物', 'info');
    const c = CROP_MAP[p.cropId];
    if (p.withered) return g.toast(`${c.name}已經枯萎，用清理工具清除`, 'warn');
    if (!p.mature) return g.toast(`${c.name}還沒成熟`, 'info');
    // 優質判定：基礎機率 + 施肥加成
    const qChance = CONFIG.QUALITY.baseChance + (p.fertilized ? CONFIG.QUALITY.fertilizerBonus : 0);
    const quality = Math.random() < qChance;
    if (!g.inventory.addCrops(c.id, c.harvestAmount, quality)) {
      g.audio.play('error');
      return g.toast('倉庫已滿！先出售一些作物或升級倉庫', 'warn');
    }
    p.cropId = null;
    p.plantedAt = null;
    p.wateredAt = null;
    p.watered = false;
    p.growth = 0;
    p.mature = false;
    p.maturedAt = null;
    p.pest = false;
    p.fertilized = false;
    // tilled 保持 true → 收成後可直接再播種
    g.state.stats.harvested++;
    if (quality) g.state.stats.qualityHarvested += c.harvestAmount;
    g.progression.addXp(c.xp);
    g.audio.play('harvest');
    g.events.emit('crop:harvested', { plot: p, cropId: c.id, amount: c.harvestAmount, quality });
    g.toast(
      quality
        ? `⭐ 收成優質${c.name} ×${c.harvestAmount}！售價 ×${CONFIG.QUALITY.priceMult}（+${c.xp} 經驗）`
        : `收成 ${c.icon} ${c.name} ×${c.harvestAmount}（+${c.xp} 經驗）`,
      'success',
    );
    g.changed();
  }

  async clearPlot(p) {
    const g = this.game;
    if (p.hasSprinkler) {
      const ok = await g.modal.confirm({ title: '⛲ 收回灑水器', body: '要收回這座灑水器嗎？會放回背包。' });
      if (!ok || !p.hasSprinkler) return;
      p.hasSprinkler = false;
      g.inventory.addItem('sprinkler', 1);
      g.toast('已收回灑水器');
      g.changed();
      return;
    }
    if (!p.cropId) return g.toast('這格沒有需要清理的東西', 'info');
    const c = CROP_MAP[p.cropId];
    const body = p.withered
      ? '清除枯萎的作物？'
      : p.mature
        ? `${c.icon} ${c.name} 已經成熟，確定要剷除嗎？<br>（不會獲得收成物）`
        : `確定要剷除還沒成熟的 ${c.icon} ${c.name} 嗎?<br>種子不會退還。`;
    const ok = await g.modal.confirm({ title: '🧹 清理農地', body, okText: '剷除', danger: true });
    if (!ok || !p.cropId) return;
    p.cropId = null;
    p.plantedAt = null;
    p.wateredAt = null;
    p.watered = false;
    p.growth = 0;
    p.mature = false;
    p.maturedAt = null;
    p.withered = false;
    p.pest = false;
    p.fertilized = false;
    g.audio.play('click');
    g.toast('農地清理完成');
    g.changed();
  }

  fertilize(p) {
    const g = this.game;
    if (!p.cropId) return g.toast('先種點東西再用肥料吧', 'info');
    if (p.mature) return g.toast('成熟的作物不需要肥料', 'info');
    if (!p.watered) return g.toast('先澆水讓作物開始生長，才能施肥', 'warn');
    if (!g.inventory.useItem('fertilizer')) return g.toast('沒有肥料了，到商店購買', 'warn');
    const c = CROP_MAP[p.cropId];
    const remain = Math.max(0, c.growthMs - p.growth);
    p.growth = Math.min(c.growthMs, p.growth + remain * CONFIG.FERTILIZER_REDUCTION);
    p.fertilized = true; // 提高本輪優質機率
    if (p.growth >= c.growthMs && !p.mature) {
      p.mature = true;
      p.maturedAt = Date.now();
      g.events.emit('crop:matured', p);
    }
    g.audio.play('plant');
    g.toast(`✨ 施肥完成，${c.name}生長加速、優質機率提高！`, 'success');
    g.events.emit('item:used', { itemId: 'fertilizer', plot: p });
    g.changed();
  }

  placeSprinkler(p) {
    const g = this.game;
    if (p.cropId) return g.toast('這格有作物，不能放灑水器', 'warn');
    if (p.hasSprinkler) return g.toast('這裡已經有灑水器了', 'info');
    if (!g.inventory.useItem('sprinkler')) return g.toast('背包裡沒有灑水器，先到商店購買', 'warn');
    p.hasSprinkler = true;
    p.tilled = false;
    g.audio.play('water');
    g.toast('⛲ 灑水器就位！會自動幫周圍 8 格澆水', 'success');
    g.events.emit('sprinkler:placed', p);
    g.changed();
  }

  async promptUnlock(p) {
    const g = this.game, s = g.state;
    const z = zoneOfPlot(p.id);
    if (!z || s.unlockedZones.includes(z.id)) return;
    const count = z.rows.length * CONFIG.GRID_COLS;
    const meets = s.level >= z.level;
    const body = `<b>${z.name}</b>（${count} 格農地）<br>` +
      `需求等級：Lv ${z.level} ${meets ? '✅' : `❌（目前 Lv ${s.level}）`}<br>` +
      `解鎖價格：💰 ${z.price}（目前 💰 ${s.coins}）`;
    const ok = await g.modal.confirm({ title: '🔓 解鎖農地', body, okText: '解鎖' });
    if (!ok) return;
    if (s.unlockedZones.includes(z.id)) return; // 防重複扣款
    if (s.level < z.level) return g.toast(`等級不足，需要 Lv ${z.level}`, 'warn');
    if (!g.economy.spend(z.price)) return g.toast('金幣不足', 'warn');
    s.unlockedZones.push(z.id);
    for (const q of s.plots) {
      if (zoneOfPlot(q.id)?.id === z.id) q.unlocked = true;
    }
    g.audio.play('levelup');
    g.toast(`🎉 ${z.name}解鎖成功！`, 'success');
    g.events.emit('zone:unlocked', z);
    g.changed();
    g.save.save();
  }

  describe(p) {
    const g = this.game;
    if (p.hasSprinkler) return g.toast('⛲ 灑水器：自動為周圍 8 格澆水（用清理工具可收回）', 'info');
    if (!p.cropId) return g.toast(p.tilled ? '已翻土：選擇種子即可播種' : '未整理土地：使用翻土工具開墾', 'info');
    const c = CROP_MAP[p.cropId];
    const stage = stageIndex(p) + 1;
    if (p.mature) return g.toast(`${c.icon} ${c.name}成熟了！使用收成工具採收`, 'success');
    if (!p.watered) return g.toast(`${c.icon} ${c.name}（階段 ${stage}/${c.stages}）💧 需要澆水才會生長`, 'info');
    return g.toast(`${c.icon} ${c.name}（階段 ${stage}/${c.stages}）剩餘 ${fmtTime(remainingMs(p, g.weather.speedMult()))}`, 'info');
  }
}
