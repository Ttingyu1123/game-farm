import { ShopPanel } from './ShopPanel.js';
import { WarehousePanel } from './WarehousePanel.js';
import { InventoryPanel } from './InventoryPanel.js';
import { OrderPanel } from './OrderPanel.js';
import { TaskPanel } from './TaskPanel.js';
import { AchievementPanel } from './AchievementPanel.js';

export class Panels {
  constructor(game) {
    this.game = game;
    this.content = document.getElementById('panel-content');
    this.tabsEl = document.getElementById('panel-tabs');
    this.active = 'shop';
    this.panels = {
      shop: new ShopPanel(game),
      warehouse: new WarehousePanel(game),
      inventory: new InventoryPanel(game),
      orders: new OrderPanel(game),
      tasks: new TaskPanel(game),
      achievements: new AchievementPanel(game),
    };
    this.tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) this.setActive(b.dataset.tab);
    });
    this.content.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || b.disabled) return;
      this.panels[this.active].onAction?.(b.dataset);
    });
    game.events.on('state:changed', () => this.render());
    game.events.on('tick', () => this.panels[this.active].live?.(this.content));
  }

  setActive(name) {
    if (!this.panels[name]) return;
    this.active = name;
    for (const b of this.tabsEl.querySelectorAll('.tab-btn')) {
      b.classList.toggle('active', b.dataset.tab === name);
    }
    this.render();
    this.game.events.emit('panel:opened', name);
  }

  render() {
    if (!this.game.state) return;
    this.content.innerHTML = this.panels[this.active].html();
  }
}
