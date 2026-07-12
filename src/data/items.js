// 道具／設備資料表（資料驅動，後續可加高級灑水器、溫室等）
export const ITEMS = [
  {
    id: 'fertilizer', name: '快速肥料', icon: '✨', type: 'consumable',
    price: 30, unlockLevel: 3,
    desc: '對生長中的作物使用，立即縮短剩餘生長時間 25%',
    buyQty: [1, 5, 10],
  },
  {
    id: 'sprinkler', name: '基礎灑水器', icon: '⛲', type: 'equipment',
    price: 250, unlockLevel: 4,
    desc: '放置在空地上，自動為周圍 8 格農地澆水',
    buyQty: [1],
  },
];

export const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
