import { CONFIG } from '../config.js';
import { SEASONS, SEASON_MAP } from '../data/seasons.js';

// 季節：固定順序輪替（春→夏→秋→冬），當季作物成長加速＋優質加成，逆季減速
export class SeasonSystem {
  constructor(game) {
    this.game = game;
  }

  def() {
    return SEASON_MAP[this.game.state.season?.current] || SEASONS[0];
  }

  mult(cropId) {
    const s = this.def();
    if (s.boost.includes(cropId)) return CONFIG.SEASON.boostMult;
    if (s.penalty.includes(cropId)) return CONFIG.SEASON.penaltyMult;
    return 1;
  }

  qualityBonus(cropId) {
    return this.def().boost.includes(cropId) ? CONFIG.SEASON.qualityBonus : 0;
  }

  remainingMs(now = Date.now()) {
    return Math.max(0, this.game.state.season.changedAt + CONFIG.SEASON.durationMs - now);
  }

  ensure(now) {
    const st = this.game.state;
    if (!st.season || !SEASON_MAP[st.season.current]) {
      st.season = { current: 'spring', changedAt: now };
    }
    // 離線跨多季：保留相位逐步推進（guard 防異常時間差鎖死迴圈）
    let guard = 0;
    while (now - st.season.changedAt >= CONFIG.SEASON.durationMs && guard++ < 1000) {
      this.advance(st.season.changedAt + CONFIG.SEASON.durationMs, false);
    }
  }

  tick(now) {
    if (now - this.game.state.season.changedAt >= CONFIG.SEASON.durationMs) {
      this.advance(now, true);
    }
  }

  advance(at, announce) {
    const g = this.game;
    const idx = SEASONS.findIndex((s) => s.id === g.state.season.current);
    const next = SEASONS[(idx + 1) % SEASONS.length];
    g.state.season = { current: next.id, changedAt: at };
    g.events.emit('season:changed', next);
    if (announce) g.toast(`季節更替：${next.icon} ${next.name} — ${next.desc}`, 'info');
    g.changed();
  }
}
