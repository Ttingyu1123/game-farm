export class EventBus {
  constructor() {
    this.map = new Map();
  }
  on(ev, fn) {
    if (!this.map.has(ev)) this.map.set(ev, []);
    this.map.get(ev).push(fn);
    return () => this.off(ev, fn);
  }
  off(ev, fn) {
    const arr = this.map.get(ev);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  emit(ev, payload) {
    const arr = this.map.get(ev);
    if (!arr) return;
    for (const fn of arr.slice()) {
      try { fn(payload); } catch (e) { console.error(`[EventBus] ${ev} handler error`, e); }
    }
  }
}
