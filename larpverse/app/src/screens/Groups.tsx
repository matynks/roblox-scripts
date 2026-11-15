import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Search as SearchIcon, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ExperienceArt, GroupEmblem } from '../components/Art';
import { AccountRow, Button, Empty, Notice, PageHeader, Q, Section, Sparks, Tabs, Toggle } from '../components/ui';
import { compact, timeAgo } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AccountCard, Group, Paged } from '../types';

export function Groups() {
  const me = useMe();
  const [tab, setTab] = useState<'mine' | 'browse'>('mine');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const mine = useQuery({ queryKey: ['groups', 'mine', me.account.id], queryFn: () => api.get<{ items: Group[] }>('/api/groups/mine'), enabled: tab === 'mine' });
  const all = useQuery({ queryKey: ['groups', 'all', q], queryFn: () => api.get<Paged<Group>>(`/api/groups?q=${encodeURIComponent(q)}&limit=50`), enabled: tab === 'browse' });
  const list = (gs: Group[]) => (
    <div className="list card">
      {gs.map((g) => (
        <Link key={g.id} to={`/groups/${g.id}`} className="row">
          <GroupEmblem emblem={g.emblem} size={46} />
          <div className="row-main"><strong>{g.name}</strong><div className="muted tiny">{compact(g.members)} members{g.myRank ? ` · ${g.myRank}` : ''}</div></div>
        </Link>
      ))}
    </div>
  );
  return (
    <div className="page">
      <PageHeader title="Groups" right={<Link to="/groups/new" className="icon-btn" aria-label="Create group"><Plus size={20} /></Link>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'mine', label: 'My groups' }, { value: 'browse', label: 'Browse' }]} />
      {tab === 'mine' && <Q q={mine}>{(d) => d.items.length === 0 ? <Empty title="You’re not in any groups" action={<Button onClick={() => setTab('browse')}>Browse groups</Button>} /> : list(d.items)}</Q>}
      {tab === 'browse' && (
        <>
          <form className="searchbar" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}><SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search groups" aria-label="Search groups" /></form>
          <Q q={all}>{(d) => d.items.length === 0 ? <Empty title="No groups found" /> : list(d.items)}</Q>
        </>
      )}
    </div>
  );
}

type GroupDetailData = Group & { experiences: { id: number; name: string; art: any; genre: string; visits: number }[] };

export function GroupDetail() {
  const { id } = useParams();
  const me = useMe();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [tab, setTab] = useState<'wall' | 'members' | 'about'>('wall');
  const [post, setPost] = useState('');
  const [shout, setShout] = useState('');
  const g = useQuery({ queryKey: ['group', id, me.account.id], queryFn: () => api.get<GroupDetailData>(`/api/groups/${id}`) });
  const posts = useQuery({ queryKey: ['group-posts', id], queryFn: () => api.get<Paged<{ id: number; body: string; createdAt: number; author: AccountCard | null }>>(`/api/groups/${id}/posts`), enabled: tab === 'wall' });
  const members = useQuery({ queryKey: ['group-members', id], queryFn: () => api.get<Paged<{ rank: string; joinedAt: number; account: AccountCard }>>(`/api/groups/${id}/members?limit=100`), enabled: tab === 'members' });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['group', id] }); qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['group-members', id] }); };
  const join = useMutation({ mutationFn: (on: boolean) => api.post(`/api/groups/${id}/${on ? 'join' : 'leave'}`), onSuccess: refresh, onError });
  const send = useMutation({ mutationFn: () => api.post(`/api/groups/${id}/posts`, { body: post }), onSuccess: () => { setPost(''); qc.invalidateQueries({ queryKey: ['group-posts', id] }); }, onError });
  const setShoutM = useMutation({ mutationFn: () => api.patch(`/api/groups/${id}`, { shout }), onSuccess: () => { setShout(''); refresh(); }, onError });
  const rank = useMutation({ mutationFn: ({ accountId, r }: { accountId: number; r: string }) => api.post(`/api/groups/${id}/members/${accountId}/rank`, { rank: r }), onSuccess: refresh, onError });
  return (
    <div className="page">
      <PageHeader title="Group" />
      <Q q={g}>
        {(d) => {
          const leader = d.myRank === 'owner' || d.myRank === 'admin';
          const member = d.myRank && d.myRank !== 'pending';
          return (
            <>
              <div className="group-head">
                <GroupEmblem emblem={d.emblem} size={84} />
                <div>
                  <h1>{d.name}</h1>
                  <div className="muted small">{compact(d.members)} members · by {d.owner ? <Link to={`/profile/${d.owner.id}`} className="link">{d.owner.displayName}</Link> : '—'}</div>
                  <div className="row-gap">
                    {!d.myRank && <Button size="sm" loading={join.isPending} onClick={() => join.mutate(true)}>{d.isPublic ? 'Join group' : 'Request to join'}</Button>}
                    {d.myRank === 'pending' && <span className="pill">Request pending</span>}
                    {member && d.myRank !== 'owner' && <Button size="sm" variant="ghost" onClick={() => { if (confirm('Leave this group?')) join.mutate(false); }}>Leave</Button>}
                    {d.myRank && <span className="pill">{d.myRank}</span>}
                  </div>
                </div>
              </div>
              {d.shout && <div className="card announce"><Megaphone size={18} /><div><span>{d.shout.text}</span><div className="muted tiny">{timeAgo(d.shout.at)}</div></div></div>}
              {leader && (
                <form className="compose" onSubmit={(e) => { e.preventDefault(); if (shout.trim()) setShoutM.mutate(); }}>
                  <input value={shout} onChange={(e) => setShout(e.target.value)} maxLength={255} placeholder="Post a group shout (notifies members)" aria-label="Group shout" />
                  <button className="icon-btn" aria-label="Post shout"><Megaphone size={18} /></button>
                </form>
              )}
              <Tabs value={tab} onChange={setTab} tabs={[{ value: 'wall', label: 'Wall' }, { value: 'members', label: 'Members' }, { value: 'about', label: 'About' }]} />
              {tab === 'wall' && (
                <>
                  {member && (
                    <form className="compose" onSubmit={(e) => { e.preventDefault(); if (post.trim()) send.mutate(); }}>
                      <input value={post} onChange={(e) => setPost(e.target.value)} maxLength={500} placeholder="Write on the wall" aria-label="Wall post" />
                      <button className="icon-btn" aria-label="Post" disabled={send.isPending}><Send size={18} /></button>
                    </form>
                  )}
                  <Q q={posts}>{(p) => p.items.length === 0 ? <p className="muted">No posts yet.</p> : (
                    <div className="list card">{p.items.map((x) => (
                      <div key={x.id} className="post">
                        {x.author && <Link to={`/profile/${x.author.id}`} className="post-author">{x.author.displayName}</Link>}
                        <span className="muted tiny"> · {timeAgo(x.createdAt)}</span>
                        <p className="pre">{x.body}</p>
                      </div>
                    ))}</div>
                  )}</Q>
                </>
              )}
              {tab === 'members' && (
                <Q q={members}>{(m) => (
                  <div className="list card">{m.items.map((x) => (
                    <AccountRow key={x.account.id} account={x.account} sub={`${x.rank} · joined ${timeAgo(x.joinedAt)}`} right={leader && x.rank !== 'owner' ? (
                      <select className="select-sm" value={x.rank} onChange={(e) => rank.mutate({ accountId: x.account.id, r: e.target.value })} aria-label="Rank">
                        {x.rank === 'pending' && <option value="pending">Pending</option>}
                        <option value="member">Member</option><option value="admin">Admin</option><option value="remove">Remove</option>
                      </select>
                    ) : undefined} />
                  ))}</div>
                )}</Q>
              )}
              {tab === 'about' && (
                <>
                  <div className="card pad"><p className="pre">{d.description || 'No description.'}</p><div className="muted tiny">{d.isPublic ? 'Public group' : 'Private group (join requests)'}</div></div>
                  {d.experiences.length > 0 && <Section title="Group experiences"><div className="grid exp-grid">{d.experiences.map((e) => <Link key={e.id} to={`/experiences/${e.id}`} className="exp-tile"><ExperienceArt art={e.art} /><div className="exp-tile-name ellipsis">{e.name}</div></Link>)}</div></Section>}
                </>
              )}
            </>
          );
        }}
      </Q>
    </div>
  );
}

const SHAPES = ['shield', 'circle', 'hexagon', 'diamond', 'star'];
const SYMBOLS = ['crown', 'bolt', 'heart', 'star', 'skull', 'leaf', 'flame', 'gem', 'paw', 'music', 'sword', 'rocket'];

export function NewGroup() {
  const me = useMe();
  const { setMe } = useSession();
  const nav = useNavigate();
  const onError = useErrorToast();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [emblem, setEmblem] = useState({ shape: 'shield', color: '#6d4aff', accent: '#ffd166', symbol: 'star' });
  const cost = me.perks.freeGroups ? 0 : me.config.economy.groupCreateCost;
  const create = useMutation({
    mutationFn: () => api.post<Group>('/api/groups', { name, description, isPublic, emblem }),
    onSuccess: (g) => { push({ kind: 'success', title: `${g.name} created` }); api.get('/api/me').then(setMe); nav(`/groups/${g.id}`, { replace: true }); },
    onError,
  });
  return (
    <div className="page">
      <PageHeader title="Create group" />
      <div className="center"><GroupEmblem emblem={emblem} size={96} /></div>
      <label className="field"><span className="field-label">Name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
      <label className="field"><span className="field-label">Description</span><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></label>
      <div className="field-label">Shape</div>
      <div className="chips">{SHAPES.map((s) => <button key={s} className={`chip ${emblem.shape === s ? 'active' : ''}`} onClick={() => setEmblem({ ...emblem, shape: s })}>{s}</button>)}</div>
      <div className="field-label">Symbol</div>
      <div className="chips">{SYMBOLS.map((s) => <button key={s} className={`chip ${emblem.symbol === s ? 'active' : ''}`} onClick={() => setEmblem({ ...emblem, symbol: s })}>{s}</button>)}</div>
      <div className="two-col">
        <label className="field"><span className="field-label">Color</span><input type="color" value={emblem.color} onChange={(e) => setEmblem({ ...emblem, color: e.target.value })} /></label>
        <label className="field"><span className="field-label">Accent</span><input type="color" value={emblem.accent} onChange={(e) => setEmblem({ ...emblem, accent: e.target.value })} /></label>
      </div>
      <Toggle label="Public group" hint="Anyone can join. Turn off to approve join requests." checked={isPublic} onChange={setIsPublic} />
      <Notice kind="rp">Creating a group costs {cost ? <Sparks amount={cost} size={12} /> : 'nothing (perk)'} — fictional roleplay currency.</Notice>
      <Button block size="lg" loading={create.isPending} disabled={name.trim().length < 3} onClick={() => create.mutate()}>Create group</Button>
    </div>
  );
}
