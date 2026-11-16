// 加工機器資料表（資料驅動，後續可加新機器）
export const MACHINES = [
  { id: 'juicer', name: '果汁機', icon: '🌀', price: 500, unlockLevel: 8, desc: '把蔬果打成好喝的果汁' },
  { id: 'oven', name: '烤爐', icon: '🔥', price: 1500, unlockLevel: 12, desc: '烘焙麵包與派' },
  { id: 'jampot', name: '果醬鍋', icon: '🍯', price: 3000, unlockLevel: 15, desc: '熬煮高價果醬與蜜餞' },
];

export const MACHINE_MAP = Object.fromEntries(MACHINES.map((m) => [m.id, m]));
