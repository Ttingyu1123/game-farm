// 作物資料表 — 新增作物只需在此加一筆，不需改核心程式
export const CROPS = [
  {
    id: 'carrot', name: '胡蘿蔔', icon: '🥕',
    seedPrice: 10, sellPrice: 22, growthMs: 30 * 1000,
    stages: 4, harvestAmount: 1, xp: 3, unlockLevel: 1, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🥕'],
  },
  {
    id: 'wheat', name: '小麥', icon: '🌾',
    seedPrice: 14, sellPrice: 12, growthMs: 45 * 1000,
    stages: 4, harvestAmount: 2, xp: 4, unlockLevel: 1, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🌾'],
  },
  {
    id: 'tomato', name: '番茄', icon: '🍅',
    seedPrice: 25, sellPrice: 30, growthMs: 75 * 1000,
    stages: 5, harvestAmount: 2, xp: 7, unlockLevel: 2, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🪴', '🍅'],
  },
  {
    id: 'strawberry', name: '草莓', icon: '🍓',
    seedPrice: 40, sellPrice: 32, growthMs: 120 * 1000,
    stages: 5, harvestAmount: 3, xp: 10, unlockLevel: 3, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🌸', '🍓'],
  },
  {
    id: 'corn', name: '玉米', icon: '🌽',
    seedPrice: 60, sellPrice: 45, growthMs: 180 * 1000,
    stages: 5, harvestAmount: 3, xp: 15, unlockLevel: 4, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🎋', '🌽'],
  },
  {
    id: 'pumpkin', name: '南瓜', icon: '🎃',
    seedPrice: 100, sellPrice: 230, growthMs: 300 * 1000,
    stages: 6, harvestAmount: 1, xp: 25, unlockLevel: 5, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🍃', '🟠', '🎃'],
  },
  {
    id: 'eggplant', name: '茄子', icon: '🍆',
    seedPrice: 150, sellPrice: 130, growthMs: 420 * 1000,
    stages: 5, harvestAmount: 2, xp: 35, unlockLevel: 7, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🪴', '🍆'],
  },
  {
    id: 'blueberry', name: '藍莓', icon: '🫐',
    seedPrice: 220, sellPrice: 85, growthMs: 600 * 1000,
    stages: 5, harvestAmount: 4, xp: 50, unlockLevel: 9, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🌼', '🫐'],
  },
  {
    id: 'watermelon', name: '西瓜', icon: '🍉',
    seedPrice: 350, sellPrice: 780, growthMs: 900 * 1000,
    stages: 6, harvestAmount: 1, xp: 80, unlockLevel: 13, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🍃', '🟢', '🍉'],
  },
  {
    id: 'goldapple', name: '金蘋果', icon: '🍎',
    seedPrice: 800, sellPrice: 2000, growthMs: 1500 * 1000,
    stages: 6, harvestAmount: 1, xp: 180, unlockLevel: 17, waterRequired: 1,
    stageIcons: ['🌰', '🌱', '🌿', '🌸', '🍏', '🍎'],
  },
];

export const CROP_MAP = Object.fromEntries(CROPS.map((c) => [c.id, c]));
