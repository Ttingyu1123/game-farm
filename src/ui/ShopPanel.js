import { CROPS } from '../data/crops.js';
import { ITEMS } from '../data/items.js';
import { fmtTime } from '../utils/helpers.js';

export class ShopPanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const s = this.game.state;
    let h = `<h4 class="panel-title">🛒 種子商店</h4>`;
    for (const c of CROPS) {
      const locked = s.level < c.unlockLevel;
      const owned = s.seeds[c.id] || 0;
      const sm = this.game.season.mult(c.id);
      const seasonTag = sm > 1
        ? `<span class="season-tag in">當季 ⚡+30%</span>`
        : sm < 1 ? `<span class="season-tag off">逆季 🐌-30%</span>` : '';
      h += `<div class="shop-row ${locked ? 'locked' : ''}">
        <span class="shop-icon">${c.icon}</span>
        <div class="shop-info">
          <b>${c.name}種子 ${seasonTag}</b>
          <span class="muted">💰${c.seedPrice}／顆 · 持有 ${owned}</span>
          <span class="muted small">成長 ${fmtTime(c.growthMs)} · 收成 ${c.harvestAmount} 個 · 每個賣 💰${c.sellPrice}</span>
        </div>
        ${locked
          ? `<span class="lock-tag">Lv ${c.unlockLevel} 解鎖</span>`
          : `<div class="qty-btns">${[1, 5, 10].map((q) =>
              `<button class="btn btn-small" data-action="buy-seed" data-id="${c.id}" data-qty="${q}" ${s.coins < c.seedPrice * q ? 'disabled' : ''}>×${q}</button>`
            ).join('')}</div>`}
      </div>`;
    }
    h += `<h4 class="panel-title">🧰 道具</h4>`;
    for (const it of ITEMS) {
      const locked = s.level < it.unlockLevel;
      const owned = s.items[it.id] || 0;
      h += `<div class="shop-row ${locked ? 'locked' : ''}">
        <span class="shop-icon">${it.icon}</span>
        <div class="shop-info">
          <b>${it.name}</b>
          <span class="muted">💰${it.price} · 持有 ${owned}</span>
          <span class="muted small">${it.desc}</span>
        </div>
        ${locked
          ? `<span class="lock-tag">Lv ${it.unlockLevel} 解鎖</span>`
          : `<div class="qty-btns">${it.buyQty.map((q) =>
              `<button class="btn btn-small" data-action="buy-item" data-id="${it.id}" data-qty="${q}" ${s.coins < it.price * q ? 'disabled' : ''}>×${q}</button>`
            ).join('')}</div>`}
      </div>`;
    }
    return h;
  }

  onAction(d) {
    if (d.action === 'buy-seed') this.game.shop.buySeed(d.id, Number(d.qty));
    else if (d.action === 'buy-item') this.game.shop.buyItem(d.id, Number(d.qty));
  }
}
