import type { Listing, Slot } from '@/api/types';
import { rarityOrder, type Rarity } from '@/theme/tokens';

export type ListingSort = 'featured' | 'price_asc' | 'price_desc' | 'rarity' | 'newest';

export const SORT_LABELS: Record<ListingSort, string> = {
  featured: 'Featured',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rarity: 'Rarity',
  newest: 'Newest',
};

export type ListingFilters = {
  slot: Slot | 'all';
  rarity: Rarity | 'all';
  sort: ListingSort;
  query: string;
  hideOwned: boolean;
};

export const DEFAULT_FILTERS: ListingFilters = {
  slot: 'all',
  rarity: 'all',
  sort: 'featured',
  query: '',
  hideOwned: false,
};

/** Pure filter + sort for the marketplace grid (unit tested). */
export function filterListings(listings: Listing[], filters: ListingFilters, ownedItemIds: ReadonlySet<string>): Listing[] {
  const query = filters.query.trim().toLowerCase();
  const result = listings.filter((listing) => {
    if (filters.slot !== 'all' && listing.item.slot !== filters.slot) return false;
    if (filters.rarity !== 'all' && listing.item.rarity !== filters.rarity) return false;
    if (filters.hideOwned && ownedItemIds.has(listing.item_id)) return false;
    if (query && !listing.item.name.toLowerCase().includes(query) && !listing.item.description.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  const byName = (a: Listing, b: Listing) => a.item.name.localeCompare(b.item.name);
  const sorters: Record<ListingSort, (a: Listing, b: Listing) => number> = {
    featured: (a, b) => Number(b.is_featured) - Number(a.is_featured) || rarityOrder[b.item.rarity] - rarityOrder[a.item.rarity] || byName(a, b),
    price_asc: (a, b) => a.price - b.price || byName(a, b),
    price_desc: (a, b) => b.price - a.price || byName(a, b),
    rarity: (a, b) => rarityOrder[b.item.rarity] - rarityOrder[a.item.rarity] || a.price - b.price || byName(a, b),
    newest: (a, b) => b.listed_at.localeCompare(a.listed_at) || byName(a, b),
  };
  return result.sort(sorters[filters.sort]);
}
