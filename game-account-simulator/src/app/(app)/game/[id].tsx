import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import type { GamePass } from '@/api/types';
import { PlayerRow } from '@/components/PlayerRow';
import { invalidateEconomy, patchBalance, useGame, useLeaderboard, useMe } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { Segmented } from '@/ui/Chips';
import { GameThumb } from '@/ui/GameThumb';
import { GlyphIcon, Icon } from '@/ui/Icon';
import { compact, OrbAmount } from '@/ui/Orb';
import { Card, IconButton, Pill, ProgressBar, Row, StatTile } from '@/ui/primitives';
import { Header, Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';
import { formatDate } from '@/utils/format';

const HOW_TO: Record<string, string> = {
  orb_rush: 'Swipe or tap left/right to switch lanes. Dodge the blocks, grab the orbs — the track keeps speeding up.',
  stacker: 'Tap to drop the sliding block. Anything hanging over the edge is sliced off. Line it up perfectly for a bonus.',
  reflex: 'Tap blocks before they vanish. Gold blocks are worth triple. Never tap a skull!',
  glyph_match: 'Flip two cards at a time to find matching pairs. Chain matches for combos and clear the board fast for a time bonus.',
};

export default function GameDetail() {
  const t = useTheme();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useGame(id ?? '');
  const board = useLeaderboard(id ?? '');
  const me = useMe();
  const [tab, setTab] = useState<'about' | 'passes' | 'leaderboard'>('about');
  const [buying, setBuying] = useState<GamePass | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const intent = useRef<string | null>(null);

  if (g.isLoading) return <Screen header={<Header title="Experience" />}><LoadingList rows={4} height={140} /></Screen>;
  if (g.error || !g.data) return <Screen header={<Header title="Experience" />}><ErrorState error={g.error} onRetry={() => g.refetch()} /></Screen>;
  const game = g.data;
  const balance = me.data?.wallet.balance ?? 0;

  const vote = async (v: 1 | -1) => {
    try {
      await backend.rateGame(game.id, game.my_vote === v ? null : v);
      g.refetch();
    } catch (e) {
      toast.error("Couldn't rate", toAppError(e).message);
    }
  };
  const favorite = async () => {
    try {
      await backend.toggleGameFavorite(game.id);
      g.refetch();
      qc.invalidateQueries({ queryKey: ['profile'] });
    } catch (e) {
      toast.error("Couldn't favorite", toAppError(e).message);
    }
  };
  const buyPass = async () => {
    if (!buying) return;
    intent.current ??= randomUUID();
    setBusy(true);
    setErr(null);
    try {
      const r = await backend.purchaseGamePass(buying.id, buying.price, intent.current);
      patchBalance(qc, r);
      toast.success(`${buying.name} unlocked!`, 'Your perk applies from your next run.');
      toast.achievements(r.unlocked);
      invalidateEconomy(qc);
      qc.invalidateQueries({ queryKey: ['passes'] });
      g.refetch();
      setBuying(null);
      intent.current = null;
    } catch (e) {
      const ae = toAppError(e);
      setErr(ae.message);
      if (!ae.retryable) intent.current = null;
    } finally {
      setBusy(false);
    }
  };

  const capPct = game.daily_orb_cap ? Math.min(1, game.orbs_today / game.daily_orb_cap) : 0;
  return (
    <Screen header={<Header title={game.title} subtitle={`by ${game.creator_name}`} right={<IconButton icon={game.is_favorite ? 'star' : 'star-outline'} color={game.is_favorite ? t.gold : undefined} label={game.is_favorite ? 'Unfavorite' : 'Favorite'} onPress={favorite} />} />} refreshing={g.isRefetching} onRefresh={() => { g.refetch(); board.refetch(); }} testID="game-screen">
      <View>
        <GameThumb thumbnail={game.thumbnail} width={Math.min(width, 700) - space.lg * 2} height={(Math.min(width, 700) - space.lg * 2) * 0.56} radius={radius.xl} />
        <View style={{ position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6 }}>
          <Pill label={game.genre} color="#ffffff" solid={false} />
          <Pill label={`${compact(game.playing_now)} playing`} color={t.success} icon="ellipse" solid />
        </View>
      </View>
      <Text variant="body" tone="muted">
        {game.tagline}
      </Text>
      <Button title="Play" icon="play" size="lg" fullWidth onPress={() => router.push(`/play/${game.id}`)} testID="play-button" />
      <Row gap={space.sm}>
        <StatTile label="Visits" value={compact(game.visits)} icon="eye" />
        <StatTile label="Rating" value={game.rating != null ? `${game.rating}%` : '—'} icon="thumbs-up" color={t.success} />
        <StatTile label="Favorites" value={compact(game.favorites)} icon="star" color={t.gold} />
      </Row>
      <Card style={{ gap: space.sm }}>
        <Row justify="space-between">
          <Text variant="bodyStrong">Your stats</Text>
          <Text variant="small" tone="faint">
            {game.my_stats ? `Last played ${formatDate(game.my_stats.last_played_at)}` : 'Not played yet'}
          </Text>
        </Row>
        <Row gap={space.lg}>
          <View>
            <Text variant="small" tone="faint">
              Best
            </Text>
            <Text variant="heading" testID="my-best">{game.my_stats?.best_score.toLocaleString('en-US') ?? '—'}</Text>
          </View>
          <View>
            <Text variant="small" tone="faint">
              Plays
            </Text>
            <Text variant="heading">{game.my_stats?.plays ?? 0}</Text>
          </View>
          <View>
            <Text variant="small" tone="faint">
              Orbs earned
            </Text>
            <OrbAmount amount={game.my_stats?.total_orbs ?? 0} variant="heading" />
          </View>
        </Row>
        <View style={{ gap: 4, marginTop: 4 }}>
          <Row justify="space-between">
            <Text variant="small" tone="muted">
              Today's Orbs from this game
            </Text>
            <Text variant="small" tone="muted">
              {game.orbs_today}/{game.daily_orb_cap}
            </Text>
          </Row>
          <ProgressBar value={capPct} color={capPct >= 1 ? t.warning : t.gold} height={6} />
        </View>
        <Row gap={space.sm} style={{ marginTop: 4 }}>
          <Button title={`${compact(game.likes)}`} icon={game.my_vote === 1 ? 'thumbs-up' : 'thumbs-up-outline'} variant={game.my_vote === 1 ? 'primary' : 'secondary'} size="sm" style={{ flex: 1 }} disabled={!game.my_stats} onPress={() => vote(1)} testID="vote-up" />
          <Button title={`${compact(game.dislikes)}`} icon={game.my_vote === -1 ? 'thumbs-down' : 'thumbs-down-outline'} variant="secondary" size="sm" style={{ flex: 1 }} disabled={!game.my_stats} onPress={() => vote(-1)} testID="vote-down" />
        </Row>
        {!game.my_stats ? (
          <Text variant="small" tone="faint">
            Play once to rate this experience.
          </Text>
        ) : null}
      </Card>

      <Segmented testIDPrefix="gtab" value={tab} onChange={setTab} options={[{ value: 'about', label: 'About' }, { value: 'passes', label: 'Passes', count: game.passes.length }, { value: 'leaderboard', label: 'Leaderboard' }]} />

      {tab === 'about' ? (
        <Card style={{ gap: space.md }}>
          <Text variant="body">{game.description}</Text>
          <View style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 6 }}>
            <Row gap={8}>
              <Icon name="help-circle" size={18} color={t.accent} />
              <Text variant="bodyStrong">How to play</Text>
            </Row>
            <Text variant="caption" tone="muted">
              {HOW_TO[game.engine]}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            Rewards: 1 Orb per {game.score_per_orb} points, up to {game.max_orbs_per_session} per run and {game.daily_orb_cap} per day. Scores are verified by the server.
          </Text>
          <Text variant="small" tone="faint">
            Updated {formatDate(game.updated_at)} · Released {formatDate(game.created_at)}
          </Text>
        </Card>
      ) : tab === 'passes' ? (
        <View style={{ gap: space.sm }}>
          {game.passes.map((p) => (
            <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} testID={`gpass-${p.id}`}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `${p.icon.color}33`, alignItems: 'center', justifyContent: 'center' }}>
                <GlyphIcon glyph={p.icon.glyph} size={26} color={p.icon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{p.name}</Text>
                <Text variant="caption" tone="muted">
                  {p.description}
                </Text>
              </View>
              {p.owned ? (
                <Pill label="Owned" color={t.success} icon="checkmark" />
              ) : (
                <Button title={p.price.toLocaleString('en-US')} size="sm" variant="gold" onPress={() => { intent.current = randomUUID(); setErr(null); setBuying(p); }} testID={`buy-pass-${p.id}`} />
              )}
            </Card>
          ))}
        </View>
      ) : (
        <Card padded={false} style={{ paddingVertical: space.xs }}>
          {board.data?.me ? (
            <View style={{ padding: space.md, borderBottomWidth: 1, borderColor: t.border }}>
              <Text variant="caption" tone="primary">
                You're #{board.data.me.rank} with {board.data.me.best_score.toLocaleString('en-US')}
              </Text>
            </View>
          ) : null}
          {board.isLoading ? (
            <View style={{ padding: space.md }}>
              <LoadingList rows={5} height={44} />
            </View>
          ) : (
            (board.data?.entries ?? []).map((e) => (
              <PlayerRow
                key={e.user.id}
                user={e.user}
                subtitle={`${e.best_score.toLocaleString('en-US')} points`}
                right={
                  <Text variant="heading" tone={e.rank <= 3 ? 'gold' : e.is_me ? 'primary' : 'faint'} style={{ width: 40, textAlign: 'right' }}>
                    #{e.rank}
                  </Text>
                }
              />
            ))
          )}
        </Card>
      )}

      <Sheet
        visible={!!buying}
        onClose={() => !busy && setBuying(null)}
        title="Buy game pass"
        footer={<Button title={buying && balance < buying.price ? `Need ${(buying.price - balance).toLocaleString('en-US')} more Orbs` : `Buy for ${buying?.price.toLocaleString('en-US')} Orbs`} variant="gold" size="lg" fullWidth loading={busy} disabled={!buying || balance < buying.price} onPress={buyPass} testID="confirm-pass" />}
      >
        {buying ? (
          <>
            <Row gap={space.md}>
              <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: `${buying.icon.color}33`, alignItems: 'center', justifyContent: 'center' }}>
                <GlyphIcon glyph={buying.icon.glyph} size={30} color={buying.icon.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="heading">{buying.name}</Text>
                <Text variant="caption" tone="muted">
                  {game.title} · {buying.description}
                </Text>
              </View>
            </Row>
            <Card elevated style={{ gap: 8 }}>
              <Row justify="space-between">
                <Text tone="muted">Your balance</Text>
                <OrbAmount amount={balance} variant="bodyStrong" />
              </Row>
              <Row justify="space-between">
                <Text tone="muted">After purchase</Text>
                <OrbAmount amount={Math.max(0, balance - buying.price)} variant="bodyStrong" />
              </Row>
            </Card>
            {err ? (
              <Text variant="caption" tone="danger">
                {err}
              </Text>
            ) : null}
            <Text variant="small" tone="faint">
              Passes are permanent for this experience. Orbs are simulated and have no real value.
            </Text>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
