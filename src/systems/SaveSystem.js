import { CONFIG } from '../config.js';
import { createInitialState, createPlot, emptyCropMap, initialMachines } from '../core/GameState.js';

export class SaveSystem {
  constructor(game) {
    this.game = game;
    this._timer = null;
  }

  save() {
    const s = this.game.state;
    if (!s) return;
    try {
      s.lastSavedAt = Date.now();
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(s));
      this.game.events.emit('saved', s.lastSavedAt);
    } catch (e) {
      console.error('[SaveSystem] 存檔失敗', e);
      this.game.toast('存檔失敗（儲存空間可能已滿）', 'warn');
    }
  }

  saveSoon() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.save(), CONFIG.SAVE_DEBOUNCE_MS);
  }

  static hasSave() {
    try { return !!localStorage.getItem(CONFIG.SAVE_KEY); } catch { return false; }
  }

  // 讀原始存檔（開始畫面顯示提示用），不做遷移
  static peek() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  static load() {
    let raw;
    try {
      const text = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!text) return null;
      raw = JSON.parse(text);
    } catch (e) {
      console.error('[SaveSystem] 存檔損壞，無法解析', e);
      return null;
    }
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.plots)) {
      console.error('[SaveSystem] 存檔結構異常');
      return null;
    }
    try {
      return migrate(raw);
    } catch (e) {
      console.error('[SaveSystem] 存檔遷移失敗', e);
      return null;
    }
  }

  static clear() {
    try { localStorage.removeItem(CONFIG.SAVE_KEY); } catch { /* ignore */ }
  }
}

// 舊存檔缺少新欄位時以預設值補齊，不使整份存檔失效
function migrate(raw) {
  const base = createInitialState(raw.createdAt || Date.now());
  const s = { ...base, ...raw };
  s.saveVersion = CONFIG.SAVE_VERSION;
  s.settings = { ...base.settings, ...(raw.settings || {}) };
  s.stats = { ...base.stats, ...(raw.stats || {}) };
  s.tutorial = { ...base.tutorial, ...(raw.tutorial || {}) };
  s.weather = { ...base.weather, ...(raw.weather || {}) };
  s.season = { ...base.season, ...(raw.season || {}) };
  s.seeds = { ...emptyCropMap(), ...(raw.seeds || {}) };
  s.warehouse = { ...emptyCropMap(), ...(raw.warehouse || {}) };
  s.warehouseQ = { ...emptyCropMap(), ...(raw.warehouseQ || {}) };
  s.items = { ...base.items, ...(raw.items || {}) };
  s.market = {
    factors: { ...base.market.factors, ...(raw.market?.factors || {}) },
    changedAt: raw.market?.changedAt ?? base.market.changedAt,
  };
  s.achievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  s.machines = { ...initialMachines(), ...(raw.machines || {}) };
  s.products = { ...(raw.products || {}) };
  s.unlockedZones = Array.isArray(raw.unlockedZones) ? raw.unlockedZones : [];
  s.orders = Array.isArray(raw.orders) ? raw.orders : [];
  s.dailyTasks = Array.isArray(raw.dailyTasks) ? raw.dailyTasks : [];
  s.plots = base.plots.map((bp, i) => {
    const rp = raw.plots[i];
    return rp && typeof rp === 'object' ? { ...createPlot(i), ...rp, id: i } : bp;
  });
  return s;
}
