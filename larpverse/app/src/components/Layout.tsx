import { Bell, Compass, Home, Menu, Search, Shirt, ShoppingBag, WifiOff } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Director } from '../admin/Director';
import { useCinematic, useSession, useToast } from '../state';
import { Sparks } from './ui';

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 512 512" width="30" height="30" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cff" /><stop offset="1" stopColor="#ff5fa2" /></linearGradient></defs>
        <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#lg)" />
        <path d="M168 132h56v192h120v56H168z" fill="#fff" />
        <path d="M376 116l14 34 34 14-34 14-14 34-14-34-34-14 34-14z" fill="#ffd166" />
      </svg>
      <span className="logo-text">Larpverse</span>
    </span>
  );
}

export function TopBar() {
  const { me } = useSession();
  const cine = useCinematic();
  const nav = useNavigate();
  const press = useRef<any>(null);
  // Long-pressing the logo shows or hides the Director button while recording.
  const down = () => { press.current = setTimeout(() => { if (cine.enabled) cine.setDirectorHidden(!cine.directorHidden); }, 900); };
  const up = () => clearTimeout(press.current);
  if (!me) return null;
  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo" onPointerDown={down} onPointerUp={up} onPointerLeave={up} onContextMenu={(e) => e.preventDefault()}><Logo /></Link>
      <div className="topbar-actions">
        <button className="icon-btn" aria-label="Search" onClick={() => nav('/search')}><Search size={21} /></button>
        <button className="icon-btn bell" aria-label="Notifications" onClick={() => nav('/notifications')}>
          <Bell size={21} />
          {me.unreadNotifications > 0 && <span className="count">{me.unreadNotifications > 99 ? '99+' : me.unreadNotifications}</span>}
        </button>
        <Link to="/wallet" className="spark-chip" aria-label="Wallet"><Sparks amount={me.wallet.balance} compactNum size={17} /></Link>
      </div>
    </header>
  );
}

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/avatar', label: 'Avatar', icon: Shirt },
  { to: '/more', label: 'More', icon: Menu },
];

export function BottomNav() {
  return (
    <nav className="bottomnav">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}>
          <t.icon size={22} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const { status, refresh } = useSession();
  const cine = useCinematic();
  useEffect(() => {
    const on = () => { setOnline(true); refresh(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [refresh]);
  if ((online && status !== 'offline') || cine.enabled) return null;
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} /> <span>{online ? 'Can’t reach the Larpverse server.' : 'You’re offline.'} Showing saved data.</span>
      <button onClick={() => refresh()}>Retry</button>
    </div>
  );
}

export function ToastHost() {
  const { toasts, dismiss } = useToast();
  const nav = useNavigate();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind ?? 'info'}`} onClick={() => { dismiss(t.id); if (t.to) nav(t.to); }}>
          {t.kind === 'notification' && <Bell size={18} className="toast-icon" />}
          <div><strong>{t.title}</strong>{t.body && <div className="toast-body">{t.body}</div>}</div>
        </div>
      ))}
    </div>
  );
}

/** Android hardware back button: go back in history, or leave the app from a root tab. */
export function useAndroidBack() {
  const nav = useNavigate();
  const loc = useLocation();
  const locRef = useRef(loc.pathname);
  locRef.current = loc.pathname;
  useEffect(() => {
    const App = (window as any).Capacitor?.Plugins?.App;
    if (!App) return;
    const handle = App.addListener('backButton', () => {
      if (['/', '/discover', '/marketplace', '/avatar', '/more'].includes(locRef.current)) App.exitApp();
      else nav(-1);
    });
    return () => { Promise.resolve(handle).then((h: any) => h?.remove?.()); };
  }, [nav]);
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="app-shell">
      <TopBar />
      <OfflineBanner />
      <main className="content">{children ?? <Outlet />}</main>
      <BottomNav />
      <Director />
    </div>
  );
}
