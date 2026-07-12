// 加工配方資料表：inputs 消耗一般品庫存，產品價值約為原料 1.6~2 倍
export const RECIPES = [
  // 果汁機
  { id: 'carrot_juice', machine: 'juicer', name: '胡蘿蔔汁', icon: '🥤', inputs: { carrot: 3 }, timeMs: 180 * 1000, sellPrice: 110, xp: 8, unlockLevel: 8 },
  { id: 'tomato_juice', machine: 'juicer', name: '番茄汁', icon: '🧃', inputs: { tomato: 3 }, timeMs: 240 * 1000, sellPrice: 150, xp: 10, unlockLevel: 8 },
  { id: 'strawberry_shake', machine: 'juicer', name: '草莓奶昔', icon: '🍹', inputs: { strawberry: 4 }, timeMs: 360 * 1000, sellPrice: 220, xp: 14, unlockLevel: 9 },
  { id: 'melon_slush', machine: 'juicer', name: '西瓜冰沙', icon: '🍧', inputs: { watermelon: 1 }, timeMs: 600 * 1000, sellPrice: 1200, xp: 40, unlockLevel: 13 },
  // 烤爐
  { id: 'bread', machine: 'oven', name: '麵包', icon: '🍞', inputs: { wheat: 4 }, timeMs: 300 * 1000, sellPrice: 90, xp: 12, unlockLevel: 12 },
  { id: 'corn_bread', machine: 'oven', name: '玉米麵包', icon: '🥖', inputs: { wheat: 3, corn: 2 }, timeMs: 480 * 1000, sellPrice: 220, xp: 18, unlockLevel: 12 },
  { id: 'pumpkin_pie', machine: 'oven', name: '南瓜派', icon: '🥧', inputs: { pumpkin: 1, wheat: 2 }, timeMs: 600 * 1000, sellPrice: 420, xp: 25, unlockLevel: 12 },
  // 果醬鍋
  { id: 'strawberry_jam', machine: 'jampot', name: '草莓果醬', icon: '🫙', inputs: { strawberry: 6 }, timeMs: 600 * 1000, sellPrice: 340, xp: 25, unlockLevel: 15 },
  { id: 'blueberry_jam', machine: 'jampot', name: '藍莓果醬', icon: '🍇', inputs: { blueberry: 5 }, timeMs: 720 * 1000, sellPrice: 700, xp: 35, unlockLevel: 15 },
  { id: 'golden_honey', machine: 'jampot', name: '金蘋果蜜', icon: '🏺', inputs: { goldapple: 1, blueberry: 2 }, timeMs: 1200 * 1000, sellPrice: 3600, xp: 100, unlockLevel: 17 },
];

export const RECIPE_MAP = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
