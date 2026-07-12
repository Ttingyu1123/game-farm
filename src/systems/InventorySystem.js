export class InventorySystem {
  constructor(game) {
    this.game = game;
  }

  // --- 種子背包 ---
  seedCount(id) { return this.game.state.seeds[id] || 0; }

  addSeeds(id, n) {
    if (n <= 0) return;
    const s = this.game.state.seeds;
    s[id] = (s[id] || 0) + n;
  }

  useSeed(id) {
    const s = this.game.state.seeds;
    if ((s[id] || 0) < 1) return false;
    s[id] -= 1;
    return true;
  }

  // --- 道具 ---
  itemCount(id) { return this.game.state.items[id] || 0; }

  addItem(id, n) {
    if (n <= 0) return;
    const it = this.game.state.items;
    it[id] = (it[id] || 0) + n;
  }

  useItem(id) {
    const it = this.game.state.items;
    if ((it[id] || 0) < 1) return false;
    it[id] -= 1;
    return true;
  }

  // --- 農產品倉庫 ---
  warehouseTotal() {
    return Object.values(this.game.state.warehouse).reduce((a, b) => a + (b || 0), 0);
  }

  warehouseSpace() {
    return this.game.state.warehouseCapacity - this.warehouseTotal();
  }

  // 容量不足回傳 false（收成前檢查）
  addCrops(id, n) {
    if (n <= 0) return true;
    if (this.warehouseSpace() < n) return false;
    const w = this.game.state.warehouse;
    w[id] = (w[id] || 0) + n;
    return true;
  }

  cropCount(id) { return this.game.state.warehouse[id] || 0; }

  // 庫存不足回傳 false，絕不讓庫存變負數
  removeCrops(id, n) {
    const w = this.game.state.warehouse;
    if (n <= 0 || (w[id] || 0) < n) return false;
    w[id] -= n;
    return true;
  }
}
