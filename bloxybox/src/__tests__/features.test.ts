import type { Experience, Listing } from '@/api/types';
import { validateSignIn, validateSignUp, validateUsername } from '@/features/auth/validation';
import { devCallFor } from '@/features/dev/api';
import { initialSequenceState, LONG_PRESS_WINDOW_MS, registerLongPress, registerTap, TAP_COUNT, TAP_WINDOW_MS } from '@/features/dev/sequence';
import { featuredExperiences, inDevelopment, newExperiences, popularExperiences, searchExperiences } from '@/features/discover/api';
import { DEFAULT_FILTERS, filterListings } from '@/features/market/filters';

function listing(partial: { id: string; name: string; price: number; slot?: Listing['item']['slot']; rarity?: Listing['item']['rarity']; featured?: boolean; listedAt?: string }): Listing {
  return {
    id: `l-${partial.id}`,
    item_id: partial.id,
    price: partial.price,
    is_active: true,
    is_featured: partial.featured ?? false,
    listed_at: partial.listedAt ?? '2026-11-01T00:00:00Z',
    item: {
      id: partial.id,
      slug: partial.id,
      name: partial.name,
      description: `${partial.name} description`,
      slot: partial.slot ?? 'hat',
      rarity: partial.rarity ?? 'common',
      asset_key: 'cap',
      primary_color: '#000000',
      secondary_color: '#FFFFFF',
      is_starter: false,
    },
  };
}

describe('auth validation', () => {
  it('validates usernames like the database does', () => {
    expect(validateUsername('ok_name1')).toBeUndefined();
    expect(validateUsername('OK_Name')).toBeUndefined(); // normalised to lowercase
    expect(validateUsername('ab')).toBeDefined();
    expect(validateUsername('has space')).toBeDefined();
    expect(validateUsername('a'.repeat(21))).toBeDefined();
  });

  it('validates the whole sign-up form', () => {
    expect(
      validateSignUp({ email: 'a@b.co', password: 'abc12345', confirmPassword: 'abc12345', username: 'player_1', displayName: 'Player' }),
    ).toEqual({});
    const errors = validateSignUp({ email: 'nope', password: 'short', confirmPassword: 'x', username: '!', displayName: '' });
    expect(Object.keys(errors).sort()).toEqual(['displayName', 'email', 'password', 'username']);
    expect(validateSignUp({ email: 'a@b.co', password: 'abc12345', confirmPassword: 'abc12346', username: 'p_1', displayName: 'P' })).toEqual({
      confirmPassword: 'Passwords do not match.',
    });
    expect(validateSignIn('', '')).toEqual({ email: 'Enter your email address.', password: 'Enter your password.' });
  });
});

describe('hidden developer sequence', () => {
  it('arms only after enough quick taps and triggers only with a timely long-press', () => {
    let state = initialSequenceState;
    let armed = false;
    for (let i = 0; i < TAP_COUNT; i += 1) {
      const r = registerTap(state, 1000 + i * 200);
      state = r.state;
      armed = r.armed;
    }
    expect(armed).toBe(true);
    expect(registerLongPress(state, 1000 + TAP_COUNT * 200 + 1000).triggered).toBe(true);
    expect(registerLongPress(state, 1000 + TAP_COUNT * 200 + LONG_PRESS_WINDOW_MS + 2000).triggered).toBe(false);
  });

  it('does not arm when taps are too slow', () => {
    let state = initialSequenceState;
    let armed = false;
    for (let i = 0; i < TAP_COUNT; i += 1) {
      const r = registerTap(state, i * (TAP_WINDOW_MS / 2));
      state = r.state;
      armed = armed || r.armed;
    }
    expect(armed).toBe(false);
    expect(registerLongPress(state, TAP_WINDOW_MS * 4).triggered).toBe(false);
  });

  it('long-press without the taps does nothing', () => {
    expect(registerLongPress(initialSequenceState, 5000).triggered).toBe(false);
  });
});

describe('developer action mapping', () => {
  it('maps every action to its RPC and arguments', () => {
    expect(devCallFor({ type: 'set_balance', userId: 'u', balance: 5, reason: 'r' })).toEqual([
      'dev_set_balance',
      { p_user_id: 'u', p_balance: 5, p_reason: 'r' },
    ]);
    expect(devCallFor({ type: 'set_stats', userId: 'u', xp: 10 })[1]).toEqual({
      p_user_id: 'u',
      p_simulated_followers: null,
      p_xp: 10,
      p_profile_visits: null,
      p_games_played: null,
    });
    expect(devCallFor({ type: 'reset_user', userId: 'u', includeSocial: true })[0]).toBe('dev_reset_user');
  });
});

describe('marketplace filters', () => {
  const items = [
    listing({ id: 'a', name: 'Alpha Cap', price: 300, rarity: 'rare', featured: true }),
    listing({ id: 'b', name: 'Beta Tee', price: 100, slot: 'top', listedAt: '2026-11-10T00:00:00Z' }),
    listing({ id: 'c', name: 'Gamma Crown', price: 4000, rarity: 'legendary' }),
    listing({ id: 'd', name: 'Delta Cap', price: 100 }),
  ];

  it('filters by slot, rarity, text and ownership', () => {
    expect(filterListings(items, { ...DEFAULT_FILTERS, slot: 'top' }, new Set()).map((l) => l.item_id)).toEqual(['b']);
    expect(filterListings(items, { ...DEFAULT_FILTERS, rarity: 'legendary' }, new Set()).map((l) => l.item_id)).toEqual(['c']);
    expect(filterListings(items, { ...DEFAULT_FILTERS, query: 'cap' }, new Set()).map((l) => l.item_id).sort()).toEqual(['a', 'd']);
    expect(filterListings(items, { ...DEFAULT_FILTERS, hideOwned: true }, new Set(['a', 'c'])).map((l) => l.item_id).sort()).toEqual(['b', 'd']);
  });

  it('sorts by each option', () => {
    const ids = (sort: typeof DEFAULT_FILTERS.sort) => filterListings(items, { ...DEFAULT_FILTERS, sort }, new Set()).map((l) => l.item_id);
    expect(ids('featured')[0]).toBe('a');
    expect(ids('price_asc')).toEqual(['b', 'd', 'a', 'c']);
    expect(ids('price_desc')[0]).toBe('c');
    expect(ids('rarity')[0]).toBe('c');
    expect(ids('newest')[0]).toBe('b');
  });

  it('does not mutate its input', () => {
    const copy = [...items];
    filterListings(items, { ...DEFAULT_FILTERS, sort: 'price_desc' }, new Set());
    expect(items).toEqual(copy);
  });
});

describe('discover helpers', () => {
  const exp = (slug: string, extra: Partial<Experience>): Experience => ({
    id: slug,
    slug,
    title: slug,
    tagline: `${slug} tagline`,
    description: '',
    how_to_play: '',
    category: 'arcade',
    status: 'playable',
    is_featured: false,
    sort_order: 0,
    accent_color: '#FFFFFF',
    score_label: 'Score',
    released_at: '2026-11-01',
    coins_per_point: 1,
    win_bonus: 0,
    max_reward_per_run: 100,
    daily_reward_cap: 100,
    win_score: 1,
    play_count: 0,
    ...extra,
  });
  const list = [
    exp('box-stack', { is_featured: true, sort_order: 1, play_count: 50 }),
    exp('lane-dash', { is_featured: true, sort_order: 2, play_count: 90, category: 'action', released_at: '2026-11-10' }),
    exp('orbit-hop', { status: 'in_development', released_at: null, category: 'casual', sort_order: 3 }),
  ];

  it('builds the Discover sections', () => {
    expect(featuredExperiences(list).map((e) => e.slug)).toEqual(['box-stack', 'lane-dash']);
    expect(popularExperiences(list).map((e) => e.slug)).toEqual(['lane-dash', 'box-stack']);
    expect(newExperiences(list).map((e) => e.slug)).toEqual(['lane-dash', 'box-stack']);
    expect(inDevelopment(list).map((e) => e.slug)).toEqual(['orbit-hop']);
  });

  it('never lists in-development experiences as popular or new', () => {
    expect(popularExperiences(list).some((e) => e.status !== 'playable')).toBe(false);
    expect(newExperiences(list).some((e) => e.status !== 'playable')).toBe(false);
  });

  it('searches by text and category, playable first', () => {
    expect(searchExperiences(list, 'dash', 'all').map((e) => e.slug)).toEqual(['lane-dash']);
    expect(searchExperiences(list, '', 'casual').map((e) => e.slug)).toEqual(['orbit-hop']);
    expect(searchExperiences(list, 'arcade', 'all').map((e) => e.slug)).toEqual(['box-stack']);
  });
});
