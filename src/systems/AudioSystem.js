// 音效為程式生成（WebAudio）；背景音樂依季節串流播放，載入失敗時退回程式生成的備援音樂
import { CONFIG } from '../config.js';

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

// 備援背景音樂（程式生成）：C–Am–F–G 和弦墊 + C 大調五聲音階隨機旋律
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
    this._musicOn = false;
    this._el = null;
    this._fadeTimer = null;
    this._trackFailed = false;
    game.events.on('season:changed', (season) => this._switchTrack(season.id));
    document.addEventListener('visibilitychange', () => this._onVisibility());
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
    if (this._musicOn || !st?.settings.music) return;
    this._musicOn = true;
    if (this._trackFailed) this._startSynth();
    else this._playTrack(st.season?.current);
  }

  stopMusic() {
    this._musicOn = false;
    this._clearFade();
    if (this._el) this._el.pause();
    this._stopSynth();
  }

  syncVolume() {
    if (this._el && !this._fadeTimer) this._el.volume = this._musicVol();
  }

  _musicVol() {
    return Math.min(1, Math.max(0, this.game.state?.settings.volume ?? 0.6));
  }

  _playTrack(seasonId) {
    if (!this._el) {
      this._el = new Audio();
      this._el.loop = true;
      this._el.addEventListener('error', () => this._fallbackToSynth());
    }
    const el = this._el;
    const url = `${CONFIG.BGM.baseUrl}${seasonId || 'spring'}${CONFIG.BGM.ext}`;
    if (el.src !== url) el.src = url;
    el.volume = this._musicVol();
    const p = el.play();
    if (p) p.catch((e) => this._onPlayRejected(e));
  }

  _onPlayRejected(e) {
    if (e.name === 'AbortError') return; // 換曲或暫停打斷了上一次 play()
    if (e.name !== 'NotAllowedError') { this._fallbackToSynth(); return; }
    // 瀏覽器要求先有使用者手勢：等下一次點擊再播
    document.addEventListener('pointerdown', () => {
      if (this._musicOn && !this._trackFailed) this._playTrack(this.game.state?.season?.current);
    }, { once: true });
  }

  _switchTrack(seasonId) {
    if (!this._musicOn || this._trackFailed) return;
    const el = this._el;
    if (!el || el.paused) { this._playTrack(seasonId); return; }
    this._clearFade();
    const steps = 12;
    const from = el.volume;
    let step = 0;
    this._fadeTimer = setInterval(() => {
      step += 1;
      el.volume = Math.max(0, from * (1 - step / steps));
      if (step < steps) return;
      this._clearFade();
      if (this._musicOn) this._playTrack(seasonId);
    }, CONFIG.BGM.fadeMs / steps);
  }

  _clearFade() {
    if (!this._fadeTimer) return;
    clearInterval(this._fadeTimer);
    this._fadeTimer = null;
  }

  _fallbackToSynth() {
    if (this._trackFailed) return;
    this._trackFailed = true;
    this._clearFade();
    if (this._musicOn) this._startSynth();
  }

  _onVisibility() {
    if (!this._musicOn || this._trackFailed || !this._el) return;
    if (document.hidden) this._el.pause();
    else this._playTrack(this.game.state?.season?.current);
  }

  _startSynth() {
    if (this._musicTimer) return;
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

  _stopSynth() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _scheduleBars() {
    const st = this.game.state;
    if (!st?.settings.music) { this._stopSynth(); return; }
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
