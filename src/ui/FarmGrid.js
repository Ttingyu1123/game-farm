import { CONFIG } from '../config.js';
import { CROP_MAP } from '../data/crops.js';
import { zoneOfPlot } from '../core/GameState.js';
import { progressOf, stageIndex, remainingMs } from '../systems/CropSystem.js';
import { fmtTime } from '../utils/helpers.js';
import { ico, icoSrc, stageSprite } from './icons.js';

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
      // 明確定位，讓鎖定區告示牌能疊在同一批格子上而不擠開它們
      btn.style.gridArea = `${Math.floor(i / CONFIG.GRID_COLS) + 1} / ${(i % CONFIG.GRID_COLS) + 1}`;
      this.el.appendChild(btn);
      this.cells.push(btn);
      this.sigs.push('');
    }
    this.signs = CONFIG.ZONES.map((z) => {
      const sign = document.createElement('div');
      sign.className = 'zone-sign';
      sign.style.gridRow = `${Math.min(...z.rows) + 1} / ${Math.max(...z.rows) + 2}`;
      sign.innerHTML = `${ico('locked')}<span><b>${z.name}</b><small>Lv ${z.level} · ${ico('coin')} ${z.price}</small></span>`;
      this.el.appendChild(sign);
      return { zone: z, el: sign };
    });
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
    const unlocked = this.game.state.unlockedZones;
    for (const { zone, el } of this.signs) el.classList.toggle('hidden', unlocked.includes(zone.id));
  }

  updateCell(i) {
    const p = this.game.state.plots[i];
    const v = this.view(p);
    const el = this.cells[i];
    const sig = `${v.cls}|${v.html}`;
    if (this.sigs[i] !== sig) {
      this.sigs[i] = sig;
      el.className = v.cls + (this.rangeSet.has(i) ? ' range' : '');
      el.innerHTML = v.html;
    }
    // 倒數與進度條每秒都變，獨立更新，避免整格重建讓圖片閃爍
    if (el.title !== v.title) el.title = v.title;
    if (v.remain !== undefined) {
      const sub = el.querySelector('.plot-sub');
      if (sub && sub.textContent !== v.remain) sub.textContent = v.remain;
      const bar = el.querySelector('.plot-bar > div');
      if (bar) bar.style.width = `${v.pct}%`;
    }
  }

  view(p) {
    if (!p.unlocked) {
      const z = zoneOfPlot(p.id);
      return {
        cls: 'plot locked',
        html: '',
        title: z ? `${z.name}：達到 Lv ${z.level} 後可用 💰${z.price} 解鎖（點擊查看）` : '鎖定',
      };
    }
    const sprite = (name, grow = 1) =>
      `<img class="sprite" style="--g:${grow}" src="${icoSrc(name)}" alt="" draggable="false">`;
    if (p.hasSprinkler) {
      return {
        cls: 'plot sprinkler',
        html: sprite('sprinkler'),
        title: '基礎灑水器：自動為周圍 8 格澆水（清理工具可收回）',
      };
    }
    if (!p.cropId) {
      return p.tilled
        ? { cls: 'plot tilled', html: '', title: '已翻土：選擇種子即可播種' }
        : { cls: 'plot raw', html: '', title: '未整理土地：使用翻土工具開墾' };
    }
    const c = CROP_MAP[p.cropId];
    if (p.withered) {
      return {
        cls: 'plot withered',
        html: sprite('withered'),
        title: `${c.name}枯萎了：用清理工具清除`,
      };
    }
    const stage = stageIndex(p);
    const mult = this.game.displayMult(c.id);
    let cls = 'plot planted';
    let badge = '';
    let statusTitle = '';
    let remain;
    if (p.pest) {
      cls += ' pest';
      badge = `<span class="plot-badge pest-badge">${ico('pest')}</span>`;
      statusTitle = '🐛 害蟲入侵！生長暫停，點擊驅趕';
    } else if (p.mature) {
      cls += ' mature';
      statusTitle = '✨ 可收成';
    } else if (!p.watered) {
      cls += ' dry';
      badge = `<span class="plot-badge need-badge">${ico('drop')}</span>`;
      statusTitle = '💧 需要澆水才會生長';
    } else {
      cls += ' watered growing';
      remain = fmtTime(remainingMs(p, mult));
      statusTitle = `剩餘 ${remain}`;
    }
    const live = remain === undefined ? '' : `<span class="plot-sub"></span>`;
    const bar = p.mature ? '' : `<div class="plot-bar"><div></div></div>`;
    const fertBadge = p.fertilized && !p.mature ? `<span class="plot-badge fert-badge">${ico('fertilizer')}</span>` : '';
    const sMult = this.game.season.mult(c.id);
    const seasonNote = sMult > 1 ? '｜🌟 當季 +30% 生長' : sMult < 1 ? '｜🐌 逆季 -30% 生長' : '';
    return {
      cls,
      html: `${badge}${fertBadge}${sprite(stageSprite(c, stage), (stage / (c.stages - 1)).toFixed(2))}${live}${bar}`,
      title: `${c.icon} ${c.name}｜階段 ${stage + 1}/${c.stages}｜${statusTitle}${seasonNote}`,
      remain: remain ?? '',
      pct: Math.round(progressOf(p) * 100),
    };
  }
}
