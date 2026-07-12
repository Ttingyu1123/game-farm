import { CONFIG } from '../config.js';
import { WEATHERS, WEATHER_MAP } from '../data/weather.js';
import { weightedPick } from '../utils/helpers.js';

export class WeatherSystem {
  constructor(game) {
    this.game = game;
  }

  def() {
    return WEATHER_MAP[this.game.state.weather.current] || WEATHER_MAP.sunny;
  }

  speedMult() {
    return this.def().speed;
  }

  ensure(now) {
    const w = this.game.state.weather;
    if (!WEATHER_MAP[w.current]) {
      w.current = 'sunny';
      w.changedAt = now;
    }
    if (now - w.changedAt >= CONFIG.WEATHER_INTERVAL_MS) this.roll(now);
  }

  tick(now) {
    if (now - this.game.state.weather.changedAt >= CONFIG.WEATHER_INTERVAL_MS) this.roll(now);
    if (this.def().autoWater) this.game.farm.rainTick();
  }

  roll(now) {
    const w = weightedPick(WEATHERS);
    this.game.state.weather = { current: w.id, changedAt: now };
    this.game.events.emit('weather:changed', w);
    this.game.changed();
  }
}
