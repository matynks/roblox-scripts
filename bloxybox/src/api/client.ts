import { onlineManager } from '@tanstack/react-query';

import { getSupabase, hasSupabase } from '@/lib/supabase';

import { AppError, toAppError } from './errors';

export function requireOnline(): void {
  if (!onlineManager.isOnline()) {
    throw new AppError('NETWORK');
  }
}

/** Calls a Postgres function through PostgREST and normalises errors. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!hasSupabase()) throw new AppError('NOT_CONFIGURED');
  try {
    const { data, error } = await getSupabase().rpc(fn, args ?? {});
    if (error) throw error;
    return data as T;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Runs a select and normalises errors. */
export async function select<T>(
  run: (client: ReturnType<typeof getSupabase>) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T> {
  if (!hasSupabase()) throw new AppError('NOT_CONFIGURED');
  try {
    const { data, error } = await run(getSupabase());
    if (error) throw error;
    return data as T;
  } catch (error) {
    throw toAppError(error);
  }
}

/** Numeric columns (bigint/numeric) arrive as numbers or strings depending on size; normalise. */
export function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
