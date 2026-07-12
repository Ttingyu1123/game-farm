import { CONFIG } from '../config.js';
import { FESTIVALS, FESTIVAL_MAP } from '../data/festivals.js';
import { pick } from '../utils/helpers.js';

// 節慶：週期性限時全域加成
export class FestivalSystem {
  constructor(game) {
    this.game = game;
  }

  def() {
    const f = this.game.state.festival;
    return f?.current ? (FESTIVAL_MAP[f.current] || null) : null;
  }

  active() { return !!this.def(); }
  growthMult() { return this.def()?.effect.growth ?? 1; }
  sellBonus() { return this.def()?.effect.sellBonus ?? 0; }
  harvestXpMult() { return this.def()?.effect.harvestXp ?? 1; }
  orderCoinsMult() { return this.def()?.effect.orderCoins ?? 1; }

  remainingMs(now = Date.now()) {
    const f = this.game.state.festival;
    if (!f?.current) return 0;
    return Math.max(0, f.startedAt + CONFIG.FESTIVAL.durationMs - now);
  }

  ensure(now) {
    const s = this.game.state;
    if (!s.festival || typeof s.festival !== 'object') {
      s.festival = { current: null, startedAt: 0, nextAt: now + CONFIG.FESTIVAL.firstDelayMs };
    }
    const f = s.festival;
    if (f.current && now - f.startedAt >= CONFIG.FESTIVAL.durationMs) {
      f.current = null;
      f.nextAt = now + CONFIG.FESTIVAL.intervalMs;
    }
    // 離線錯過場次 → 回來 2 分鐘後開一場（歡迎回來）
    if (!f.current && f.nextAt <= now) f.nextAt = now + 2 * 60 * 1000;
  }

  tick(now) {
    const f = this.game.state.festival;
    if (!f) return;
    if (f.current) {
      if (now - f.startedAt >= CONFIG.FESTIVAL.durationMs) this.end(now);
    } else if (now >= f.nextAt) {
      this.start(pick(FESTIVALS).id, now);
    }
  }

  start(id, now = Date.now()) {
    const fd = FESTIVAL_MAP[id];
    if (!fd) return;
    this.game.state.festival = { current: id, startedAt: now, nextAt: 0 };
    const mins = Math.round(CONFIG.FESTIVAL.durationMs / 60000);
    this.game.toast(`${fd.icon} 節慶開始：${fd.name}！${fd.desc}（限時 ${mins} 分鐘）`, 'success');
    this.game.audio.play('levelup');
    this.game.events.emit('festival:started', fd);
    this.game.changed();
  }

  end(now = Date.now()) {
    const fd = this.def();
    this.game.state.festival = { current: null, startedAt: 0, nextAt: now + CONFIG.FESTIVAL.intervalMs };
    if (fd) this.game.toast(`${fd.icon} ${fd.name}結束了，下次見！`, 'info');
    this.game.events.emit('festival:ended', fd);
    this.game.changed();
  }
}
