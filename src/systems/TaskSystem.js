import { CONFIG } from '../config.js';
import { CROPS } from '../data/crops.js';
import { TASK_POOL } from '../data/tasks.js';
import { todayStr, shuffle } from '../utils/helpers.js';

export class TaskSystem {
  constructor(game) {
    this.game = game;
    const ev = game.events;
    ev.on('crop:planted', ({ cropId }) => { this.inc('plant'); this.inc('plantCrop', 1, cropId); });
    ev.on('crop:watered', ({ auto }) => { if (!auto) this.inc('water'); });
    ev.on('crop:harvested', () => this.inc('harvest'));
    ev.on('crops:sold', ({ qty }) => this.inc('sell', qty));
    ev.on('order:completed', () => this.inc('order'));
    ev.on('coins:earned', ({ amount }) => this.inc('earn', amount));
  }

  // 日期變更後產生新任務；同一天不重複產生（重新整理不會重置進度）
  ensureDaily() {
    const s = this.game.state;
    const today = todayStr();
    if (s.dailyTaskDate === today && Array.isArray(s.dailyTasks) && s.dailyTasks.length) return;
    const unlocked = CROPS.filter((c) => c.unlockLevel <= s.level);
    const pool = shuffle([...TASK_POOL]);
    s.dailyTasks = pool.slice(0, CONFIG.DAILY_TASK_COUNT).map((p) => p.make(s.level, unlocked));
    s.dailyTaskDate = today;
    this.game.changed();
  }

  inc(type, n = 1, cropId = null) {
    if (n <= 0) return;
    const s = this.game.state;
    let touched = false;
    for (const t of s.dailyTasks) {
      if (t.type !== type || t.claimed) continue;
      if (type === 'plantCrop' && t.cropId !== cropId) continue;
      if (t.progress >= t.target) continue;
      t.progress = Math.min(t.target, t.progress + n);
      touched = true;
      if (t.progress >= t.target) {
        this.game.toast(`✅ 任務完成：${t.name}！記得領取獎勵`, 'success');
      }
    }
    if (touched) this.game.changed();
  }

  claim(idx) {
    const g = this.game, s = g.state;
    const t = s.dailyTasks[idx];
    if (!t || t.claimed || t.progress < t.target) return; // 防重複領取
    t.claimed = true;
    g.economy.addCoins(t.coins, 'task');
    g.progression.addXp(t.xp);
    s.stats.tasksClaimed++;
    g.audio.play('coin');
    g.toast(`領取任務獎勵：+💰${t.coins}、+⭐${t.xp}`, 'success');
    g.events.emit('task:claimed', t);
    g.changed();
  }
}
