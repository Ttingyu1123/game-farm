import { CONFIG } from '../config.js';
import { clamp } from '../utils/helpers.js';

export const now = () => Date.now();

// 離線經過時間：防負值、防異常巨大時間差
export function offlineMsSince(lastSavedAt) {
  return clamp(Date.now() - (lastSavedAt || Date.now()), 0, CONFIG.MAX_OFFLINE_MS);
}
