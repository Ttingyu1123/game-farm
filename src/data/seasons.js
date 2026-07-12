// 季節資料表：boost = 當季作物（成長加速+優質加成），penalty = 逆季作物（成長減速）
export const SEASONS = [
  { id: 'spring', name: '春天', icon: '🌸', boost: ['carrot', 'strawberry', 'blueberry'], penalty: ['pumpkin'], desc: '胡蘿蔔、草莓、藍莓當季' },
  { id: 'summer', name: '夏天', icon: '☀️', boost: ['tomato', 'corn', 'watermelon', 'eggplant'], penalty: ['strawberry'], desc: '番茄、玉米、西瓜、茄子當季' },
  { id: 'autumn', name: '秋天', icon: '🍂', boost: ['pumpkin', 'wheat', 'goldapple'], penalty: ['carrot', 'watermelon'], desc: '南瓜、小麥、金蘋果當季' },
  { id: 'winter', name: '冬天', icon: '❄️', boost: ['wheat'], penalty: ['tomato', 'strawberry', 'eggplant', 'watermelon'], desc: '寒冬只有小麥耐寒' },
];

export const SEASON_MAP = Object.fromEntries(SEASONS.map((s) => [s.id, s]));
