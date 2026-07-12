import { CONFIG } from '../config.js';
import { MACHINES, MACHINE_MAP } from '../data/machines.js';
import { RECIPE_MAP } from '../data/recipes.js';
import { CROP_MAP } from '../data/crops.js';
import { createMachineSlot } from '../core/GameState.js';
import { fmtTime } from '../utils/helpers.js';

// 加工鏈：每型機器可多台（slots），各插槽獨立佇列；進度以 startedAt 時間戳計算 → 離線照常完成
export class WorkshopSystem {
  constructor(game) {
    this.game = game;
    this._notified = new Set(); // key = `${machineId}:${slotIdx}`，倉庫滿提示每批一次
  }

  machine(id) {
    return this.game.state.machines[id];
  }

  owned(id) {
    return (this.machine(id)?.count || 0) > 0;
  }

  slot(id, i) {
    return this.machine(id)?.slots?.[i] || null;
  }

  // 下一台的價格：基價 × (1 + priceGrowth × 已擁有台數)
  nextPrice(id) {
    const mdef = MACHINE_MAP[id];
    const n = this.machine(id)?.count || 0;
    return Math.round(mdef.price * (1 + CONFIG.MACHINE_EXTRA.priceGrowth * n));
  }

  buyMachine(id) {
    const g = this.game;
    const mdef = MACHINE_MAP[id];
    const m = this.machine(id);
    if (!mdef || !m) return;
    if (m.count >= CONFIG.MACHINE_EXTRA.maxPerType) {
      return g.toast(`${mdef.name}已達上限（${CONFIG.MACHINE_EXTRA.maxPerType} 台）`, 'info');
    }
    if (g.state.level < mdef.unlockLevel) return g.toast(`${mdef.name}需要等級 ${mdef.unlockLevel}`, 'warn');
    const cost = this.nextPrice(id);
    if (!g.economy.spend(cost)) return g.toast(`金幣不足（需要 💰${cost}）`, 'warn');
    m.slots.push(createMachineSlot());
    m.count = m.slots.length;
    g.audio.play('levelup');
    g.toast(`🏭 第 ${m.count} 台${mdef.icon} ${mdef.name}已安裝！`, 'success');
    g.events.emit('machine:bought', id);
    g.changed();
  }

  isReadySlot(id, i, now = Date.now()) {
    const sl = this.slot(id, i);
    if (!sl?.recipeId || !sl.startedAt) return false;
    const r = RECIPE_MAP[sl.recipeId];
    return !!r && now - sl.startedAt >= r.timeMs;
  }

  remainingMsSlot(id, i, now = Date.now()) {
    const sl = this.slot(id, i);
    const r = sl?.recipeId ? RECIPE_MAP[sl.recipeId] : null;
    if (!r) return 0;
    return Math.max(0, sl.startedAt + r.timeMs - now);
  }

  // 自動挑插槽：先找閒置機台，再找佇列未滿的
  pickSlot(id) {
    const m = this.machine(id);
    if (!m) return null;
    for (let i = 0; i < m.slots.length; i++) {
      if (!m.slots[i].recipeId) return { idx: i, queued: false };
    }
    for (let i = 0; i < m.slots.length; i++) {
      if ((m.slots[i].queue?.length || 0) < CONFIG.WORKSHOP.queueMax) return { idx: i, queued: true };
    }
    return null;
  }

  // 開工或排入佇列。排入當下即扣原料。
  startRecipe(machineId, recipeId) {
    const g = this.game;
    const mdef = MACHINE_MAP[machineId];
    const m = this.machine(machineId);
    const r = RECIPE_MAP[recipeId];
    if (!mdef || !m || !r || r.machine !== machineId) return;
    if (!this.owned(machineId)) return g.toast(`還沒購買${mdef.name}`, 'warn');
    if (g.state.level < r.unlockLevel) return g.toast(`${r.name}需要等級 ${r.unlockLevel}`, 'warn');
    const pick = this.pickSlot(machineId);
    if (!pick) return g.toast(`${mdef.name}所有機台的佇列都滿了`, 'warn');
    // 先檢查全部原料再扣，避免扣一半
    for (const [cid, n] of Object.entries(r.inputs)) {
      if (g.inventory.cropCount(cid) < n) {
        const c = CROP_MAP[cid];
        return g.toast(`原料不足：需要 ${c.icon} ${c.name} ×${n}（庫存 ${g.inventory.cropCount(cid)}）`, 'warn');
      }
    }
    for (const [cid, n] of Object.entries(r.inputs)) g.inventory.removeCrops(cid, n);
    const sl = this.slot(machineId, pick.idx);
    if (!Array.isArray(sl.queue)) sl.queue = [];
    if (pick.queued) {
      sl.queue.push(recipeId);
      g.audio.play('click');
      g.toast(`${r.icon} ${r.name}已排入機台 ${pick.idx + 1} 佇列（${sl.queue.length}/${CONFIG.WORKSHOP.queueMax}）`, 'success');
    } else {
      sl.recipeId = recipeId;
      sl.startedAt = Date.now();
      this._notified.delete(`${machineId}:${pick.idx}`);
      g.audio.play('plant');
      g.toast(`${r.icon} 機台 ${pick.idx + 1} 開始製作${r.name}（需時 ${fmtTime(r.timeMs)}）`, 'success');
    }
    g.events.emit('process:started', { machineId, recipeId, slot: pick.idx, queued: pick.queued });
    g.changed();
  }

  // 完成入庫 + 佇列自動接續。倉庫沒空間回傳 false（成品留在機器上等收取）。
  _finishSlot(machineId, i) {
    const g = this.game;
    const sl = this.slot(machineId, i);
    const r = sl?.recipeId ? RECIPE_MAP[sl.recipeId] : null;
    if (!r || !this.isReadySlot(machineId, i)) return false;
    if (g.inventory.warehouseSpace() < 1) return false;
    g.state.products[r.id] = (g.state.products[r.id] || 0) + 1;
    sl.recipeId = null;
    sl.startedAt = null;
    this._notified.delete(`${machineId}:${i}`);
    g.state.stats.processed = (g.state.stats.processed || 0) + 1;
    g.progression.addXp(r.xp);
    g.audio.play('harvest');
    g.toast(`${r.icon} ${r.name}完成入庫！（+${r.xp} 經驗）`, 'success');
    g.events.emit('process:collected', r);
    // 佇列接續
    if (Array.isArray(sl.queue) && sl.queue.length) {
      const next = sl.queue.shift();
      const nr = RECIPE_MAP[next];
      if (nr) {
        sl.recipeId = next;
        sl.startedAt = Date.now();
        g.toast(`${nr.icon} 佇列接續：開始製作${nr.name}`, 'info');
      }
    }
    g.changed();
    return true;
  }

  // 手動收取（倉庫曾滿而暫扣在機器上時使用）
  collect(machineId, slotIdx = 0) {
    const g = this.game;
    const sl = this.slot(machineId, slotIdx);
    if (!sl?.recipeId) return;
    const r = RECIPE_MAP[sl.recipeId];
    if (!r) { sl.recipeId = null; sl.startedAt = null; return; }
    if (!this.isReadySlot(machineId, slotIdx)) {
      return g.toast(`${r.name}還在製作中（剩 ${fmtTime(this.remainingMsSlot(machineId, slotIdx))}）`, 'info');
    }
    if (!this._finishSlot(machineId, slotIdx)) {
      g.audio.play('error');
      g.toast('倉庫已滿！先出售一些東西再收取', 'warn');
    }
  }

  // 產品售價固定（不吃市場行情），吃轉生與節慶加成
  productPrice(recipeId) {
    const r = RECIPE_MAP[recipeId];
    if (!r) return 0;
    const prestigeBonus = 1 + (this.game.state.prestige || 0) * CONFIG.PRESTIGE.sellBonus;
    const festBonus = 1 + this.game.festival.sellBonus();
    return Math.max(1, Math.round(r.sellPrice * prestigeBonus * festBonus));
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
      if (!m?.count) continue;
      for (let i = 0; i < m.slots.length; i++) {
        const sl = m.slots[i];
        if (!sl.recipeId || !this.isReadySlot(mdef.id, i, now)) continue;
        // 完成 → 自動入庫；倉庫滿則提示一次，成品留在機器上等手動收取
        const key = `${mdef.id}:${i}`;
        if (!this._finishSlot(mdef.id, i) && !this._notified.has(key)) {
          this._notified.add(key);
          const r = RECIPE_MAP[sl.recipeId];
          this.game.toast(`${r.icon} ${r.name}做好了，但倉庫已滿 — 清出空間後到工坊收取`, 'warn');
          this.game.events.emit('process:ready', { machineId: mdef.id, slot: i });
        }
      }
    }
  }
}
