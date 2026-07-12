// 節慶資料表：限時全域加成（效果數值集中於此）
export const FESTIVALS = [
  { id: 'harvest_fest', name: '豐收祭', icon: '🎉', desc: '收成經驗 ×2', effect: { harvestXp: 2 } },
  { id: 'market_boom', name: '市集日', icon: '🎪', desc: '所有售價 +25%', effect: { sellBonus: 0.25 } },
  { id: 'rain_blessing', name: '甘霖祭', icon: '💦', desc: '生長速度 +50%', effect: { growth: 1.5 } },
  { id: 'order_rush', name: '訂單熱潮', icon: '📦', desc: '訂單金幣獎勵 ×1.5', effect: { orderCoins: 1.5 } },
];

export const FESTIVAL_MAP = Object.fromEntries(FESTIVALS.map((f) => [f.id, f]));
