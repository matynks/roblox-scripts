// Process-wide service container, populated once by start().
export const app = {
  /** @type {import('./db.js').Db} */
  db: null,
  cfg: null,
  game: null,
  log: (...args) => console.log('[larpverse]', ...args),
};
