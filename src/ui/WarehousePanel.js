import { CONFIG } from '../config.js';
import { CROPS } from '../data/crops.js';

export class WarehousePanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const g = this.game, s = g.state;
    const total = g.inventory.warehouseTotal();
    const pct = Math.min(100, Math.round((total / s.warehouseCapacity) * 100));
    const maxed = s.warehouseUpgrades >= CONFIG.WAREHOUSE_UPGRADE.maxUpgrades;
    const cost = g.shop.warehouseUpgradeCost();
    let h = `<h4 class="panel-title">📦 農產品倉庫</h4>
      <div class="cap-box">
        <div class="cap-bar"><div style="width:${pct}%"></div></div>
        <span>容量 ${total}/${s.warehouseCapacity}</span>
        <button class="btn btn-small" data-action="upgrade" ${maxed || s.coins < cost ? 'disabled' : ''}>
          ${maxed ? '已達上限' : `擴充 +${CONFIG.WAREHOUSE_UPGRADE.capacityStep}（💰${cost}）`}
        </button>
      </div>`;
    const rows = CROPS.filter((c) => (s.warehouse[c.id] || 0) > 0);
    if (!rows.length) {
      h += `<div class="empty-state">倉庫空空的，快去收成吧 🧺</div>`;
      return h;
    }
    for (const c of rows) {
      const n = s.warehouse[c.id];
      h += `<div class="shop-row">
        <span class="shop-icon">${c.icon}</span>
        <div class="shop-info">
          <b>${c.name} ×${n}</b>
          <span class="muted">單價 💰${c.sellPrice} · 總值 💰${c.sellPrice * n}</span>
        </div>
        <div class="qty-btns">
          <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-qty="1">賣1 (+${c.sellPrice})</button>
          <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-qty="5" ${n < 5 ? 'disabled' : ''}>賣5 (+${c.sellPrice * 5})</button>
          <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-qty="all">全賣 (+${c.sellPrice * n})</button>
        </div>
      </div>`;
    }
    return h;
  }

  onAction(d) {
    const g = this.game;
    if (d.action === 'upgrade') return g.shop.upgradeWarehouse();
    if (d.action === 'sell') {
      const qty = d.qty === 'all' ? g.inventory.cropCount(d.id) : Number(d.qty);
      g.shop.sellCrops(d.id, qty);
    }
  }
}
