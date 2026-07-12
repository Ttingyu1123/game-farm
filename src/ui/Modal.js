export class Modal {
  constructor() {
    this.root = document.getElementById('modal-root');
    this._resolver = null;
    this.root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-modal-action]');
      if (a) return this.finish(a.dataset.modalAction === 'ok');
      if (e.target === this.root) this.finish(false);
    });
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  confirm({ title, body, okText = '確定', cancelText = '取消', danger = false }) {
    if (this._resolver) return Promise.resolve(false); // 防止疊窗重複觸發
    this.root.innerHTML = `
      <div class="modal-card">
        <h3>${title}</h3>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="btn" data-modal-action="cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-action="ok">${okText}</button>
        </div>
      </div>`;
    this.root.classList.remove('hidden');
    return new Promise((res) => { this._resolver = res; });
  }

  info({ title, body, okText = '知道了' }) {
    if (this._resolver) return Promise.resolve(true);
    this.root.innerHTML = `
      <div class="modal-card">
        <h3>${title}</h3>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="btn btn-primary" data-modal-action="ok">${okText}</button>
        </div>
      </div>`;
    this.root.classList.remove('hidden');
    return new Promise((res) => { this._resolver = res; });
  }

  // 自訂內容（設定畫面用），呼叫端自行綁事件；data-modal-action="cancel" 可關閉
  open(html) {
    this.root.innerHTML = `<div class="modal-card">${html}</div>`;
    this.root.classList.remove('hidden');
    return this.root;
  }

  finish(value) {
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    const r = this._resolver;
    this._resolver = null;
    if (r) r(value);
  }
}
