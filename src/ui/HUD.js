import { MAX_LEVEL } from '../data/levels.js';
import { fmtClock } from '../utils/helpers.js';
import { openSettings } from './SettingsModal.js';

// 圖示由 icons.js 的監看器換入；文字沒變就不重設，否則每個 tick 都會重建圖片
function setText(el, text) {
  if (el.dataset.text === text) return;
  el.dataset.text = text;
  el.textContent = text;
}

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('hud');
    this.el.innerHTML = `
      <div class="hud-left"><span class="hud-title">🌱 療癒小農場</span></div>
      <div class="hud-center">
        <span class="hud-chip hidden" id="hud-prestige" title="轉生世代">🌟</span>
        <span class="hud-chip" id="hud-coins" title="金幣">💰 0</span>
        <span class="hud-chip" id="hud-level" title="等級">Lv 1</span>
        <div id="xp-bar" title="經驗值"><div id="xp-fill"></div><span id="xp-text"></span></div>
        <span class="hud-chip" id="hud-season" title="季節">🌸</span>
        <span class="hud-chip" id="hud-weather" title="天氣">☀️</span>
      </div>
      <div class="hud-right">
        <span id="hud-save" title="最近存檔時間">💾 --</span>
        <button id="btn-settings" class="btn btn-small" title="設定">⚙️</button>
      </div>`;
    this.coinsEl = this.el.querySelector('#hud-coins');
    this.levelEl = this.el.querySelector('#hud-level');
    this.xpFill = this.el.querySelector('#xp-fill');
    this.xpText = this.el.querySelector('#xp-text');
    this.weatherEl = this.el.querySelector('#hud-weather');
    this.seasonEl = this.el.querySelector('#hud-season');
    this.prestigeEl = this.el.querySelector('#hud-prestige');
    this.saveEl = this.el.querySelector('#hud-save');
    this.el.querySelector('#btn-settings').addEventListener('click', () => openSettings(game));

    game.events.on('tick', () => this.update());
    game.events.on('state:changed', () => this.update());
    game.events.on('saved', (ts) => { this.saveEl.textContent = `💾 ${fmtClock(ts)}`; });
  }

  update() {
    const s = this.game.state;
    if (!s) return;
    setText(this.coinsEl, `💰 ${s.coins}`);
    setText(this.levelEl, `Lv ${s.level}`);
    const need = this.game.progression.xpNeeded();
    if (s.level >= MAX_LEVEL || !Number.isFinite(need)) {
      this.xpFill.style.width = '100%';
      setText(this.xpText, 'MAX');
    } else {
      this.xpFill.style.width = `${Math.min(100, Math.round((s.xp / need) * 100))}%`;
      setText(this.xpText, `${s.xp}/${need}`);
    }
    const w = this.game.weather.def();
    setText(this.weatherEl, `${w.icon} ${w.name}`);
    const se = this.game.season.def();
    setText(this.seasonEl, `${se.icon} ${se.name}`);
    this.seasonEl.title = `季節：${se.desc}（當季 +30% 生長、優質 +10%）`;
    const pr = s.prestige || 0;
    this.prestigeEl.classList.toggle('hidden', pr === 0);
    if (pr > 0) {
      setText(this.prestigeEl, `🌟×${pr}`);
      this.prestigeEl.title = `第 ${pr} 世農場：永久售價 +${pr * 5}%、生長 +${pr * 5}%`;
    }
  }
}
