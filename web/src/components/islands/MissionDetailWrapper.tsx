import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type Event, type Mission, getEvents, getMission } from '../../lib/api';
import { listMissionsCached, onMissionsChanged } from '../../lib/cache';
import { statusLabel } from '../../lib/copy';
import MandateEditor from './MandateEditor';
import MissionTimeline, { ToolTraceRail } from './MissionTimeline';
import OfferComparison from './OfferComparison';
import AgentStatusStrip from './AgentStatusStrip';
import { SkeletonTimelineRows } from '../primitives/Skeleton';

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

  const elapsedMs = Math.max(0, now - new Date(mission.createdAt).getTime());
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
 * ticker). Silent when there is nothing to show — a missing card reads
 * as a quieter product than a dashed "no jobs" placeholder.
 */
function LiveStrip({ mission }: { mission: Mission }) {
  const [others, setOthers] = useState<Mission[]>([]);

  useEffect(() => {
    let live = true;
    const load = () =>
      listMissionsCached()
        .then((list) => {
          if (!live) return;
          const activeOthers = (Array.isArray(list) ? list : [])
            .filter(m => m.id !== mission.id)
            .filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED');
          setOthers(activeOthers.slice(0, 3));
        })
        .catch(() => { if (live) setOthers([]); });
    load();
    // Another tab started or finished a job — refresh immediately.
    const off = onMissionsChanged(load);
    return () => { live = false; off(); };
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

/**
 * LifecycleScrubber — a 4px sticky strip under the header with a dot at each
 * lifecycle state (DRAFT → SOURCING → COMMITTED → IN_PROGRESS → COMPLETED).
 * On long missions it keeps "where are we" visible while you scroll. The
 * whole strip is a polite status region so state transitions are announced.
 */
const LIFECYCLE = ['DRAFT', 'SOURCING', 'COMMITTED', 'IN_PROGRESS', 'COMPLETED'] as const;
const LIFECYCLE_LABELS: Record<string, string> = {
  DRAFT: 'Details',
  SOURCING: 'Finding engineers',
  COMMITTED: 'Booked',
  IN_PROGRESS: 'On site',
  COMPLETED: 'Done',
};

function lifecycleIndex(status?: string): number {
  switch (status) {
    case 'DRAFT':
    case 'MANDATE_CONFIRMED':
      return 0;
    case 'SOURCING':
    case 'OFFERS_RECEIVED':
    case 'NEGOTIATING':
      return 1;
    case 'COMMITTED':
    case 'AWAITING_APPROVAL':
    case 'ESCALATED':
      return 2;
    case 'IN_PROGRESS':
    case 'EVIDENCE_PENDING':
    case 'VERIFYING':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

function LifecycleScrubber({ mission }: { mission: Mission }) {
  const idx = lifecycleIndex(mission.status);
  // The dots and bar are decorative — the textual status already lives in
  // AgentStatusStrip and StatusBadge, and state transitions are announced
  // by the parent via the sr-only status region. Putting aria-live here
  // would cause screen readers to repeat the stage on every poll tick.
  return (
    <div
      className="sticky top-12 sm:top-16 z-40 -mx-4 sm:-mx-5 px-4 sm:px-5 py-1.5 bg-paper/90 backdrop-blur-sm"
      aria-hidden
    >
      <div className="relative h-1 rounded-full bg-paper-inset">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-mandate/30 transition-[width] duration-500 ease-yaler"
          style={{ width: `${(idx / (LIFECYCLE.length - 1)) * 100}%` }}
        />
        {LIFECYCLE.map((state, i) => (
          <span
            key={state}
            title={LIFECYCLE_LABELS[state]}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-300 ${
              i === idx
                ? 'w-2.5 h-2.5 bg-mandate ring-2 ring-mandate/25'
                : i < idx
                  ? 'w-1.5 h-1.5 bg-mandate/60'
                  : 'w-1.5 h-1.5 bg-ink/15'
            }`}
            style={{ left: `${(i / (LIFECYCLE.length - 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function MissionDetailWrapper({ initialMissionId }: Props) {
  const [id, setId] = useState(initialMissionId || 'demo');
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

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

  const load = useCallback(async (missionId: string): Promise<Mission | null> => {
    const [data, evs] = await Promise.all([
      getMission(missionId),
      getEvents(missionId).catch(() => null),
    ]);
    setMission(data);
    if (evs) setEvents(evs);
    return data;
  }, []);

  // Announce state transitions to screen readers (3.4) — e.g. moving to
  // COMPLETED reads "Job completed, receipt ready."
  useEffect(() => {
    const curr = mission?.status;
    if (!curr) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = curr;
    if (!prev || prev === curr) return;
    setStatusAnnouncement(
      curr === 'COMPLETED' ? 'Job completed, receipt ready.' : `Job update: ${statusLabel(curr)}.`,
    );
  }, [mission?.status]);

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
      <div className="space-y-4 animate-fade-up">
        <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-28 rounded-full bg-paper-inset" />
            <div className="h-8 w-3/4 rounded-lg bg-paper-inset" />
            <div className="h-3 w-1/2 rounded-lg bg-paper-inset" />
          </div>
        </div>
        <div className="paper-card rounded-2xl p-5 sm:p-6">
          <SkeletonTimelineRows count={5} />
        </div>
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

  const offerCount = events.filter((e) => e.type === 'OFFER_RECEIVED' || e.type === 'QUOTE_RECEIVED').length;
  const lastEventAt = events.length
    ? events.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b)).createdAt
    : undefined;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* State transitions announced to screen readers (3.4) */}
      <div className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement}
      </div>

      <LifecycleScrubber mission={mission} />

      {(mission.status === 'DRAFT' ? (
        <MandateEditor
          initialMission={mission}
          onStarted={(next) => setMission(next)}
        />
      ) : (
        <>
          <AgentStatusStrip mission={mission} offerCount={offerCount} lastEventAt={lastEventAt} />
          <div className="sticky top-16 sm:top-20 z-30 -my-3">
            <ToolTraceRail events={events} />
          </div>
          <LiveWatchBar mission={mission} />
          <MissionTimeline mission={mission} events={events} />
          <OfferComparison
            missionId={mission.id}
            missionStatus={mission.status}
            budgetMax={mission.mandate?.budget?.maxAmount}
          />
        </>
      ))}
      {(mission.status !== 'DRAFT' && (
        <LiveStrip mission={mission} />
      ))}
    </div>
  );
}
