import { DatabaseSync } from 'node:sqlite';

function bindable(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

/**
 * Thin synchronous wrapper over node:sqlite with a statement cache and nested transactions.
 * Node runs JavaScript on one thread and node:sqlite is synchronous, so a transaction whose
 * callback never awaits cannot interleave with any other request.
 */
export class Db {
  constructor(file) {
    this.file = file;
    this.raw = new DatabaseSync(file);
    this.raw.exec('PRAGMA foreign_keys = ON');
    this.raw.exec('PRAGMA busy_timeout = 5000');
    if (file !== ':memory:') {
      this.raw.exec('PRAGMA journal_mode = WAL');
      this.raw.exec('PRAGMA synchronous = NORMAL');
    }
    this.cache = new Map();
    this.depth = 0;
  }

  stmt(sql) {
    let s = this.cache.get(sql);
    if (!s) {
      s = this.raw.prepare(sql);
      this.cache.set(sql, s);
    }
    return s;
  }

  get(sql, ...params) {
    return this.stmt(sql).get(...params.map(bindable)) ?? null;
  }

  all(sql, ...params) {
    return this.stmt(sql).all(...params.map(bindable));
  }

  run(sql, ...params) {
    const r = this.stmt(sql).run(...params.map(bindable));
    return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
  }

  value(sql, ...params) {
    const row = this.get(sql, ...params);
    if (!row) return null;
    const k = Object.keys(row)[0];
    return row[k];
  }

  exec(sql) {
    this.raw.exec(sql);
  }

  /** Run fn atomically. Must be synchronous. Nested calls use savepoints. */
  tx(fn) {
    if (this.depth > 0) {
      const name = `sp_${this.depth}`;
      this.raw.exec(`SAVEPOINT ${name}`);
      this.depth++;
      try {
        const result = fn();
        this.raw.exec(`RELEASE ${name}`);
        return result;
      } catch (e) {
        this.raw.exec(`ROLLBACK TO ${name}`);
        this.raw.exec(`RELEASE ${name}`);
        throw e;
      } finally {
        this.depth--;
      }
    }
    this.raw.exec('BEGIN IMMEDIATE');
    this.depth++;
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        throw new Error('db.tx callback must be synchronous');
      }
      this.raw.exec('COMMIT');
      return result;
    } catch (e) {
      try { this.raw.exec('ROLLBACK'); } catch { /* already rolled back */ }
      throw e;
    } finally {
      this.depth--;
    }
  }

  close() {
    this.cache.clear();
    this.raw.close();
  }
}
