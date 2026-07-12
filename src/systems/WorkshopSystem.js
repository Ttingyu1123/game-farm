import { CONFIG } from '../config.js';
import { MACHINES, MACHINE_MAP } from '../data/machines.js';
import { RECIPE_MAP } from '../data/recipes.js';
import { CROP_MAP } from '../data/crops.js';
import { fmtTime } from '../utils/helpers.js';

// 加工鏈：機器把作物加工成高價產品；進度以 startedAt 時間戳計算 → 離線照常完成
export class WorkshopSystem {
  constructor(game) {
    this.game = game;
    this._notified = new Set(); // 「完成了」提示每批只跳一次（transient，重整後再提醒一次無妨）
  }

  machine(id) {
    return this.game.state.machines[id];
  }

  isReady(id, now = Date.now()) {
    const m = this.machine(id);
    if (!m?.recipeId || !m.startedAt) return false;
    const r = RECIPE_MAP[m.recipeId];
    return !!r && now - m.startedAt >= r.timeMs;
  }

  remainingMs(id, now = Date.now()) {
    const m = this.machine(id);
    const r = m?.recipeId ? RECIPE_MAP[m.recipeId] : null;
    if (!r) return 0;
    return Math.max(0, m.startedAt + r.timeMs - now);
  }

  buyMachine(id) {
    const g = this.game;
    const mdef = MACHINE_MAP[id];
    const m = this.machine(id);
    if (!mdef || !m) return;
    if (m.owned) return g.toast(`已經擁有${mdef.name}了`, 'info');
    if (g.state.level < mdef.unlockLevel) return g.toast(`${mdef.name}需要等級 ${mdef.unlockLevel}`, 'warn');
    if (!g.economy.spend(mdef.price)) return g.toast(`金幣不足（需要 💰${mdef.price}）`, 'warn');
    m.owned = true;
    g.audio.play('levelup');
    g.toast(`🏭 ${mdef.icon} ${mdef.name}已安裝！開始加工吧`, 'success');
    g.events.emit('machine:bought', id);
    g.changed();
  }

  // 開工或排入佇列（機器忙碌時）。排入當下即扣原料。
  startRecipe(machineId, recipeId) {
    const g = this.game;
    const mdef = MACHINE_MAP[machineId];
    const m = this.machine(machineId);
    const r = RECIPE_MAP[recipeId];
    if (!mdef || !m || !r || r.machine !== machineId) return;
    if (!m.owned) return g.toast(`還沒購買${mdef.name}`, 'warn');
    if (g.state.level < r.unlockLevel) return g.toast(`${r.name}需要等級 ${r.unlockLevel}`, 'warn');
    if (!Array.isArray(m.queue)) m.queue = [];
    const busy = !!m.recipeId;
    if (busy && m.queue.length >= CONFIG.WORKSHOP.queueMax) {
      return g.toast(`佇列已滿（${CONFIG.WORKSHOP.queueMax} 批）`, 'warn');
    }
    // 先檢查全部原料再扣，避免扣一半
    for (const [cid, n] of Object.entries(r.inputs)) {
      if (g.inventory.cropCount(cid) < n) {
        const c = CROP_MAP[cid];
        return g.toast(`原料不足：需要 ${c.icon} ${c.name} ×${n}（庫存 ${g.inventory.cropCount(cid)}）`, 'warn');
      }
    }
    for (const [cid, n] of Object.entries(r.inputs)) g.inventory.removeCrops(cid, n);
    if (busy) {
      m.queue.push(recipeId);
      g.audio.play('click');
      g.toast(`${r.icon} ${r.name}已排入佇列（${m.queue.length}/${CONFIG.WORKSHOP.queueMax}）`, 'success');
    } else {
      m.recipeId = recipeId;
      m.startedAt = Date.now();
      this._notified.delete(machineId);
      g.audio.play('plant');
      g.toast(`${r.icon} 開始製作${r.name}（需時 ${fmtTime(r.timeMs)}）`, 'success');
    }
    g.events.emit('process:started', { machineId, recipeId, queued: busy });
    g.changed();
  }

  // 完成入庫 + 佇列自動接續。倉庫沒空間回傳 false（成品留在機器上等收取）。
  _finish(machineId) {
    const g = this.game;
    const m = this.machine(machineId);
    const r = m?.recipeId ? RECIPE_MAP[m.recipeId] : null;
    if (!r || !this.isReady(machineId)) return false;
    if (g.inventory.warehouseSpace() < 1) return false;
    g.state.products[r.id] = (g.state.products[r.id] || 0) + 1;
    m.recipeId = null;
    m.startedAt = null;
    this._notified.delete(machineId);
    g.state.stats.processed = (g.state.stats.processed || 0) + 1;
    g.progression.addXp(r.xp);
    g.audio.play('harvest');
    g.toast(`${r.icon} ${r.name}完成入庫！（+${r.xp} 經驗）`, 'success');
    g.events.emit('process:collected', r);
    // 佇列接續
    if (Array.isArray(m.queue) && m.queue.length) {
      const next = m.queue.shift();
      const nr = RECIPE_MAP[next];
      if (nr) {
        m.recipeId = next;
        m.startedAt = Date.now();
        g.toast(`${nr.icon} 佇列接續：開始製作${nr.name}`, 'info');
      }
    }
    g.changed();
    return true;
  }

  // 手動收取（倉庫曾滿而暫扣在機器上時使用）
  collect(machineId) {
    const g = this.game;
    const m = this.machine(machineId);
    if (!m?.recipeId) return;
    const r = RECIPE_MAP[m.recipeId];
    if (!r) { m.recipeId = null; m.startedAt = null; return; }
    if (!this.isReady(machineId)) {
      return g.toast(`${r.name}還在製作中（剩 ${fmtTime(this.remainingMs(machineId))}）`, 'info');
    }
    if (!this._finish(machineId)) {
      g.audio.play('error');
      g.toast('倉庫已滿！先出售一些東西再收取', 'warn');
    }
  }

  // 產品售價固定（不吃市場行情），吃轉生加成 — ponytail: 產品要加入行情波動時改這裡
  productPrice(recipeId) {
    const r = RECIPE_MAP[recipeId];
    if (!r) return 0;
    const bonus = 1 + (this.game.state.prestige || 0) * CONFIG.PRESTIGE.sellBonus;
    return Math.max(1, Math.round(r.sellPrice * bonus));
  }

  sellProduct(recipeId, qty) {
    const g = this.game;
    const r = RECIPE_MAP[recipeId];
    if (!r) return;
    const have = g.state.products[recipeId] || 0;
    qty = Math.min(Math.floor(qty), have);
    if (qty <= 0) return g.toast('沒有可出售的產品', 'info');
    g.state.products[recipeId] -= qty;
    const coins = this.productPrice(recipeId) * qty;
    g.economy.addCoins(coins, 'product');
    g.audio.play('coin');
    g.toast(`出售 ${r.icon} ${r.name} ×${qty}，+💰${coins}`, 'success');
    g.events.emit('product:sold', { recipeId, qty, coins });
    g.changed();
  }

  productTotal() {
    return Object.values(this.game.state.products).reduce((a, b) => a + (b || 0), 0);
  }

  tick(now) {
    for (const mdef of MACHINES) {
      const m = this.machine(mdef.id);
      if (!m?.owned || !m.recipeId) continue;
      if (!this.isReady(mdef.id, now)) continue;
      // 完成 → 自動入庫；倉庫滿則提示一次，成品留在機器上等手動收取
      if (!this._finish(mdef.id) && !this._notified.has(mdef.id)) {
        this._notified.add(mdef.id);
        const r = RECIPE_MAP[m.recipeId];
        this.game.toast(`${r.icon} ${r.name}做好了，但倉庫已滿 — 清出空間後到工坊收取`, 'warn');
        this.game.events.emit('process:ready', { machineId: mdef.id });
      }
    }
  }
}
