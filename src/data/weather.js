// 天氣效果集中設定
export const WEATHERS = [
  { id: 'sunny',  name: '晴天', icon: '☀️', speed: 1,    autoWater: false, weight: 5, effect: '風和日麗' },
  { id: 'cloudy', name: '多雲', icon: '⛅', speed: 1.15, autoWater: false, weight: 3, effect: '生長速度 +15%' },
  { id: 'rain',   name: '雨天', icon: '🌧️', speed: 1,    autoWater: true,  weight: 2, effect: '自動幫作物澆水' },
];

export const WEATHER_MAP = Object.fromEntries(WEATHERS.map((w) => [w.id, w]));
