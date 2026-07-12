import { CONFIG } from '../config.js';
import { CROP_MAP } from '../data/crops.js';
import { ITEM_MAP } from '../data/items.js';

export class ShopSystem {
  constructor(game) {
    this.game = game;
  }

  buySeed(cropId, qty) {
    const g = this.game, s = g.state;
    const c = CROP_MAP[cropId];
    qty = Math.floor(qty);
    if (!c || qty <= 0) return;
    if (s.level < c.unlockLevel) return g.toast(`${c.name}需要等級 ${c.unlockLevel} 解鎖`, 'warn');
    const cost = c.seedPrice * qty;
    if (!g.economy.spend(cost)) return g.toast(`金幣不足（需要 💰${cost}）`, 'warn');
    g.inventory.addSeeds(cropId, qty);
    g.audio.play('coin');
    g.toast(`購買 ${c.icon} ${c.name}種子 ×${qty}（-💰${cost}）`, 'success');
    g.events.emit('shop:purchased', { kind: 'seed', id: cropId, qty, cost });
    g.changed();
  }

  buyItem(itemId, qty = 1) {
    const g = this.game, s = g.state;
    const it = ITEM_MAP[itemId];
    qty = Math.floor(qty);
    if (!it || qty <= 0) return;
    if (s.level < it.unlockLevel) return g.toast(`${it.name}需要等級 ${it.unlockLevel} 解鎖`, 'warn');
    const cost = it.price * qty;
    if (!g.economy.spend(cost)) return g.toast(`金幣不足（需要 💰${cost}）`, 'warn');
    g.inventory.addItem(itemId, qty);
    g.audio.play('coin');
    g.toast(`購買 ${it.icon} ${it.name} ×${qty}（-💰${cost}）`, 'success');
    g.events.emit('shop:purchased', { kind: 'item', id: itemId, qty, cost });
    g.changed();
  }

  sellCrops(cropId, qty) {
    const g = this.game;
    const c = CROP_MAP[cropId];
    if (!c) return;
    const have = g.inventory.cropCount(cropId);
    qty = Math.min(Math.floor(qty), have);
    if (qty <= 0) return g.toast('沒有可出售的庫存', 'info');
    if (!g.inventory.removeCrops(cropId, qty)) return;
    const coins = c.sellPrice * qty;
    g.economy.addCoins(coins, 'sell');
    g.state.stats.sold += qty;
    g.audio.play('coin');
    g.toast(`出售 ${c.icon} ${c.name} ×${qty}，+💰${coins}`, 'success');
    g.events.emit('crops:sold', { cropId, qty, coins });
    g.changed();
  }

  warehouseUpgradeCost() {
    const s = this.game.state;
    const u = CONFIG.WAREHOUSE_UPGRADE;
    return u.baseCost + u.costStep * s.warehouseUpgrades;
  }

  upgradeWarehouse() {
    const g = this.game, s = g.state;
    const u = CONFIG.WAREHOUSE_UPGRADE;
    if (s.warehouseUpgrades >= u.maxUpgrades) return g.toast('倉庫已升到最高級', 'info');
    const cost = this.warehouseUpgradeCost();
    if (!g.economy.spend(cost)) return g.toast(`金幣不足（需要 💰${cost}）`, 'warn');
    s.warehouseUpgrades++;
    s.warehouseCapacity += u.capacityStep;
    g.audio.play('levelup');
    g.toast(`📦 倉庫升級！容量 +${u.capacityStep}（目前 ${s.warehouseCapacity}）`, 'success');
    g.events.emit('warehouse:upgraded', s.warehouseCapacity);
    g.changed();
  }
}
