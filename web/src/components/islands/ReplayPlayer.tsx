import React, { useEffect, useMemo, useState } from 'react';
import { type Event, type Mission, type Offer, getEvents, getMission, getOffers } from '../../lib/api';
import MissionTimeline from './MissionTimeline';
import { SkeletonTimelineRows } from '../primitives/Skeleton';
import { eventLabel, statusLabel } from '../../lib/copy';

interface Props {
  initialMissionId?: string;
}

/** One event revealed per ~900ms at 1x. */
const STEP_MS = 900;

/**
 * Which lifecycle status the replay shows once a given event is the latest
 * revealed one. Events not listed here (e.g. POLICY_BLOCKED) keep whatever
 * status the previous mapped event set — the scan walks backwards.
 */
const EVENT_TO_STATUS: Record<string, string> = {
  MISSION_CREATED: 'DRAFT',
  MANDATE_EXTRACTED: 'DRAFT',
  MANDATE_UPDATED: 'DRAFT',
  MANDATE_CONFIRMED: 'MANDATE_CONFIRMED',
  EXECUTION_STARTED: 'SOURCING',
  SOURCING_STARTED: 'SOURCING',
  CALLOUT_SENT: 'SOURCING',
  SUPPLIERS_SOURCED: 'SOURCING',
  CALLOUT_DECLINED: 'SOURCING',
  CALLOUT_EXPIRED: 'SOURCING',
  MISSION_RESUMED: 'SOURCING',
  HUMAN_REROUTED: 'SOURCING',
  OFFER_RECEIVED: 'OFFERS_RECEIVED',
  QUOTE_RECEIVED: 'OFFERS_RECEIVED',
  A2A_QUOTE_RECEIVED: 'OFFERS_RECEIVED',
  OFFERS_RECEIVED: 'OFFERS_RECEIVED',
  OFFERS_RANKED: 'OFFERS_RECEIVED',
  HUMAN_REJECTED: 'OFFERS_RECEIVED',
  NEGOTIATING: 'NEGOTIATING',
  POLICY_ESCALATE: 'AWAITING_APPROVAL',
  POLICY_ESCALATION: 'AWAITING_APPROVAL',
  HUMAN_APPROVED: 'COMMITTED',
  OFFER_ACCEPTED: 'COMMITTED',
  COMMITTED: 'COMMITTED',
  WORK_DISPATCHED: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_PROGRESS',
  EVIDENCE_REQUESTED: 'EVIDENCE_PENDING',
  EVIDENCE_PENDING: 'EVIDENCE_PENDING',
  EVIDENCE_INSUFFICIENT: 'EVIDENCE_PENDING',
  EVIDENCE_SUBMITTED: 'VERIFYING',
  VERIFYING: 'VERIFYING',
  EVIDENCE_VERIFIED: 'VERIFYING',
  MISSION_COMPLETED: 'COMPLETED',
  COMPLETED: 'COMPLETED',
  RECEIPT_ISSUED: 'COMPLETED',
  FEEDBACK_RECORDED: 'COMPLETED',
  NO_QUOTES: 'ESCALATED',
  NO_SUPPLIERS: 'ESCALATED',
  ESCALATED: 'ESCALATED',
  WORKER_FAILED: 'ESCALATED',
  MISSION_CANCELLED: 'CANCELLED',
};

const OFFER_EVENTS = new Set(['OFFER_RECEIVED', 'QUOTE_RECEIVED', 'A2A_QUOTE_RECEIVED']);

/**
 * ReplayPlayer — a job's timeline played back like a recording. Loads the
 * mission, its events and its offers exactly once (never polls), then
 * reveals events one by one in chronological order through the same
 * MissionTimeline the live page uses, with the mission status derived from
 * the latest revealed event. Scrubbable, with 1x/4x speed. Clearly badged
 * as a replay so nobody mistakes it for a live job.
 */
export default function ReplayPlayer({ initialMissionId }: Props) {
  const [id, setId] = useState(initialMissionId || 'demo');
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);

  // Resolve the real job ID after hydration, never during render — SSG
  // always renders with initialMissionId while the client sees the real URL.
  // Same pattern as MissionDetailWrapper, plus an ?id= fallback so the
  // pre-rendered /replay/1 page can deep-link any job on static hosts whose
  // redirect rules don't cover /replay/*.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('id');
    if (q) {
      setId(q);
      return;
    }
    if (initialMissionId && initialMissionId !== 'demo') return;
    const parts = window.location.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('replay');
    if (idx !== -1 && parts[idx + 1]) {
      setId(parts[idx + 1]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the recording once — a replay never polls.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [m, evs, offs] = await Promise.all([
          getMission(id),
          getEvents(id).catch(() => [] as Event[]),
          getOffers(id).catch(() => [] as Offer[]),
        ]);
        if (!active) return;
        const sorted = [...evs].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setMission(m);
        setEvents(sorted);
        setOffers(offs);
        setRevealed(0);
        setPlaying(false);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Job not found');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const total = events.length;
  const atEnd = total > 0 && revealed >= total;

  // The metronome — one step per tick, stopping at the end of the tape.
  useEffect(() => {
    if (!playing) return;
    if (revealed >= total) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, revealed, total, speed]);

  const revealedEvents = useMemo(() => events.slice(0, revealed), [events, revealed]);

  // The status the replay shows: the latest revealed event that maps to a
  // lifecycle state. Before the tape starts, every job is a draft.
  const playbackMission = useMemo<Mission | null>(() => {
    if (!mission) return null;
    let status = 'DRAFT';
    for (let i = revealedEvents.length - 1; i >= 0; i--) {
      const s = EVENT_TO_STATUS[revealedEvents[i].type];
      if (s) {
        status = s;
        break;
      }
    }
    return { ...mission, status };
  }, [mission, revealedEvents]);

  // The quotes counter climbs as each quote event is revealed.
  const quotesIn = useMemo(
    () => revealedEvents.filter((e) => OFFER_EVENTS.has(e.type)).length,
    [revealedEvents],
  );
  const lastEvent = revealedEvents.length > 0 ? revealedEvents[revealedEvents.length - 1] : null;

  const togglePlay = () => {
    if (total === 0) return;
    if (!playing && revealed >= total) setRevealed(0); // play at the end rewinds first
    setPlaying((p) => !p);
  };

  const scrub = (value: number) => {
    setRevealed(value);
    if (value >= total) setPlaying(false);
  };

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

  if (error || !mission || !playbackMission) {
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-4 animate-pop-in">
        <div className="flex justify-center">
          <span className="receipt-punch" />
        </div>
        <h2 className="font-display text-2xl text-ink">We couldn’t find that job</h2>
        <p className="text-ink-muted text-sm max-w-sm mx-auto">
          {error || 'It may have expired, or the link is wrong.'} Nothing to replay without it.
        </p>
        <a href="/" className="btn-primary inline-flex">Back home</a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Replay position announced politely as the tape moves */}
      <div className="sr-only" role="status" aria-live="polite">
        {`Replay: ${statusLabel(playbackMission.status)}. Step ${revealed} of ${total}.`}
      </div>

      {/* The badge — nobody should mistake this for a live job */}
      <div className="paper-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3 animate-pop-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink text-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider shrink-0">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
            Replay
          </span>
          <span className="text-xs text-ink-muted truncate">
            A recording of a real job — nothing here is live.
          </span>
        </div>
        <a
          href={`/missions/${id}`}
          className="text-xs font-medium text-mandate hover:text-ink transition-colors shrink-0"
        >
          Watch it live →
        </a>
      </div>

      {/* Transport: play/pause, start over, speed, scrubber, quotes counter */}
      <div className="paper-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={total === 0}
            className="btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2 disabled:opacity-40"
          >
            {playing ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
                {atEnd ? 'Play again' : revealed === 0 ? 'Play the job' : 'Play'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setPlaying(false); setRevealed(0); }}
            disabled={total === 0 || revealed === 0}
            className="btn-secondary text-sm py-2.5 px-4 disabled:opacity-40"
          >
            Start over
          </button>
          <div
            className="flex items-center rounded-full border border-ink/15 overflow-hidden"
            role="group"
            aria-label="Playback speed"
          >
            {([1, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  speed === s ? 'bg-mandate text-paper-raised' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-muted tabular-nums ml-auto">
            {total === 0 ? 'No recorded steps' : `Step ${revealed} of ${total}`}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={revealed}
          onChange={(e) => scrub(Number(e.target.value))}
          disabled={total === 0}
          aria-label="Scrub the timeline — step through the job’s events"
          className="w-full accent-mandate cursor-pointer disabled:opacity-40 disabled:cursor-default"
        />

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-muted truncate">
            {lastEvent
              ? `Last step: ${eventLabel(lastEvent.type)}`
              : total > 0
                ? 'Ready — press play or drag the scrubber.'
                : 'This job has no recorded steps yet.'}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-paper-inset px-2.5 py-1 font-medium text-ink tabular-nums">
            Quotes in: {quotesIn}{offers.length > 0 ? ` of ${offers.length}` : ''}
          </span>
        </div>
      </div>

      {/* The timeline, driven — with mission + events + rehearsal set it never polls */}
      <MissionTimeline mission={playbackMission} events={revealedEvents} rehearsal />
    </div>
  );
}
