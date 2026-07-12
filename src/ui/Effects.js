import { CROP_MAP } from '../data/crops.js';

// 粒子特效：訂閱遊戲事件，在對應位置噴出 emoji 粒子（純 CSS 動畫、自動回收）
const MAX_PARTICLES = 60;

export class Effects {
  constructor(game) {
    this.game = game;
    this.layer = document.createElement('div');
    this.layer.id = 'fx-layer';
    this.layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.layer);

    const ev = game.events;
    ev.on('crop:harvested', ({ plot, cropId, quality }) => {
      const icon = quality ? '⭐' : (CROP_MAP[cropId]?.icon ?? '🌾');
      this.burstAtPlot(plot.id, [icon, '✨'], quality ? 10 : 6);
    });
    ev.on('crop:watered', ({ plot, auto }) => {
      if (!auto) this.burstAtPlot(plot.id, ['💧'], 4);
    });
    ev.on('crop:planted', ({ plot }) => this.burstAtPlot(plot.id, ['🌱'], 3));
    ev.on('crops:sold', () => this.coinBurst());
    ev.on('product:sold', () => this.coinBurst());
    ev.on('order:completed', () => this.coinBurst(8));
    ev.on('task:claimed', () => this.coinBurst());
    ev.on('level:up', () => this.confetti());
    ev.on('achievement:earned', () => this.confetti(8));
    ev.on('festival:started', () => this.confetti(16));
    ev.on('pest:shooed', ({ id }) => this.burstAtPlot(id ?? -1, ['💨'], 3));
  }

  spawn(x, y, emoji, { spread = 44, rise = 60, dur = 0.9, size = 1.1 } = {}) {
    if (this.layer.children.length > MAX_PARTICLES) return;
    const el = document.createElement('span');
    el.className = 'fx-p';
    el.textContent = emoji;
    const dx = (Math.random() - 0.5) * 2 * spread;
    const dy = -(rise * 0.5 + Math.random() * rise);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${size}rem`;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.animationDuration = `${dur}s`;
    el.addEventListener('animationend', () => el.remove());
    this.layer.appendChild(el);
  }

  burstAt(x, y, emojis, n, opt) {
    for (let i = 0; i < n; i++) {
      this.spawn(x, y, emojis[i % emojis.length], opt);
    }
  }

  burstAtPlot(plotId, emojis, n) {
    const cell = document.querySelector(`.plot[data-i="${plotId}"]`);
    if (!cell) return;
    const r = cell.getBoundingClientRect();
    this.burstAt(r.left + r.width / 2, r.top + r.height / 2, emojis, n);
  }

  coinBurst(n = 5) {
    const el = document.getElementById('hud-coins');
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.burstAt(r.left + r.width / 2, r.top + r.height / 2, ['🪙', '💰'], n, { rise: 40, spread: 36 });
  }

  confetti(n = 14) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < n; i++) {
      this.spawn(
        w * (0.3 + Math.random() * 0.4),
        h * (0.25 + Math.random() * 0.2),
        ['🎉', '✨', '🌟', '🎊'][i % 4],
        { spread: 120, rise: 90, dur: 1.2, size: 1 + Math.random() * 0.5 },
      );
    }
  }
}
