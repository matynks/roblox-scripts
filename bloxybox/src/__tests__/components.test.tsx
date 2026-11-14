import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AvatarAppearance, ProfileSummary, Slot } from '@/api/types';
import { PurchaseSheet } from '@/components/feature/PurchaseSheet';
import { ProfileView } from '@/components/feature/ProfileView';
import { Button } from '@/components/ui/Button';
import { CoinAmount } from '@/components/ui/CoinAmount';
import { AvatarView, appearanceKey } from '@/features/avatar/AvatarView';
import { KNOWN_ASSETS } from '@/features/avatar/parts';
import { BoxStackGame } from '@/games/box-stack/BoxStackGame';
import { LaneDashGame } from '@/games/lane-dash/LaneDashGame';
import { headShapes } from '@/theme/tokens';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 24, left: 0, right: 0, bottom: 16 } };
async function wrap(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

describe('Button', () => {
  it('fires onPress and respects disabled', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Buy" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Buy' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button label="Buy" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Buy' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('CoinAmount', () => {
  it('renders grouped and signed amounts with an accessible label', async () => {
    await render(<CoinAmount amount={1250} signed />);
    expect(screen.getByText('+1,250')).toBeTruthy();
    expect(screen.getByLabelText('plus 1,250 BoxCoins')).toBeTruthy();
  });
});

describe('AvatarView', () => {
  it('renders every known asset in every head shape', async () => {
    for (const shape of headShapes) {
      for (const [slot, assets] of Object.entries(KNOWN_ASSETS)) {
        for (const asset of assets) {
          const appearance: AvatarAppearance = {
            skin_color: '#FFD86B',
            head_shape: shape,
            equipped: [{ item_id: asset, slot: slot as Slot, asset_key: asset, primary_color: '#123456', secondary_color: '#ABCDEF' }],
          };
          const { unmount } = await render(<AvatarView appearance={appearance} size={120} />);
          await unmount();
        }
      }
    }
  });

  it('keys memoisation on appearance, not object identity', async () => {
    const a: AvatarAppearance = { skin_color: '#FFD86B', head_shape: 'cube', equipped: [] };
    expect(appearanceKey(a)).toBe(appearanceKey({ ...a, equipped: [] }));
    expect(appearanceKey(a)).not.toBe(appearanceKey({ ...a, head_shape: 'tall' }));
  });
});

describe('PurchaseSheet', () => {
  it('blocks the purchase and explains the shortfall when the balance is too low', async () => {
    const onConfirm = jest.fn();
    await wrap(
      <PurchaseSheet
        visible
        title="Hero Cape"
        subtitle="rare back"
        price={950}
        balance={500}
        busy={false}
        error={null}
        onConfirm={onConfirm}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/You need 450 more BoxCoins/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-purchase'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms when affordable', async () => {
    const onConfirm = jest.fn();
    await wrap(
      <PurchaseSheet visible title="Volt Cap" subtitle="common hat" price={80} balance={500} busy={false} error={null} onConfirm={onConfirm} onClose={() => undefined} />,
    );
    await fireEvent.press(screen.getByTestId('confirm-purchase'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileView', () => {
  const profile: ProfileSummary = {
    id: 'u1',
    username: 'nova',
    display_name: 'Nova',
    bio: 'Stacking boxes since 2026',
    accent: 'cyan',
    created_at: '2026-11-01T00:00:00Z',
    avatar: { skin_color: '#FFD86B', head_shape: 'round', equipped: [] },
    stats: {
      level: 3,
      xp: 500,
      xp_level_start: 400,
      xp_next_level: 900,
      games_played: 12,
      profile_visits: 40,
      daily_streak: 2,
      items_owned: 5,
      experiences_played: 2,
    },
    social: { followers_real: 3, followers_simulated: 1200, followers_total: 1203, following: 4, friends: 2 },
    relationship: { is_self: true, is_following: false, follows_you: false },
  };

  it('labels simulated followers and shows the breakdown', async () => {
    await wrap(<ProfileView profile={profile} />);
    expect(screen.getByText('Nova')).toBeTruthy();
    expect(screen.getByText(/3 player followers \+ 1,200 simulated followers/)).toBeTruthy();
    expect(screen.getByLabelText('Followers: 1,203, includes simulated data')).toBeTruthy();
  });
});

describe('mini-games mount', () => {
  it('Box Stack renders its play area', async () => {
    await wrap(<BoxStackGame seed={1} perks={[]} paused reduceMotion onScore={() => undefined} onFinish={() => undefined} />);
    expect(screen.getByLabelText(/Box Stack play area/)).toBeTruthy();
  });

  it('Lane Dash renders its track', async () => {
    await wrap(<LaneDashGame seed={1} perks={['extra_life']} paused reduceMotion onScore={() => undefined} onFinish={() => undefined} />);
    expect(screen.getByLabelText(/Lane Dash track/)).toBeTruthy();
  });
});
