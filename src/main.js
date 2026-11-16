import { CONFIG } from './config.js';
import { Game } from './core/Game.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { Modal } from './ui/Modal.js';
import { initToast, showToast } from './ui/Toast.js';
import { HUD } from './ui/HUD.js';
import { FarmGrid } from './ui/FarmGrid.js';
import { Toolbar } from './ui/Toolbar.js';
import { Panels } from './ui/Panels.js';
import { Tutorial } from './ui/Tutorial.js';
import { Effects } from './ui/Effects.js';
import { HELP_HTML } from './ui/Help.js';
import { fmtTime, fmtClock } from './utils/helpers.js';
import { installIconizer } from './ui/icons.js';

const game = new Game();
window.game = game;         // 除錯用
window.gameConfig = CONFIG; // 除錯/測試用

installIconizer();
initToast(game);
game.modal = new Modal();

let ui = null;
function ensureUI() {
  if (ui) return;
  ui = {
    hud: new HUD(game),
    grid: new FarmGrid(game),
    toolbar: new Toolbar(game),
    panels: new Panels(game),
    tutorial: new Tutorial(game),
    effects: new Effects(game),
  };
  game.uiRefs = ui;
}

// --- 季節/天氣/節慶橫幅 ---
function updateWeatherBanner() {
  const el = document.getElementById('weather-banner');
  const w = game.weather.def();
  const se = game.season.def();
  const fd = game.festival.def();
  const festHtml = fd
    ? ` · <span class="fest-chip">${fd.icon} ${fd.name}（${fd.desc}）<span id="fest-remain"></span></span>`
    : '';
  el.innerHTML = `${se.icon} ${se.name} · ${w.icon} ${w.name} <span class="muted">｜${se.desc}｜${w.effect}</span>${festHtml}`;
  const area = document.getElementById('farm-area');
  area.classList.toggle('raining', w.id === 'rain');
  area.className = area.className.replace(/\bseason-\w+\b/g, '').trim();
  area.classList.add(`season-${se.id}`);
}

// --- 遊戲啟動後 ---
game.events.on('booted', ({ offlineMs }) => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  ensureUI();
  ui.grid.init();
  ui.toolbar.render();
  ui.panels.render();
  ui.hud.update();
  updateWeatherBanner();
  if (offlineMs > 60 * 1000) {
    showToast(`👋 歡迎回來！離線 ${fmtTime(offlineMs)} 期間作物持續成長`, 'success');
  }
  if (game.state.settings.music) game.audio.startMusic();
  ui.tutorial.maybeStart();
});

game.events.on('weather:changed', () => {
  if (game.running) {
    updateWeatherBanner();
    const w = game.weather.def();
    showToast(`天氣變化：${w.icon} ${w.name}（${w.effect}）`, 'info');
  }
});

game.events.on('season:changed', () => {
  if (game.running) updateWeatherBanner();
});

game.events.on('festival:started', () => { if (game.running) updateWeatherBanner(); });
game.events.on('festival:ended', () => { if (game.running) updateWeatherBanner(); });
game.events.on('tick', () => {
  const el = document.getElementById('fest-remain');
  if (el) el.textContent = ` ⏳${fmtTime(game.festival.remainingMs())}`;
});

game.events.on('level:up', ({ level, reward, unlocks }) => {
  const lines = [];
  if (reward?.coins) lines.push(`升級獎勵：💰 ${reward.coins}`);
  for (const u of unlocks) lines.push(`✨ ${u}`);
  game.modal.info({
    title: `🎉 升級到 Lv ${level}！`,
    body: lines.length ? lines.join('<br>') : '繼續努力，更多內容等你解鎖！',
  });
});

// --- 開始畫面 ---
const btnNew = document.getElementById('btn-new-game');
const btnContinue = document.getElementById('btn-continue');
const btnHelp = document.getElementById('btn-help');
const btnSound = document.getElementById('btn-sound-toggle');
const btnWipe = document.getElementById('btn-wipe-save');
const saveHint = document.getElementById('start-save-hint');

let soundPref = true;

function refreshStartScreen() {
  const has = SaveSystem.hasSave();
  btnContinue.disabled = !has;
  const peek = SaveSystem.peek();
  if (peek) {
    soundPref = peek.settings?.sound ?? true;
    saveHint.textContent = `上次遊玩：${fmtClock(peek.lastSavedAt)}｜Lv ${peek.level ?? '?'}｜💰 ${peek.coins ?? '?'}`;
  } else {
    saveHint.textContent = '尚無存檔';
  }
  btnSound.textContent = soundPref ? '音效：開' : '音效：關';
}
refreshStartScreen();

btnNew.addEventListener('click', async () => {
  if (SaveSystem.hasSave()) {
    const ok = await game.modal.confirm({
      title: '開始新遊戲',
      body: '已有舊存檔，開始新遊戲會<b>覆蓋舊進度</b>，確定嗎？',
      okText: '開始新遊戲', danger: true,
    });
    if (!ok) return;
  }
  game.newGame(soundPref);
});

btnContinue.addEventListener('click', () => {
  if (!game.continueGame(soundPref)) {
    showToast('存檔讀取失敗（可能已損壞），請開始新遊戲', 'warn');
    btnContinue.disabled = true;
  }
});

btnHelp.addEventListener('click', () => {
  game.modal.info({ title: '📖 遊戲說明', body: HELP_HTML });
});

btnSound.addEventListener('click', () => {
  soundPref = !soundPref;
  btnSound.textContent = soundPref ? '音效：開' : '音效：關';
});

btnWipe.addEventListener('click', async () => {
  if (!SaveSystem.hasSave()) return showToast('目前沒有存檔', 'info');
  const ok = await game.modal.confirm({
    title: '🗑️ 清除存檔',
    body: '確定要清除所有進度嗎？<b>無法復原</b>。',
    okText: '清除', danger: true,
  });
  if (!ok) return;
  SaveSystem.clear();
  refreshStartScreen();
  showToast('存檔已清除', 'success');
});

// --- 離開頁面前存檔 ---
window.addEventListener('beforeunload', () => {
  if (game.running) game.save.save();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && game.running) game.save.save();
});
