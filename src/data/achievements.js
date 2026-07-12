import { CONFIG } from '../config.js';

// 成就資料表：check(state) 回傳 true 即達成（自動偵測、發放一次）
export const ACHIEVEMENTS = [
  { id: 'firstHarvest', icon: '🌱', name: '第一次收成', desc: '收成 1 次', coins: 20, check: (s) => s.stats.harvested >= 1 },
  { id: 'harvest50', icon: '🧺', name: '收成達人', desc: '累計收成 50 次', coins: 100, check: (s) => s.stats.harvested >= 50 },
  { id: 'harvest200', icon: '🚜', name: '豐收大師', desc: '累計收成 200 次', coins: 300, check: (s) => s.stats.harvested >= 200 },
  { id: 'sold100', icon: '💰', name: '小小商人', desc: '累計出售 100 個作物', coins: 150, check: (s) => s.stats.sold >= 100 },
  { id: 'earn2000', icon: '🤑', name: '金幣獵人', desc: '累計賺取 2000 金幣', coins: 200, check: (s) => s.stats.coinsEarned >= 2000 },
  { id: 'orders10', icon: '📦', name: '信譽良好', desc: '完成 10 張訂單', coins: 150, check: (s) => s.stats.ordersCompleted >= 10 },
  { id: 'level5', icon: '⭐', name: '小有名氣', desc: '達到等級 5', coins: 120, check: (s) => s.level >= 5 },
  { id: 'level10', icon: '🌟', name: '農場之星', desc: '達到等級 10', coins: 400, check: (s) => s.level >= 10 },
  { id: 'allZones', icon: '🗺️', name: '大地主', desc: '解鎖全部農地', coins: 500, check: (s) => s.unlockedZones.length >= CONFIG.ZONES.length },
  { id: 'pest10', icon: '🐛', name: '除蟲專家', desc: '驅趕 10 隻害蟲', coins: 100, check: (s) => s.stats.pestsShooed >= 10 },
  { id: 'quality10', icon: '✨', name: '品質保證', desc: '收成 10 個優質作物', coins: 150, check: (s) => s.stats.qualityHarvested >= 10 },
  { id: 'capacity3', icon: '🏗️', name: '倉儲大亨', desc: '倉庫升級 3 次', coins: 200, check: (s) => s.warehouseUpgrades >= 3 },
  { id: 'process1', icon: '🧃', name: '初次加工', desc: '完成 1 次加工', coins: 50, check: (s) => (s.stats.processed || 0) >= 1 },
  { id: 'process25', icon: '🏭', name: '加工大師', desc: '累計加工 25 件產品', coins: 300, check: (s) => (s.stats.processed || 0) >= 25 },
  { id: 'level20', icon: '👑', name: '農場傳奇', desc: '達到等級 20', coins: 1000, check: (s) => s.level >= 20 },
  { id: 'prestige1', icon: '🌟', name: '重新出發', desc: '完成第一次轉生', coins: 300, check: (s) => (s.prestige || 0) >= 1 },
  { id: 'prestige3', icon: '💫', name: '輪迴大師', desc: '完成三次轉生', coins: 1000, check: (s) => (s.prestige || 0) >= 3 },
];
