export function compact(n: number | null | undefined): string {
  if (n == null) return '0';
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) => `${(Math.floor(v * 10) / 10).toString().replace(/\.0$/, '')}${s}`;
  if (abs >= 1e12) return fmt(n / 1e12, 'T');
  if (abs >= 1e9) return fmt(n / 1e9, 'B');
  if (abs >= 1e6) return fmt(n / 1e6, 'M');
  if (abs >= 1e4) return fmt(n / 1e3, 'K');
  return n.toLocaleString('en-US');
}

export const full = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-US');

export function timeAgo(t: number | null | undefined): string {
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
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

export function dateLabel(t: number | null | undefined): string {
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateTime(t: number | null | undefined): string {
  if (!t) return '';
  return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function duration(ms: number | null | undefined): string {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (x: number) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#9aa4b5', uncommon: '#5cd68a', rare: '#4cc9f0', epic: '#b388ff', legendary: '#ffb703', mythic: '#ff5fa2',
};

export const CATEGORY_LABELS: Record<string, string> = {
  hat: 'Hat', hair: 'Hair', face: 'Face', accessory: 'Accessory', shirt: 'Shirt', pants: 'Pants', bundle: 'Bundle',
  animation: 'Animation', emote: 'Emote', collectible: 'Collectible', special: 'Special',
};

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function readFileAsDataUrl(file: File, maxEdge = 512): Promise<string> {
  // Downscale large images on the device before upload.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
