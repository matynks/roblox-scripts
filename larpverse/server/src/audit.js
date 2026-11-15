import { app } from './app.js';
import { now, toJson } from './util.js';

/** Records an operation in the append-only audit log. */
export function audit(ctx, action, targetType = null, targetId = null, details = {}) {
  app.db.run(
    `INSERT INTO audit_logs (user_id, acting_account_id, action, target_type, target_id, details, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ctx?.user?.id ?? null, ctx?.account?.id ?? null, action, targetType, targetId, toJson(details), ctx?.ip ?? null, now(),
  );
}
