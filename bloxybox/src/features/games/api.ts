import type { QueryClient } from '@tanstack/react-query';

import { num, requireOnline, rpc } from '@/api/client';
import { queryKeys } from '@/api/keys';
import type { GameResult, GameSessionStart } from '@/api/types';
import { applyServerBalance, invalidateEconomy } from '@/features/wallet/api';

export async function startGameSession(slug: string): Promise<GameSessionStart> {
  requireOnline();
  return rpc<GameSessionStart>('start_game_session', { p_slug: slug });
}

export async function submitGameResult(
  client: QueryClient,
  input: { sessionId: string; slug: string; score: number; outcome: 'win' | 'loss'; durationMs: number },
): Promise<GameResult> {
  const result = await rpc<GameResult>('submit_game_result', {
    p_session_id: input.sessionId,
    p_score: Math.max(0, Math.floor(input.score)),
    p_outcome: input.outcome,
    p_duration_ms: Math.max(0, Math.round(input.durationMs)),
  });

  if (result.accepted) {
    const balance = num(result.balance);
    applyServerBalance(client, balance);
    invalidateEconomy(client);
    void client.invalidateQueries({ queryKey: queryKeys.progress });
    void client.invalidateQueries({ queryKey: queryKeys.leaderboard(input.slug) });
    void client.invalidateQueries({ queryKey: queryKeys.experiences });
    void client.invalidateQueries({ queryKey: ['profile'] });
    return { ...result, reward: num(result.reward), balance };
  }
  return result;
}

export const REJECTION_MESSAGES: Record<Extract<GameResult, { accepted: false }>['reason'], string> = {
  session_expired: 'This run took too long and expired, so no reward was given.',
  score_rate_exceeded: "This score couldn't be verified, so no reward was given.",
  win_not_plausible: "This win couldn't be verified, so no reward was given.",
};
