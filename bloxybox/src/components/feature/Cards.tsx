import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Experience, GamePass, Listing, PlayerCard, Transaction } from '@/api/types';
import { SLOT_LABELS } from '@/api/types';
import { AppText } from '@/components/ui/AppText';
import { Badge, withAlpha } from '@/components/ui/Badge';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { AvatarView, ItemPreview } from '@/features/avatar/AvatarView';
import { CATEGORY_LABELS } from '@/features/discover/api';
import { PERK_ICONS } from '@/features/passes/api';
import { formatCompact, formatRelative } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { accentColors, colors, radii, rarityColors, spacing } from '@/theme/tokens';

/** Original key art for each experience, drawn in code. */
export const ExperienceArt = memo(function ExperienceArt({
  slug,
  accent,
  size,
}: {
  slug: string;
  accent: string;
  size: number;
}) {
  switch (slug) {
    case 'box-stack':
      return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Rect x={30} y={70} width={40} height={14} rx={3} fill={accent} />
          <Rect x={26} y={56} width={44} height={14} rx={3} fill={withAlpha(accent, 0.8)} />
          <Rect x={33} y={42} width={36} height={14} rx={3} fill={withAlpha(accent, 0.65)} />
          <Rect x={36} y={28} width={30} height={14} rx={3} fill="#FFFFFF" opacity={0.85} />
          <Rect x={58} y={14} width={30} height={14} rx={3} fill="#FFFFFF" opacity={0.4} />
          <Path d="M50 22 L54 26" stroke="#FFFFFF" strokeWidth={2} />
        </Svg>
      );
    case 'lane-dash':
      return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d="M38 8 L22 92" stroke={withAlpha(accent, 0.6)} strokeWidth={2} />
          <Path d="M62 8 L78 92" stroke={withAlpha(accent, 0.6)} strokeWidth={2} />
          <Path d="M50 8 L50 92" stroke={withAlpha(accent, 0.3)} strokeWidth={2} strokeDasharray="6 6" />
          <Rect x={54} y={30} width={14} height={10} rx={2} fill={colors.danger} />
          <Circle cx={36} cy={46} r={5} fill={colors.coin} />
          <Circle cx={34} cy={60} r={5} fill={colors.coin} />
          <Rect x={42} y={70} width={16} height={16} rx={5} fill={accent} />
        </Svg>
      );
    case 'orbit-hop':
      return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={30} stroke={withAlpha(accent, 0.5)} strokeWidth={2} fill="none" />
          <Circle cx={50} cy={50} r={12} fill={accent} />
          <Circle cx={80} cy={50} r={6} fill="#FFFFFF" opacity={0.8} />
          <Circle cx={30} cy={28} r={4} fill={withAlpha(accent, 0.7)} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Rect x={20} y={60} width={60} height={20} rx={4} fill={withAlpha(accent, 0.5)} />
          <Rect x={30} y={40} width={12} height={20} rx={3} fill={accent} />
          <Circle cx={36} cy={34} r={8} fill={accent} />
          <Rect x={56} y={46} width={10} height={14} rx={3} fill={withAlpha(accent, 0.8)} />
          <Circle cx={61} cy={40} r={7} fill={withAlpha(accent, 0.8)} />
        </Svg>
      );
  }
});

export const ExperienceCard = memo(function ExperienceCard({
  experience,
  onPress,
  variant = 'tile',
  bestScore,
}: {
  experience: Experience;
  onPress: () => void;
  variant?: 'tile' | 'wide' | 'row';
  bestScore?: number;
}) {
  const playable = experience.status === 'playable';
  const accent = experience.accent_color;

  if (variant === 'row') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${experience.title}${playable ? '' : ', in development'}`}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.expRow, pressed ? styles.pressed : null]}
      >
        <View style={[styles.expRowArt, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <ExperienceArt slug={experience.slug} accent={accent} size={44} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {experience.title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {experience.tagline}
          </AppText>
        </View>
        {playable ? (
          <Badge label={CATEGORY_LABELS[experience.category]} color={accent} />
        ) : (
          <Badge label="In development" color={colors.textMuted} />
        )}
      </Pressable>
    );
  }

  const wide = variant === 'wide';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${experience.title}${playable ? '' : ', in development'}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.expCard,
        wide ? styles.expWide : styles.expTile,
        { borderColor: withAlpha(accent, 0.35) },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.expArt, { backgroundColor: withAlpha(accent, 0.14), height: wide ? 150 : 110 }]}>
        <ExperienceArt slug={experience.slug} accent={accent} size={wide ? 120 : 90} />
        {!playable ? <Badge label="In development" color={colors.textSecondary} style={styles.expBadge} /> : null}
      </View>
      <View style={styles.expBody}>
        <AppText variant={wide ? 'heading' : 'bodyStrong'} numberOfLines={1}>
          {experience.title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={wide ? 2 : 1}>
          {experience.tagline}
        </AppText>
        <View style={styles.expMeta}>
          {playable ? (
            <>
              <Ionicons name="play" size={12} color={accent} />
              <AppText variant="micro" color={colors.textSecondary}>
                {formatCompact(experience.play_count)} plays
              </AppText>
              {bestScore ? (
                <AppText variant="micro" color={colors.textSecondary}>
                  · Best {bestScore}
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText variant="micro" color={colors.textMuted}>
              Not playable yet
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
});

export const ListingCard = memo(function ListingCard({
  listing,
  owned,
  onPress,
  width,
}: {
  listing: Listing;
  owned: boolean;
  onPress: () => void;
  width: number;
}) {
  const rarity = rarityColors[listing.item.rarity];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.item.name}, ${listing.item.rarity}, ${owned ? 'owned' : `${listing.price} BoxCoins`}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.listing, { width, borderColor: withAlpha(rarity, 0.3) }, pressed ? styles.pressed : null]}
    >
      <View style={[styles.listingArt, { backgroundColor: withAlpha(rarity, 0.1) }]}>
        <ItemPreview item={listing.item} size={width - spacing.xl} />
        {listing.is_featured ? <Ionicons name="star" size={14} color={colors.coin} style={styles.featured} /> : null}
      </View>
      <View style={styles.listingBody}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {listing.item.name}
        </AppText>
        <AppText variant="micro" color={rarity} uppercase>
          {listing.item.rarity} · {SLOT_LABELS[listing.item.slot].replace(/s$/, '')}
        </AppText>
        {owned ? (
          <View style={styles.ownedRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <AppText variant="caption" color={colors.success}>
              Owned
            </AppText>
          </View>
        ) : (
          <CoinAmount amount={listing.price} size="sm" />
        )}
      </View>
    </Pressable>
  );
});

export const PassCard = memo(function PassCard({
  pass,
  owned,
  enabled,
  onPress,
}: {
  pass: GamePass;
  owned: boolean;
  enabled?: boolean;
  onPress: () => void;
}) {
  const accent = pass.experience?.accent_color ?? colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pass.name} Game Pass${owned ? ', owned' : ''}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.pass, pressed ? styles.pressed : null]}
    >
      <View style={[styles.passIcon, { backgroundColor: withAlpha(accent, 0.16), borderColor: withAlpha(accent, 0.4) }]}>
        <Ionicons name={PERK_ICONS[pass.perk]} size={24} color={accent} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {pass.name}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {pass.description}
        </AppText>
      </View>
      {owned ? (
        <Badge label={enabled === false ? 'Off' : 'Owned'} color={enabled === false ? colors.textMuted : colors.success} />
      ) : (
        <CoinAmount amount={pass.price} size="sm" />
      )}
    </Pressable>
  );
});

export const PlayerRow = memo(function PlayerRow({
  player,
  onPress,
  trailing,
}: {
  player: PlayerCard;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  const accent = accentColors[player.accent] ?? colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.display_name}, @${player.username}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.player, pressed ? { backgroundColor: colors.surfaceRaised } : null]}
    >
      <View style={[styles.playerAvatar, { borderColor: accent }]}>
        <AvatarView appearance={player.avatar} size={44} frame="head" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {player.display_name}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          @{player.username}
          {player.level ? ` · Level ${player.level}` : ''}
        </AppText>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
});

const TX_ICONS: Record<Transaction['kind'], React.ComponentProps<typeof Ionicons>['name']> = {
  welcome_bonus: 'gift-outline',
  daily_reward: 'calendar-outline',
  game_reward: 'game-controller-outline',
  item_purchase: 'bag-handle-outline',
  pass_purchase: 'ticket-outline',
  dev_adjustment: 'construct-outline',
  dev_set_balance: 'construct-outline',
  dev_reset: 'refresh-outline',
};

export const TransactionRow = memo(function TransactionRow({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const positive = transaction.amount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${transaction.description}, ${positive ? 'plus' : 'minus'} ${Math.abs(transaction.amount)} BoxCoins`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tx, pressed ? { backgroundColor: colors.surfaceRaised } : null]}
    >
      <View style={[styles.txIcon, { backgroundColor: positive ? colors.successSoft : colors.surfaceHigh }]}>
        <Ionicons name={TX_ICONS[transaction.kind]} size={18} color={positive ? colors.success : colors.textSecondary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {transaction.description}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatRelative(transaction.created_at)}
        </AppText>
      </View>
      <CoinAmount amount={transaction.amount} signed size="sm" color={positive ? colors.success : colors.text} />
    </Pressable>
  );
});

export const StatTile = memo(function StatTile({
  label,
  value,
  simulated,
  onPress,
}: {
  label: string;
  value: string;
  simulated?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <AppText variant="heading" tabular numberOfLines={1}>
        {value}
      </AppText>
      <View style={styles.statLabel}>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {label}
        </AppText>
        {simulated ? (
          <AppText variant="micro" color={colors.info}>
            SIM
          </AppText>
        ) : null}
      </View>
    </>
  );
  if (!onPress) return <View style={styles.stat}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${simulated ? ', includes simulated data' : ''}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.stat, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expRowArt: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  expTile: { width: 170 },
  expWide: { width: 280 },
  expArt: { alignItems: 'center', justifyContent: 'center' },
  expBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  expBody: { padding: spacing.md, gap: spacing.xxs + 1 },
  expMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  listing: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  listingArt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  featured: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  listingBody: { padding: spacing.md, gap: spacing.xs },
  ownedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
