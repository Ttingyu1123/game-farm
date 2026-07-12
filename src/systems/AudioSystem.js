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

// 程式生成背景音樂：C–Am–F–G 和弦墊 + C 大調五聲音階隨機旋律
const MUSIC = {
  barSec: 2.4,
  chords: [
    [261.63, 329.63, 392.0],  // C
    [220.0, 261.63, 329.63],  // Am
    [174.61, 220.0, 261.63],  // F
    [196.0, 246.94, 293.66],  // G
  ],
  scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
};

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this._musicTimer = null;
    this._nextBar = 0;
    this._barIdx = 0;
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

  // ---------- 背景音樂 ----------
  startMusic() {
    const st = this.game.state;
    if (this._musicTimer || !st?.settings.music) return;
    this.ensureCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this._barIdx = 0;
    this._nextBar = this.ctx.currentTime + 0.15;
    // 500ms 前瞻排程：分頁節流也不會斷拍
    this._musicTimer = setInterval(() => {
      try { this._scheduleBars(); } catch { /* 音樂出錯不影響遊戲 */ }
    }, 500);
    this._scheduleBars();
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _scheduleBars() {
    const st = this.game.state;
    if (!st?.settings.music) { this.stopMusic(); return; }
    const master = st.settings.volume ?? 0.6;
    if (master <= 0) return;
    while (this._nextBar < this.ctx.currentTime + 1.5) {
      const t = this._nextBar;
      const bar = MUSIC.barSec;
      const chord = MUSIC.chords[this._barIdx % MUSIC.chords.length];
      for (const f of chord) this._pad(f, t, bar * 0.98, master * 0.028);
      this._pad(chord[0] / 2, t, bar * 0.98, master * 0.045); // 低音根音
      // 每小節 1~2 顆五聲音階旋律音
      const n = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) {
        const f = MUSIC.scale[Math.floor(Math.random() * MUSIC.scale.length)];
        this._pluck(f, t + Math.random() * bar * 0.7, 0.55, master * 0.05);
      }
      this._barIdx++;
      this._nextBar += bar;
    }
  }

  _pad(freq, t, dur, vol) {
    const o = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(vol, t + 0.5);
    gn.gain.setValueAtTime(vol, t + dur * 0.6);
    gn.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _pluck(freq, t, dur, vol) {
    const o = this.ctx.createOscillator();
    const gn = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(vol, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
