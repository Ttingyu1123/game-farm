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
      <label class="settings-row">🎚️ 音量
        <input type="range" id="set-volume" min="0" max="1" step="0.05" value="${s.settings.volume}">
      </label>
      <div class="settings-actions">
        <button class="btn" id="set-save">💾 手動存檔</button>
        <button class="btn" id="set-tutorial">🎓 重看教學</button>
        <button class="btn" id="set-help">📖 遊戲說明</button>
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
  root.querySelector('#set-volume').addEventListener('input', (e) => {
    s.settings.volume = Number(e.target.value);
    game.changed();
    game.audio.play('click');
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
