import { ACHIEVEMENTS } from '../data/achievements.js';

export class AchievementPanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const s = this.game.state;
    const earned = new Set(s.achievements || []);
    let h = `<h4 class="panel-title">🏆 成就 <span class="muted small">（${earned.size}/${ACHIEVEMENTS.length}）</span></h4>`;
    for (const a of ACHIEVEMENTS) {
      const got = earned.has(a.id);
      h += `<div class="shop-row ${got ? 'ach-earned' : 'ach-locked'}">
        <span class="shop-icon">${a.icon}</span>
        <div class="shop-info">
          <b>${a.name}</b>
          <span class="muted small">${a.desc} · 獎勵 💰${a.coins}</span>
        </div>
        ${got ? `<span class="claimed-tag">✔ 達成</span>` : `<span class="lock-tag">未達成</span>`}
      </div>`;
    }
    return h;
  }
}
