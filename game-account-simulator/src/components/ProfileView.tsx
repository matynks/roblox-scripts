import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { backend } from '@/api';
import type { PublicProfile } from '@/api/types';
import { AvatarView, Headshot, ItemThumb } from '@/avatar/AvatarView';
import { PROFILE_THEMES } from '@/content/progression';
import { useCatalog, useMe, useProfile, useSocialAction, useUserActivity } from '@/hooks/queries';
import { Button } from '@/ui/Button';
import { GameThumb } from '@/ui/GameThumb';
import { GlyphIcon, Icon } from '@/ui/Icon';
import { Card, GradientFill, IconButton, Pill, Row } from '@/ui/primitives';
import { Screen, SectionHeader } from '@/ui/Screen';
import { Sheet, useConfirm } from '@/ui/Sheet';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/Toast';
import { RARITY_COLORS, radius, space, useTheme } from '@/ui/theme';
import { formatDate } from '@/utils/format';

import { FeedItem } from './FeedItem';
import { OnlineDot } from './PlayerRow';

const REPORT_REASONS = [
  ['spam', 'Spam'],
  ['harassment', 'Harassment or bullying'],
  ['inappropriate_profile', 'Inappropriate profile'],
  ['cheating', 'Cheating or exploiting'],
  ['impersonation', 'Impersonation'],
  ['other', 'Something else'],
] as const;

function Stat({ label, value, onPress, testID }: { label: string; value: number | string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="heading">{typeof value === 'number' ? value.toLocaleString('en-US') : value}</Text>
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

function RelationshipActions({ p }: { p: PublicProfile }) {
  const t = useTheme();
  const act = useSocialAction();
  const { confirm, element } = useConfirm();
  const [more, setMore] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState('');
  const r = p.relationship;
  const name = p.profile.display_name;
  const busy = act.isPending;

  if (r.is_blocked) {
    return (
      <>
        <Button title="Unblock" icon="lock-open" variant="secondary" fullWidth loading={busy} onPress={() => act.mutate({ type: 'unblock', userId: p.profile.id, name })} testID="profile-unblock" />
        {element}
      </>
    );
  }

  return (
    <View style={{ gap: space.sm }}>
      <Row gap={space.sm}>
        {r.is_friend ? (
          <Button title="Friends" icon="people" variant="secondary" style={{ flex: 1 }} onPress={() => setMore(true)} testID="profile-friends-btn" />
        ) : r.incoming_request_id ? (
          <Button title="Accept request" icon="checkmark" style={{ flex: 1 }} loading={busy} onPress={() => act.mutate({ type: 'accept', requestId: r.incoming_request_id!, name })} testID="profile-accept" />
        ) : r.outgoing_request_id ? (
          <Button title="Requested" icon="time" variant="secondary" style={{ flex: 1 }} loading={busy} onPress={() => act.mutate({ type: 'cancel', requestId: r.outgoing_request_id! })} testID="profile-cancel-request" />
        ) : (
          <Button title="Add friend" icon="person-add" style={{ flex: 1 }} loading={busy} onPress={() => act.mutate({ type: 'friend', userId: p.profile.id, name })} testID="profile-add-friend" />
        )}
        <Button
          title={r.is_following ? 'Following' : r.follows_you ? 'Follow back' : 'Follow'}
          icon={r.is_following ? 'checkmark' : 'add'}
          variant={r.is_following ? 'secondary' : 'outline'}
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => act.mutate({ type: r.is_following ? 'unfollow' : 'follow', userId: p.profile.id, name })}
          testID="profile-follow"
        />
        <IconButton icon="ellipsis-horizontal" label="More actions" size={46} onPress={() => setMore(true)} />
      </Row>
      <Sheet visible={more} onClose={() => setMore(false)} title={name}>
        {r.is_friend ? (
          <Button
            title="Remove friend"
            icon="person-remove"
            variant="secondary"
            fullWidth
            onPress={async () => {
              setMore(false);
              if (await confirm({ title: `Remove ${name}?`, message: 'You will no longer be friends. You can send a new request later.', confirmLabel: 'Remove', destructive: true, icon: 'person-remove' })) act.mutate({ type: 'unfriend', userId: p.profile.id });
            }}
          />
        ) : null}
        <Button title="Report player" icon="flag" variant="secondary" fullWidth onPress={() => { setMore(false); setReporting(true); }} testID="profile-report" />
        <Button
          title="Block player"
          icon="ban"
          variant="danger"
          fullWidth
          testID="profile-block"
          onPress={async () => {
            setMore(false);
            if (await confirm({ title: `Block ${name}?`, message: 'They will be removed from your friends and followers and won’t be able to contact you or see your profile.', confirmLabel: 'Block', destructive: true, icon: 'ban' })) act.mutate({ type: 'block', userId: p.profile.id, name });
          }}
        />
      </Sheet>
      <Sheet
        visible={reporting}
        onClose={() => setReporting(false)}
        title={`Report ${name}`}
        footer={
          <Button
            title="Send report"
            variant="danger"
            fullWidth
            testID="report-submit"
            onPress={async () => {
              try {
                await backend.report(p.profile.id, reason, details);
                toast.success('Report sent', 'Thanks — our team will review it.');
                setReporting(false);
                setDetails('');
              } catch (e: any) {
                toast.error("Couldn't send report", e?.message);
              }
            }}
          />
        }
      >
        <View style={{ gap: 6 }}>
          {REPORT_REASONS.map(([v, label]) => (
            <Pressable key={v} onPress={() => setReason(v)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: reason === v ? t.dangerSoft : t.surfaceAlt }}>
              <Icon name={reason === v ? 'radio-button-on' : 'radio-button-off'} size={18} color={reason === v ? t.danger : t.textFaint} />
              <Text variant="bodyStrong">{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextField label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={500} placeholder="What happened?" />
      </Sheet>
      {element}
    </View>
  );
}

export function ProfileView({ username, isSelfTab = false }: { username: string; isSelfTab?: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const q = useProfile(username);
  const me = useMe();
  const catalog = useCatalog();
  const activity = useUserActivity(q.data?.profile.id, !!q.data?.visibility.activity);

  if (q.isLoading) return <LoadingList rows={4} height={120} />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;
  const self = p.relationship.is_self;
  const theme = PROFILE_THEMES.find((x) => x.key === p.profile.profile_theme) ?? PROFILE_THEMES[0];
  const tileW = (Math.min(width, 700) - space.lg * 2 - space.sm * 3) / 4;
  const card = p.card;

  return (
    <View style={{ gap: space.lg }} testID="profile-view">
      <GradientFill colors={[theme.colors[0], theme.colors[1]]} style={{ borderRadius: radius.xl, overflow: 'hidden', paddingTop: space.lg }}>
        <View style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <Row align="flex-end" style={{ paddingHorizontal: space.lg }}>
          <AvatarView config={card.avatar} size={Math.min(150, width * 0.36)} />
          <View style={{ flex: 1, paddingBottom: space.lg, gap: 4 }}>
            <Row gap={6}>
              <OnlineDot online={card.is_online} />
              <Text variant="small" color="rgba(255,255,255,0.9)">
                {card.is_online == null ? 'Status hidden' : card.is_online ? 'Online' : 'Offline'}
              </Text>
            </Row>
            <Text variant="title" color="#fff" numberOfLines={1} testID="profile-display-name">
              {p.profile.display_name}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.85)" testID="profile-username">
              @{p.profile.username}
            </Text>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text variant="small" color="#fff">
                  LV {p.profile.level}
                </Text>
              </View>
              {p.profile.is_npc ? (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text variant="small" color="#fff">
                    SIMULATED PLAYER
                  </Text>
                </View>
              ) : null}
            </Row>
          </View>
        </Row>
      </GradientFill>

      {p.profile.status_text ? (
        <Row gap={8}>
          <Icon name="chatbubble-ellipses" size={16} color={t.accent} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {p.profile.status_text}
          </Text>
        </Row>
      ) : null}

      <Card padded={false} style={{ paddingVertical: space.md }}>
        <Row>
          <Stat label="Friends" value={p.counts.friends} testID="stat-friends" onPress={() => router.push({ pathname: '/friends', params: { userId: p.profile.id, username: p.profile.username, tab: 'friends' } })} />
          <Stat label="Followers" value={p.counts.followers} testID="stat-followers" onPress={() => router.push({ pathname: '/friends', params: { userId: p.profile.id, username: p.profile.username, tab: 'followers' } })} />
          <Stat label="Following" value={p.counts.following} testID="stat-following" onPress={() => router.push({ pathname: '/friends', params: { userId: p.profile.id, username: p.profile.username, tab: 'following' } })} />
        </Row>
      </Card>

      {self ? (
        <Row gap={space.sm}>
          <Button title="Edit profile" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/edit-profile')} testID="edit-profile" />
          <Button title="Customize" icon="color-palette-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/avatar')} />
          {isSelfTab ? <IconButton icon="settings-outline" label="Settings" size={46} onPress={() => router.push('/settings')} /> : null}
        </Row>
      ) : (
        <RelationshipActions p={p} />
      )}

      <Card style={{ gap: space.sm }}>
        <Text variant="label" tone="muted">
          About
        </Text>
        <Text variant="body" tone={p.profile.bio ? 'default' : 'faint'}>
          {p.profile.bio || (self ? 'Tell the world about yourself — tap Edit profile.' : 'No bio yet.')}
        </Text>
        <Row gap={space.lg} style={{ marginTop: 4, flexWrap: 'wrap' }}>
          <Row gap={5}>
            <Icon name="calendar-outline" size={14} color={t.textMuted} />
            <Text variant="caption" tone="muted">
              Joined {formatDate(p.profile.created_at)}
            </Text>
          </Row>
          <Row gap={5}>
            <Icon name="game-controller-outline" size={14} color={t.textMuted} />
            <Text variant="caption" tone="muted">
              {p.counts.games_played.toLocaleString('en-US')} games played
            </Text>
          </Row>
          {p.counts.items != null ? (
            <Row gap={5}>
              <Icon name="cube-outline" size={14} color={t.textMuted} />
              <Text variant="caption" tone="muted">
                {p.counts.items} items
              </Text>
            </Row>
          ) : null}
        </Row>
      </Card>

      {self && isSelfTab ? (
        <Card padded={false}>
          {[
            ['cube', 'Inventory', '/inventory', 'inventory-link'],
            ['albums', 'Saved outfits', '/outfits', 'outfits-link'],
            ['trophy', 'Achievements', '/achievements', 'achievements-link'],
            ['analytics', 'Account analytics', '/analytics', 'analytics-link'],
            ['receipt', 'Transactions', '/transactions', 'transactions-link'],
          ].map(([icon, label, href, id], i) => (
            <Pressable key={href} testID={id} onPress={() => router.push(href as any)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingHorizontal: space.lg, backgroundColor: pressed ? t.surfacePressed : 'transparent', borderTopWidth: i ? 1 : 0, borderColor: t.border })}>
              <Icon name={icon as any} size={20} color={t.primary} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {label}
              </Text>
              <Icon name="chevron-forward" size={18} color={t.textFaint} />
            </Pressable>
          ))}
        </Card>
      ) : null}

      <SectionHeader title={`Badges · ${p.badges.length}`} action={self ? 'All' : undefined} onAction={() => router.push('/achievements')} />
      {p.badges.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
          {p.badges.map((b) => (
            <View key={b.key} style={{ width: 84, alignItems: 'center', gap: 6, padding: space.sm, borderRadius: radius.md, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
                <GlyphIcon glyph={b.icon} size={22} color={t.gold} />
              </View>
              <Text variant="small" align="center" numberOfLines={2}>
                {b.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text variant="caption" tone="faint">
          No badges yet.
        </Text>
      )}

      {p.showcase ? (
        <>
          <SectionHeader title="Collection showcase" action={self ? 'Inventory' : undefined} onAction={() => router.push('/inventory')} />
          {p.showcase.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {p.showcase.slice(0, 8).map((id) => {
                const c = catalog.byId.get(id);
                if (!c) return null;
                return (
                  <Pressable key={id} onPress={() => router.push(`/item/${id}`)} style={{ width: tileW, height: tileW, borderRadius: radius.md, backgroundColor: t.surfaceAlt, overflow: 'hidden' }} accessibilityLabel={c.name}>
                    <View style={{ height: 3, backgroundColor: RARITY_COLORS[c.rarity] }} />
                    <ItemThumb itemId={id} slot={c.slot} size={tileW - 3} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text variant="caption" tone="faint">
              Nothing to show yet.
            </Text>
          )}
        </>
      ) : (
        <Card>
          <Row gap={8}>
            <Icon name="lock-closed" size={16} color={t.textMuted} />
            <Text variant="caption" tone="muted">
              This player's inventory is private.
            </Text>
          </Row>
        </Card>
      )}

      {p.top_games.length ? (
        <>
          <SectionHeader title="Top experiences" />
          <View style={{ gap: space.sm }}>
            {p.top_games.slice(0, 4).map((g) => (
              <Pressable key={g.game_id} onPress={() => router.push(`/game/${g.game_id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, backgroundColor: pressed ? t.surfacePressed : t.surface })}>
                <GameThumb thumbnail={g.thumbnail} width={64} height={42} radius={10} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{g.title}</Text>
                  <Text variant="caption" tone="muted">
                    {g.plays} plays · best {g.best_score.toLocaleString('en-US')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {p.public_outfits.length ? (
        <>
          <SectionHeader title="Shared outfits" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
            {p.public_outfits.map((o) => (
              <Pressable key={o.id} onPress={() => router.push({ pathname: '/outfits', params: { tryOn: o.id, name: o.name } })} style={{ width: 120, alignItems: 'center', borderRadius: radius.md, backgroundColor: t.surface, paddingBottom: space.sm }}>
                <AvatarView config={o} size={100} animated={false} />
                <Text variant="small" numberOfLines={1}>
                  {o.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="Recent activity" />
      {p.visibility.activity ? (
        <Card padded={false} style={{ paddingHorizontal: space.md }}>
          {activity.isLoading ? (
            <View style={{ padding: space.md }}>
              <LoadingList rows={2} height={40} />
            </View>
          ) : (activity.data ?? []).length ? (
            (activity.data ?? []).slice(0, 6).map((e) => <FeedItem key={e.id} event={e} showUser={false} />)
          ) : (
            <EmptyState icon="pulse" title="Nothing yet" />
          )}
        </Card>
      ) : (
        <Card>
          <Row gap={8}>
            <Icon name="lock-closed" size={16} color={t.textMuted} />
            <Text variant="caption" tone="muted">
              Activity is visible to {self ? 'you only' : 'friends only'}.
            </Text>
          </Row>
        </Card>
      )}
      {!self && me.data ? (
        <Row justify="center" gap={6}>
          <Headshot config={me.data.avatar} size={20} />
          <Text variant="small" tone="faint">
            Viewing as @{me.data.profile.username}
          </Text>
        </Row>
      ) : null}
      {p.profile.is_npc ? (
        <Text variant="small" tone="faint" align="center">
          Simulated players are part of the Blockora world and respond automatically.
        </Text>
      ) : null}
    </View>
  );
}

export function ProfileScreen({ username, isSelfTab }: { username: string; isSelfTab?: boolean }) {
  const q = useProfile(username);
  return (
    <Screen tabInset={isSelfTab} refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <ProfileView username={username} isSelfTab={isSelfTab} />
    </Screen>
  );
}
