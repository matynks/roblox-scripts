export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function countdown(toIso: string, now = Date.now()): string {
  const ms = Math.max(0, Date.parse(toIso) - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

export const SLOT_LABEL: Record<string, string> = {
  hair: 'Hair',
  face: 'Face',
  hat: 'Hats',
  face_accessory: 'Face Gear',
  neck: 'Neck',
  back: 'Back',
  shirt: 'Tops',
  pants: 'Bottoms',
  shoes: 'Shoes',
};

export const TXN_LABEL: Record<string, string> = {
  signup_bonus: 'Welcome bonus',
  daily_reward: 'Daily reward',
  purchase: 'Marketplace',
  gamepass_purchase: 'Game pass',
  game_reward: 'Game reward',
  achievement_reward: 'Achievement',
  quest_reward: 'Quest',
  level_reward: 'Level up',
  collection_reward: 'Set bonus',
  username_change: 'Username change',
  admin_adjustment: 'Developer adjustment',
  refund: 'Refund',
};
