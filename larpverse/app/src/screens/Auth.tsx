import { Server, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api, ApiError, checkServer, getServer, isNative, setServer } from '../api';
import { SparkIcon } from '../components/Art';
import { Button, Field, Notice, Tabs } from '../components/ui';
import { useSession, useToast } from '../state';
import type { Me } from '../types';

export function ServerSetup({ compact }: { compact?: boolean }) {
  const [url, setUrl] = useState(getServer() || 'http://192.168.1.10:8787');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    let u = url.trim();
    if (!/^https?:\/\//.test(u)) u = `http://${u}`;
    const ok = await checkServer(u);
    setBusy(false);
    if (!ok) { setErr('No Larpverse server answered at that address. Is it running and on the same Wi-Fi?'); return; }
    setServer(u);
    window.location.reload();
  };
  return (
    <div className={compact ? 'server-setup compact' : 'auth-screen'}>
      {!compact && <AuthHero />}
      <form className="card auth-card" onSubmit={submit}>
        <h2><Server size={18} /> Connect to your server</h2>
        <p className="muted small">Larpverse runs on your own server (a PC on your Wi-Fi, a VPS, or Termux on this phone). Enter its address.</p>
        <Field label="Server address" hint="Example: http://192.168.1.10:8787 or http://127.0.0.1:8787 (Termux)" error={err}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </Field>
        <Button type="submit" loading={busy} block>Connect</Button>
        {compact && getServer() && <Button type="button" variant="ghost" block onClick={() => { setServer(null); window.location.reload(); }}>Forget server</Button>}
      </form>
    </div>
  );
}

function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-logo">
        <svg viewBox="0 0 512 512" width="72" height="72" aria-hidden="true"><defs><linearGradient id="ah" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#ff5fa2" /></linearGradient></defs><rect x="16" y="16" width="480" height="480" rx="120" fill="url(#ah)" /><path d="M168 132h56v192h120v56H168z" fill="#fff" /><path d="M376 116l14 34 34 14-34 14-14 34-14-34-34-14 34-14z" fill="#ffd166" /></svg>
      </div>
      <h1>Larpverse</h1>
      <p className="muted">Roleplay worlds, a living city and your own story.</p>
    </div>
  );
}

export function AuthScreen() {
  const { signIn } = useSession();
  const { push } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mfa, setMfa] = useState<{ token: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const deviceName = isNative() ? 'Larpverse for Android' : 'Web browser';
      if (mfa) {
        const r = await api.post<{ token: string; me: Me }>('/api/auth/login/mfa', { mfaToken: mfa.token, code });
        signIn(r.token, r.me);
      } else if (mode === 'login') {
        const r = await api.post<any>('/api/auth/login', { username, password, deviceName });
        if (r.mfaRequired) setMfa({ token: r.mfaToken });
        else signIn(r.token, r.me);
      } else {
        const r = await api.post<{ token: string; me: Me }>('/api/auth/register', { username, password, displayName: displayName || undefined, deviceName });
        signIn(r.token, r.me);
        push({ kind: 'success', title: `Welcome to Larpverse, ${r.me.account.displayName}!` });
      }
    } catch (e: any) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <AuthHero />
      <form className="card auth-card" onSubmit={submit}>
        {mfa ? (
          <>
            <h2><ShieldCheck size={18} /> 2-step verification</h2>
            <p className="muted small">Enter the 6-digit code from your authenticator app.</p>
            <Field label="Code" error={err?.message}>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus />
            </Field>
            <Button type="submit" loading={busy} block>Verify</Button>
            <Button type="button" variant="ghost" block onClick={() => { setMfa(null); setCode(''); }}>Back</Button>
          </>
        ) : (
          <>
            <Tabs value={mode} onChange={(m) => { setMode(m); setErr(null); }} tabs={[{ value: 'login', label: 'Log in' }, { value: 'register', label: 'Sign up' }]} />
            <Field label="Username" error={err?.details?.field === 'username' ? err.message : null}>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" autoCorrect="off" autoComplete="username" required />
            </Field>
            {mode === 'register' && (
              <Field label="Display name" hint="Shown on your profile. You can change it later.">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} />
              </Field>
            )}
            <Field label="Password" hint={mode === 'register' ? 'At least 8 characters with letters and numbers.' : undefined} error={err?.details?.field === 'password' ? err.message : null}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            </Field>
            {err && !err.details?.field && <div className="field-error">{err.message}</div>}
            <Button type="submit" loading={busy} block>{mode === 'login' ? 'Log in' : 'Create account'}</Button>
            {mode === 'register' && (
              <Notice kind="rp"><SparkIcon size={14} /> New accounts start with fictional Sparks. Larpverse is an independent roleplay platform; Sparks have no real-world value.</Notice>
            )}
          </>
        )}
        {isNative() && <button type="button" className="link small" onClick={() => { setServer(null); window.location.reload(); }}>Server: {getServer()} · change</button>}
      </form>
    </div>
  );
}
