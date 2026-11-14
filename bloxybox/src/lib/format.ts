/** Formatting helpers. Implemented by hand so output is identical on every device and in tests. */

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 1234567 -> "1,234,567" */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  return sign + groupThousands(String(Math.trunc(Math.abs(value))));
}

/** 1234 -> "1.2K", 3400000 -> "3.4M". Values under 10,000 are shown in full. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs < 10_000) return formatNumber(value);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = abs / size;
      const rounded = scaled >= 100 ? Math.floor(scaled).toString() : (Math.floor(scaled * 10) / 10).toString();
      return `${sign}${rounded}${suffix}`;
    }
  }
  return formatNumber(value);
}

/** Signed amount for ledgers: +250 / -80 */
export function formatSigned(value: number): string {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(date)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function formatRelative(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = Math.round((now.getTime() - date.getTime()) / 1000);
  if (Number.isNaN(diff)) return '';
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.round(diff / 86_400)}d ago`;
  return formatDate(date);
}

/** Milliseconds until a timestamp, rendered as "5h 12m" / "12m 03s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  return `${minutes}m ${pad(seconds)}s`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
