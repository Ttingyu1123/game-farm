import { CONFIG } from '../config.js';
import { EventBus } from './EventBus.js';
import { createInitialState } from './GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { offlineMsSince } from '../systems/TimeSystem.js';
import { FarmSystem } from '../systems/FarmSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { OrderSystem } from '../systems/OrderSystem.js';
import { TaskSystem } from '../systems/TaskSystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { clamp } from '../utils/helpers.js';

export class Game {
  constructor() {
    this.events = new EventBus();
    this.state = null;
    this.selectedTool = null;
    this.running = false;
    this.modal = null;   // main.js 掛入
    this.uiRefs = null;  // main.js 掛入
    this._interval = null;
    this.lastTick = 0;
    this.lastAutosave = 0;
  }

  toast(msg, type = 'info') {
    this.events.emit('toast', { msg, type });
  }

  newGame(soundPref = true) {
    const state = createInitialState();
    state.settings.sound = soundPref;
    this.boot(state, 0);
  }

  continueGame(soundPref = null) {
    const state = SaveSystem.load();
    if (!state) return false;
    if (soundPref !== null) state.settings.sound = soundPref;
    const offlineMs = offlineMsSince(state.lastSavedAt);
    this.boot(state, offlineMs);
    return true;
  }

  boot(state, offlineMs) {
    if (this._interval) clearInterval(this._interval); // 防重複建立計時器
    this.state = state;
    this.selectedTool = null;

    this.save = new SaveSystem(this);
    this.audio = new AudioSystem(this);
    this.economy = new EconomySystem(this);
    this.inventory = new InventorySystem(this);
    this.progression = new ProgressionSystem(this);
    this.weather = new WeatherSystem(this);
    this.farm = new FarmSystem(this);
    this.shop = new ShopSystem(this);
    this.orders = new OrderSystem(this);
    this.tasks = new TaskSystem(this);

    const now = Date.now();
    // 離線成長：以中性倍率 1.0 補算（離線期間天氣未知）
    if (offlineMs > 0) this.farm.advanceGrowth(offlineMs, 1);
    this.weather.ensure(now);
    this.orders.ensure();
    this.tasks.ensureDaily();

    this.lastTick = now;
    this.lastAutosave = now;
    this.running = true;
    this._interval = setInterval(() => this.tick(), CONFIG.TICK_MS);
    this.events.emit('booted', { offlineMs });
    this.save.save();
  }

  tick() {
    if (!this.running) return;
    const now = Date.now();
    // dt 以時間戳計算：分頁休眠、系統睡眠後也能正確補進度
    const dt = clamp(now - this.lastTick, 0, CONFIG.MAX_OFFLINE_MS);
    this.lastTick = now;

    this.weather.tick(now);
    this.farm.advanceGrowth(dt, this.weather.speedMult());
    this.farm.sprinklerTick();
    this.orders.tick(now);
    this.tasks.ensureDaily();

    if (now - this.lastAutosave >= CONFIG.AUTOSAVE_MS) {
      this.lastAutosave = now;
      this.save.save();
    }
    this.events.emit('tick', now);
  }

  selectTool(tool) {
    this.selectedTool = (!tool || this.selectedTool === tool) ? null : tool;
    this.audio.play('click');
    this.events.emit('tool:selected', this.selectedTool);
  }

  // 狀態變更統一出口：通知 UI + 排程存檔
  changed() {
    this.events.emit('state:changed');
    this.save.saveSoon();
  }

  stop() {
    this.running = false;
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    if (this.state) this.save.save();
  }
}
