export class TaskPanel {
  constructor(game) {
    this.game = game;
  }

  html() {
    const s = this.game.state;
    let h = `<h4 class="panel-title">📝 每日任務 <span class="muted small">（${s.dailyTaskDate}，每天更新）</span></h4>`;
    if (!s.dailyTasks.length) {
      h += `<div class="empty-state">今天的任務準備中…</div>`;
      return h;
    }
    s.dailyTasks.forEach((t, i) => {
      const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
      const done = t.progress >= t.target;
      h += `<div class="task-row ${t.claimed ? 'claimed' : ''}">
        <div class="task-info">
          <b>${t.name}</b>
          <div class="task-bar"><div style="width:${pct}%"></div></div>
          <span class="muted small">${Math.min(t.progress, t.target)}/${t.target} · 獎勵 💰${t.coins} ＋ ⭐${t.xp}</span>
        </div>
        ${t.claimed
          ? `<span class="claimed-tag">✔ 已領取</span>`
          : `<button class="btn btn-small ${done ? 'btn-primary' : ''}" data-action="claim" data-idx="${i}" ${done ? '' : 'disabled'}>領取</button>`}
      </div>`;
    });
    return h;
  }

  onAction(d) {
    if (d.action === 'claim') this.game.tasks.claim(Number(d.idx));
  }
}
