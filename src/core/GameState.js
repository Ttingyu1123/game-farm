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
    withered: false,  // 第一版不觸發，保留結構供擴充
    hasSprinkler: false,
  };
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
    seeds: { ...emptyCropMap(), ...CONFIG.INITIAL.seeds },
    items: { fertilizer: 0, sprinkler: 0 },
    warehouse: emptyCropMap(),
    warehouseCapacity: CONFIG.INITIAL.warehouseCapacity,
    warehouseUpgrades: 0,
    plots,
    unlockedZones: [],
    orders: [],
    orderSeq: 1,
    dailyTasks: [],
    dailyTaskDate: '',
    weather: { current: 'sunny', changedAt: now },
    tutorial: { completed: false },
    settings: { sound: true, volume: 0.6 },
    stats: {
      planted: 0, watered: 0, harvested: 0, sold: 0,
      ordersCompleted: 0, tasksClaimed: 0, coinsEarned: 0, coinsSpent: 0,
    },
  };
}
