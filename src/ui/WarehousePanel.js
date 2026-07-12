import { CONFIG } from '../config.js';
import { CROPS } from '../data/crops.js';

export class WarehousePanel {
  constructor(game) {
    this.game = game;
  }

  trendHtml(cropId) {
    const f = this.game.market.factor(cropId);
    if (f > 1.05) return `<span class="mkt up">▲ 行情 +${Math.round((f - 1) * 100)}%</span>`;
    if (f < 0.95) return `<span class="mkt down">▼ 行情 -${Math.round((1 - f) * 100)}%</span>`;
    return `<span class="mkt">— 行情持平</span>`;
  }

  rowHtml(c, n, quality) {
    const price = this.game.market.priceOf(c.id, quality);
    const q = quality ? '1' : '0';
    const name = quality ? `⭐優質${c.name}` : c.name;
    return `<div class="shop-row ${quality ? 'quality-row' : ''}">
      <span class="shop-icon">${c.icon}</span>
      <div class="shop-info">
        <b>${name} ×${n}</b>
        <span class="muted">現價 💰${price}／個 · 總值 💰${price * n} ${this.trendHtml(c.id)}</span>
      </div>
      <div class="qty-btns">
        <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-q="${q}" data-qty="1">賣1 (+${price})</button>
        <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-q="${q}" data-qty="5" ${n < 5 ? 'disabled' : ''}>賣5 (+${price * 5})</button>
        <button class="btn btn-small" data-action="sell" data-id="${c.id}" data-q="${q}" data-qty="all">全賣 (+${price * n})</button>
      </div>
    </div>`;
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
      </div>
      <p class="muted small">📈 市場行情每 ${Math.round(CONFIG.MARKET.intervalMs / 60000)} 分鐘波動，挑高點賣更賺！⭐優質作物售價 ×${CONFIG.QUALITY.priceMult}。</p>`;
    let any = false;
    for (const c of CROPS) {
      const nq = s.warehouseQ[c.id] || 0;
      if (nq > 0) { h += this.rowHtml(c, nq, true); any = true; }
      const n = s.warehouse[c.id] || 0;
      if (n > 0) { h += this.rowHtml(c, n, false); any = true; }
    }
    if (!any) h += `<div class="empty-state">倉庫空空的，快去收成吧 🧺</div>`;
    return h;
  }

  onAction(d) {
    const g = this.game;
    if (d.action === 'upgrade') return g.shop.upgradeWarehouse();
    if (d.action === 'sell') {
      const quality = d.q === '1';
      const qty = d.qty === 'all' ? g.inventory.cropCount(d.id, quality) : Number(d.qty);
      g.shop.sellCrops(d.id, qty, quality);
    }
  }
}
