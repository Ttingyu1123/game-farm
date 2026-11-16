// 自製圖示系統：資料表仍以 emoji 當文字備援（title／aria），畫面上由這裡換成 assets/icons 的圖
const BASE = 'assets/icons/';

export const icoSrc = (name) => `${BASE}${name}.png`;
export const ico = (name, cls = '') =>
  `<img class="ico${cls ? ` ${cls}` : ''}" src="${icoSrc(name)}" alt="" draggable="false">`;

const SHARED_STAGES = ['seed', 'sprout', 'seedling'];

// 生長階段 → 圖示名：最後三階段是該作物專屬（幼株／開花結果／成熟），前面用共用的種子、發芽、幼苗
export function stageSprite(crop, stage) {
  const own = stage - (crop.stages - 3);
  return own >= 0 ? `crop-${crop.id}-${own + 1}` : SHARED_STAGES[stage];
}

const EMOJI_ICON = {
  '🥕': 'crop-carrot', '🌾': 'crop-wheat', '🍅': 'crop-tomato', '🍓': 'crop-strawberry',
  '🌽': 'crop-corn', '🎃': 'crop-pumpkin', '🍆': 'crop-eggplant', '🫐': 'crop-blueberry',
  '🍉': 'crop-watermelon', '🍎': 'crop-goldapple',
  '🌱': 'sprout', '🥀': 'withered', '🐛': 'pest', '⛲': 'sprinkler', '🔒': 'locked',
  '🧴': 'fertilizer', '⭐': 'star', '🌟': 'star',
  '🪓': 'hoe', '🚿': 'water-can', '🧺': 'basket', '🧹': 'shovel',
  '💰': 'coin', '🪙': 'coin', '💧': 'drop',
  '🛒': 'shop', '📦': 'crate', '🎒': 'backpack', '🏭': 'workshop',
  '📋': 'orders', '📝': 'tasks', '🏆': 'trophy', '⚙': 'gear', '💾': 'save',
  '☀': 'sun', '⛅': 'cloudy', '🌧': 'rain', '🌸': 'spring', '🍂': 'autumn', '❄': 'winter',
  '🌀': 'machine-juicer', '🔥': 'machine-oven', '🍯': 'machine-jampot',
  '🥤': 'recipe-carrot_juice', '🧃': 'recipe-tomato_juice', '🍹': 'recipe-strawberry_shake',
  '🍧': 'recipe-melon_slush', '🍞': 'recipe-bread', '🥖': 'recipe-corn_bread',
  '🥧': 'recipe-pumpkin_pie', '🫙': 'recipe-strawberry_jam', '🍇': 'recipe-blueberry_jam',
  '🏺': 'recipe-golden_honey',
};

const EMOJI_RE = new RegExp(`(${Object.keys(EMOJI_ICON).join('|')})\\uFE0F?`, 'u');

function iconizeText(node) {
  if (!node.parentNode) return; // 每 tick 重設的文字，等監看器跑到時可能已被換掉
  let rest = node;
  let m;
  while ((m = EMOJI_RE.exec(rest.nodeValue))) {
    const after = rest.splitText(m.index);
    after.nodeValue = after.nodeValue.slice(m[0].length);
    const img = document.createElement('img');
    img.className = 'ico';
    img.src = icoSrc(EMOJI_ICON[m[1]]);
    img.alt = m[1];
    img.draggable = false;
    after.parentNode.insertBefore(img, after);
    rest = after;
  }
}

function iconizeTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return iconizeText(root);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (EMOJI_RE.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
  }
  nodes.forEach(iconizeText);
}

// 全頁監看：任何進到畫面的文字節點（toast、面板、彈窗、教學）裡的對應 emoji 都自動換成圖示
export function installIconizer(root = document.body) {
  iconizeTree(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') iconizeTree(r.target);
      else r.addedNodes.forEach(iconizeTree);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
