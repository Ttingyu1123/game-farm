import { CONFIG } from '../config.js';
import { CROP_MAP } from '../data/crops.js';
import { zoneOfPlot } from '../core/GameState.js';
import { progressOf, stageIndex, remainingMs } from '../systems/CropSystem.js';
import { fmtTime } from '../utils/helpers.js';

export class FarmGrid {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('farm-grid');
    this.cells = [];
    this.sigs = [];
    this.rangeSet = new Set();
    this._built = false;

    game.events.on('tick', () => this.renderAll());
    game.events.on('state:changed', () => this.renderAll());
    game.events.on('tool:selected', () => this.renderAll());
  }

  init() {
    if (this._built) return;
    this._built = true;
    const total = CONFIG.GRID_COLS * CONFIG.GRID_ROWS;
    this.el.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const btn = document.createElement('button');
      btn.className = 'plot';
      btn.dataset.i = i;
      btn.setAttribute('aria-label', `農地 ${i + 1}`);
      this.el.appendChild(btn);
      this.cells.push(btn);
      this.sigs.push('');
    }
    this.el.addEventListener('click', (e) => {
      const cell = e.target.closest('.plot');
      if (!cell) return;
      this.game.farm.handleClick(Number(cell.dataset.i));
    });
    // 灑水器作用範圍預覽
    this.el.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.plot');
      if (!cell) return;
      this.clearRange();
      const i = Number(cell.dataset.i);
      const p = this.game.state.plots[i];
      const placing = this.game.selectedTool === 'sprinkler' && p.unlocked && !p.cropId && !p.hasSprinkler;
      if (placing || p.hasSprinkler) {
        for (const n of this.game.farm.neighbors(i)) {
          this.rangeSet.add(n);
          this.cells[n].classList.add('range');
        }
      }
    });
    this.el.addEventListener('mouseleave', () => this.clearRange());
    this.renderAll();
  }

  clearRange() {
    for (const i of this.rangeSet) this.cells[i].classList.remove('range');
    this.rangeSet.clear();
  }

  renderAll() {
    if (!this._built || !this.game.state) return;
    for (let i = 0; i < this.cells.length; i++) this.updateCell(i);
  }

  updateCell(i) {
    const p = this.game.state.plots[i];
    const v = this.view(p);
    const sig = `${v.cls}|${v.html}|${v.title}`;
    if (this.sigs[i] === sig) return;
    this.sigs[i] = sig;
    const el = this.cells[i];
    el.className = v.cls + (this.rangeSet.has(i) ? ' range' : '');
    el.innerHTML = v.html;
    el.title = v.title;
  }

  view(p) {
    if (!p.unlocked) {
      const z = zoneOfPlot(p.id);
      return {
        cls: 'plot locked',
        html: `<span class="plot-icon">🔒</span><span class="plot-sub">Lv${z?.level ?? '?'}·💰${z?.price ?? '?'}</span>`,
        title: z ? `${z.name}：達到 Lv ${z.level} 後可用 💰${z.price} 解鎖（點擊查看）` : '鎖定',
      };
    }
    if (p.hasSprinkler) {
      return {
        cls: 'plot sprinkler',
        html: `<span class="plot-icon">⛲</span><span class="plot-sub">自動澆水</span>`,
        title: '基礎灑水器：自動為周圍 8 格澆水（清理工具可收回）',
      };
    }
    if (!p.cropId) {
      return p.tilled
        ? { cls: 'plot tilled', html: `<span class="plot-sub">已翻土</span>`, title: '已翻土：選擇種子即可播種' }
        : { cls: 'plot raw', html: `<span class="plot-sub">未整理</span>`, title: '未整理土地：使用翻土工具開墾' };
    }
    const c = CROP_MAP[p.cropId];
    const stage = stageIndex(p);
    const pct = Math.round(progressOf(p) * 100);
    const mult = this.game.weather.speedMult();
    let cls = 'plot planted';
    let statusHtml = '';
    let statusTitle = '';
    if (p.mature) {
      cls += ' mature';
      statusHtml = `<span class="plot-sub ok">可收成！</span>`;
      statusTitle = '✨ 可收成';
    } else if (!p.watered) {
      cls += ' dry';
      statusHtml = `<span class="plot-sub need">💧 需澆水</span>`;
      statusTitle = '💧 需要澆水才會生長';
    } else {
      cls += ' watered growing';
      const remain = fmtTime(remainingMs(p, mult));
      statusHtml = `<span class="plot-sub">${remain}</span>`;
      statusTitle = `剩餘 ${remain}`;
    }
    const bar = p.mature ? '' : `<div class="plot-bar"><div style="width:${pct}%"></div></div>`;
    return {
      cls,
      html: `<span class="plot-icon stage-${stage}">${c.stageIcons[stage] ?? c.icon}</span>${statusHtml}${bar}`,
      title: `${c.icon} ${c.name}｜階段 ${stage + 1}/${c.stages}｜${statusTitle}`,
    };
  }
}
