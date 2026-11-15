import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Gamepad2, Megaphone, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { ExperienceTile, FriendBubble, ItemTile, Name, Q, Rail, Section, Sparks } from '../components/ui';
import { timeAgo } from '../lib/format';
import { useMe } from '../state';
import type { AccountCard, Experience, Item, Notification } from '../types';

type HomeData = {
  account: AccountCard; balance: number; motd: string; featured: Experience[]; recommended: Experience[]; popular: Experience[];
  recentlyPlayed: Experience[]; favorites: Experience[]; recommendedItems: Item[]; friends: AccountCard[]; friendCount: number;
  activeSession: { id: number; name: string; status: string; experienceId: number } | null; notifications: Notification[];
  unreadNotifications: number; announcement: string | null;
};

export function Home() {
  const me = useMe();
  const q = useQuery({ queryKey: ['home', me.account.id], queryFn: () => api.get<HomeData>('/api/home') });
  return (
    <div className="page home">
      <Q q={q} label="Loading your home…">
        {(d) => (
          <>
            <div className="hello card">
              <Link to={`/profile/${d.account.id}`} className="hello-avatar"><Avatar spec={d.account.avatar} crop="upper" size={92} /></Link>
              <div className="hello-main">
                <div className="muted small">Welcome back</div>
                <h1><Name account={d.account} size={18} /></h1>
                <div className="muted small">@{d.account.username}</div>
                <Link to="/wallet" className="hello-balance"><Sparks amount={d.balance} tag /></Link>
              </div>
            </div>

            {(d.announcement || d.motd) && (
              <div className="card announce"><Megaphone size={18} /><span>{d.announcement || d.motd}</span></div>
            )}

            {d.activeSession && (
              <Link to={`/session/${d.activeSession.id}`} className="card continue">
                <Gamepad2 size={22} />
                <div><strong>Return to {d.activeSession.name}</strong><div className="muted small">Your LARP session is {d.activeSession.status}</div></div>
                <ChevronRight size={18} />
              </Link>
            )}

            <Section title={`Friends (${d.friendCount})`} action={<Link to="/friends" className="link small">See all</Link>}>
              <Rail>
                <Link to="/friends?tab=find" className="friend-bubble add"><span className="headshot add-friend"><UserPlus size={24} /></span><span>Add friends</span></Link>
                {d.friends.map((f) => <FriendBubble key={f.id} account={f} />)}
              </Rail>
            </Section>

            {d.featured.length > 0 && (
              <Section title="Featured" action={<Link to="/discover?sort=featured" className="link small">More</Link>}>
                <Rail>{d.featured.map((e) => <ExperienceTile key={e.id} exp={e} wide />)}</Rail>
              </Section>
            )}

            {d.recentlyPlayed.length > 0 && (
              <Section title="Continue playing">
                <Rail>{d.recentlyPlayed.map((e) => <ExperienceTile key={e.id} exp={e} />)}</Rail>
              </Section>
            )}

            <Section title="Recommended for you" action={<Link to="/discover?sort=recommended" className="link small">More</Link>}>
              <Rail>{d.recommended.map((e) => <ExperienceTile key={e.id} exp={e} />)}</Rail>
            </Section>

            {d.favorites.length > 0 && (
              <Section title="Favorites">
                <Rail>{d.favorites.map((e) => <ExperienceTile key={e.id} exp={e} />)}</Rail>
              </Section>
            )}

            <Section title="Marketplace picks" action={<Link to="/marketplace" className="link small">Shop</Link>}>
              <Rail>{d.recommendedItems.map((i) => <ItemTile key={i.id} item={i} />)}</Rail>
            </Section>

            <Section title="Popular now">
              <Rail>{d.popular.map((e) => <ExperienceTile key={e.id} exp={e} />)}</Rail>
            </Section>

            {d.notifications.length > 0 && (
              <Section title="Latest notifications" action={<Link to="/notifications" className="link small">All</Link>}>
                <div className="list card">
                  {d.notifications.map((n) => (
                    <Link to="/notifications" key={n.id} className="row">
                      <div className="row-main"><strong className={n.read ? '' : 'unread-dot'}>{n.title}</strong><div className="muted tiny">{timeAgo(n.createdAt)}</div></div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </Q>
    </div>
  );
}
