import { pick } from '../utils/helpers.js';

function base(type, name, target, coins, xp) {
  return { type, name, target, coins, xp, progress: 0, claimed: false };
}

// 每日任務池：make(level, unlockedCrops) 回傳可序列化的任務物件
export const TASK_POOL = [
  { key: 'plant', make: (lv) => { const t = 6 + lv * 2; return base('plant', `種植作物 ${t} 次`, t, 30 + lv * 8, 8 + lv * 2); } },
  { key: 'water', make: (lv) => { const t = 8 + lv * 2; return base('water', `澆水 ${t} 次`, t, 25 + lv * 6, 6 + lv * 2); } },
  { key: 'harvest', make: (lv) => { const t = 5 + lv; return base('harvest', `收成 ${t} 次`, t, 35 + lv * 8, 8 + lv * 2); } },
  { key: 'sell', make: (lv) => { const t = 8 + lv * 3; return base('sell', `出售 ${t} 個作物`, t, 30 + lv * 8, 7 + lv * 2); } },
  { key: 'order', make: (lv) => base('order', '完成 2 張訂單', 2, 60 + lv * 10, 12 + lv * 2) },
  { key: 'earn', make: (lv) => { const t = 120 + lv * 60; return base('earn', `賺取 ${t} 金幣`, t, 40 + lv * 10, 10 + lv * 2); } },
  {
    key: 'plantCrop',
    make: (lv, crops) => {
      const c = pick(crops);
      const t = 4 + Math.floor(lv / 2);
      return { ...base('plantCrop', `種植 ${c.icon} ${c.name} ${t} 次`, t, 35 + lv * 8, 8 + lv * 2), cropId: c.id };
    },
  },
];
