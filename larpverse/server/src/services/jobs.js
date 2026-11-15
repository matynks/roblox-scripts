import { app } from '../app.js';
import { now, parseJson } from '../util.js';
import { notify } from './notify.js';

/** Processes due rows from scheduled_jobs once a second. */
export function startJobWorker() {
  const handlers = {
    notification: (p) => {
      if (app.db.get('SELECT 1 FROM accounts WHERE id = ?', p.accountId)) notify(p.accountId, { ...p, force: true });
    },
  };
  const tick = () => {
    try {
      const due = app.db.all('SELECT * FROM scheduled_jobs WHERE done_at IS NULL AND run_at <= ? ORDER BY run_at LIMIT 50', now());
      for (const job of due) {
        app.db.tx(() => {
          const h = handlers[job.kind];
          if (h) h(parseJson(job.payload, {}));
          app.db.run('UPDATE scheduled_jobs SET done_at = ? WHERE id = ?', now(), job.id);
        });
      }
    } catch (e) {
      app.log('job worker error', e);
    }
  };
  const timer = setInterval(tick, 1000);
  timer.unref();
  return () => clearInterval(timer);
}
