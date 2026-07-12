// 程式生成音效（WebAudio），無外部素材
const SOUNDS = {
  click:   [[600, 0, 0.06]],
  till:    [[300, 0, 0.08], [240, 0.06, 0.1]],
  plant:   [[440, 0, 0.07], [660, 0.07, 0.1]],
  water:   [[520, 0, 0.05], [780, 0.05, 0.08], [1040, 0.1, 0.1]],
  harvest: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.14]],
  coin:    [[880, 0, 0.06], [1318, 0.06, 0.12]],
  levelup: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1046, 0.3, 0.2]],
  error:   [[220, 0, 0.18]],
};

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
  }

  ensureCtx() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch { /* 無音效環境時靜默 */ }
  }

  play(name) {
    const st = this.game.state;
    if (!st || !st.settings.sound) return;
    this.ensureCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    const vol = (st.settings.volume ?? 0.6) * 0.12;
    if (vol <= 0) return;
    const notes = SOUNDS[name] || SOUNDS.click;
    try {
      for (const [freq, off, dur] of notes) {
        const o = this.ctx.createOscillator();
        const gn = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        const t0 = this.ctx.currentTime + off;
        gn.gain.setValueAtTime(0.0001, t0);
        gn.gain.linearRampToValueAtTime(vol, t0 + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(gn).connect(this.ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
      }
    } catch { /* ignore */ }
  }
}
