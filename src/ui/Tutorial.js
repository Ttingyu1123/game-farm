const STEPS = [
  { text: '歡迎來到療癒小農場！🌱 先在下方工具列選擇「🪓 翻土」工具。', target: '[data-tool="till"]', event: 'tool:selected', check: (v) => v === 'till' },
  { text: '很好！點擊一格「未整理」的土地進行翻土。', target: '#farm-grid', event: 'plot:tilled' },
  { text: '土翻好了！接著在工具列選擇「🥕 胡蘿蔔種子」。', target: '[data-tool="seed:carrot"]', event: 'tool:selected', check: (v) => v === 'seed:carrot' },
  { text: '點擊剛翻好的土地播種。', target: '#farm-grid', event: 'crop:planted' },
  { text: '種下去了！選擇「💧 澆水」工具。', target: '[data-tool="water"]', event: 'tool:selected', check: (v) => v === 'water' },
  { text: '幫作物澆水 — 澆水後作物才會開始生長喔。', target: '#farm-grid', event: 'crop:watered' },
  { text: '胡蘿蔔大約 30 秒成熟，稍等一下…（格子上會顯示倒數）', target: '#farm-grid', event: 'crop:matured' },
  { text: '成熟了！✨ 選擇「🧺 收成」工具，點擊作物採收。', target: '[data-tool="harvest"]', event: 'crop:harvested' },
  { text: '收成好了！打開右側「📦 倉庫」看看。', target: '[data-tab="warehouse"]', event: 'panel:opened', check: (v) => v === 'warehouse' },
  { text: '把胡蘿蔔賣掉換金幣吧！', target: '#panel-content', event: 'crops:sold' },
  { text: '有錢了！打開「🛒 商店」。', target: '[data-tab="shop"]', event: 'panel:opened', check: (v) => v === 'shop' },
  { text: '買一些新種子，教學就完成囉！', target: '#panel-content', event: 'shop:purchased' },
];

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.overlay = document.getElementById('tutorial-overlay');
    this.idx = -1;
    this.active = false;
    const events = [...new Set(STEPS.map((s) => s.event))];
    for (const ev of events) {
      game.events.on(ev, (payload) => this.onEvent(ev, payload));
    }
    game.events.on('tick', () => this.reposition());
    window.addEventListener('resize', () => this.reposition());
  }

  maybeStart() {
    if (!this.game.state.tutorial.completed) this.start();
  }

  start() {
    this.active = true;
    this.idx = 0;
    this.render();
  }

  restart() {
    this.game.state.tutorial.completed = false;
    this.game.changed();
    this.start();
  }

  skip() {
    this.game.toast('已略過教學，設定中可以重看', 'info');
    this.finish();
  }

  finish() {
    this.active = false;
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    if (!this.game.state.tutorial.completed) {
      this.game.state.tutorial.completed = true;
      this.game.changed();
    }
  }

  onEvent(ev, payload) {
    if (!this.active) return;
    const s = STEPS[this.idx];
    if (!s || s.event !== ev) return;
    if (s.check && !s.check(payload)) return;
    this.idx++;
    if (this.idx >= STEPS.length) {
      this.game.toast('🎉 教學完成！開始經營你的小農場吧', 'success');
      this.finish();
    } else {
      this.render();
    }
  }

  render() {
    const s = STEPS[this.idx];
    if (!s) return;
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="tut-ring" id="tut-ring"></div>
      <div class="tut-card">
        <div class="tut-step">新手教學 ${this.idx + 1}/${STEPS.length}</div>
        <p>${s.text}</p>
        <button class="btn btn-small" id="tut-skip">略過教學</button>
      </div>`;
    this.overlay.querySelector('#tut-skip').addEventListener('click', () => this.skip());
    this.reposition();
  }

  reposition() {
    if (!this.active) return;
    const s = STEPS[this.idx];
    const ring = this.overlay.querySelector('#tut-ring');
    if (!s || !ring) return;
    const t = document.querySelector(s.target);
    if (!t) { ring.style.display = 'none'; return; }
    const r = t.getBoundingClientRect();
    ring.style.display = 'block';
    ring.style.left = `${r.left - 6}px`;
    ring.style.top = `${r.top - 6}px`;
    ring.style.width = `${r.width + 12}px`;
    ring.style.height = `${r.height + 12}px`;
  }
}
