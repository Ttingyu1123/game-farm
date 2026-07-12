import { ACHIEVEMENTS } from '../data/achievements.js';

// 成就：state:changed 時自動偵測，達成即發放一次（已發放清單存在存檔中）
export class AchievementSystem {
  constructor(game) {
    this.game = game;
    this._busy = false;
    game.events.on('state:changed', () => this.evaluate());
    game.events.on('booted', () => this.evaluate());
  }

  evaluate() {
    if (this._busy) return;
    const g = this.game, s = g.state;
    if (!s || !Array.isArray(s.achievements)) return;
    this._busy = true;
    try {
      for (const a of ACHIEVEMENTS) {
        if (s.achievements.includes(a.id)) continue;
        let ok = false;
        try { ok = a.check(s); } catch { /* 壞掉的 check 不阻塞其他成就 */ }
        if (!ok) continue;
        s.achievements.push(a.id); // 先記錄再發獎 → 不可重複
        g.economy.addCoins(a.coins, 'achievement');
        g.audio.play('levelup');
        g.toast(`🏆 成就達成：${a.name}！+💰${a.coins}`, 'success');
        g.events.emit('achievement:earned', a);
        g.save.saveSoon();
      }
    } finally {
      this._busy = false;
    }
  }
}
