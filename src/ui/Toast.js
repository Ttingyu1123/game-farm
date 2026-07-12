let root = null;

export function showToast(msg, type = 'info') {
  if (!root) root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  root.appendChild(el);
  // 同時最多 4 則，避免堆疊遮擋
  while (root.children.length > 4) root.firstChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

export function initToast(game) {
  root = document.getElementById('toast-root');
  game.events.on('toast', ({ msg, type }) => showToast(msg, type));
}
