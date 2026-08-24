import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type Mission, getMission, listMissions } from '../../lib/api';
import MandateEditor from './MandateEditor';
import MissionTimeline from './MissionTimeline';
import OfferComparison from './OfferComparison';

interface Props {
  initialMissionId?: string;
}

/**
 * LiveWatchBar — gives a mission page the identity of a *live job*.
 * A pulsing LIVE chip (only while the mission is active), an elapsed
 * clock since the mission was created, and a copy-able share link so
 * anyone can watch the job unfold. Same paper/receipt craft as the
 * rest of the surface.
 */
function LiveWatchBar({ mission }: { mission: Mission }) {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const active = mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED';

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsedMs = Math.max(0, new Date(mission.createdAt).getTime() - now);
  const elapsedMin = Math.floor(elapsedMs / 60000);
  const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
  const elapsedLabel = elapsedMin > 0
    ? `elapsed ${elapsedMin}m ${String(elapsedSec).padStart(2, '0')}s`
    : `elapsed ${elapsedSec}s`;

  const copyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: ignore */
    }
  };

  return (
    <div className="paper-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3 animate-pop-in">
      <div className="flex items-center gap-2.5 min-w-0">
        {active ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-escalate opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-escalate" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-escalate">LIVE</span>
            <span className="text-xs text-ink-muted tabular-nums truncate">{elapsedLabel}</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-mandate shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mandate">DONE</span>
            <span className="text-xs text-ink-muted">Job finished</span>
          </>
        )}
      </div>

      {active && (
        <button
          type="button"
          onClick={copyLink}
          className="text-[11px] text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5 shrink-0"
        >
          {copied ? (
            <>
              <span className="text-mandate">✓</span> Link copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copy watch link
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * LiveStrip — honest social proof: shows other real jobs currently in
 * flight on the roster (fetched from listMissions, not a synthetic
 * ticker). Only renders when there is at least one other active job.
 */
function LiveStrip({ mission }: { mission: Mission }) {
  const [others, setOthers] = useState<Mission[]>([]);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    listMissions()
      .then((list) => {
        const activeOthers = (Array.isArray(list) ? list : [])
          .filter(m => m.id !== mission.id)
          .filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED');
        setOthers(activeOthers.slice(0, 3));
      })
      .catch(() => setOthers([]));
  }, [mission.id]);

  if (others.length === 0) return null;

  return (
    <div className="paper-card rounded-2xl px-4 py-3 space-y-2 animate-pop-in">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">Other jobs in progress right now</p>
      <div className="flex flex-col gap-1.5">
        {others.map((m) => (
          <a
            key={m.id}
            href={`/missions/${m.id}`}
            className="flex items-center gap-2 group"
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mandate" />
            </span>
            <span className="text-xs text-ink group-hover:text-mandate transition-colors truncate">
              {m.goal}
            </span>
            <span className="text-[10px] text-ink-muted shrink-0">
              {m.status === 'SOURCING' ? 'sourcing' : m.status === 'OFFERS_RECEIVED' ? 'comparing quotes' : m.status === 'COMMITTED' ? 'booked' : 'active'}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function MissionDetailWrapper({ initialMissionId }: Props) {
  const [id, setId] = useState(initialMissionId || 'demo');
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the real mission ID from the URL after hydration, not during
  // render. Reading window.location during render causes a hydration
  // mismatch because the server (SSG) always renders with initialMissionId
  // (typically 'demo' via _redirects) while the client sees the real ID.
  useEffect(() => {
    if (initialMissionId && initialMissionId !== 'demo') return;
    if (typeof window === 'undefined') return;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('missions');
    if (idx !== -1 && parts[idx + 1] && parts[idx + 1] !== id) {
      setId(parts[idx + 1]);
    }
  }, []);

  const load = useCallback(async (id: string): Promise<Mission | null> => {
    const data = await getMission(id);
    setMission(data);
    return data;
  }, []);

  // Polling config — backoff until the mission is in a long-running state,
  // then stop; only restart on terminal states or when a user navigates
  // back.  This avoids hammering the backend with a 3s poll while
  // OFFERS_RECEIVED is waiting for a buyer decision, and prevents battery
  // drain on mobile.
  const INITIAL_DELAY = 3000; // 3s
  const MAX_DELAY = 30000;    // cap at 30s
  const BACKOFF_FACTOR = 2;

  // States where the mission is quiet — no worker activity, buyer decision
  // pending, so slower polling is fine.
  const QUIET_STATUSES = new Set(['OFFERS_RECEIVED', 'NEGOTIATING']);

  // States where the mission is actively executing — fast polling is needed
  // for evidence transitions and real-time updates.
  const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'EVIDENCE_PENDING', 'VERIFYING']);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    let delay = INITIAL_DELAY;

    async function tick() {
      if (!active) return;
      try {
        setLoading(true);
        setError(null);
        const data = await load(id);
        if (!data) return;
        // Stop polling only on terminal states — active states still need
        // polling for evidence transitions.
        if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
          if (interval) clearInterval(interval);
          interval = null;
        } else {
          // When the mission is quiet or not actively executing, back off.
          if (QUIET_STATUSES.has(data.status) || !ACTIVE_STATUSES.has(data.status)) {
            delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY);
          } else {
            // Active execution — go back to fast polling.
            delay = INITIAL_DELAY;
          }
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Job not found');
      } finally {
        if (active) setLoading(false);
      }
    }

    tick();

    interval = setInterval(tick, delay);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, load]);

  if (loading) {
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-3 animate-pop-in">
        <div className="flex justify-center">
          <span className="receipt-punch" />
        </div>
        <p className="font-display text-xl text-ink">Opening the job…</p>
        <p className="text-xs text-ink-muted">This should only take a moment.</p>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-4 animate-pop-in">
        <div className="flex justify-center">
          <span className="receipt-punch" />
        </div>
        <h2 className="font-display text-2xl text-ink">We couldn’t find that job</h2>
        <p className="text-ink-muted text-sm max-w-sm mx-auto">{error || 'It may have expired, or the link is wrong.'}</p>
        <a href="/" className="btn-primary inline-flex">Back home</a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {(mission.status === 'DRAFT' ? (
        <MandateEditor
          initialMission={mission}
          onStarted={(next) => setMission(next)}
        />
      ) : (
        <>
          <LiveWatchBar mission={mission} />
          <MissionTimeline missionId={mission.id} />
          <OfferComparison missionId={mission.id} missionStatus={mission.status} />
        </>
      ))}
      {(mission.status !== 'DRAFT' && (
        <LiveStrip mission={mission} />
      ))}
    </div>
  );
}
