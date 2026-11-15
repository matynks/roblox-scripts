import { Backpack, Bell, ChevronRight, Clapperboard, Gamepad2, History, LogOut, Receipt, Settings, SlidersHorizontal, UserRound, Users, UsersRound, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { Headshot, Name, Sheet, Sparks } from '../components/ui';
import { useCinematic, useMe, useSession } from '../state';

export function More() {
  const me = useMe();
  const { signOut, isStaff } = useSession();
  const cine = useCinematic();
  const [switching, setSwitching] = useState(false);
  const links = [
    { to: `/profile/${me.account.id}`, icon: UserRound, label: 'Profile' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/groups', icon: UsersRound, label: 'Groups' },
    { to: '/inventory', icon: Backpack, label: 'Inventory' },
    { to: '/characters', icon: Gamepad2, label: 'LARP characters' },
    { to: '/game/history', icon: History, label: 'Session history' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/wallet/purchases', icon: Receipt, label: 'Purchases' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];
  return (
    <div className="page">
      <button className="card me-card" onClick={() => setSwitching(true)}>
        <Headshot account={me.account} size={56} />
        <div className="row-main"><Name account={me.account} /><div className="muted small">@{me.account.username}</div><Sparks amount={me.wallet.balance} size={13} tag /></div>
        <span className="link small">Switch</span>
      </button>
      <div className="more-grid">
        {links.map((l) => <Link key={l.to} to={l.to} className="more-tile"><l.icon size={24} /><span>{l.label}</span></Link>)}
      </div>
      {isStaff && !cine.enabled && (
        <Link to="/modify" className="row card subtle"><SlidersHorizontal size={18} /><div className="row-main"><strong>Modify Menu</strong><div className="muted tiny">Staff tools · requires your password</div></div><ChevronRight size={18} /></Link>
      )}
      {isStaff && cine.enabled && (
        <button className="row card subtle" onClick={() => cine.setPanelOpen(true)}><Clapperboard size={18} /><div className="row-main"><strong>Director panel</strong></div></button>
      )}
      <button className="row card subtle" onClick={() => signOut()}><LogOut size={18} /><div className="row-main"><strong>Log out</strong></div></button>
      <p className="muted tiny center">Larpverse · independent fictional roleplay platform</p>
      <Sheet open={switching} onClose={() => setSwitching(false)} title="Switch account" tall><AccountSwitcher onDone={() => setSwitching(false)} /></Sheet>
    </div>
  );
}
