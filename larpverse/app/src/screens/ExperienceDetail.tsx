import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Play, Share2, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ExperienceArt } from '../components/Art';
import { AccountRow, Button, ExperienceTile, Notice, PageHeader, Q, Rail, Section, Sheet, Stat } from '../components/ui';
import { cap, compact, dateLabel } from '../lib/format';
import { useErrorToast, useToast } from '../state';
import type { Experience, SessionSummary } from '../types';

type Detail = Experience & { scenario: { id: number; name: string; description: string } | null; servers: SessionSummary[]; similar: Experience[] };

export function ExperienceDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const onError = useErrorToast();
  const { push } = useToast();
  const [showcase, setShowcase] = useState(false);
  const q = useQuery({ queryKey: ['experience', id], queryFn: () => api.get<Detail>(`/api/experiences/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['experience', id] });
  const fav = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/api/experiences/${id}/favorite`) : api.del(`/api/experiences/${id}/favorite`)),
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['experiences'] }); }, onError,
  });
  const vote = useMutation({ mutationFn: (v: number) => api.post(`/api/experiences/${id}/vote`, { vote: v }), onSuccess: refresh, onError });
  const play = useMutation({
    mutationFn: () => api.post<{ engine: string }>(`/api/experiences/${id}/play`),
    onSuccess: (r) => { if (r.engine === 'larp') nav(`/play/${id}`); else { setShowcase(true); refresh(); } },
    onError,
  });
  return (
    <div className="page">
      <PageHeader title="" right={<button className="icon-btn" aria-label="Share" onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => push({ title: 'Link copied' })).catch(() => {}); }}><Share2 size={20} /></button>} />
      <Q q={q}>
        {(e) => (
          <>
            <div className="exp-hero"><ExperienceArt art={e.art} thumbnail={e.thumbnail} title={e.name} /></div>
            <h1 className="exp-title">{e.name}</h1>
            <div className="muted small">
              By {e.creator ? <Link to={`/profile/${e.creator.id}`} className="link">{e.creator.displayName}</Link> : 'Larpverse'}
              {e.group && <> · <Link to={`/groups/${e.group.id}`} className="link">{e.group.name}</Link></>}
            </div>
            <div className="exp-actions">
              <Button size="lg" icon={<Play size={20} fill="currentColor" />} onClick={() => play.mutate()} loading={play.isPending} className="play-btn">{e.engine === 'larp' ? 'Play' : 'Visit'}</Button>
              <button className={`icon-btn big ${e.isFavorite ? 'on' : ''}`} aria-label="Favorite" onClick={() => fav.mutate(!e.isFavorite)}><Heart size={22} fill={e.isFavorite ? 'currentColor' : 'none'} /></button>
              <button className={`icon-btn big ${e.myVote === 1 ? 'on' : ''}`} aria-label="Like" onClick={() => vote.mutate(e.myVote === 1 ? 0 : 1)}><ThumbsUp size={20} /></button>
              <button className={`icon-btn big ${e.myVote === -1 ? 'on' : ''}`} aria-label="Dislike" onClick={() => vote.mutate(e.myVote === -1 ? 0 : -1)}><ThumbsDown size={20} /></button>
            </div>
            <div className="stats-row card">
              <Stat label="Playing" value={compact(e.playing)} />
              <Stat label="Visits" value={compact(e.visits)} />
              <Stat label="Favorites" value={compact(e.favorites)} />
              <Stat label="Rating" value={e.rating != null ? `${e.rating}%` : '—'} />
              <Stat label="Max players" value={e.maxPlayers} />
            </div>
            <Section title="About">
              <p className="pre">{e.description}</p>
              <div className="muted small">Genre: {cap(e.genre)} · Created {dateLabel(e.createdAt)} · Updated {dateLabel(e.updatedAt)}</div>
            </Section>
            {e.engine === 'larp' && e.scenario && (
              <Section title="Default scenario"><div className="card pad"><strong>{e.scenario.name}</strong><p className="muted small">{e.scenario.description}</p></div></Section>
            )}
            {e.engine === 'larp' && (
              <Section title={`Servers (${e.servers.length})`} action={<Link to={`/play/${e.id}`} className="link small">Lobby</Link>}>
                {e.servers.length === 0 ? <p className="muted">No open sessions. Start one from the lobby!</p> : (
                  <div className="list card">
                    {e.servers.slice(0, 5).map((s) => (
                      <Link key={s.id} to={`/play/${e.id}?session=${s.id}`} className="row">
                        <Users size={18} />
                        <div className="row-main"><strong>{s.name}</strong><div className="muted tiny">{s.scenario?.name} · {s.status} · host {s.host?.displayName}</div></div>
                        <span className="pill">{s.players}/{s.maxPlayers}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Section>
            )}
            {e.creator && <Section title="Creator"><div className="list card"><AccountRow account={e.creator} /></div></Section>}
            {e.similar.length > 0 && <Section title="Similar experiences"><Rail>{e.similar.map((x) => <ExperienceTile key={x.id} exp={x} />)}</Rail></Section>}
            <Sheet open={showcase} onClose={() => setShowcase(false)} title={e.name}>
              <div className="exp-hero small"><ExperienceArt art={e.art} thumbnail={e.thumbnail} /></div>
              <Notice>This is a showcase listing in Larpverse — your visit was counted. The playable roleplay world is <Link to="/discover?sort=featured" className="link">Larpverse City RP</Link> and its scenario experiences.</Notice>
              <Button block onClick={() => setShowcase(false)}>Close</Button>
            </Sheet>
          </>
        )}
      </Q>
    </div>
  );
}
