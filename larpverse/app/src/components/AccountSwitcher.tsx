import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AccountCard } from '../types';
import { Button, Field, Headshot, Name, Sheet } from './ui';

/** Lists accounts the signed-in login can act as; staff also see fictional accounts. */
export function AccountSwitcher({ inline, onDone }: { inline?: boolean; onDone?: () => void }) {
  const me = useMe();
  const { switchAccount, setMe, can } = useSession();
  const onError = useErrorToast();
  const { push } = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const list = useQuery({ queryKey: ['switchable', q], queryFn: () => api.get<{ own: AccountCard[]; fictional: AccountCard[] }>(`/api/me/switchable?q=${encodeURIComponent(q)}`) });
  const sw = useMutation({
    mutationFn: (id: number) => switchAccount(id),
    onSuccess: () => { push({ title: 'Switched account' }); onDone?.(); nav('/'); },
    onError,
  });
  const add = useMutation({
    mutationFn: () => api.post('/api/me/accounts', { username }),
    onSuccess: (m: any) => { setMe(m); setAdding(false); setUsername(''); push({ kind: 'success', title: `Created @${m.account.username}` }); list.refetch(); },
    onError,
  });
  const row = (a: AccountCard) => (
    <button key={a.id} className="row" onClick={() => a.id !== me.account.id && sw.mutate(a.id)}>
      <Headshot account={a} size={40} />
      <div className="row-main"><Name account={a} /><div className="muted tiny">@{a.username}{a.isFictional ? ' · fictional' : ''}</div></div>
      {a.id === me.account.id && <Check size={18} className="accent" />}
    </button>
  );
  const body = (
    <>
      <div className="list card">{list.data?.own.map(row)}</div>
      {me.accounts.filter((a) => !a.isFictional).length <= me.config.economy.maxAltAccounts && (
        <Button variant="ghost" icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add account</Button>
      )}
      {can('accounts.manage') && (
        <>
          <h4 className="list-title">Fictional accounts (staff)</h4>
          <input className="input" placeholder="Search fictional accounts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search fictional accounts" />
          <div className="list card scroll-list">{list.data?.fictional.map(row)}</div>
        </>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add an account">
        <Field label="Username" hint="Another account on this same login."><input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" /></Field>
        <Button block loading={add.isPending} onClick={() => add.mutate()}>Create & switch</Button>
      </Sheet>
    </>
  );
  return inline ? body : <div>{body}</div>;
}
