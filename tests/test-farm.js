const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:5317/';
const results = [];
const errors = [];
function check(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}

let page;
(async () => {
  const browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));

  await page.goto(URL);
  await page.waitForTimeout(500);

  // 頁面標題與開始畫面
  check('page title', (await page.title()).includes('療癒小農場'));
  check('continue disabled without save', await page.locator('#btn-continue').isDisabled());

  // 開始新遊戲
  await page.click('#btn-new-game');
  await page.waitForSelector('#app:not(.hidden)');
  check('app visible after new game', true);

  // 教學出現後略過
  await page.waitForSelector('#tut-skip', { timeout: 3000 });
  await page.click('#tut-skip');
  check('tutorial skippable', await page.locator('#tutorial-overlay').evaluate((el) => el.classList.contains('hidden')));
  await page.evaluate(() => { window.gameConfig.PEST.chancePerMin = 0; }); // 測試期間關閉隨機害蟲

  const setTool = (tool) => page.evaluate((tl) => { const g = window.game; g.selectedTool = tl; g.events.emit('tool:selected', tl); }, tool);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.game.state)));
  const closeModal = async () => {
    if (await page.locator('#modal-root .modal-card').count()) {
      await page.click('[data-modal-action="ok"], [data-modal-action="cancel"]').catch(() => {});
      await page.waitForTimeout(150);
    }
  };

  check('cloud layer renders 4 clouds', (await page.locator('#cloud-layer .cloud').count()) === 4);
  check('fx layer exists', (await page.locator('#fx-layer').count()) === 1);
  check('guide link on start screen', (await page.evaluate(() => {
    const a = document.querySelector('#btn-guide');
    return a && a.getAttribute('href') === 'guide.html' && a.target === '_blank';
  })) === true);

  let s = await state();
  check('initial coins 300', s.coins === 300, `coins=${s.coins}`);
  check('initial seeds carrot 8 wheat 5', s.seeds.carrot === 8 && s.seeds.wheat === 5);
  check('24 plots unlocked', s.plots.filter((p) => p.unlocked).length === 24);

  // 未翻土直接播種 → 應失敗
  await setTool('seed:carrot');
  await page.click('.plot[data-i="0"]');
  s = await state();
  check('cannot plant on untilled', s.plots[0].cropId === null && s.seeds.carrot === 8);

  // 翻土
  await setTool('till');
  await page.click('.plot[data-i="0"]');
  s = await state();
  check('till works', s.plots[0].tilled === true);
  check('plot cell shows tilled class', await page.locator('.plot[data-i="0"]').evaluate((el) => el.classList.contains('tilled')));

  // 播種
  await setTool('seed:carrot');
  await page.click('.plot[data-i="0"]');
  s = await state();
  check('plant consumes seed', s.plots[0].cropId === 'carrot' && s.seeds.carrot === 7);

  // 重複播種 → 應失敗
  await page.click('.plot[data-i="0"]');
  s = await state();
  check('no double planting', s.seeds.carrot === 7);

  // 未澆水不生長
  await page.waitForTimeout(700);
  s = await state();
  check('no growth before watering', s.plots[0].growth === 0);

  // 澆水
  await setTool('water');
  await page.click('.plot[data-i="0"]');
  s = await state();
  check('water works', s.plots[0].watered === true);
  // 重複澆水（不會壞，只是提示）
  await page.click('.plot[data-i="0"]');
  await page.waitForTimeout(700);
  s = await state();
  check('growth progresses after watering', s.plots[0].growth > 0, `growth=${s.plots[0].growth}`);
  check('xp gained from plant+water', s.xp >= 2, `xp=${s.xp}`);

  // 未成熟收成 → 應失敗
  await setTool('harvest');
  await page.click('.plot[data-i="0"]', {force:true});
  s = await state();
  check('cannot harvest immature', s.plots[0].cropId === 'carrot');

  // 商店購買（含快速連點防護）
  const coinsBefore = s.coins;
  await page.click('#panel-tabs [data-tab="shop"]');
  const buyBtn = page.locator('[data-action="buy-seed"][data-id="carrot"][data-qty="5"]').first();
  await buyBtn.click({ clickCount: 3, delay: 30 }); // 快速三連點
  await page.waitForTimeout(300);
  s = await state();
  const spent = coinsBefore - s.coins;
  check('buy deducts coins correctly (rapid clicks OK)', spent % 50 === 0 && s.coins >= 0 && s.seeds.carrot === 7 + spent / 10,
    `spent=${spent} seeds=${s.seeds.carrot}`);

  // 金幣不足防護：嘗試買 10 顆南瓜（未解鎖 + 太貴）
  await page.evaluate(() => window.game.shop.buySeed('pumpkin', 10));
  s = await state();
  check('cannot buy locked/unaffordable crop', (s.seeds.pumpkin || 0) === 0 && s.coins >= 0);

  // 快轉作物到成熟
  await page.evaluate(() => { window.game.state.plots[0].growth = 10 * 60 * 1000; });
  await page.waitForTimeout(600);
  s = await state();
  check('crop matures', s.plots[0].mature === true);
  check('mature class on cell', await page.locator('.plot[data-i="0"]').evaluate((el) => el.classList.contains('mature')));

  // 收成（固定隨機值 → 必出一般品，避免 10% 優質機率造成 flaky）
  await page.evaluate(() => { window.__origRandom = Math.random; Math.random = () => 0.99; });
  await setTool('harvest');
  await page.click('.plot[data-i="0"]', {force:true});
  check('harvest particle burst spawned', (await page.locator('#fx-layer .fx-p').count()) > 0);
  await page.evaluate(() => { Math.random = window.__origRandom; });
  s = await state();
  check('harvest adds to warehouse', s.warehouse.carrot === 1, `carrot=${s.warehouse.carrot}`);
  check('plot resets to tilled after harvest', s.plots[0].cropId === null && s.plots[0].tilled === true);

  // 倉庫出售
  await page.click('#panel-tabs [data-tab="warehouse"]');
  const coinsBeforeSell = s.coins;
  await page.click('[data-action="sell"][data-id="carrot"][data-qty="1"]');
  s = await state();
  check('sell gives coins', s.coins === coinsBeforeSell + 22 && s.warehouse.carrot === 0, `coins=${s.coins}`);

  // 鎖定農地 → 彈確認視窗
  await page.click('.plot[data-i="47"]');
  await page.waitForTimeout(300);
  check('locked plot opens unlock modal', await page.locator('#modal-root .modal-card').count() === 1);
  await page.click('[data-modal-action="cancel"]');
  s = await state();
  check('cancel unlock: no coins deducted', s.unlockedZones.length === 0);

  // 訂單面板
  await page.click('#panel-tabs [data-tab="orders"]');
  check('3 orders shown', await page.locator('.order-card').count() === 3);
  s = await state();
  const unlockLv = { carrot: 1, wheat: 1, tomato: 2, strawberry: 3, corn: 4, pumpkin: 5 };
  check('orders only require unlocked crops', s.orders.every((o) => unlockLv[o.cropId] <= s.level));

  // 訂單交付（先給庫存再交付，快速雙擊防重複）
  const o = s.orders[0];
  await page.evaluate((oid) => {
    const g = window.game;
    const ord = g.state.orders.find((x) => x.id === oid);
    g.state.warehouse[ord.cropId] = ord.qty;
    g.changed();
  }, o.id);
  await page.waitForTimeout(200);
  const coinsBeforeOrder = (await state()).coins;
  const deliverBtn = page.locator(`[data-action="deliver"][data-id="${o.id}"]`);
  await deliverBtn.click();
  await page.waitForTimeout(200);
  const coinsAfterDeliver = (await state()).coins;
  check('order pays reward', coinsAfterDeliver >= coinsBeforeOrder + o.coins, `coins=${coinsAfterDeliver}`);
  await page.evaluate((oid) => { window.game.orders.complete(oid); window.game.orders.complete(oid); }, o.id); // 模擬重複觸發
  await page.waitForTimeout(200);
  s = await state();
  check('order pays exactly once', s.coins === coinsAfterDeliver, `coins=${s.coins} vs ${coinsAfterDeliver}`);
  check('order replaced, still 3 orders', s.orders.length === 3 && !s.orders.find((x) => x.id === o.id));
  await closeModal(); // 可能出現升級恭喜彈窗

  // 每日任務
  await page.click('#panel-tabs [data-tab="tasks"]');
  check('3 daily tasks', s.dailyTasks.length === 3, s.dailyTasks.map((t) => t.type).join(','));
  // 任務重複領取防護
  await page.evaluate(() => {
    const g = window.game;
    const t = g.state.dailyTasks[0];
    t.progress = t.target;
    g.changed();
  });
  await page.evaluate(() => window.game.tasks.claim(0));
  const coinsAfterFirstClaim = (await state()).coins;
  await page.evaluate(() => { window.game.tasks.claim(0); window.game.tasks.claim(0); });
  s = await state();
  check('task claim pays exactly once', s.coins === coinsAfterFirstClaim && s.dailyTasks[0].claimed === true, `coins=${s.coins} vs ${coinsAfterFirstClaim}`);
  await closeModal(); // 可能出現升級恭喜彈窗

  // 倉庫已滿不可收成
  await page.evaluate(() => {
    const g = window.game;
    g.state.warehouse.wheat = g.state.warehouseCapacity - g.inventory.warehouseTotal() + (g.state.warehouse.wheat || 0);
    const p = g.state.plots[1];
    p.unlocked = true; p.tilled = true; p.cropId = 'carrot'; p.watered = true; p.growth = 999999; p.mature = true;
    g.changed();
  });
  await page.waitForTimeout(400);
  await setTool('harvest');
  await page.click('.plot[data-i="1"]', {force:true});
  s = await state();
  check('warehouse full blocks harvest', s.plots[1].cropId === 'carrot');
  await page.evaluate(() => { window.game.state.warehouse.wheat = 0; window.game.changed(); });

  // ===== v1.1 深度機制 =====
  // 市場行情
  check('market initial factor is 1.0', (await page.evaluate(() => window.game.market.factor('carrot'))) === 1);
  await page.evaluate(() => window.game.market.roll(Date.now()));
  const mkt = await page.evaluate(() => ({
    f: window.game.market.factor('carrot'),
    p: window.game.market.priceOf('carrot'),
    pq: window.game.market.priceOf('carrot', true),
  }));
  check('market factors within 0.8-1.4', mkt.f >= 0.8 && mkt.f <= 1.4, `f=${mkt.f}`);
  check('market price = round(base*f), quality x2', mkt.p === Math.max(1, Math.round(22 * mkt.f)) && mkt.pq === mkt.p * 2, `p=${mkt.p}`);

  // 優質作物（施肥後強制隨機值 → 必出優質）
  await page.evaluate(() => {
    const g = window.game;
    const p = g.state.plots[3];
    p.unlocked = true; p.tilled = true; p.cropId = 'carrot'; p.watered = true;
    p.growth = 999999; p.mature = true; p.maturedAt = Date.now(); p.fertilized = true;
    window.__origRandom = Math.random; Math.random = () => 0;
    g.farm.harvest(p);
    Math.random = window.__origRandom;
  });
  s = await state();
  check('quality harvest goes to warehouseQ', s.warehouseQ.carrot === 1 && s.stats.qualityHarvested === 1, `q=${s.warehouseQ.carrot}`);
  const qPrice = await page.evaluate(() => window.game.market.priceOf('carrot', true));
  const coinsBeforeQSell = s.coins;
  await page.evaluate(() => window.game.shop.sellCrops('carrot', 1, true));
  s = await state();
  check('quality sells at 2x market price', s.coins === coinsBeforeQSell + qPrice, `+${s.coins - coinsBeforeQSell} expect ${qPrice}`);

  // 害蟲：暫停生長、點擊驅趕後恢復
  await page.evaluate(() => {
    const g = window.game;
    const p = g.state.plots[4];
    p.unlocked = true; p.tilled = true; p.cropId = 'carrot'; p.plantedAt = Date.now();
    p.watered = true; p.wateredAt = Date.now(); p.growth = 5000; p.mature = false; p.pest = true;
    g.changed();
  });
  await page.waitForTimeout(800);
  s = await state();
  check('pest pauses growth', s.plots[4].growth === 5000, `growth=${s.plots[4].growth}`);
  await page.click('.plot[data-i="4"]', { force: true });
  s = await state();
  check('click shoos pest & counts stat', s.plots[4].pest === false && s.stats.pestsShooed === 1);
  await page.waitForTimeout(700);
  s = await state();
  check('growth resumes after shoo', s.plots[4].growth > 5000, `growth=${s.plots[4].growth}`);

  // 枯萎：成熟放太久 → 枯萎 → 不能收成 → 清理工具清除
  await page.evaluate(() => {
    const g = window.game;
    const p = g.state.plots[3];
    p.tilled = true; p.cropId = 'carrot'; p.watered = true; p.growth = 999999; p.mature = true;
    p.maturedAt = Date.now() - 10 * 60 * 1000; // 遠超 3×30 秒寬限期
    g.changed();
  });
  await page.waitForTimeout(600);
  s = await state();
  check('overdue mature crop withers', s.plots[3].withered === true && s.plots[3].mature === false);
  await page.evaluate(() => window.game.farm.harvest(window.game.state.plots[3]));
  s = await state();
  check('withered crop cannot be harvested', s.plots[3].cropId === 'carrot');
  await setTool('clear');
  await page.click('.plot[data-i="3"]');
  await page.waitForTimeout(300);
  await page.click('[data-modal-action="ok"]');
  await page.waitForTimeout(200);
  s = await state();
  check('clear tool removes withered crop', s.plots[3].cropId === null && s.plots[3].withered === false);

  // 成就：第一次收成應已自動達成
  check('firstHarvest achievement earned', s.achievements.includes('firstHarvest'));
  await page.click('#panel-tabs [data-tab="achievements"]');
  check('achievement panel renders 17 items', (await page.locator('#panel-content .shop-row').count()) === 17);

  // ===== v1.2 季節系統 =====
  s = await state();
  check('season starts in spring', s.season.current === 'spring');
  const se = await page.evaluate(() => ({
    carrot: window.game.season.mult('carrot'),
    pumpkin: window.game.season.mult('pumpkin'),
    tomato: window.game.season.mult('tomato'),
    qb: window.game.season.qualityBonus('carrot'),
    qbOff: window.game.season.qualityBonus('tomato'),
  }));
  check('spring multipliers (carrot 1.3 / pumpkin 0.7 / tomato 1)',
    se.carrot === 1.3 && se.pumpkin === 0.7 && se.tomato === 1, JSON.stringify(se));
  check('quality bonus only for in-season crop', se.qb === 0.1 && se.qbOff === 0);
  check('HUD shows season', (await page.locator('#hud-season').textContent()).includes('春'));
  await page.evaluate(() => window.game.season.advance(Date.now(), false));
  s = await state();
  check('season rotates spring→summer', s.season.current === 'summer');
  check('summer boosts tomato', (await page.evaluate(() => window.game.season.mult('tomato'))) === 1.3);
  await page.click('#panel-tabs [data-tab="shop"]');
  await page.waitForTimeout(200);
  check('shop shows season tags', (await page.locator('.season-tag').count()) > 0);
  check('banner shows season', (await page.locator('#weather-banner').textContent()).includes('夏天'));
  // 回到春天，讓後續測試環境穩定
  await page.evaluate(() => { window.game.state.season = { current: 'spring', changedAt: Date.now() }; window.game.changed(); });

  // ===== v1.4 加工鏈 =====
  await page.evaluate(() => { window.game.state.level = 8; window.game.state.coins += 2000; window.game.changed(); });
  s = await state();
  const coinsB4Machine = s.coins;
  // 未達等級的機器不能買
  await page.evaluate(() => window.game.workshop.buyMachine('jampot')); // Lv15
  s = await state();
  check('cannot buy machine below level', (s.machines.jampot.count || 0) === 0 && s.coins === coinsB4Machine);
  // 買果汁機
  await page.evaluate(() => window.game.workshop.buyMachine('juicer'));
  s = await state();
  check('buy machine deducts coins', s.machines.juicer.count === 1 && s.coins === coinsB4Machine - 500, `coins=${s.coins}`);
  // 原料不足不能開工
  await page.evaluate(() => { window.game.state.warehouse.carrot = 0; window.game.workshop.startRecipe('juicer', 'carrot_juice'); });
  s = await state();
  check('cannot start recipe without inputs', s.machines.juicer.slots[0].recipeId === null);
  // 正常開工：扣原料
  await page.evaluate(() => { window.game.state.warehouse.carrot = 5; window.game.workshop.startRecipe('juicer', 'carrot_juice'); });
  s = await state();
  check('start recipe consumes inputs', s.machines.juicer.slots[0].recipeId === 'carrot_juice' && s.warehouse.carrot === 2, `carrot=${s.warehouse.carrot}`);
  // 加工中不能再開一鍋
  await page.evaluate(() => window.game.workshop.startRecipe('juicer', 'tomato_juice'));
  s = await state();
  check('busy machine rejects new recipe', s.machines.juicer.slots[0].recipeId === 'carrot_juice');
  // 未完成不能收取
  await page.evaluate(() => window.game.workshop.collect('juicer'));
  s = await state();
  check('cannot collect before ready', (s.products.carrot_juice || 0) === 0 && s.machines.juicer.slots[0].recipeId === 'carrot_juice');
  // 快轉到完成（timestamp 驅動 = 離線加工同一機制）→ v1.5 起自動入庫
  await page.evaluate(() => { window.game.state.machines.juicer.slots[0].startedAt = Date.now() - 10 * 60 * 1000; });
  await page.waitForTimeout(700); // tick 自動完成入庫
  s = await state();
  check('auto-collect adds product & frees machine',
    (s.products.carrot_juice || 0) === 1 && s.machines.juicer.slots[0].recipeId === null && s.stats.processed === 1);
  check('process achievement earned', s.achievements.includes('process1'));
  // 賣加工品（固定價 110，prestige 0）
  const coinsB4PSell = s.coins;
  await page.evaluate(() => { window.game.workshop.sellProduct('carrot_juice', 1); window.game.workshop.sellProduct('carrot_juice', 1); });
  s = await state();
  check('sell product pays once at fixed price', s.coins === coinsB4PSell + 110 && (s.products.carrot_juice || 0) === 0, `coins=${s.coins}`);
  // 倉庫滿不能收取
  await page.evaluate(() => {
    const g = window.game;
    g.state.warehouse.carrot = 3;
    g.workshop.startRecipe('juicer', 'carrot_juice');
    g.state.machines.juicer.slots[0].startedAt = Date.now() - 10 * 60 * 1000;
    g.state.warehouse.wheat = g.state.warehouseCapacity - g.inventory.warehouseTotal() + (g.state.warehouse.wheat || 0);
    g.workshop.collect('juicer');
  });
  s = await state();
  check('warehouse full blocks collect', (s.products.carrot_juice || 0) === 0 && s.machines.juicer.slots[0].recipeId === 'carrot_juice');
  await page.evaluate(() => { window.game.state.warehouse.wheat = 0; window.game.workshop.collect('juicer'); window.game.changed(); });
  s = await state();
  check('collect works after freeing space', (s.products.carrot_juice || 0) === 1);
  // 工坊面板渲染
  await page.click('#panel-tabs [data-tab="workshop"]');
  await page.waitForTimeout(200);
  check('workshop panel renders machine & recipes', (await page.locator('#panel-content .machine-card').count()) >= 1
    && (await page.locator('#panel-content .recipe-row').count()) >= 2);
  // ===== v1.5 佇列與加工合約 =====
  // 佇列：排入 2 批、第 3 批排入被拒（不扣原料）
  await page.evaluate(() => {
    const g = window.game;
    g.state.warehouse.carrot = 12;
    g.workshop.startRecipe('juicer', 'carrot_juice'); // 開工
    g.workshop.startRecipe('juicer', 'carrot_juice'); // 佇列 1
    g.workshop.startRecipe('juicer', 'carrot_juice'); // 佇列 2
    g.workshop.startRecipe('juicer', 'carrot_juice'); // 佇列滿 → 拒絕
  });
  s = await state();
  check('queue holds 2 and rejects overflow without consuming',
    s.machines.juicer.slots[0].queue.length === 2 && s.warehouse.carrot === 3,
    `q=${s.machines.juicer.slots[0].queue.length} carrot=${s.warehouse.carrot}`);
  // 完成 → 自動入庫 → 佇列自動接續
  await page.evaluate(() => { window.game.state.machines.juicer.slots[0].startedAt = Date.now() - 10 * 60 * 1000; });
  await page.waitForTimeout(700);
  s = await state();
  check('queue auto-advances after finish',
    (s.products.carrot_juice || 0) === 2 && s.machines.juicer.slots[0].recipeId === 'carrot_juice' && s.machines.juicer.slots[0].queue.length === 1,
    `p=${s.products.carrot_juice} q=${s.machines.juicer.slots[0].queue.length}`);

  // 加工合約：生成器（強制機率觸發）
  const genO = await page.evaluate(() => {
    const R = Math.random; Math.random = () => 0.1;
    const o = window.game.orders.generate();
    Math.random = R; return o;
  });
  check('generator produces product contract when machine owned',
    genO.kind === 'product' && !!genO.recipeId, JSON.stringify({ kind: genO.kind, r: genO.recipeId }));
  // 注入合約 → 缺貨不能交付 → 給貨後交付一次
  await page.evaluate(() => {
    const g = window.game;
    g.state.orders[0] = { id: 'oP1', kind: 'product', customer: '測試熊', customerIcon: '🐻', recipeId: 'tomato_juice', qty: 1, coins: 225, xp: 22, expiresAt: Date.now() + 600000 };
    g.changed();
  });
  await page.click('#panel-tabs [data-tab="orders"]');
  await page.waitForTimeout(200);
  check('product order shows workshop tag',
    (await page.locator('#panel-content .order-card').first().textContent()).includes('加工合約'));
  await page.evaluate(() => window.game.orders.complete('oP1'));
  s = await state();
  check('product order blocked without stock', !!s.orders.find((o) => o.id === 'oP1'));
  await page.evaluate(() => { window.game.state.products.tomato_juice = 2; window.game.changed(); });
  const coinsB4PO = (await state()).coins;
  await page.evaluate(() => { window.game.orders.complete('oP1'); window.game.orders.complete('oP1'); });
  s = await state();
  check('product order completes once & deducts product',
    (s.products.tomato_juice || 0) === 1 && !s.orders.find((o) => o.id === 'oP1') && s.coins - coinsB4PO >= 225,
    `delta=${s.coins - coinsB4PO}`);
  await closeModal(); // 可能升級彈窗

  // 清掉殘餘工坊狀態，避免影響後續容量相關測試
  await page.evaluate(() => {
    const m = window.game.state.machines.juicer.slots[0];
    m.recipeId = null; m.startedAt = null; m.queue = [];
    window.game.state.products = {};
    window.game.changed();
  });

  // ===== v1.6 多台機器 / 節慶 / 音樂 =====
  await page.evaluate(() => { window.game.state.coins = 10000; window.game.changed(); });
  await page.evaluate(() => window.game.workshop.buyMachine('juicer'));
  s = await state();
  check('second machine costs escalated price (900)', s.machines.juicer.count === 2 && s.coins === 9100, `coins=${s.coins}`);
  await page.evaluate(() => window.game.workshop.buyMachine('juicer'));
  s = await state();
  check('third machine costs 1300', s.machines.juicer.count === 3 && s.coins === 7800, `coins=${s.coins}`);
  await page.evaluate(() => window.game.workshop.buyMachine('juicer'));
  s = await state();
  check('max 3 machines per type', s.machines.juicer.count === 3 && s.coins === 7800);
  // 平行插槽：連開兩批自動分配到不同機台
  await page.evaluate(() => {
    const g = window.game;
    g.state.warehouse.carrot = 6;
    g.workshop.startRecipe('juicer', 'carrot_juice');
    g.workshop.startRecipe('juicer', 'carrot_juice');
  });
  s = await state();
  check('parallel slots auto-picked', s.machines.juicer.slots.filter((x) => x.recipeId).length === 2);
  await page.evaluate(() => {
    for (const sl of window.game.state.machines.juicer.slots) { sl.recipeId = null; sl.startedAt = null; sl.queue = []; }
    window.game.changed();
  });

  // 節慶：售價加成 / 生長加成 / 到期結束
  await page.evaluate(() => window.game.festival.start('market_boom', Date.now()));
  s = await state();
  check('festival starts', s.festival.current === 'market_boom');
  const festPrice = await page.evaluate(() => {
    const g = window.game;
    const f = g.state.market.factors.carrot;
    return { p: g.market.priceOf('carrot'), expect: Math.max(1, Math.round(22 * f * 1 * 1.25)) };
  });
  check('festival sell bonus +25% applied', festPrice.p === festPrice.expect, JSON.stringify(festPrice));
  await page.waitForTimeout(300);
  check('banner shows festival', (await page.locator('#weather-banner').textContent()).includes('市集日'));
  await page.evaluate(() => window.game.festival.start('rain_blessing', Date.now()));
  check('festival growth mult 1.5', (await page.evaluate(() => window.game.festival.growthMult())) === 1.5);
  await page.evaluate(() => { window.game.state.festival.startedAt = Date.now() - 99 * 60 * 1000; });
  await page.waitForTimeout(600);
  s = await state();
  check('festival ends after duration', s.festival.current === null && s.festival.nextAt > Date.now());
  check('banner cleared after festival', !(await page.locator('#weather-banner').textContent()).includes('甘霖祭'));

  // 背景音樂引擎
  s = await state();
  check('music setting default on', s.settings.music === true);
  const musicOk = await page.evaluate(async () => {
    try {
      const a = window.game.audio;
      const st = window.game.state;
      a.stopMusic(); a.startMusic();
      const on = a._musicOn;
      const src = a._el.src;
      const wantSrc = src.endsWith(`/bgm/${st.season.current}.m4a`);
      // 換季：淡出後換成新一季的曲子
      const next = st.season.current === 'spring' ? 'summer' : 'spring';
      a._clearFade(); a._el.volume = 0.5;
      Object.defineProperty(a._el, 'paused', { get: () => false, configurable: true });
      a._switchTrack(next);
      await new Promise((r) => setTimeout(r, 1600));
      delete a._el.paused;
      const switched = a._el.src.endsWith(`/bgm/${next}.m4a`);
      // 音檔載入失敗：退回程式生成的備援音樂
      a._el.dispatchEvent(new Event('error'));
      const fellBack = a._trackFailed && !!a._musicTimer;
      a.stopMusic();
      const off = !a._musicOn && !a._musicTimer && a._el.paused;
      a._trackFailed = false;
      return { ok: true, on, wantSrc, switched, fellBack, off, src };
    } catch (e) { return { ok: false, err: String(e) }; }
  });
  check('music engine start/stop safe', musicOk.ok && musicOk.on && musicOk.off, JSON.stringify(musicOk));
  check('music plays the current season track', musicOk.wantSrc, JSON.stringify(musicOk));
  check('music switches track on season change', musicOk.switched, JSON.stringify(musicOk));
  check('music falls back to synth when track fails', musicOk.fellBack, JSON.stringify(musicOk));

  // 存檔 & 重新載入
  await page.evaluate(() => window.game.save.save());
  const before = await state();
  await page.reload();
  await page.waitForTimeout(500);
  check('continue enabled with save', !(await page.locator('#btn-continue').isDisabled()));
  await page.click('#btn-continue');
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForTimeout(400);
  check('tutorial not replayed after reload', (await page.locator('#tut-skip').count()) === 0);
  s = await state();
  check('coins persist after reload', s.coins === before.coins, `${s.coins} vs ${before.coins}`);
  check('seeds persist after reload', s.seeds.carrot === before.seeds.carrot);
  check('plot state persists after reload', s.plots[0].tilled === before.plots[0].tilled && s.plots[1].cropId === 'carrot');

  // 離線成長：把 lastSavedAt 與 wateredAt 倒退 60 秒再重載
  await page.evaluate(() => {
    const g = window.game;
    const p = g.state.plots[2];
    p.unlocked = true; p.tilled = true; p.cropId = 'carrot'; p.plantedAt = Date.now(); p.watered = true; p.wateredAt = Date.now(); p.growth = 0; p.mature = false;
    g.save.save();
    const raw = JSON.parse(localStorage.getItem('cozy-pocket-farm-save'));
    raw.lastSavedAt = Date.now() - 60 * 1000;
    localStorage.setItem('cozy-pocket-farm-save', JSON.stringify(raw));
    g.running = false; // 停掉遊戲，避免 beforeunload 自動存檔覆蓋竄改後的存檔
  });
  await page.reload();
  await page.click('#btn-continue');
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForTimeout(500);
  s = await state();
  check('offline growth applied (60s -> carrot mature)', s.plots[2].mature === true, `growth=${s.plots[2].growth}`);

  // 損壞存檔安全處理
  await page.evaluate(() => {
    window.game.running = false; // 避免 beforeunload 把損壞測試資料蓋回正常存檔
    localStorage.setItem('cozy-pocket-farm-save', '{corrupted!!!');
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#btn-continue');
  await page.waitForTimeout(400);
  const appHidden = await page.locator('#app').evaluate((el) => el.classList.contains('hidden'));
  check('corrupted save handled gracefully (stays on start screen, no crash)', appHidden);

  // 清除存檔重新開始
  await page.evaluate(() => localStorage.removeItem('cozy-pocket-farm-save'));
  await page.reload();
  await page.waitForTimeout(300);
  check('after wipe: continue disabled again', await page.locator('#btn-continue').isDisabled());

  // 桌面截圖
  await page.click('#btn-new-game');
  await page.waitForSelector('#app:not(.hidden)');
  await page.waitForTimeout(400);
  await page.screenshot({ path: __dirname + '/shot-desktop.png' });

  // 手機 viewport 點擊測試
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.click('#tut-skip').catch(() => {});
  await setTool('till');
  await page.click('.plot[data-i="5"]');
  s = await state();
  check('mobile viewport: plot clickable & correct target', s.plots[5].tilled === true);
  await page.screenshot({ path: __dirname + '/shot-mobile.png' });

  // ===== v1.3 終局內容（在最後的新遊戲上驗證）=====
  // 等級上限 12 → 20
  await page.evaluate(() => {
    const g = window.game;
    g.state.level = 12; g.state.xp = 0;
    g.progression.addXp(1250); // XP_TABLE[12]
  });
  await page.waitForTimeout(200);
  await closeModal(); // 升級恭喜彈窗
  s = await state();
  check('level cap raised: 12 -> 13 possible', s.level === 13, `level=${s.level}`);

  // 新作物存在且等級鎖正確
  const newCrops = await page.evaluate(() => {
    const g = window.game;
    return { count: g.state.plots ? Object.keys(g.state.seeds).length : 0, seeds: Object.keys(g.state.seeds) };
  });
  check('10 crops in seed map', newCrops.count === 10, newCrops.seeds.join(','));
  check('goldapple locked below Lv17', (await page.evaluate(() => {
    const g = window.game;
    g.shop.buySeed('goldapple', 1); // Lv13 嘗試買 Lv17 作物 → 應失敗
    return g.state.seeds.goldapple || 0;
  })) === 0);

  // 轉生
  await page.evaluate(() => { window.game.state.level = 20; window.game.changed(); });
  await page.waitForTimeout(200);
  s = await state();
  check('level20 achievement earned', s.achievements.includes('level20'));
  const plotsTilledBefore = s.plots[5].tilled;
  await page.evaluate(() => window.game.progression.prestigeNow());
  await page.waitForTimeout(400);
  s = await state();
  check('prestige resets level & farm', s.level === 1 && s.plots[5].tilled === false && plotsTilledBefore === true,
    `level=${s.level}`);
  check('prestige counter & start coins bonus', s.prestige === 1 && s.coins >= 500, `coins=${s.coins}`);
  check('achievements survive prestige', s.achievements.includes('level20') && s.achievements.includes('prestige1'));
  check('tutorial not replayed after prestige', s.tutorial.completed === true && (await page.locator('#tut-skip').count()) === 0);
  const prBonus = await page.evaluate(() => ({
    price: window.game.market.priceOf('carrot'), // 行情 1.0 × 1.05 → round(23.1) = 23
    mult: window.game.prestigeMult(),
  }));
  check('prestige sell bonus +5%', prBonus.price === 23, `price=${prBonus.price}`);
  check('prestige growth bonus +5%', prBonus.mult === 1.05);
  check('HUD shows prestige star', (await page.locator('#hud-prestige').textContent()).includes('×1'));
  // 轉生後任務事件不重複計數（系統單次建立守衛）
  await page.evaluate(() => {
    const g = window.game;
    g.state.dailyTasks = [{ type: 'plant', name: '種植測試', target: 10, coins: 1, xp: 1, progress: 0, claimed: false }];
    const p = g.state.plots[0];
    p.unlocked = true; p.tilled = true;
    g.farm.plant(p, 'carrot');
  });
  s = await state();
  check('no double task counting after prestige', s.dailyTasks[0].progress === 1, `progress=${s.dailyTasks[0].progress}`);

  // ===== 攻略說明書頁 =====
  await page.goto(URL + 'guide.html');
  await page.waitForTimeout(300);
  check('guide page loads with title', (await page.title()).includes('完整攻略'));
  check('guide has 16 sections', (await page.locator('h2.sec').count()) === 16);
  check('guide has play link back to game', (await page.locator('header.top a.play').count()) === 1);
  check('guide crop table lists 10 crops', (await page.locator('#s4 table tr').count()) === 11); // 表頭+10列

  await browser.close();

  console.log('===== RESULTS =====');
  for (const r of results) console.log(r);
  console.log('===== ERRORS =====');
  console.log(errors.length ? errors.join('\n') : '(none)');
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`===== ${results.length - fails}/${results.length} passed, ${errors.length} console errors =====`);
  process.exit(fails || errors.length ? 1 : 0);
})().catch(async (e) => {
  console.error('TEST CRASH:', e.message.split('\n')[0]);
  console.log('===== RESULTS SO FAR =====');
  for (const r of results) console.log(r);
  console.log('===== ERRORS =====');
  console.log(errors.join('\n') || '(none)');
  try { await page.screenshot({ path: __dirname + '/crash.png' }); console.log('crash.png saved'); } catch {}
  process.exit(2);
});
