import { MACHINES } from '../data/machines.js';
import { RECIPES, RECIPE_MAP } from '../data/recipes.js';
import { CROP_MAP } from '../data/crops.js';
import { fmtTime } from '../utils/helpers.js';

export class WorkshopPanel {
  constructor(game) {
    this.game = game;
  }

  inputsHtml(r) {
    const g = this.game;
    return Object.entries(r.inputs).map(([cid, n]) => {
      const c = CROP_MAP[cid];
      const have = g.inventory.cropCount(cid);
      const ok = have >= n;
      return `<span class="${ok ? '' : 'input-missing'}">${c.icon}×${n}<small>(${have})</small></span>`;
    }).join(' ');
  }

  machineHtml(mdef) {
    const g = this.game, s = g.state;
    const m = s.machines[mdef.id];
    // 未擁有 → 購買列
    if (!m.owned) {
      const locked = s.level < mdef.unlockLevel;
      return `<div class="shop-row ${locked ? 'locked' : ''}">
        <span class="shop-icon">${mdef.icon}</span>
        <div class="shop-info"><b>${mdef.name}</b><span class="muted small">${mdef.desc}</span></div>
        ${locked
          ? `<span class="lock-tag">Lv ${mdef.unlockLevel} 解鎖</span>`
          : `<button class="btn btn-small btn-primary" data-action="buy-machine" data-id="${mdef.id}" ${s.coins < mdef.price ? 'disabled' : ''}>安裝（💰${mdef.price}）</button>`}
      </div>`;
    }
    // 加工中 / 完成
    if (m.recipeId) {
      const r = RECIPE_MAP[m.recipeId];
      const ready = g.workshop.isReady(mdef.id);
      const remain = g.workshop.remainingMs(mdef.id);
      const pct = Math.round(((r.timeMs - remain) / r.timeMs) * 100);
      return `<div class="machine-card ${ready ? 'ready' : ''}">
        <div class="machine-head"><span class="shop-icon">${mdef.icon}</span><b>${mdef.name}</b>
          <span class="muted small">製作中：${r.icon} ${r.name}</span></div>
        <div class="task-bar"><div style="width:${pct}%"></div></div>
        <div class="machine-actions">
          <span class="muted small" data-ws-remain="${mdef.id}">${ready ? '✅ 完成！' : `⏳ ${fmtTime(remain)}`}</span>
          <button class="btn btn-small ${ready ? 'btn-primary' : ''}" data-action="collect" data-id="${mdef.id}" ${ready ? '' : 'disabled'}>收取</button>
        </div>
      </div>`;
    }
    // 閒置 → 配方清單
    const recipes = RECIPES.filter((r) => r.machine === mdef.id && s.level >= r.unlockLevel);
    let h = `<div class="machine-card">
      <div class="machine-head"><span class="shop-icon">${mdef.icon}</span><b>${mdef.name}</b><span class="muted small">閒置中，選擇配方：</span></div>`;
    for (const r of recipes) {
      const canStart = Object.entries(r.inputs).every(([cid, n]) => g.inventory.cropCount(cid) >= n);
      h += `<div class="recipe-row">
        <span class="recipe-icon">${r.icon}</span>
        <div class="shop-info">
          <b>${r.name} <span class="muted small">賣 💰${g.workshop.productPrice(r.id)}</span></b>
          <span class="muted small">原料 ${this.inputsHtml(r)} · 需時 ${fmtTime(r.timeMs)} · +${r.xp} 經驗</span>
        </div>
        <button class="btn btn-small" data-action="start" data-machine="${mdef.id}" data-recipe="${r.id}" ${canStart ? '' : 'disabled'}>開始</button>
      </div>`;
    }
    const lockedRecipes = RECIPES.filter((r) => r.machine === mdef.id && s.level < r.unlockLevel);
    for (const r of lockedRecipes) {
      h += `<div class="recipe-row locked"><span class="recipe-icon">${r.icon}</span>
        <div class="shop-info"><b>${r.name}</b></div><span class="lock-tag">Lv ${r.unlockLevel}</span></div>`;
    }
    return h + `</div>`;
  }

  html() {
    const g = this.game, s = g.state;
    let h = `<h4 class="panel-title">🏭 加工工坊</h4>
      <p class="muted small">把作物加工成高價產品！製作需要時間，離線也照常完成。加工品與作物共用倉庫容量。</p>`;
    for (const mdef of MACHINES) h += this.machineHtml(mdef);

    h += `<h4 class="panel-title">🧺 加工品</h4>`;
    const rows = RECIPES.filter((r) => (s.products[r.id] || 0) > 0);
    if (!rows.length) {
      h += `<div class="empty-state">還沒有加工品，開一鍋吧！</div>`;
    }
    for (const r of rows) {
      const n = s.products[r.id];
      const price = g.workshop.productPrice(r.id);
      h += `<div class="shop-row quality-row">
        <span class="shop-icon">${r.icon}</span>
        <div class="shop-info"><b>${r.name} ×${n}</b><span class="muted">💰${price}／個 · 總值 💰${price * n}</span></div>
        <div class="qty-btns">
          <button class="btn btn-small" data-action="sell-product" data-id="${r.id}" data-qty="1">賣1 (+${price})</button>
          <button class="btn btn-small" data-action="sell-product" data-id="${r.id}" data-qty="all">全賣 (+${price * n})</button>
        </div>
      </div>`;
    }
    return h;
  }

  live(root) {
    for (const el of root.querySelectorAll('[data-ws-remain]')) {
      const id = el.dataset.wsRemain;
      const ready = this.game.workshop.isReady(id);
      el.textContent = ready ? '✅ 完成！' : `⏳ ${fmtTime(this.game.workshop.remainingMs(id))}`;
    }
  }

  onAction(d) {
    const g = this.game;
    if (d.action === 'buy-machine') return g.workshop.buyMachine(d.id);
    if (d.action === 'start') return g.workshop.startRecipe(d.machine, d.recipe);
    if (d.action === 'collect') return g.workshop.collect(d.id);
    if (d.action === 'sell-product') {
      const qty = d.qty === 'all' ? (g.state.products[d.id] || 0) : Number(d.qty);
      g.workshop.sellProduct(d.id, qty);
    }
  }
}
