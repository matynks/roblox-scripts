import { E } from './http.js';

/** Fixed-window counters kept in memory, keyed by bucket + client identity. */
export class RateLimiter {
  constructor() {
    this.windows = new Map();
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref();
  }

  hit(key, limit, windowMs) {
    const t = Date.now();
    let w = this.windows.get(key);
    if (!w || t >= w.resetAt) {
      w = { count: 0, resetAt: t + windowMs };
      this.windows.set(key, w);
    }
    w.count++;
    return w.count <= limit;
  }

  enforce(key, limit, windowMs, message) {
    if (!this.hit(key, limit, windowMs)) throw E.tooMany(message);
  }

  sweep() {
    const t = Date.now();
    for (const [k, w] of this.windows) if (t >= w.resetAt) this.windows.delete(k);
  }

  stop() {
    clearInterval(this.timer);
  }
}
