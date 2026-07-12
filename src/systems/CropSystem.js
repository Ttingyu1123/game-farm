import { CROP_MAP } from '../data/crops.js';

// 純函式：作物生長計算（與 UI、農地操作分離）
export function cropOf(plot) {
  return plot.cropId ? CROP_MAP[plot.cropId] || null : null;
}

export function progressOf(plot) {
  const c = cropOf(plot);
  if (!c) return 0;
  return Math.min(1, plot.growth / c.growthMs);
}

export function stageIndex(plot) {
  const c = cropOf(plot);
  if (!c) return 0;
  if (plot.mature) return c.stages - 1;
  return Math.min(c.stages - 2, Math.floor(progressOf(plot) * (c.stages - 1)));
}

export function remainingMs(plot, speedMult = 1) {
  const c = cropOf(plot);
  if (!c || plot.mature) return 0;
  return (c.growthMs - plot.growth) / Math.max(0.01, speedMult);
}
