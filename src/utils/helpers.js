export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function fmtTime(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export function fmtClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('zh-TW', { hour12: false });
  } catch {
    return '--:--:--';
  }
}

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedPick(list) {
  const total = list.reduce((a, x) => a + (x.weight || 1), 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= (x.weight || 1);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
