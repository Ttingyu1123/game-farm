import { CONFIG } from '../config.js';
import { CROPS } from '../data/crops.js';

export function emptyCropMap() {
  return Object.fromEntries(CROPS.map((c) => [c.id, 0]));
}

export function createPlot(id) {
  return {
    id,
    unlocked: false,
    tilled: false,
    cropId: null,
    plantedAt: null,
    wateredAt: null,
    watered: false,
    growth: 0,        // 已累積的生長毫秒數
    mature: false,
    maturedAt: null,  // 成熟時間戳（枯萎倒數起點）
    withered: false,
    hasSprinkler: false,
    pest: false,      // 害蟲：暫停生長，點擊驅趕
    fertilized: false, // 本輪施過肥 → 提高優質機率
  };
}

export function marketFactorMap() {
  return Object.fromEntries(CROPS.map((c) => [c.id, 1]));
}

export function zoneOfPlot(id) {
  const row = Math.floor(id / CONFIG.GRID_COLS);
  return CONFIG.ZONES.find((z) => z.rows.includes(row)) || null;
}

export function createInitialState(now = Date.now()) {
  const plots = [];
  const total = CONFIG.GRID_COLS * CONFIG.GRID_ROWS;
  for (let i = 0; i < total; i++) {
    const p = createPlot(i);
    p.unlocked = Math.floor(i / CONFIG.GRID_COLS) < CONFIG.INITIAL_UNLOCKED_ROWS;
    plots.push(p);
  }
  return {
    saveVersion: CONFIG.SAVE_VERSION,
    createdAt: now,
    lastSavedAt: now,
    coins: CONFIG.INITIAL.coins,
    level: CONFIG.INITIAL.level,
    xp: CONFIG.INITIAL.xp,
    prestige: 0, // 轉生次數（永久加成）
    seeds: { ...emptyCropMap(), ...CONFIG.INITIAL.seeds },
    items: { fertilizer: 0, sprinkler: 0 },
    warehouse: emptyCropMap(),
    warehouseQ: emptyCropMap(), // ⭐ 優質作物庫存
    warehouseCapacity: CONFIG.INITIAL.warehouseCapacity,
    warehouseUpgrades: 0,
    market: { factors: marketFactorMap(), changedAt: now }, // 初始行情 1.0，之後每 5 分鐘波動
    achievements: [],
    plots,
    unlockedZones: [],
    orders: [],
    orderSeq: 1,
    dailyTasks: [],
    dailyTaskDate: '',
    weather: { current: 'sunny', changedAt: now },
    season: { current: 'spring', changedAt: now },
    tutorial: { completed: false },
    settings: { sound: true, volume: 0.6 },
    stats: {
      planted: 0, watered: 0, harvested: 0, sold: 0,
      ordersCompleted: 0, tasksClaimed: 0, coinsEarned: 0, coinsSpent: 0,
      pestsShooed: 0, qualityHarvested: 0, withered: 0,
    },
  };
}
