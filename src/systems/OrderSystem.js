import { CONFIG } from '../config.js';
import { CROPS, CROP_MAP } from '../data/crops.js';
import { CUSTOMERS } from '../data/orders.js';
import { pick } from '../utils/helpers.js';

export class OrderSystem {
  constructor(game) {
    this.game = game;
  }

  ensure() {
    const s = this.game.state;
    let added = false;
    while (s.orders.length < CONFIG.ORDER.count) {
      s.orders.push(this.generate());
      added = true;
    }
    if (added) this.game.changed();
  }

  generate() {
    const s = this.game.state;
    // 只出已解鎖作物的訂單
    const unlocked = CROPS.filter((c) => c.unlockLevel <= s.level);
    const crop = pick(unlocked);
    const qty = 2 + Math.floor(Math.random() * (1 + s.level));
    const customer = pick(CUSTOMERS);
    const o = CONFIG.ORDER;
    return {
      id: `o${s.orderSeq++}`,
      customer: customer.name,
      customerIcon: customer.icon,
      cropId: crop.id,
      qty,
      coins: Math.ceil(qty * crop.sellPrice * o.coinFactor),
      xp: Math.ceil(qty * crop.xp * o.xpFactor) + o.xpBase,
      expiresAt: Date.now() + o.lifetimeMs,
    };
  }

  complete(id) {
    const g = this.game, s = g.state;
    const idx = s.orders.findIndex((o) => o.id === id);
    if (idx < 0) return; // 已被領取／過期 → 防重複
    const o = s.orders[idx];
    const c = CROP_MAP[o.cropId];
    if (!g.inventory.removeCrops(o.cropId, o.qty)) {
      return g.toast(`庫存不足：需要 ${c.icon} ${c.name} ×${o.qty}`, 'warn');
    }
    s.orders.splice(idx, 1); // 先移除再發獎，杜絕重複領取
    g.economy.addCoins(o.coins, 'order');
    g.progression.addXp(o.xp);
    s.stats.ordersCompleted++;
    g.audio.play('coin');
    g.toast(`🚚 完成 ${o.customer} 的訂單！+💰${o.coins}、+⭐${o.xp}`, 'success');
    g.events.emit('order:completed', o);
    this.ensure();
    g.changed();
  }

  refresh(id) {
    const g = this.game, s = g.state;
    const idx = s.orders.findIndex((o) => o.id === id);
    if (idx < 0) return;
    s.orders.splice(idx, 1, this.generate());
    g.toast('已換一張新訂單', 'info');
    g.changed();
  }

  tick(now) {
    const s = this.game.state;
    let removed = false;
    for (let i = s.orders.length - 1; i >= 0; i--) {
      if (s.orders[i].expiresAt <= now) {
        s.orders.splice(i, 1);
        removed = true;
      }
    }
    if (removed) {
      this.ensure();
      this.game.toast('有訂單過期了，新訂單已送達', 'info');
      this.game.changed();
    }
  }
}
