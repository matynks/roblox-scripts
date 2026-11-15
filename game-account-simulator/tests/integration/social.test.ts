import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { closeDb, newPlayer, rpc, sql } from './helpers';

after(closeDb);

describe('friends', () => {
  it('runs the full request → accept flow with notifications', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    const sent = await rpc(a.client, 'send_friend_request', { p_target: b.id });
    assert.equal(sent.data.status, 'pending');
    assert.equal((await rpc(a.client, 'send_friend_request', { p_target: b.id })).code, 'REQUEST_PENDING');
    const inbox = await rpc(b.client, 'list_friend_requests');
    assert.equal(inbox.data.incoming.length, 1);
    assert.equal(inbox.data.incoming[0].user.username, a.username);
    const note = await b.client.from('notifications').select('kind').eq('kind', 'friend_request');
    assert.equal(note.data!.length, 1);
    const acc = await rpc(b.client, 'respond_friend_request', { p_request_id: sent.data.request_id, p_accept: true });
    assert.equal(acc.data.status, 'friends');
    const rows = await sql('select count(*)::int as n from public.friendships where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)', [a.id, b.id]);
    assert.equal(rows[0].n, 2, 'friendship stored symmetrically');
    assert.equal((await rpc(a.client, 'send_friend_request', { p_target: b.id })).code, 'ALREADY_FRIENDS');
    const list = await rpc(a.client, 'list_connections', { p_user: a.id, p_kind: 'friends' });
    assert.equal(list.data[0].username, b.username);
    await rpc(a.client, 'remove_friend', { p_target: b.id });
    const after = await sql('select count(*)::int as n from public.friendships where user_id = $1', [a.id]);
    assert.equal(after[0].n, 0);
  });

  it('accepts a crossed request automatically and supports decline/cancel', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    await rpc(a.client, 'send_friend_request', { p_target: b.id });
    const crossed = await rpc(b.client, 'send_friend_request', { p_target: a.id });
    assert.equal(crossed.data.status, 'friends', 'sending back accepts the pending request');
    const c = await newPlayer();
    const r = await rpc(a.client, 'send_friend_request', { p_target: c.id });
    assert.equal((await rpc(a.client, 'respond_friend_request', { p_request_id: r.data.request_id, p_accept: true })).code, 'REQUEST_NOT_FOUND', 'sender cannot accept own request');
    await rpc(c.client, 'respond_friend_request', { p_request_id: r.data.request_id, p_accept: false });
    const r2 = await rpc(a.client, 'send_friend_request', { p_target: c.id });
    assert.equal((await rpc(a.client, 'cancel_friend_request', { p_request_id: r2.data.request_id })).code, null);
  });

  it('simulated players accept instantly; privacy settings are honoured', async () => {
    const a = await newPlayer();
    const [npc] = await sql(`select id from public.profiles where is_npc order by username limit 1`);
    const r = await rpc(a.client, 'send_friend_request', { p_target: npc.id });
    assert.equal(r.data.status, 'friends');
    const b = await newPlayer();
    await b.client.from('user_settings').update({ allow_friend_requests: false }).eq('user_id', b.id);
    assert.equal((await rpc(a.client, 'send_friend_request', { p_target: b.id })).code, 'NOT_ACCEPTING');
    await b.client.from('user_settings').update({ friends_visibility: 'nobody' }).eq('user_id', b.id);
    assert.equal((await rpc(a.client, 'list_connections', { p_user: b.id, p_kind: 'followers' })).code, 'PRIVATE_LIST');
    assert.equal((await rpc(a.client, 'send_friend_request', { p_target: a.id })).code, 'INVALID_TARGET');
  });
});

describe('follows', () => {
  it('follows, notifies, lists and unfollows', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    const f = await rpc(a.client, 'follow_user', { p_target: b.id });
    assert.equal(f.data.status, 'following');
    const followers = await rpc(b.client, 'list_connections', { p_user: b.id, p_kind: 'followers' });
    assert.equal(followers.data[0].username, a.username);
    const n = await b.client.from('notifications').select('title').eq('kind', 'new_follower');
    assert.equal(n.data!.length, 1);
    const prof = await rpc(b.client, 'get_profile', { p_username: a.username });
    assert.equal(prof.data.relationship.follows_you, true);
    await rpc(a.client, 'unfollow_user', { p_target: b.id });
    const after = await rpc(b.client, 'list_connections', { p_user: b.id, p_kind: 'followers' });
    assert.equal(after.data.length, 0);
  });
});

describe('blocking and reporting', () => {
  it('blocking severs every connection and prevents contact', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    await rpc(a.client, 'send_friend_request', { p_target: b.id });
    await rpc(b.client, 'send_friend_request', { p_target: a.id });
    await rpc(a.client, 'follow_user', { p_target: b.id });
    await rpc(b.client, 'follow_user', { p_target: a.id });
    assert.equal((await rpc(a.client, 'block_user', { p_target: b.id })).code, null);
    const links = await sql(
      `select (select count(*) from public.friendships where user_id in ($1, $2))::int as f,
              (select count(*) from public.follows where follower_id in ($1, $2) and followee_id in ($1, $2))::int as fo`, [a.id, b.id]);
    assert.deepEqual([links[0].f, links[0].fo], [0, 0]);
    assert.equal((await rpc(b.client, 'send_friend_request', { p_target: a.id })).code, 'USER_UNAVAILABLE');
    assert.equal((await rpc(b.client, 'follow_user', { p_target: a.id })).code, 'USER_UNAVAILABLE');
    assert.equal((await rpc(b.client, 'get_profile', { p_username: a.username })).code, 'USER_UNAVAILABLE');
    const search = await rpc(b.client, 'search_users', { p_query: a.username });
    assert.equal(search.data.length, 0, 'blockers are hidden from the blocked player\'s search');
    const blocked = await rpc(a.client, 'list_blocked_users');
    assert.equal(blocked.data[0].username, b.username);
    await rpc(a.client, 'unblock_user', { p_target: b.id });
    assert.equal((await rpc(b.client, 'follow_user', { p_target: a.id })).code, null);
  });

  it('files reports that only developers can read', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    assert.equal((await rpc(a.client, 'report_user', { p_target: b.id, p_reason: 'harassment', p_details: 'spam messages' })).code, null);
    const [row] = await sql('select reason from public.reports where reporter_id = $1', [a.id]);
    assert.equal(row.reason, 'harassment');
  });
});

describe('profiles, search and feed', () => {
  it('returns a rich profile, search results and a friends feed', async () => {
    const a = await newPlayer();
    const [npc] = await sql(`select id, username from public.profiles where is_npc order by level desc limit 1`);
    await rpc(a.client, 'send_friend_request', { p_target: npc.id });
    const prof = await rpc(a.client, 'get_profile', { p_username: npc.username });
    assert.equal(prof.code, null);
    assert.equal(prof.data.relationship.is_friend, true);
    assert.ok(prof.data.badges.length > 0);
    assert.ok(prof.data.top_games.length > 0);
    assert.ok(Array.isArray(prof.data.showcase));
    const search = await rpc(a.client, 'search_users', { p_query: npc.username.slice(0, 5) });
    assert.ok(search.data.some((u: any) => u.username === npc.username));
    const feed = await rpc(a.client, 'get_feed', { p_limit: 50 });
    assert.ok(feed.data.some((e: any) => e.user.id === npc.id), 'friend activity appears in the feed');
    const marked = await rpc(a.client, 'mark_notifications_read', { p_ids: null });
    assert.ok(marked.data >= 1);
    const me = await rpc(a.client, 'get_me');
    assert.equal(me.data.counts.unread_notifications, 0);
  });
});
