import { app } from '../app.js';
import { requireActiveAccount, requireAuth } from '../auth.js';
import { E } from '../http.js';
import { BODY_TYPES, equipItem, getAvatar, outfitView, resetAvatar, saveOutfit, setBody, unequipItem, wearOutfit } from '../services/avatar.js';
import { now } from '../util.js';
import { v, check } from '../validate.js';

export const bodyColorsSchema = v.object({
  head: v.color().optional(), torso: v.color().optional(), leftArm: v.color().optional(),
  rightArm: v.color().optional(), leftLeg: v.color().optional(), rightLeg: v.color().optional(),
}, { strict: true });

export default function register(r) {
  r.get('/api/avatar', requireAuth, (ctx) => getAvatar(ctx.account.id));
  r.get('/api/accounts/:id/avatar', (ctx) => {
    if (!app.db.get('SELECT 1 FROM accounts WHERE id = ?', Number(ctx.params.id))) throw E.notFound('Account not found');
    return getAvatar(Number(ctx.params.id));
  });

  r.patch('/api/avatar', requireActiveAccount, (ctx) => {
    const body = check(v.object({ bodyColors: bodyColorsSchema.optional(), bodyType: v.enum(BODY_TYPES).optional() }), ctx.body);
    return setBody(ctx.account.id, body);
  });

  r.post('/api/avatar/equip', requireActiveAccount, (ctx) => {
    const { itemId } = check(v.object({ itemId: v.int({ min: 1 }) }), ctx.body);
    return equipItem(ctx.account.id, itemId);
  });

  r.post('/api/avatar/unequip', requireActiveAccount, (ctx) => {
    const { itemId } = check(v.object({ itemId: v.int({ min: 1 }) }), ctx.body);
    return unequipItem(ctx.account.id, itemId);
  });

  r.post('/api/avatar/reset', requireActiveAccount, (ctx) => resetAvatar(ctx.account.id));

  r.get('/api/avatar/outfits', requireAuth, (ctx) => ({
    outfits: app.db.all('SELECT * FROM outfits WHERE account_id = ? ORDER BY updated_at DESC', ctx.account.id).map(outfitView),
  }));

  r.post('/api/avatar/outfits', requireActiveAccount, (ctx) => {
    const { name } = check(v.object({ name: v.string({ min: 1, max: 40 }) }), ctx.body);
    ctx.status = 201;
    return saveOutfit(ctx.account.id, name);
  });

  r.patch('/api/avatar/outfits/:id', requireActiveAccount, (ctx) => {
    const { name, updateLook } = check(v.object({ name: v.string({ min: 1, max: 40 }).optional(), updateLook: v.bool().optional() }), ctx.body);
    const { db } = app;
    const o = db.get('SELECT * FROM outfits WHERE id = ? AND account_id = ?', Number(ctx.params.id), ctx.account.id);
    if (!o) throw E.notFound('Outfit not found');
    if (name) db.run('UPDATE outfits SET name = ?, updated_at = ? WHERE id = ?', name, now(), o.id);
    if (updateLook) {
      const cur = getAvatar(ctx.account.id);
      db.run('UPDATE outfits SET data = ?, updated_at = ? WHERE id = ?',
        JSON.stringify({ bodyColors: cur.bodyColors, bodyType: cur.bodyType, itemIds: cur.equipped.map((e) => e.itemId) }), now(), o.id);
    }
    return outfitView(db.get('SELECT * FROM outfits WHERE id = ?', o.id));
  });

  r.delete('/api/avatar/outfits/:id', requireAuth, (ctx) => {
    const n = app.db.run('DELETE FROM outfits WHERE id = ? AND account_id = ?', Number(ctx.params.id), ctx.account.id).changes;
    if (!n) throw E.notFound('Outfit not found');
    return { ok: true };
  });

  r.post('/api/avatar/outfits/:id/wear', requireActiveAccount, (ctx) => wearOutfit(ctx.account.id, Number(ctx.params.id)));
}
