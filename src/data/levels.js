export const MAX_LEVEL = 12;

// 升到下一級所需經驗（索引 = 目前等級）
export const XP_TABLE = {
  1: 20, 2: 40, 3: 70, 4: 110, 5: 160, 6: 220,
  7: 300, 8: 400, 9: 520, 10: 660, 11: 820,
};

// 升級金幣獎勵（到達該等級時發放一次）
export const LEVEL_REWARDS = {
  2: { coins: 60 }, 3: { coins: 90 }, 4: { coins: 130 }, 5: { coins: 180 },
  6: { coins: 240 }, 7: { coins: 320 }, 8: { coins: 420 }, 9: { coins: 540 },
  10: { coins: 700 }, 11: { coins: 880 }, 12: { coins: 1100 },
};

export function xpNeeded(level) {
  return XP_TABLE[level] ?? Infinity;
}
