import { CROPS } from '../data/crops.js';
import { ITEMS } from '../data/items.js';

export class InventoryPanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const s = this.game.state;
    let h = `<h4 class="panel-title">🎒 種子背包</h4>`;
    const seedRows = CROPS.filter((c) => s.level >= c.unlockLevel || (s.seeds[c.id] || 0) > 0);
    if (!seedRows.length) h += `<div class="empty-state">還沒有種子</div>`;
    for (const c of seedRows) {
      h += `<div class="shop-row">
        <span class="shop-icon">${c.icon}</span>
        <div class="shop-info"><b>${c.name}種子</b><span class="muted">持有 ${s.seeds[c.id] || 0} 顆</span></div>
      </div>`;
    }
    h += `<h4 class="panel-title">🧰 道具</h4>`;
    const itemRows = ITEMS.filter((it) => (s.items[it.id] || 0) > 0);
    if (!itemRows.length) h += `<div class="empty-state">還沒有道具，到商店逛逛吧</div>`;
    for (const it of itemRows) {
      h += `<div class="shop-row">
        <span class="shop-icon">${it.icon}</span>
        <div class="shop-info"><b>${it.name} ×${s.items[it.id]}</b><span class="muted small">${it.desc}</span></div>
      </div>`;
    }
    h += `<p class="muted small hint">提示：種子與道具在下方工具列選用後，點擊農地即可使用。</p>`;
    return h;
  }
}
