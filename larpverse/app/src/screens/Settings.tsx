import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronRight, Info, Lock, LogOut, MonitorSmartphone, Palette, Shield, User } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { api, getServer, isNative, setServer } from '../api';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { Button, Field, Notice, PageHeader, Q, Section, Sparks, Toggle } from '../components/ui';
import { dateTime } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';

export function Settings() {
  return (
    <Routes>
      <Route index element={<SettingsIndex />} />
      <Route path="account" element={<AccountSettings />} />
      <Route path="privacy" element={<PrivacySettings />} />
      <Route path="security" element={<SecuritySettings />} />
      <Route path="notifications" element={<NotificationSettings />} />
      <Route path="app" element={<AppSettings />} />
    </Routes>
  );
}

function SettingsIndex() {
  const { signOut } = useSession();
  const items = [
    { to: 'account', icon: User, label: 'Account info', sub: 'Username, accounts' },
    { to: 'privacy', icon: Lock, label: 'Privacy', sub: 'Who can see and contact you' },
    { to: 'security', icon: Shield, label: 'Security', sub: 'Password, 2-step, sessions' },
    { to: 'notifications', icon: Bell, label: 'Notifications', sub: 'What you get notified about' },
    { to: 'app', icon: Palette, label: 'App', sub: 'Theme, data saver, server' },
  ];
  return (
    <div className="page">
      <PageHeader title="Settings" />
      <div className="list card">
        {items.map((i) => (
          <Link key={i.to} to={`/settings/${i.to}`} className="row"><i.icon size={20} /><div className="row-main"><strong>{i.label}</strong><div className="muted tiny">{i.sub}</div></div><ChevronRight size={18} /></Link>
        ))}
      </div>
      <Button variant="danger" block icon={<LogOut size={16} />} onClick={() => signOut()}>Log out</Button>
    </div>
  );
}

function AccountSettings() {
  const me = useMe();
  const { setMe } = useSession();
  const onError = useErrorToast();
  const { push } = useToast();
  const [username, setUsername] = useState(me.account.username);
  const change = useMutation({
    mutationFn: () => api.post('/api/me/username', { username }),
    onSuccess: async () => { push({ kind: 'success', title: 'Username changed' }); setMe(await api.get('/api/me')); },
    onError,
  });
  return (
    <div className="page">
      <PageHeader title="Account info" />
      <div className="card pad">
        <div className="kv"><span>Display name</span><span>{me.account.displayName} · <Link className="link" to={`/profile/${me.account.id}`}>edit</Link></span></div>
        <div className="kv"><span>Login</span><span>{me.user.username}</span></div>
        <div className="kv"><span>Account created</span><span>{dateTime(me.account.createdAt)}</span></div>
      </div>
      <Section title="Change username">
        <Field label="New username" hint={<>Costs <Sparks amount={me.config.economy.usernameChangeCost} size={11} /> (fictional). 3–20 letters, numbers or _.</>}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" autoCorrect="off" />
        </Field>
        <Button loading={change.isPending} disabled={username === me.account.username} onClick={() => change.mutate()}>Change username</Button>
      </Section>
      <Section title="Accounts on this login"><AccountSwitcher inline /></Section>
    </div>
  );
}

function PrivacySettings() {
  const me = useMe();
  const { setMe } = useSession();
  const onError = useErrorToast();
  const p = me.settings.privacy;
  const save = useMutation({ mutationFn: (privacy: any) => api.patch('/api/me/settings', { privacy }), onSuccess: (s: any) => setMe({ ...me, settings: s }), onError });
  const Sel = ({ k, label, opts }: { k: string; label: string; opts: [string, string][] }) => (
    <Field label={label}><select value={p[k]} onChange={(e) => save.mutate({ [k]: e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
  );
  const vis: [string, string][] = [['everyone', 'Everyone'], ['friends', 'Friends only'], ['nobody', 'No one']];
  return (
    <div className="page">
      <PageHeader title="Privacy" />
      <div className="card pad">
        <Sel k="profileVisibility" label="Who can see my profile details" opts={vis} />
        <Sel k="inventoryVisibility" label="Who can see my inventory" opts={vis} />
        <Sel k="friendRequests" label="Who can send me friend requests" opts={[['everyone', 'Everyone'], ['nobody', 'No one']]} />
        <Sel k="gameInvites" label="Who can invite me to LARP sessions" opts={vis} />
        <Toggle label="Allow followers" checked={p.allowFollow} onChange={(v) => save.mutate({ allowFollow: v })} />
        <Toggle label="Show when I’m online" checked={p.showOnlineStatus} onChange={(v) => save.mutate({ showOnlineStatus: v })} />
        <Toggle label="Appear in people search" checked={p.searchable} onChange={(v) => save.mutate({ searchable: v })} />
      </div>
    </div>
  );
}

function NotificationSettings() {
  const me = useMe();
  const { setMe } = useSession();
  const onError = useErrorToast();
  const n = me.settings.notifications;
  const save = useMutation({ mutationFn: (notifications: any) => api.patch('/api/me/settings', { notifications }), onSuccess: (s: any) => setMe({ ...me, settings: s }), onError });
  const labels: Record<string, string> = {
    friend_request: 'Friend requests', friend_accept: 'Accepted requests', follow: 'New followers', purchase: 'Purchases', sale: 'Item sales',
    reward: 'Rewards', badge: 'Badges', group: 'Group activity', game_invite: 'Game invites', event: 'Events', announcement: 'Announcements',
  };
  return (
    <div className="page">
      <PageHeader title="Notifications" />
      <div className="card pad">
        {Object.keys(labels).map((k) => <Toggle key={k} label={labels[k]} checked={n[k] !== false} onChange={(v) => save.mutate({ [k]: v })} />)}
      </div>
      <p className="muted small">Security and system notices are always delivered.</p>
    </div>
  );
}

function SecuritySettings() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<{ sessions: any[] }>('/api/security/sessions') });
  const logins = useQuery({ queryKey: ['logins'], queryFn: () => api.get<{ logins: any[] }>('/api/security/logins') });
  const pw = useMutation({ mutationFn: () => api.post('/api/security/password', { currentPassword: cur, newPassword: next, signOutOthers: true }), onSuccess: () => { setCur(''); setNext(''); push({ kind: 'success', title: 'Password changed. Other devices were signed out.' }); qc.invalidateQueries({ queryKey: ['sessions'] }); }, onError });
  const revoke = useMutation({ mutationFn: (id: number) => api.del(`/api/security/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }), onError });
  const revokeOthers = useMutation({ mutationFn: () => api.post('/api/security/sessions/revoke-others'), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }), onError });
  return (
    <div className="page">
      <PageHeader title="Security" />
      <Section title="Change password">
        <div className="card pad">
          <Field label="Current password"><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
          <Field label="New password" hint="At least 8 characters with letters and numbers"><input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
          <Button loading={pw.isPending} disabled={!cur || next.length < 8} onClick={() => pw.mutate()}>Update password</Button>
        </div>
      </Section>
      <Section title="2-step verification"><Mfa enabled={me.user.mfaEnabled} onChange={async () => setMe(await api.get('/api/me'))} /></Section>
      <Section title="Where you’re signed in" action={<Button size="sm" variant="ghost" onClick={() => revokeOthers.mutate()}>Sign out others</Button>}>
        <Q q={sessions}>{(d) => (
          <div className="list card">{d.sessions.map((s) => (
            <div key={s.id} className="row"><MonitorSmartphone size={20} /><div className="row-main"><strong>{s.deviceName ?? 'Device'}{s.current && ' (this device)'}</strong><div className="muted tiny">{s.ip} · last active {dateTime(s.lastSeenAt)}</div></div>{!s.current && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(s.id)}>Sign out</Button>}</div>
          ))}</div>
        )}</Q>
      </Section>
      <Section title="Recent sign-ins">
        <Q q={logins}>{(d) => (
          <div className="list card">{d.logins.map((l) => <div key={l.id} className="row"><div className="row-main"><strong className={l.success ? '' : 'neg'}>{l.success ? 'Signed in' : `Failed (${l.reason})`}</strong><div className="muted tiny">{dateTime(l.createdAt)} · {l.ip}</div></div></div>)}</div>
        )}</Q>
      </Section>
    </div>
  );
}

function Mfa({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const onError = useErrorToast();
  const { push } = useToast();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (setup && canvas.current) QRCode.toCanvas(canvas.current, setup.otpauthUrl, { width: 180, margin: 1 }).catch(() => {}); }, [setup]);
  const start = useMutation({ mutationFn: () => api.post<{ secret: string; otpauthUrl: string }>('/api/security/mfa/setup'), onSuccess: setSetup, onError });
  const enable = useMutation({ mutationFn: () => api.post('/api/security/mfa/enable', { code }), onSuccess: () => { setSetup(null); setCode(''); push({ kind: 'success', title: '2-step verification is on' }); onChange(); }, onError });
  const disable = useMutation({ mutationFn: () => api.post('/api/security/mfa/disable', { password, code }), onSuccess: () => { setCode(''); setPassword(''); push({ title: '2-step verification turned off' }); onChange(); }, onError });
  if (enabled) {
    return (
      <div className="card pad">
        <p><Shield size={16} /> 2-step verification is <strong>on</strong>. You’ll enter a code from your authenticator app when signing in and when unlocking staff tools.</p>
        <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Current code"><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>
        <Button variant="danger" loading={disable.isPending} disabled={!password || code.length !== 6} onClick={() => disable.mutate()}>Turn off</Button>
      </div>
    );
  }
  return (
    <div className="card pad">
      {!setup ? (
        <><p className="muted">Protect your login with codes from an authenticator app.</p><Button loading={start.isPending} onClick={() => start.mutate()}>Set up 2-step verification</Button></>
      ) : (
        <>
          <p>Scan this code with your authenticator app, or enter the key manually.</p>
          <canvas ref={canvas} className="qr" />
          <code className="secret">{setup.secret}</code>
          <Field label="6-digit code"><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" /></Field>
          <Button loading={enable.isPending} disabled={code.length !== 6} onClick={() => enable.mutate()}>Turn on</Button>
        </>
      )}
    </div>
  );
}

function AppSettings() {
  const me = useMe();
  const { setMe, isStaff } = useSession();
  const onError = useErrorToast();
  const nav = useNavigate();
  const taps = useRef(0);
  const p = me.settings.preferences;
  const save = useMutation({ mutationFn: (preferences: any) => api.patch('/api/me/settings', { preferences }), onSuccess: (s: any) => setMe({ ...me, settings: s }), onError });
  return (
    <div className="page">
      <PageHeader title="App" />
      <div className="card pad">
        <Field label="Theme"><select value={p.theme} onChange={(e) => save.mutate({ theme: e.target.value })}><option value="dark">Dark</option><option value="light">Light</option><option value="system">Match system</option></select></Field>
        <Toggle label="Reduce motion" checked={p.reduceMotion} onChange={(v) => save.mutate({ reduceMotion: v })} />
        <Toggle label="Data saver" hint="Fewer background refreshes on mobile data" checked={p.dataSaver} onChange={(v) => save.mutate({ dataSaver: v })} />
      </div>
      {isNative() && (
        <Section title="Server">
          <div className="card pad">
            <div className="kv"><span>Connected to</span><span>{getServer()}</span></div>
            <Button variant="secondary" onClick={() => { if (confirm('Disconnect from this server? You will need to sign in again.')) { setServer(null); window.location.reload(); } }}>Change server</Button>
          </div>
        </Section>
      )}
      <Section title="About">
        <div className="card pad">
          <p><Info size={16} /> Larpverse is an independent, fictional roleplay platform. It is not affiliated with any other game platform. Sparks are fictional and have no real-world value.</p>
          {/* Discreet staff entry: tap the version 5 times. Access is still enforced by the server. */}
          <div className="kv" onClick={() => { taps.current += 1; if (taps.current >= 5 && isStaff) { taps.current = 0; nav('/modify'); } }}><span>Version</span><span>1.0.0</span></div>
        </div>
      </Section>
      <Notice>Sparks cannot be bought with real money in Larpverse.</Notice>
    </div>
  );
}
