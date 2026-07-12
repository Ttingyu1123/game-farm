export class EconomySystem {
  constructor(game) {
    this.game = game;
  }

  addCoins(n, reason = '') {
    if (!Number.isFinite(n) || n <= 0) return;
    const s = this.game.state;
    s.coins += Math.round(n);
    s.stats.coinsEarned += Math.round(n);
    this.game.events.emit('coins:earned', { amount: Math.round(n), reason });
  }

  // 金幣不足回傳 false，絕不讓金幣變負數
  spend(n) {
    if (!Number.isFinite(n) || n < 0) return false;
    const s = this.game.state;
    if (s.coins < n) return false;
    s.coins -= n;
    s.stats.coinsSpent += n;
    this.game.events.emit('coins:spent', n);
    return true;
  }
}
