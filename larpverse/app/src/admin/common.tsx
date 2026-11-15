import { useMutation, useQuery } from '@tanstack/react-query';
import { Lock, Search as SearchIcon, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { api } from '../api';
import { Button, Field, Headshot, ItemThumb, Name } from '../components/ui';
import { useErrorToast, useMe, useSession } from '../state';
import type { AccountCard, Item, Paged } from '../types';

export function isElevated(me: { elevatedUntil: number | null }) {
  return Boolean(me.elevatedUntil && me.elevatedUntil > Date.now());
}

/** Staff must re-enter their password (and 2-step code) to unlock the Modify Menu. */
export function UnlockGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const { refresh } = useSession();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const unlock = useMutation({
    mutationFn: () => api.post('/api/security/elevate', { password, code: code || undefined }),
    onSuccess: async () => { setPassword(''); setCode(''); setErr(null); await refresh(); },
    onError: (e: any) => setErr(e.message),
  });
  if (isElevated(me)) return <>{children}</>;
  return (
    <div className="page">
      <form className="card auth-card unlock" onSubmit={(e) => { e.preventDefault(); unlock.mutate(); }}>
        <h2><Lock size={18} /> Unlock Modify Menu</h2>
        <p className="muted small">Staff tools change live data. Confirm it’s you — access stays unlocked for 20 minutes on this device and every change is recorded in the audit log.</p>
        <Field label="Password" error={err}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" /></Field>
        {me.user.mfaEnabled && <Field label="2-step code"><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>}
        <Button block loading={unlock.isPending} disabled={!password}>Unlock</Button>
      </form>
    </div>
  );
}

export function useAdminAccounts(q: string, fictional?: string) {
  return useQuery({
    queryKey: ['admin', 'accounts', q, fictional],
    queryFn: () => api.get<Paged<AccountCard & { balance: number }>>(`/api/admin/accounts?q=${encodeURIComponent(q)}&limit=60${fictional ? `&fictional=${fictional}` : ''}`),
  });
}

export function AccountPicker({ value, onChange, multiple, label = 'Accounts' }: { value: number[]; onChange: (ids: number[]) => void; multiple?: boolean; label?: string }) {
  const [q, setQ] = useState('');
  const list = useAdminAccounts(q);
  const selected = useQuery({
    queryKey: ['admin', 'accounts', 'selected', value.join(',')],
    queryFn: async () => Promise.all(value.map((id) => api.get<AccountCard>(`/api/accounts/${id}/summary`))),
    enabled: value.length > 0,
  });
  const toggle = (id: number) => {
    if (multiple) onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
    else onChange(value[0] === id ? [] : [id]);
  };
  return (
    <div className="picker">
      <div className="field-label">{label}</div>
      {value.length > 0 && (
        <div className="chips">
          {(selected.data ?? []).map((a) => <button key={a.id} className="chip active" onClick={() => toggle(a.id)}>{a.displayName} <X size={12} /></button>)}
        </div>
      )}
      <div className="searchbar small"><SearchIcon size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts" aria-label="Search accounts" /></div>
      <div className="list card picker-list">
        {list.data?.items.map((a) => (
          <button key={a.id} className={`row ${value.includes(a.id) ? 'active' : ''}`} onClick={() => toggle(a.id)}>
            <Headshot account={a} size={32} presence={false} />
            <div className="row-main"><Name account={a} /><div className="muted tiny">@{a.username}{a.isFictional ? ' · fictional' : ''}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ItemPicker({ onPick, label = 'Find an item', category }: { onPick: (item: Item) => void; label?: string; category?: string }) {
  const [q, setQ] = useState('');
  const list = useQuery({
    queryKey: ['admin', 'items', q, category],
    queryFn: () => api.get<Paged<Item>>(`/api/admin/items?q=${encodeURIComponent(q)}&limit=40${category ? `&category=${category}` : ''}`),
  });
  return (
    <div className="picker">
      <div className="searchbar small"><SearchIcon size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={label} aria-label={label} /></div>
      <div className="grid item-grid picker-grid">
        {list.data?.items.map((i) => (
          <button key={i.id} className="item-tile" onClick={() => onPick(i)}>
            <ItemThumb item={i} size={70} />
            <div className="item-tile-name ellipsis2 tiny">{i.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function JsonField({ label, value, onChange, rows = 6 }: { label: string; value: any; onChange: (v: any) => void; rows?: number }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <Field label={label} error={err} hint="JSON">
      <textarea className="mono" rows={rows} value={text} onChange={(e) => {
        setText(e.target.value);
        try { onChange(JSON.parse(e.target.value || '{}')); setErr(null); } catch { setErr('Invalid JSON'); }
      }} />
    </Field>
  );
}

export function useAdminMutation<T = any>(fn: (vars: T) => Promise<any>, onDone?: (r: any) => void) {
  const onError = useErrorToast();
  return useMutation({ mutationFn: fn, onSuccess: (r) => onDone?.(r), onError });
}
