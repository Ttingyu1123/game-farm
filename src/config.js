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
  SEASON: {
    durationMs: 10 * 60 * 1000, // 每季 10 分鐘，春→夏→秋→冬輪替
    boostMult: 1.3,             // 當季作物成長 +30%
    penaltyMult: 0.7,           // 逆季作物成長 -30%
    qualityBonus: 0.1,          // 當季作物優質機率 +10%
  },

  // 工坊：佇列與加工合約訂單
  WORKSHOP: {
    queueMax: 2,                              // 每台機器可預排批次數
    productOrderChance: 0.3,                  // 有機器時訂單為加工合約的機率
    productOrderCoinFactor: 1.5,              // 加工合約溢價（高於作物訂單的 1.35）
    productOrderLifetimeMs: 45 * 60 * 1000,   // 加工需要時間，期限較長
  },

  // 同型機器多台：產能擴充的金幣沉沒點
  MACHINE_EXTRA: {
    maxPerType: 3,
    priceGrowth: 0.8, // 第 n+1 台價格 = 基價 × (1 + 0.8n)
  },

  // 節慶限時活動
  FESTIVAL: {
    firstDelayMs: 5 * 60 * 1000,   // 開局 5 分鐘後第一場
    intervalMs: 30 * 60 * 1000,    // 場與場之間間隔
    durationMs: 8 * 60 * 1000,     // 每場 8 分鐘
  },

  // 轉生：Lv20 重置農場換永久加成（成就與統計保留）
  PRESTIGE: {
    unlockLevel: 20,
    sellBonus: 0.05,       // 每世永久售價 +5%
    growthBonus: 0.05,     // 每世永久生長速度 +5%
    startCoinsBonus: 200,  // 每世初始金幣 +200
  },
  BGM: {
    baseUrl: 'https://music.tingyudeco.com/game-farm/bgm/', // 四季各一首：<seasonId>.m4a
    ext: '.m4a',
    fadeMs: 1200,
  },
};
