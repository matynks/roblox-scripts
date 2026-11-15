import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

/**
 * Integration helpers against a LOCAL Supabase stack (`npx supabase start`).
 * The anon key below is the public, well-known key of the local development
 * stack — it is not a secret and is never used against a hosted project.
 */
export const API_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const DB_URL = process.env.SUPABASE_TEST_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
export const MAILPIT_URL = process.env.SUPABASE_TEST_MAILPIT_URL ?? 'http://127.0.0.1:54324';

if (!/^(http:\/\/)?(127\.0\.0\.1|localhost)/.test(API_URL) || !/@(127\.0\.0\.1|localhost):/.test(DB_URL)) {
  throw new Error('Integration tests only run against a local Supabase stack.');
}

const pool = new pg.Pool({ connectionString: DB_URL, max: 4 });
export async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
export async function closeDb() {
  await pool.end();
}

export function anonClient(): SupabaseClient {
  return createClient(API_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface Player {
  client: SupabaseClient;
  id: string;
  username: string;
  email: string;
  password: string;
}

let counter = 0;
export function uniqueUsername(prefix = 'T'): string {
  counter++;
  return `${prefix}${Date.now().toString(36)}${counter}${Math.floor(Math.random() * 1000)}`.slice(0, 20);
}

export async function newPlayer(opts: { username?: string; displayName?: string } = {}): Promise<Player> {
  const client = anonClient();
  const username = opts.username ?? uniqueUsername();
  const email = `${username.toLowerCase()}@test.blockora.dev`;
  const password = 'Passw0rd!' + Math.random().toString(36).slice(2, 8);
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: opts.displayName ?? username, terms_accepted: true } },
  });
  if (error) throw error;
  if (!data.session) throw new Error('Expected a session (local stack has email confirmation disabled)');
  return { client, id: data.user!.id, username, email, password };
}

export const idem = () => randomUUID();

/** Calls an RPC and returns { data, code, hint }. */
export async function rpc(client: SupabaseClient, fn: string, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc(fn, args);
  return { data: data as any, code: error?.message ?? null, hint: (error as any)?.hint ?? null, error };
}

export async function balanceOf(userId: string): Promise<number> {
  const [row] = await sql<{ balance: string }>('select balance from public.wallets where user_id = $1', [userId]);
  return Number(row.balance);
}

export async function makeDeveloper(userId: string, role: 'developer' | 'owner' = 'developer') {
  await sql(
    `insert into public.developer_roles (user_id, role, note) values ($1, $2, 'integration test')
     on conflict (user_id) do update set role = excluded.role`,
    [userId, role],
  );
}

/** Moves a game session's start time into the past (simulates time played). */
export async function backdateSession(sessionId: string, seconds: number) {
  await sql(`update public.game_sessions set started_at = now() - make_interval(secs => $2) where id = $1`, [sessionId, seconds]);
}

export async function latestEmailTo(address: string): Promise<{ text: string; subject: string } | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
    if (res.ok) {
      const body: any = await res.json();
      const msg = body.messages?.[0];
      if (msg) {
        const full: any = await (await fetch(`${MAILPIT_URL}/api/v1/message/${msg.ID}`)).json();
        return { text: full.Text ?? full.HTML ?? '', subject: full.Subject ?? '' };
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}
