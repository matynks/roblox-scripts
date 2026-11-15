import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { anonClient, closeDb, latestEmailTo, newPlayer, rpc, sql, uniqueUsername } from './helpers';

after(closeDb);

describe('registration', () => {
  it('initialises a complete simulated account server-side', async () => {
    const p = await newPlayer({ displayName: 'Test Player' });
    const [profile] = await sql('select * from public.profiles where id = $1', [p.id]);
    assert.equal(profile.username, p.username);
    assert.equal(profile.display_name, 'Test Player');
    assert.ok(profile.terms_accepted_at, 'terms acceptance recorded');

    // 750 welcome bonus + 50 for the "Welcome Aboard" achievement
    const me = await rpc(p.client, 'get_me');
    assert.equal(me.code, null);
    assert.equal(me.data.wallet.balance, 800);
    assert.equal(me.data.access.is_developer, false);
    assert.equal(me.data.daily.can_claim, true);

    const ledger = await sql('select kind, amount, balance_after from public.currency_transactions where user_id = $1 order by created_at', [p.id]);
    assert.deepEqual(ledger.map((r) => [r.kind, Number(r.amount)]), [['signup_bonus', 750], ['achievement_reward', 50]]);

    const inv = await sql('select count(*)::int as n from public.inventory_items where user_id = $1', [p.id]);
    assert.equal(inv[0].n, 12, 'starter items granted');
    const [avatar] = await sql('select equipped from public.avatars where user_id = $1', [p.id]);
    for (const slot of ['hair', 'face', 'shirt', 'pants', 'shoes']) assert.ok(avatar.equipped[slot], `${slot} equipped`);

    const notes = await p.client.from('notifications').select('title');
    assert.ok(notes.data!.some((n) => n.title === 'Welcome to Blockora!'));
  });

  it('rejects taken, invalid and terms-less sign-ups', async () => {
    const first = await newPlayer();
    const c = anonClient();
    const dup = await c.auth.signUp({
      email: `${uniqueUsername().toLowerCase()}@test.blockora.dev`,
      password: 'Passw0rd!xyz',
      options: { data: { username: first.username.toUpperCase(), terms_accepted: true } },
    });
    assert.ok(dup.error, 'case-insensitive duplicate username rejected');

    const bad = await c.auth.signUp({
      email: `${uniqueUsername().toLowerCase()}@test.blockora.dev`,
      password: 'Passw0rd!xyz',
      options: { data: { username: '_bad__name', terms_accepted: true } },
    });
    assert.ok(bad.error, 'invalid username rejected');

    const noTerms = await c.auth.signUp({
      email: `${uniqueUsername().toLowerCase()}@test.blockora.dev`,
      password: 'Passw0rd!xyz',
      options: { data: { username: uniqueUsername() } },
    });
    assert.ok(noTerms.error, 'terms required');

    const weak = await c.auth.signUp({
      email: `${uniqueUsername().toLowerCase()}@test.blockora.dev`,
      password: 'short',
      options: { data: { username: uniqueUsername(), terms_accepted: true } },
    });
    assert.ok(weak.error, 'weak password rejected by auth policy');
  });

  it('lets signed-out visitors check username availability (and nothing else)', async () => {
    const p = await newPlayer();
    const c = anonClient();
    const taken = await rpc(c, 'check_username_available', { p_username: p.username });
    assert.deepEqual(taken.data, { available: false, reason: 'USERNAME_TAKEN' });
    const free = await rpc(c, 'check_username_available', { p_username: uniqueUsername() });
    assert.equal(free.data.available, true);
    const invalid = await rpc(c, 'check_username_available', { p_username: 'a' });
    assert.equal(invalid.data.reason, 'INVALID_USERNAME');

    const profiles = await c.from('profiles').select('id').limit(1);
    assert.ok(profiles.error || profiles.data!.length === 0, 'anon cannot read profiles');
    const me = await rpc(c, 'get_me');
    assert.ok(me.code, 'anon cannot call player RPCs');
  });
});

describe('sessions', () => {
  it('logs in, refreshes, and logs out', async () => {
    const p = await newPlayer();
    await p.client.auth.signOut();
    const c = anonClient();
    const wrong = await c.auth.signInWithPassword({ email: p.email, password: 'nope-nope-1' });
    assert.ok(wrong.error, 'wrong password rejected');
    const ok = await c.auth.signInWithPassword({ email: p.email, password: p.password });
    assert.equal(ok.error, null);
    const refreshed = await c.auth.refreshSession();
    assert.equal(refreshed.error, null);
    assert.ok(refreshed.data.session?.access_token);
    const me = await rpc(c, 'get_me');
    assert.equal(me.data.profile.username, p.username);
    await c.auth.signOut();
    const after = await rpc(c, 'get_me');
    assert.ok(after.code, 'signed-out client can no longer read the account');
  });

  it('recovers a password with the emailed 6-digit code', async () => {
    const p = await newPlayer();
    const c = anonClient();
    const req = await c.auth.resetPasswordForEmail(p.email);
    assert.equal(req.error, null);
    const mail = await latestEmailTo(p.email);
    assert.ok(mail, 'recovery email delivered');
    assert.match(mail!.subject, /Reset your Blockora password/);
    const code = mail!.text.match(/\b(\d{6})\b/)?.[1];
    assert.ok(code, 'email contains a 6-digit code');
    const verified = await c.auth.verifyOtp({ email: p.email, token: code!, type: 'recovery' });
    assert.equal(verified.error, null);
    const updated = await c.auth.updateUser({ password: 'N3wPassword!42' });
    assert.equal(updated.error, null);
    await c.auth.signOut();
    const old = await anonClient().auth.signInWithPassword({ email: p.email, password: p.password });
    assert.ok(old.error, 'old password no longer works');
    const fresh = await anonClient().auth.signInWithPassword({ email: p.email, password: 'N3wPassword!42' });
    assert.equal(fresh.error, null);
  });

  it('blocks suspended accounts from player RPCs', async () => {
    const p = await newPlayer();
    await sql(`update public.profiles set account_status = 'suspended' where id = $1`, [p.id]);
    const me = await rpc(p.client, 'get_me');
    assert.equal(me.code, 'ACCOUNT_SUSPENDED');
  });
});
