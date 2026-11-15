import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Clock, Lock, Megaphone, MessageSquareMore, Pencil, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { BadgeIcon, ExperienceArt, GroupEmblem } from '../components/Art';
import { Avatar } from '../components/Avatar';
import { Button, FriendBubble, Headshot, ItemThumb, Name, presenceText, Q, Rail, Section, Sheet, Stat, Tabs } from '../components/ui';
import { compact, dateLabel, readFileAsDataUrl } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AccountCard, Item } from '../types';

type ProfileData = AccountCard & {
  bannerColor: string; joinedAt: number; canView: boolean; limited?: boolean; bio: string; statusText: string; announcement?: string | null;
  relationship: { friendStatus: 'self' | 'none' | 'friends' | 'outgoing' | 'incoming'; isFollowing: boolean; followsYou: boolean };
  stats: { friends: number; followers: number; following: number; visits: number };
  badgesFull: { key: string; name: string; label: string; description: string; icon: string; color: string; kind: string; awardedAt: number }[];
  groups?: { id: number; name: string; emblem: any; rank: string }[];
  creations?: { id: number; name: string; art: any; thumbnail: string | null; visits: number }[];
  favorites?: { id: number; name: string; art: any; thumbnail: string | null }[];
  wearing?: { id: number; name: string; category: string; rarity: string; slot: string; asset: any }[];
  showcase?: { id: number; name: string; category: string; rarity: string; slot: string; asset: any; isLimited: boolean; serial: number | null }[];
  friendsPreview?: AccountCard[];
  allowsFriendRequests: boolean;
  allowsFollow: boolean;
  inventoryVisible?: boolean;
};

export function Profile() {
  const { id } = useParams();
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const [tab, setTab] = useState<'about' | 'creations' | 'wearing'>('about');
  const [edit, setEdit] = useState(false);
  const [badge, setBadge] = useState<ProfileData['badgesFull'][number] | null>(null);
  const q = useQuery({ queryKey: ['profile', id, me.account.id], queryFn: () => api.get<ProfileData>(`/api/accounts/${id}/profile`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['profile', id] }); qc.invalidateQueries({ queryKey: ['friends'] }); };
  const act = useMutation({
    mutationFn: async (a: 'friend' | 'unfriend' | 'accept' | 'follow' | 'unfollow') => {
      if (a === 'friend' || a === 'accept') return api.post(`/api/social/friends/${id}/request`);
      if (a === 'unfriend') return api.del(`/api/social/friends/${id}`);
      if (a === 'follow') return api.post(`/api/social/follow/${id}`);
      return api.del(`/api/social/follow/${id}`);
    },
    onSuccess: (_, a) => { refresh(); if (a === 'friend') push({ title: 'Friend request sent' }); },
    onError,
  });
  return (
    <div className="page profile">
      <Q q={q}>
        {(p) => {
          const self = p.relationship.friendStatus === 'self';
          const fs = p.relationship.friendStatus;
          return (
            <>
              <div className="profile-banner" style={{ background: `linear-gradient(135deg, ${p.bannerColor}, #120d26)` }} />
              <div className="profile-head">
                <div className="profile-avatar"><Headshot account={p} size={96} /></div>
                <div className="profile-names">
                  <h1><Name account={p} size={20} /></h1>
                  <div className="muted">@{p.username}</div>
                  <div className={`presence-text presence-${p.presence.status}`}>{presenceText(p)}</div>
                </div>
              </div>
              {p.statusText && <div className="status-text">“{p.statusText}”</div>}
              {p.announcement && <div className="card announce"><Megaphone size={18} /><span>{p.announcement}</span></div>}
              <div className="stats-row">
                <Link to={`/profile/${p.id}/friends`}><Stat label="Friends" value={compact(p.stats.friends)} /></Link>
                <Link to={`/profile/${p.id}/followers`}><Stat label="Followers" value={compact(p.stats.followers)} /></Link>
                <Link to={`/profile/${p.id}/following`}><Stat label="Following" value={compact(p.stats.following)} /></Link>
                {p.stats.visits > 0 && <Stat label="Visits" value={compact(p.stats.visits)} />}
              </div>
              <div className="profile-actions">
                {self ? (
                  <>
                    <Button icon={<Pencil size={16} />} onClick={() => setEdit(true)}>Edit profile</Button>
                    <Link to="/avatar" className="btn btn-secondary btn-md">Edit avatar</Link>
                  </>
                ) : (
                  <>
                    {fs === 'none' && <Button icon={<UserPlus size={16} />} disabled={!p.allowsFriendRequests} loading={act.isPending} onClick={() => act.mutate('friend')}>{p.allowsFriendRequests ? 'Add friend' : 'Not accepting requests'}</Button>}
                    {fs === 'outgoing' && <Button variant="secondary" icon={<Clock size={16} />} onClick={() => act.mutate('unfriend')}>Request sent · cancel</Button>}
                    {fs === 'incoming' && <Button icon={<UserCheck size={16} />} onClick={() => act.mutate('accept')}>Accept request</Button>}
                    {fs === 'friends' && <Button variant="secondary" icon={<UserMinus size={16} />} onClick={() => { if (confirm(`Unfriend ${p.displayName}?`)) act.mutate('unfriend'); }}>Friends</Button>}
                    {p.relationship.isFollowing
                      ? <Button variant="ghost" icon={<Check size={16} />} onClick={() => act.mutate('unfollow')}>Following</Button>
                      : <Button variant="ghost" disabled={!p.allowsFollow} onClick={() => act.mutate('follow')}>Follow</Button>}
                    {p.presence.status === 'in_experience' && p.presence.sessionId && <Link className="btn btn-spark btn-md" to={`/play/${p.presence.experienceId}?session=${p.presence.sessionId}`}>Join</Link>}
                  </>
                )}
              </div>
              {p.relationship.followsYou && !self && <div className="muted small center">Follows you</div>}

              {p.badgesFull.length > 0 && (
                <Section title="Badges">
                  <Rail>
                    {p.badgesFull.map((b) => (
                      <button key={b.key} className="badge-card" onClick={() => setBadge(b)}>
                        <BadgeIcon badge={b} size={22} />
                        <span className="tiny ellipsis">{b.label}</span>
                      </button>
                    ))}
                  </Rail>
                </Section>
              )}

              {!p.canView ? (
                <div className="card pad center"><Lock size={22} /><p className="muted">This profile is private.</p></div>
              ) : (
                <>
                  <Tabs value={tab} onChange={setTab} tabs={[{ value: 'about', label: 'About' }, { value: 'creations', label: 'Creations' }, { value: 'wearing', label: 'Currently wearing' }]} />
                  {tab === 'about' && (
                    <>
                      <div className="card pad"><p className="pre">{p.bio || <span className="muted">No bio yet.</span>}</p><div className="muted tiny">Joined {dateLabel(p.joinedAt)}</div></div>
                      <div className="avatar-showcase"><Avatar spec={p.avatar} size={180} animated /></div>
                      {p.showcase && p.showcase.length > 0 && (
                        <Section title="Showcase">
                          <Rail>{p.showcase.map((i) => <Link key={i.id} to={`/item/${i.id}`} className="item-tile"><ItemThumb item={{ ...i, thumbnail: null, rarity: i.rarity as Item['rarity'] }} /><div className="item-tile-name ellipsis2">{i.name}</div>{i.serial && <div className="tiny muted">#{i.serial}</div>}</Link>)}</Rail>
                        </Section>
                      )}
                      {p.friendsPreview && p.friendsPreview.length > 0 && (
                        <Section title="Friends" action={<Link to={`/profile/${p.id}/friends`} className="link small">See all</Link>}><Rail>{p.friendsPreview.map((f) => <FriendBubble key={f.id} account={f} />)}</Rail></Section>
                      )}
                      {p.groups && p.groups.length > 0 && (
                        <Section title="Groups">
                          <Rail>{p.groups.map((g) => <Link key={g.id} to={`/groups/${g.id}`} className="group-mini"><GroupEmblem emblem={g.emblem} size={52} /><span className="tiny ellipsis">{g.name}</span></Link>)}</Rail>
                        </Section>
                      )}
                      {p.favorites && p.favorites.length > 0 && (
                        <Section title="Favorite experiences">
                          <Rail>{p.favorites.map((e) => <Link key={e.id} to={`/experiences/${e.id}`} className="exp-tile"><ExperienceArt art={e.art} thumbnail={e.thumbnail} /><div className="exp-tile-name ellipsis">{e.name}</div></Link>)}</Rail>
                        </Section>
                      )}
                    </>
                  )}
                  {tab === 'creations' && (
                    p.creations && p.creations.length ? (
                      <div className="grid exp-grid">{p.creations.map((e) => <Link key={e.id} to={`/experiences/${e.id}`} className="exp-tile"><ExperienceArt art={e.art} thumbnail={e.thumbnail} /><div className="exp-tile-name ellipsis">{e.name}</div><div className="muted tiny">{compact(e.visits)} visits</div></Link>)}</div>
                    ) : <p className="muted center pad">No public creations yet.</p>
                  )}
                  {tab === 'wearing' && (
                    <div className="grid item-grid">{(p.wearing ?? []).map((i) => <Link key={i.id} to={`/item/${i.id}`} className="item-tile"><ItemThumb item={{ ...i, thumbnail: null, rarity: i.rarity as Item['rarity'] }} /><div className="item-tile-name ellipsis2">{i.name}</div></Link>)}</div>
                  )}
                  {p.inventoryVisible && self && <Link to="/inventory" className="btn btn-ghost btn-md btn-block">Open inventory</Link>}
                </>
              )}

              <Sheet open={Boolean(badge)} onClose={() => setBadge(null)} title={badge?.label}>
                {badge && (
                  <div className="center">
                    <BadgeIcon badge={badge} size={40} />
                    <p>{badge.description}</p>
                    {badge.kind === 'system' && <p className="muted small">This badge reflects a real Larpverse staff role.</p>}
                    {badge.awardedAt && <p className="muted tiny">Awarded {dateLabel(badge.awardedAt)}</p>}
                  </div>
                )}
              </Sheet>
              {self && <EditProfile open={edit} onClose={() => setEdit(false)} profile={p} onSaved={() => { refresh(); api.get('/api/me').then(setMe); }} />}
            </>
          );
        }}
      </Q>
    </div>
  );
}

type EditableProfile = ProfileData & { inventoryVisible?: boolean };

function EditProfile({ open, onClose, profile, onSaved }: { open: boolean; onClose: () => void; profile: EditableProfile; onSaved: () => void }) {
  const onError = useErrorToast();
  const { push } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [statusText, setStatusText] = useState(profile.statusText);
  const [bannerColor, setBannerColor] = useState(profile.bannerColor);
  const file = useRef<HTMLInputElement>(null);
  const save = useMutation({ mutationFn: () => api.patch('/api/me/profile', { displayName, bio, statusText, bannerColor }), onSuccess: () => { onSaved(); onClose(); push({ kind: 'success', title: 'Profile saved' }); }, onError });
  const upload = useMutation({
    mutationFn: async (f: File) => api.post('/api/me/picture', { dataUrl: await readFileAsDataUrl(f, 512) }),
    onSuccess: () => { onSaved(); push({ kind: 'success', title: 'Profile picture updated' }); }, onError,
  });
  const removePic = useMutation({ mutationFn: () => api.del('/api/me/picture'), onSuccess: onSaved, onError });
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" tall footer={<Button block loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}>
      <div className="pic-edit">
        <Headshot account={profile} size={72} presence={false} />
        <div className="row-gap">
          <Button size="sm" variant="secondary" icon={<Camera size={14} />} loading={upload.isPending} onClick={() => file.current?.click()}>Upload picture</Button>
          {profile.picture && <Button size="sm" variant="ghost" onClick={() => removePic.mutate()}>Use avatar</Button>}
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
      </div>
      <label className="field"><span className="field-label">Display name</span><input value={displayName} maxLength={30} onChange={(e) => setDisplayName(e.target.value)} /></label>
      <label className="field"><span className="field-label">Status</span><input value={statusText} maxLength={80} onChange={(e) => setStatusText(e.target.value)} placeholder="What are you up to?" /></label>
      <label className="field"><span className="field-label">About</span><textarea value={bio} maxLength={1000} rows={5} onChange={(e) => setBio(e.target.value)} /></label>
      <label className="field"><span className="field-label">Banner color</span><input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} /></label>
      <Link to="/settings/account" className="link small" onClick={onClose}><MessageSquareMore size={14} /> Change username in Settings</Link>
    </Sheet>
  );
}
