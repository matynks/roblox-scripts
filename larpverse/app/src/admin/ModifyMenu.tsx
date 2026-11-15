import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BadgeCheck, Boxes, Clapperboard, Coins, Gamepad2, Layers, Lock, Megaphone, ScrollText, Settings2, ShieldCheck, Sparkles, UserCog, Users, Wand2,
} from 'lucide-react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { api } from '../api';
import { PageHeader, Q, Sparks, Stat } from '../components/ui';
import { compact, timeAgo } from '../lib/format';
import { useCinematic, useMe, useSession } from '../state';
import { AccountEditor, AccountsAdmin } from './AccountsAdmin';
import { UnlockGate } from './common';
import { BadgesAdmin, CatalogAdmin, ExperiencesAdmin } from './ContentAdmin';
import { GameAdmin } from './GameAdmin';
import { AuditAdmin, CinematicAdmin, ConfigAdmin, CurrencyAdmin, EventsAdmin, NotificationsAdmin, PresetsAdmin, StaffAdmin } from './OpsAdmin';

export const SECTIONS = [
  { to: 'accounts', label: 'Accounts', icon: Users, perm: 'accounts.view' },
  { to: 'currency', label: 'Currency', icon: Coins, perm: 'currency.manage' },
  { to: 'badges', label: 'Badges', icon: BadgeCheck, perm: 'badges.manage' },
  { to: 'catalog', label: 'Catalog', icon: Boxes, perm: 'catalog.manage' },
  { to: 'experiences', label: 'Experiences', icon: Layers, perm: 'experiences.manage' },
  { to: 'game', label: 'LARP game', icon: Gamepad2, perm: 'game.manage' },
  { to: 'events', label: 'Scripted events', icon: Wand2, perm: 'events.manage' },
  { to: 'presets', label: 'Scenario presets', icon: Sparkles, perm: 'presets.manage' },
  { to: 'notifications', label: 'Notifications', icon: Megaphone, perm: 'notifications.manage' },
  { to: 'cinematic', label: 'Cinematic mode', icon: Clapperboard, perm: 'admin.access' },
  { to: 'audit', label: 'Audit log', icon: ScrollText, perm: 'audit.view' },
  { to: 'config', label: 'Economy config', icon: Settings2, perm: 'config.manage' },
  { to: 'staff', label: 'Staff & permissions', icon: UserCog, perm: 'staff.manage' },
];

export function ModifyMenu() {
  const { isStaff } = useSession();
  if (!isStaff) {
    return <div className="page"><div className="card pad center"><Lock size={24} /><p>This area is restricted to Larpverse staff.</p><Link to="/" className="btn btn-primary btn-md">Home</Link></div></div>;
  }
  return (
    <UnlockGate>
      <div className="modify">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<AccountsAdmin />} />
          <Route path="accounts/:id/*" element={<AccountEditor />} />
          <Route path="currency" element={<CurrencyAdmin />} />
          <Route path="badges" element={<BadgesAdmin />} />
          <Route path="catalog" element={<CatalogAdmin />} />
          <Route path="experiences" element={<ExperiencesAdmin />} />
          <Route path="game/*" element={<GameAdmin />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="presets" element={<PresetsAdmin />} />
          <Route path="notifications" element={<NotificationsAdmin />} />
          <Route path="cinematic" element={<CinematicAdmin />} />
          <Route path="audit" element={<AuditAdmin />} />
          <Route path="config" element={<ConfigAdmin />} />
          <Route path="staff" element={<StaffAdmin />} />
        </Routes>
      </div>
    </UnlockGate>
  );
}

function Dashboard() {
  const me = useMe();
  const { can, refresh } = useSession();
  const cine = useCinematic();
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<any>('/api/admin/overview') });
  const lock = useMutation({ mutationFn: () => api.post('/api/security/lock'), onSuccess: () => refresh() });
  return (
    <div className="page">
      <PageHeader title="Modify Menu" subtitle={<>Acting as <strong>{me.account.displayName}</strong> · unlocked until {new Date(me.elevatedUntil!).toLocaleTimeString()}</>}
        right={<button className="link small" onClick={() => lock.mutate()}><Lock size={14} /> Lock</button>} />
      <Q q={q}>
        {(d) => (
          <div className="stats-row card wrap">
            <Stat label="Accounts" value={compact(d.counts.accounts)} />
            <Stat label="Fictional" value={compact(d.counts.fictionalAccounts)} />
            <Stat label="Items" value={compact(d.counts.items)} />
            <Stat label="Purchases" value={compact(d.counts.purchases)} />
            <Stat label="Sparks in circulation" value={<Sparks amount={d.counts.sparksInCirculation} compactNum size={12} />} />
            <Stat label="Open sessions" value={d.counts.openSessions} />
          </div>
        )}
      </Q>
      <div className="modify-grid">
        {SECTIONS.filter((s) => can(s.perm)).map((s) => (
          <NavLink key={s.to} to={`/modify/${s.to}`} className="modify-tile"><s.icon size={22} /><span>{s.label}</span></NavLink>
        ))}
      </div>
      {!cine.enabled && <Link to="/modify/cinematic" className="card row subtle"><Clapperboard size={18} /><div className="row-main"><strong>Start cinematic mode</strong><div className="muted tiny">Clean recording layout + floating director panel</div></div></Link>}
      <Q q={q}>
        {(d) => d.recentAudit.length > 0 ? (
          <section className="section">
            <div className="section-head"><h2>Recent activity</h2><Link to="/modify/audit" className="link small">Audit log</Link></div>
            <div className="list card">{d.recentAudit.map((a: any) => <div key={a.id} className="row"><ShieldCheck size={16} /><div className="row-main"><strong>{a.action}</strong><div className="muted tiny">{a.user} · {a.targetType ?? ''} {a.targetId ?? ''} · {timeAgo(a.at)}</div></div></div>)}</div>
          </section>
        ) : null}
      </Q>
    </div>
  );
}
