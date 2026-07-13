import { CONFIG } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { HELP_HTML } from './Help.js';
import { showToast } from './Toast.js';

export function openSettings(game) {
  const s = game.state;
  const root = game.modal.open(`
    <h3>⚙️ 設定</h3>
    <div class="settings-body">
      <label class="settings-row">🔊 音效
        <input type="checkbox" id="set-sound" ${s.settings.sound ? 'checked' : ''}>
      </label>
      <label class="settings-row">🎵 背景音樂
        <input type="checkbox" id="set-music" ${s.settings.music ? 'checked' : ''}>
      </label>
      <label class="settings-row">🎚️ 音量
        <input type="range" id="set-volume" min="0" max="1" step="0.05" value="${s.settings.volume}">
      </label>
      <div class="settings-actions">
        <button class="btn" id="set-prestige">🌟 轉生${s.level >= CONFIG.PRESTIGE.unlockLevel ? `（目前第 ${(s.prestige || 0) + 1} 世可開始）` : `（Lv ${CONFIG.PRESTIGE.unlockLevel} 解鎖，目前 Lv ${s.level}）`}</button>
        <button class="btn" id="set-save">💾 手動存檔</button>
        <button class="btn" id="set-tutorial">🎓 重看教學</button>
        <button class="btn" id="set-help">📖 遊戲說明</button>
        <button class="btn" id="set-guide">📚 完整攻略</button>
        <button class="btn" id="set-menu">🏠 返回主選單</button>
        <button class="btn btn-danger" id="set-wipe">🗑️ 清除存檔</button>
      </div>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" data-modal-action="cancel">關閉</button></div>
  `);

  root.querySelector('#set-sound').addEventListener('change', (e) => {
    s.settings.sound = e.target.checked;
    game.changed();
    if (s.settings.sound) game.audio.play('click');
  });
  root.querySelector('#set-music').addEventListener('change', (e) => {
    s.settings.music = e.target.checked;
    game.changed();
    if (s.settings.music) game.audio.startMusic();
    else game.audio.stopMusic();
  });
  root.querySelector('#set-volume').addEventListener('input', (e) => {
    s.settings.volume = Number(e.target.value);
    game.changed();
    game.audio.play('click');
  });
  root.querySelector('#set-prestige').addEventListener('click', async () => {
    if (!game.progression.canPrestige()) {
      return showToast(`轉生需要達到 Lv ${CONFIG.PRESTIGE.unlockLevel}（目前 Lv ${s.level}）`, 'warn');
    }
    game.modal.finish(false);
    const next = (s.prestige || 0) + 1;
    const ok = await game.modal.confirm({
      title: '🌟 轉生確認',
      body: `開始<b>第 ${next} 世</b>農場？<br><br>` +
        `<b>會重置</b>：等級、金幣、農地、倉庫、種子、道具、工坊機器、訂單、任務<br>` +
        `<b>會保留</b>：成就、統計、設定<br><br>` +
        `<b>永久加成</b>：售價 +${next * Math.round(CONFIG.PRESTIGE.sellBonus * 100)}%、` +
        `生長速度 +${next * Math.round(CONFIG.PRESTIGE.growthBonus * 100)}%、` +
        `初始金幣 +${next * CONFIG.PRESTIGE.startCoinsBonus}`,
      okText: '轉生！', danger: true,
    });
    if (ok) game.progression.prestigeNow();
  });
  root.querySelector('#set-save').addEventListener('click', () => {
    game.save.save();
    showToast('已手動存檔', 'success');
  });
  root.querySelector('#set-tutorial').addEventListener('click', () => {
    game.modal.finish(false);
    game.uiRefs?.tutorial.restart();
  });
  root.querySelector('#set-help').addEventListener('click', async () => {
    game.modal.finish(false);
    await game.modal.info({ title: '📖 遊戲說明', body: HELP_HTML });
  });
  root.querySelector('#set-guide').addEventListener('click', () => {
    window.open('guide.html', '_blank', 'noopener');
  });
  root.querySelector('#set-menu').addEventListener('click', () => {
    game.stop();
    location.reload(); // 回開始畫面（已先存檔）
  });
  root.querySelector('#set-wipe').addEventListener('click', async () => {
    game.modal.finish(false);
    const ok = await game.modal.confirm({
      title: '🗑️ 清除存檔',
      body: '確定要清除所有進度嗎？<br>農地、金幣、任務資料都會刪除，<b>無法復原</b>。',
      okText: '清除', danger: true,
    });
    if (!ok) return;
    game.running = false; // 停止 tick，避免清除後又自動存檔
    if (game._interval) clearInterval(game._interval);
    SaveSystem.clear();
    location.reload();
  });
}
