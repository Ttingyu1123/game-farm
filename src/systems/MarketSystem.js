import { CONFIG } from '../config.js';
import { CROPS, CROP_MAP } from '../data/crops.js';
import { marketFactorMap } from '../core/GameState.js';

// 市場行情：售價每隔一段時間隨機波動，賣作物要挑時機
export class MarketSystem {
  constructor(game) {
    this.game = game;
  }

  factor(cropId) {
    return this.game.state.market?.factors?.[cropId] ?? 1;
  }

  priceOf(cropId, quality = false) {
    const c = CROP_MAP[cropId];
    if (!c) return 0;
    const p = Math.max(1, Math.round(c.sellPrice * this.factor(cropId)));
    return quality ? p * CONFIG.QUALITY.priceMult : p;
  }

  ensure(now) {
    const s = this.game.state;
    if (!s.market || !s.market.factors) {
      s.market = { factors: marketFactorMap(), changedAt: now };
    }
    if (now - s.market.changedAt >= CONFIG.MARKET.intervalMs) this.roll(now);
  }

  tick(now) {
    if (now - this.game.state.market.changedAt >= CONFIG.MARKET.intervalMs) this.roll(now);
  }

  roll(now) {
    const { min, max } = CONFIG.MARKET;
    const factors = {};
    for (const c of CROPS) {
      factors[c.id] = Math.round((min + Math.random() * (max - min)) * 100) / 100;
    }
    this.game.state.market = { factors, changedAt: now };
    this.game.events.emit('market:changed', factors);
    this.game.changed();
  }
}
