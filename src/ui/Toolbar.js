import { CROPS, CROP_MAP } from '../data/crops.js';
import { ITEM_MAP } from '../data/items.js';

const TOOL_INFO = {
  till: ['🪓', '翻土', '開墾未整理的土地'],
  water: ['🚿', '澆水', '為作物澆水，澆水後才會生長'],
  harvest: ['🧺', '收成', '採收成熟的作物'],
  clear: ['🧹', '清理', '剷除作物或收回灑水器（需確認）'],
};

export class Toolbar {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('toolbar');
    this.el.addEventListener('click', (e) => {
      const cancel = e.target.closest('[data-tool-cancel]');
      if (cancel) return game.selectTool(null);
      const btn = e.target.closest('[data-tool]');
      if (btn) game.selectTool(btn.dataset.tool);
    });
    game.events.on('tool:selected', () => this.render());
    game.events.on('state:changed', () => this.render());
  }

  render() {
    const g = this.game, s = g.state;
    if (!s) return;
    const sel = g.selectedTool;
    const tb = (tool, inner, title) =>
      `<button class="tool-btn ${sel === tool ? 'selected' : ''}" data-tool="${tool}" title="${title}">${inner}</button>`;

    let h = `<div class="tool-group">`;
    for (const [tool, [icon, name, desc]] of Object.entries(TOOL_INFO)) {
      h += tb(tool, `${icon}<span class="tool-name">${name}</span>`, desc);
    }
    h += `</div><div class="tool-group">`;
    for (const c of CROPS) {
      if (s.level < c.unlockLevel) continue;
      const n = s.seeds[c.id] || 0;
      h += tb(`seed:${c.id}`, `${c.icon}<span class="tool-count">${n}</span>`, `${c.name}種子（剩 ${n} 顆）— 點農地播種`);
    }
    const fert = s.items.fertilizer || 0;
    const spr = s.items.sprinkler || 0;
    if (fert > 0) h += tb('fertilizer', `🧴<span class="tool-count">${fert}</span>`, ITEM_MAP.fertilizer.desc);
    if (spr > 0) h += tb('sprinkler', `⛲<span class="tool-count">${spr}</span>`, ITEM_MAP.sprinkler.desc);
    h += `</div><div class="tool-status">${this.statusText()}</div>`;
    if (sel) h += `<button class="btn btn-small" data-tool-cancel>✖ 取消選擇</button>`;
    this.el.innerHTML = h;
  }

  statusText() {
    const g = this.game, sel = g.selectedTool;
    if (!sel) return '未選擇工具 — 點農地可查看資訊';
    if (sel.startsWith('seed:')) {
      const c = CROP_MAP[sel.slice(5)];
      return `播種：${c.icon} ${c.name}（剩 ${g.state.seeds[c.id] || 0} 顆）`;
    }
    const info = TOOL_INFO[sel];
    if (info) return `目前工具：${info[0]} ${info[1]}`;
    if (sel === 'fertilizer') return '使用：🧴 快速肥料（點生長中的作物）';
    if (sel === 'sprinkler') return '放置：⛲ 灑水器（點空的農地）';
    return '';
  }
}
