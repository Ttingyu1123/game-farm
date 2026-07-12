import { CROP_MAP } from '../data/crops.js';
import { fmtTime } from '../utils/helpers.js';

export class OrderPanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const s = this.game.state;
    let h = `<h4 class="panel-title">📋 農產品訂單</h4>`;
    if (!s.orders.length) {
      h += `<div class="empty-state">暫時沒有訂單</div>`;
      return h;
    }
    const now = Date.now();
    for (const o of s.orders) {
      const c = CROP_MAP[o.cropId];
      if (!c) continue;
      const have = s.warehouse[o.cropId] || 0;
      const can = have >= o.qty;
      h += `<div class="order-card">
        <div class="order-head">
          <span class="order-avatar">${o.customerIcon}</span>
          <b>${o.customer}</b>
          <span class="order-remain" data-remain="${o.expiresAt}">⏳ ${fmtTime(o.expiresAt - now)}</span>
        </div>
        <div class="order-need">需要：${c.icon} ${c.name} ×${o.qty} <span class="muted">（庫存 ${have}）</span></div>
        <div class="order-reward">獎勵：💰${o.coins} ＋ ⭐${o.xp} 經驗</div>
        <div class="order-actions">
          <button class="btn btn-small" data-action="refresh" data-id="${o.id}">🔄 換一張</button>
          <button class="btn btn-small btn-primary" data-action="deliver" data-id="${o.id}" ${can ? '' : 'disabled'}>🚚 交付</button>
        </div>
      </div>`;
    }
    return h;
  }

  live(root) {
    const now = Date.now();
    for (const el of root.querySelectorAll('[data-remain]')) {
      el.textContent = `⏳ ${fmtTime(Number(el.dataset.remain) - now)}`;
    }
  }

  onAction(d) {
    if (d.action === 'deliver') this.game.orders.complete(d.id);
    else if (d.action === 'refresh') this.game.orders.refresh(d.id);
  }
}
