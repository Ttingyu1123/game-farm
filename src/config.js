// 所有可調整數值集中在此
export const CONFIG = {
  SAVE_KEY: 'cozy-pocket-farm-save',
  SAVE_VERSION: 1,

  GRID_COLS: 6,
  GRID_ROWS: 8,
  INITIAL_UNLOCKED_ROWS: 4, // 6 欄 × 4 列 = 24 格初始解鎖

  TICK_MS: 250,             // 統一遊戲迴圈
  AUTOSAVE_MS: 20000,       // 定時自動存檔
  SAVE_DEBOUNCE_MS: 800,    // 操作後延遲存檔
  MAX_OFFLINE_MS: 12 * 3600 * 1000, // 離線成長計算上限

  INITIAL: {
    coins: 300,
    level: 1,
    xp: 0,
    seeds: { carrot: 8, wheat: 5 },
    warehouseCapacity: 100,
  },

  XP_PER_PLANT: 1,
  XP_PER_WATER: 1,

  ZONES: [
    { id: 'zoneA', name: '東側農地', rows: [4, 5], level: 2, price: 300 },
    { id: 'zoneB', name: '南側農地', rows: [6],    level: 4, price: 800 },
    { id: 'zoneC', name: '河畔農地', rows: [7],    level: 6, price: 1500 },
  ],

  WAREHOUSE_UPGRADE: { baseCost: 200, costStep: 150, capacityStep: 50, maxUpgrades: 8 },

  ORDER: {
    count: 3,
    lifetimeMs: 30 * 60 * 1000,
    coinFactor: 1.35, // 獎勵高於直接出售
    xpFactor: 0.8,
    xpBase: 5,
  },

  DAILY_TASK_COUNT: 3,
  WEATHER_INTERVAL_MS: 180 * 1000, // 天氣每 3 分鐘切換
  FERTILIZER_REDUCTION: 0.25,      // 肥料縮短剩餘時間 25%

  // --- v1.1 深度機制 ---
  WITHER: { graceFactor: 3 },      // 成熟後放置超過 3× 生長時間 → 枯萎（離線時間不計）
  PEST: { maxActive: 2, chancePerMin: 0.35, shooXp: 2 }, // 害蟲：暫停生長，點擊驅趕
  QUALITY: { baseChance: 0.1, fertilizerBonus: 0.15, priceMult: 2 }, // 優質作物
  MARKET: { intervalMs: 5 * 60 * 1000, min: 0.8, max: 1.4 },         // 售價行情波動
};
