import { CONFIG } from '../config.js';
import { CROPS } from '../data/crops.js';
import { ITEMS } from '../data/items.js';
import { MAX_LEVEL, LEVEL_REWARDS, xpNeeded } from '../data/levels.js';

export class ProgressionSystem {
  constructor(game) {
    this.game = game;
  }

  xpNeeded(level = this.game.state.level) {
    return xpNeeded(level);
  }

  addXp(n) {
    if (!Number.isFinite(n) || n <= 0) return;
    const g = this.game, s = g.state;
    if (s.level >= MAX_LEVEL) return;
    s.xp += Math.round(n);
    g.events.emit('xp:gained', n);
    // 升級獎勵在升級當下發放一次，等級單向遞增 → 不會重複發放
    while (s.level < MAX_LEVEL && s.xp >= xpNeeded(s.level)) {
      s.xp -= xpNeeded(s.level);
      s.level++;
      const reward = LEVEL_REWARDS[s.level] || null;
      if (reward?.coins) g.economy.addCoins(reward.coins, 'level');
      const unlocks = describeUnlocks(s.level);
      g.audio.play('levelup');
      g.events.emit('level:up', { level: s.level, reward, unlocks });
    }
    g.changed();
  }
}

function describeUnlocks(level) {
  const out = [];
  for (const c of CROPS) if (c.unlockLevel === level) out.push(`新作物：${c.icon} ${c.name}`);
  for (const it of ITEMS) if (it.unlockLevel === level) out.push(`新道具：${it.icon} ${it.name}`);
  for (const z of CONFIG.ZONES) if (z.level === level) out.push(`可購買農地：${z.name}（💰${z.price}）`);
  return out;
}
