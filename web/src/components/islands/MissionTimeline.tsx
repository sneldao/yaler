import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Event, type Mission, addDiagnosticMedia, createMediaAccess, getEvents, getMission, submitMissionFeedback, updateDiagnosticSignal, uploadImage } from '../../lib/api';
import ThinkingTrace, { type TraceRow } from '../primitives/ThinkingTrace';
import { LoadingStatus } from '../primitives/LoaderGrid';
import ToolChips, { type ToolChipCall } from '../primitives/ToolChips';
import StatusBadge from '../primitives/StatusBadge';
import { AGENT_TOOLS, EMPTY_STATE_COPY, eventLabel, formatMoney, nextActionLabel, supplierLabel } from '../../lib/copy';
import SponsorCallout, { SponsorRail, type SponsorId } from '../primitives/SponsorCallout';
import { celebrate, shake, playUiSound, markJobCompleted } from '../../lib/delight';

/** Rotating "still knocking" messages during SOURCING — the longest wait.
 *  Cycles every 4s with a fade swap so the user knows the agent is alive. */
const SOURCING_PULSE_LINES = [
  'Knocking on doors in N1\u2026',
  'Checking who\u2019s Gas Safe registered\u2026',
  'Asking for same-day availability\u2026',
  'Cross-referencing your budget ceiling\u2026',
  'Waiting on the third quote to come back\u2026',
  'One engineer is checking their van stock\u2026',
];

function SourcingPulse() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SOURCING_PULSE_LINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-mandate animate-pulse shrink-0" aria-hidden />
      <span key={idx} className="animate-fade-in">{SOURCING_PULSE_LINES[idx]}</span>
    </div>
  );
}

/** Map status to a human-readable description of what the agent is doing right now */
function agentNarrative(status?: string): string {
  switch (status) {
    case 'SOURCING': return 'Asked nearby engineers and is waiting for real quotes. This can take a few minutes — you don’t need to stay here.';
    case 'OFFERS_RECEIVED': return 'Comparing the quotes that came back against your budget and area rules.';
    case 'NEGOTIATING': return 'Checking if a counter-offer keeps us within mandate';
    case 'COMMITTED': return 'Locked in the booking — engineer confirmed, dispatching now';
    case 'AWAITING_APPROVAL': return 'One quote is over budget. Waiting for your call — approve, reject, or reroute';
    case 'IN_PROGRESS': return 'Engineer is on site. Waiting for completion update';
    case 'EVIDENCE_PENDING': return 'Asking for photo evidence before we close this off';
    case 'VERIFYING': return 'Checking the photos against what was agreed';
    case 'COMPLETED': return 'Verified and done. The receipt is ready — and you can rate the engineer to build the roster.';
    case 'ESCALATED': return 'Every engineer declined or timed out with no quote. We’ll re-run the search, or you can add a verified one.';
    default: return 'Preparing the mission';
  }
}

interface Props {
  missionId?: string;
  mission?: Mission;
  events?: Event[];
  rehearsal?: boolean;
}

/** Compose the sentence a screen reader speaks when a new event lands. */
function announceEvent(evt: Event): string {
  if (evt.type === 'OFFER_RECEIVED' || evt.type === 'QUOTE_RECEIVED') {
    const p = (evt.payload ?? {}) as Record<string, unknown>;
    const name = supplierLabel((p.supplierAgentId as string) || (p.supplierId as string) || evt.actor);
    const price = typeof p.price === 'number' ? formatMoney(p.price, (p.currency as string) || 'GBP') : null;
    const eta = (p.availability as string) || (p.eta as string) || null;
    return `Quote received from ${name}${price ? `, ${price}` : ''}${eta ? `, arriving ${eta}` : ''}`;
  }
  return eventLabel(evt.type);
}

/** Paper-cutout fridge icon for empty states — pure SVG, no image request. */
function DiagnosticBriefCard({ brief, missionId, onUpdated }: { brief: NonNullable<Mission['diagnosticBrief']>; missionId?: string; onUpdated?: (mission: Mission) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [uploadingFollowUp, setUploadingFollowUp] = useState<string | null>(null);
  const review = async (index: number, action: 'CONFIRM' | 'DISMISS') => {
    if (!missionId || busy !== null) return;
    setBusy(index);
    try { onUpdated?.(await updateDiagnosticSignal(missionId, index, action)); } finally { setBusy(null); }
  };
  const startEdit = (index: number, value: string) => { setEditing(index); setDraft(value); };
  const saveEdit = async (index: number) => {
    if (!missionId || busy !== null || draft.trim() === '') return;
    setBusy(index);
    try {
      onUpdated?.(await updateDiagnosticSignal(missionId, index, 'EDIT', draft.trim()));
      setEditing(null);
    } finally { setBusy(null); }
  };
  const sections = [
    ['Known', brief.known],
    ['Likely areas', brief.likelyAreas],
    ['To confirm', brief.toConfirm],
  ] as const;
  return (
    <div className="group rounded-xl border border-ink/10 bg-paper-inset/50">
      <div className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-ink">
        <span className="font-medium">Issue brief</span>
        <span className="text-[11px] text-ink-muted">{brief.confidence || 'preliminary'} · for the engineer</span>
      </div>
      <div className="px-3 pb-3 space-y-2.5 border-t border-ink/10 pt-2.5">
        <div className="rounded-lg bg-paper border border-ink/10 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-0.5">Reported</p>
          <p className="text-xs text-ink">{brief.reportedSummary}</p>
        </div>
        {brief.extractedSignals && brief.extractedSignals.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-1">Observed from evidence</p>
            <div className="flex flex-wrap gap-1.5">
              {brief.extractedSignals.map((signal, index) => (
                <span key={`${signal.label}-${signal.value}`} className="text-[10px] bg-paper border border-ink/10 rounded-full px-2 py-1 text-ink">
                  {editing === index ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(index); if (e.key === 'Escape') setEditing(null); }}
                        className="w-24 bg-paper-inset border border-ink/10 rounded px-1 py-0.5 text-ink"
                        aria-label={`Edit ${signal.label}`}
                      />
                      <button type="button" className="underline" disabled={busy === index || draft.trim() === ''} onClick={() => saveEdit(index)}>save</button>
                      <button type="button" className="underline" disabled={busy === index} onClick={() => setEditing(null)}>cancel</button>
                    </span>
                  ) : (
                    <>
                      {signal.label}: {signal.value} <span className="text-ink-muted">· {signal.status === 'CONFIRMED' ? 'manager-confirmed' : signal.status === 'DISMISSED' ? 'dismissed' : signal.confidence}</span>
                      {missionId && signal.status !== 'DISMISSED' && signal.status !== 'CONFIRMED' && <span className="ml-1 mt-1 inline-flex flex-wrap gap-1.5 align-middle"><button type="button" className="min-h-9 rounded-md px-1.5 underline" disabled={busy === index} onClick={() => review(index, 'CONFIRM')}>confirm</button><button type="button" className="min-h-9 rounded-md px-1.5 underline" disabled={busy === index} onClick={() => startEdit(index, signal.value)}>edit</button><button type="button" className="min-h-9 rounded-md px-1.5 underline" disabled={busy === index} onClick={() => review(index, 'DISMISS')}>dismiss</button></span>}
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        {sections.map(([label, items]) => items.length > 0 && (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-1">{label === 'Likely areas' ? 'Possible areas' : label === 'To confirm' ? 'Verify on site' : label}</p>
            <ul className="space-y-0.5 text-xs text-ink">
              {items.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </div>
        ))}
        {brief.diagnosticMedia && brief.diagnosticMedia.length > 0 && (
          <p className="text-[10px] text-ink-muted">
            Photos attached · {brief.analysisStatus === 'COMPLETED' ? 'visual signals extracted' : brief.analysisStatus === 'FAILED' ? 'visual analysis unavailable' : 'image analysis in progress'}
          </p>
        )}
        {brief.followUpRequests && brief.followUpRequests.some((request) => request.requested && !request.completed) && (
          <div className="rounded-lg border border-mandate/20 bg-mandate-light/30 p-2.5 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-mandate">Optional follow-up</p>
            {brief.followUpRequests.filter((request) => request.requested && !request.completed).map((request) => (
              <label key={request.kind} className="flex items-start gap-2 text-xs text-ink cursor-pointer">
                <span className="flex-1"><strong>{request.kind === 'model_plate' ? 'Model plate' : 'Display / error'}</strong> · {request.reason}</span>
                <span className="shrink-0 text-mandate underline">{uploadingFollowUp === request.kind ? 'Uploading…' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingFollowUp !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !missionId) return;
                      setUploadingFollowUp(request.kind);
                      try {
                        const uploaded = await uploadImage(file);
                        onUpdated?.(await addDiagnosticMedia(missionId, { kind: request.kind, url: uploaded.url, objectKey: uploaded.objectKey, mimeType: uploaded.mimeType, label: request.kind === 'model_plate' ? 'Model plate' : 'Display / error' }));
                      } finally {
                        setUploadingFollowUp(null);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </span>
              </label>
            ))}
            <p className="text-[10px] text-ink-muted">Optional and limited to the most useful missing view — the job continues without it.</p>
          </div>
        )}
        {brief.diagnosticMedia && brief.diagnosticMedia.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {brief.diagnosticMedia.map((media) => (
              <button key={media.url} type="button" onClick={async () => { try { const access = await createMediaAccess(missionId || '', media.objectKey || ''); window.open(access.url, '_blank', 'noopener,noreferrer'); } catch { /* unavailable media stays non-blocking */ } }} className="text-[10px] text-mandate border border-mandate/20 rounded-full px-3 min-h-9 inline-flex items-center">{media.label}</button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-ink-muted italic">Possible areas are suggestions, not a confirmed diagnosis.</p>
      </div>
    </div>
  );
}

/** Paper-cutout fridge icon for empty states — pure SVG, no image request. */
function FridgeCutout({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="1.5" />
      <path d="M6 9.5h12" />
      <path d="M9 5.5v2M9 12v3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * ToolTraceRail — the agent's toolbelt as a horizontal rail. Each chip
 * lights up (with the same fade-up the timeline uses) when the matching
 * tool fires on the event stream; the most recently fired tool carries a
 * live dot. Sticky positioning is the caller's job.
 */
export function ToolTraceRail({ events }: { events: Event[] }) {
  const { firedAt, activeId } = useMemo(() => {
    const map = new Map<string, string>();
    for (const tool of AGENT_TOOLS) {
      const hits = events.filter((e) => tool.eventTypes.includes(e.type));
      if (hits.length > 0) {
        const latest = hits.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
        map.set(tool.id, latest.createdAt);
      }
    }
    let active: string | null = null;
    let newest = 0;
    for (const [id, at] of map) {
      const t = new Date(at).getTime();
      if (t >= newest) { newest = t; active = id; }
    }
    return { firedAt: map, activeId: active };
  }, [events]);

  return (
    <div
      className="paper-card rounded-2xl px-3 py-2 overflow-x-auto"
      role="list"
      aria-label="Agent tools — chips light up as each tool runs"
    >
      <div className="flex items-center gap-1.5 min-w-max">
        {AGENT_TOOLS.map((tool) => {
          const lit = firedAt.has(tool.id);
          const isActive = activeId === tool.id;
          return (
            <span
              key={`${tool.id}-${lit}`} // remount on light-up → replay the fade-up
              role="listitem"
              aria-label={`${tool.label} ${lit ? 'ran' : 'has not run yet'}`}
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors duration-300 ${
                lit
                  ? 'animate-fade-up bg-mandate-light border-mandate/30 text-mandate'
                  : 'bg-paper border-ink/10 text-ink-muted/50'
              }`}
            >
              {isActive ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mandate" />
                </span>
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${lit ? 'bg-mandate/60' : 'bg-ink/15'}`} />
              )}
              {tool.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function MissionTimeline({
  missionId,
  mission: missionProp,
  events: eventsProp,
  rehearsal = false,
}: Props) {
  const [mission, setMission] = useState<Mission | null>(missionProp ?? null);
  const [events, setEvents] = useState<Event[]>(eventsProp ?? []);
  const [hideWork, setHideWork] = useState(false);
  const prevStatusRef = useRef<string | undefined>(missionProp?.status);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (missionProp) setMission(missionProp);
    if (eventsProp) setEvents(eventsProp);
  }, [missionProp, eventsProp]);

  // ─── Celebrations on status transitions ───────────────────
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = mission?.status;
    if (!curr || curr === prev) return;
    prevStatusRef.current = curr;

    // Don't fire on initial load
    if (!prev) return;

    switch (curr) {
      case 'OFFERS_RECEIVED':
        playUiSound('ding');
        break;
      case 'COMMITTED':
        playUiSound('ding');
        celebrate(cardRef.current);
        break;
      case 'AWAITING_APPROVAL':
        playUiSound('stop');
        shake(cardRef.current);
        break;
      case 'EVIDENCE_PENDING':
        playUiSound('ping');
        break;
      case 'COMPLETED':
        playUiSound('paper');
        celebrate(cardRef.current);
        markJobCompleted();
        break;
    }
  }, [mission?.status]);

  const fetchLatest = useCallback(async (): Promise<string | null> => {
    if (!missionId || rehearsal) return null;
    try {
      const [m, evs] = await Promise.all([getMission(missionId), getEvents(missionId)]);
      setMission(m);
      setEvents(evs);
      // Fingerprint of "did anything change" for the backoff below.
      return `${m.status}:${evs.length}:${evs[evs.length - 1]?.id ?? ''}`;
    } catch (err) {
      console.error('Polling error:', err);
      return null;
    }
  }, [missionId, rehearsal]);

  // Exponential backoff polling: starts at 2s; after 5 consecutive
  // identical responses the interval doubles 2s → 4s → 8s → 16s → 30s
  // ceiling. The moment something changes, it snaps back to 2s.
  useEffect(() => {
    if (!missionId || rehearsal) return;
    // When the parent passes both mission + events it drives the data —
    // don't run a second poller.
    if (missionProp && eventsProp) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = 2000;
    let identical = 0;
    let lastHash: string | null = null;

    const tick = async () => {
      const hash = await fetchLatest();
      if (cancelled) return;
      if (hash !== null && hash === lastHash) {
        identical += 1;
      } else {
        identical = 0;
        lastHash = hash;
      }
      delay = identical >= 5 ? Math.min(delay * 2, 30000) : 2000;
      timer = setTimeout(tick, delay);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [missionId, rehearsal, missionProp, eventsProp, fetchLatest]);

  // Newest event, announced to screen readers in plain language (3.3).
  const announcement = useMemo(() => {
    if (events.length === 0) return '';
    const newest = events.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
    return announceEvent(newest);
  }, [events]);

  const stages = [
    { label: 'Details', status: ['DRAFT', 'MANDATE_CONFIRMED'] },
    { label: 'Looking', status: ['SOURCING'] },
    { label: 'Quotes', status: ['OFFERS_RECEIVED', 'NEGOTIATING'] },
    { label: 'Booked', status: ['COMMITTED', 'AWAITING_APPROVAL'] },
    { label: 'On site', status: ['IN_PROGRESS', 'EVIDENCE_PENDING'] },
    { label: 'Checking', status: ['VERIFYING'] },
    { label: 'Done', status: ['COMPLETED'] },
  ];

  const getStageIndex = (status?: string) => {
    if (!status) return 0;
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].status.includes(status)) return i;
    }
    return 0;
  };

  const activeStageIdx = getStageIndex(mission?.status);
  const isWorking = mission?.status !== 'COMPLETED' && mission?.status !== 'DRAFT';
  const showWork = isWorking && !hideWork;
  const mandateSummary = mission ? (() => {
    const when = mission.mandate.latestCompletionAt ? new Date(mission.mandate.latestCompletionAt) : null;
    return [
      mission.mandate.budget.maxAmount > 0 ? `£${mission.mandate.budget.maxAmount} max` : null,
      mission.mandate.serviceArea.postalDistrict || null,
      when && !Number.isNaN(when.getTime()) ? `by ${when.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}` : null,
      mission.mandate.requiredEvidence.length > 0 ? 'photo required' : null,
    ].filter(Boolean).join(' · ');
  })() : '';

  // Derive which sponsor APIs are active/completed from the mission status.
  const statusSponsors: Record<string, { active?: SponsorId; done?: SponsorId[] }> = {
    DRAFT: { active: 'vapi' },
    MANDATE_CONFIRMED: { done: ['vapi', 'gemini'] },
    SOURCING: { done: ['vapi', 'gemini'], active: 'gemma' },
    OFFERS_RECEIVED: { done: ['vapi', 'gemini', 'gemma', 'exa'], active: 'apify' },
    NEGOTIATING: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'] },
    COMMITTED: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'] },
    AWAITING_APPROVAL: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'] },
    IN_PROGRESS: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'] },
    EVIDENCE_PENDING: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'], active: 'gemini' },
    VERIFYING: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify'], active: 'gemini' },
    COMPLETED: { done: ['vapi', 'gemini', 'gemma', 'exa', 'apify', 'elevenlabs'] },
  };
  const sponsorState = statusSponsors[mission?.status || ''] || {};
  const activeSponsor = sponsorState.active;
  const completedSponsors = sponsorState.done;

  const traceRows: TraceRow[] = events.map((evt) => {
    const primary = eventLabel(evt.type);
    const time = new Date(evt.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

    // Enrich quote and decline events with payload details so the
    // timeline shows *which* supplier and *what price* — not just "Quote in".
    if (evt.type === 'OFFER_RECEIVED' || evt.type === 'QUOTE_RECEIVED') {
      const p = evt.payload;
      if (p && typeof p === 'object' && p.price !== undefined) {
        const name = supplierLabel(p.supplierAgentId || evt.actor);
        const price = formatMoney(p.price, p.currency || 'GBP');
        return {
          primary: `${primary} — ${name}`,
          secondary: `${price} · ${p.availability || ''} · ${time}`.trim(),
          policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
          actor: evt.actor,
          mono: false,
        };
      }
    }
    if (evt.type === 'CALLOUT_DECLINED') {
      const p = evt.payload;
      if (p && typeof p === 'object' && p.supplier) {
        const reason = p.reason ? ` — ${p.reason}` : '';
        return {
          primary: `${primary} — ${p.supplier}${reason}`,
          secondary: time,
          policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
          actor: evt.actor,
          mono: false,
        };
      }
    }
    if (evt.type === 'SUPPLIERS_SOURCED') {
      const p = evt.payload;
      if (p && typeof p === 'string') {
        return {
          primary,
          secondary: `${p} · ${time}`,
          policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
          actor: evt.actor,
          mono: false,
        };
      }
    }

    return {
      primary,
      secondary: time,
      policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
      actor: evt.actor,
      mono: false,
    };
  });

  const toolCalls: ToolChipCall[] = events.map((evt) => {
    const isAllow = evt.policyResult === 'ALLOW';
    return {
      icon: evt.type.includes('COMMITTED') ? 'a2a' : evt.type.includes('POLICY') ? 'policy' : 'run',
      label: eventLabel(evt.type),
      chip: evt.actor,
      detailLines: [
        `Rule check: ${evt.policyResult}`,
        `Note: ${typeof evt.payload === 'object' ? JSON.stringify(evt.payload) : String(evt.payload)}`,
      ],
      diffAdd: isAllow ? 1 : 0,
      diffDel: isAllow ? 0 : 1,
    };
  });

  return (
    <div className="space-y-5" ref={cardRef}>
      {/* Screen-reader announcer for new timeline events (3.3) */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="false">
        {announcement}
      </div>

      {/* Empty state — nothing recorded yet (2.1) */}
      {mission && events.length === 0 && (
        <div className="paper-card rounded-2xl p-8 text-center space-y-3 animate-pop-in">
          <div className="flex justify-center text-ink-muted/60">
            <FridgeCutout />
          </div>
          <h3 className="font-display text-xl text-ink">
            {mission.status === 'DRAFT' ? EMPTY_STATE_COPY.mandateExtracting.title : EMPTY_STATE_COPY.noEventsYet.title}
          </h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
            {mission.status === 'DRAFT' ? EMPTY_STATE_COPY.mandateExtracting.body : EMPTY_STATE_COPY.noEventsYet.body}
          </p>
        </div>
      )}

      {mission && (
        <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <StatusBadge status={mission.status} />
              <h1 className="font-display text-3xl text-ink tracking-tight leading-tight">{mission.goal}</h1>
              <p className="text-sm text-ink-muted">{nextActionLabel(mission.status, rehearsal)}</p>
              <div className="rounded-lg border border-ink/10 bg-paper-inset/40 px-3 py-2 text-xs text-ink" role="status">
                <span className="font-medium">Next:</span>{' '}
                {mission.status === 'DRAFT' ? 'Check the brief, then start looking.' :
                  mission.status === 'SOURCING' ? 'Nothing needed — qualified engineers are reviewing it.' :
                    mission.status === 'OFFERS_RECEIVED' ? 'Review the best fit against your rules.' :
                      mission.status === 'AWAITING_APPROVAL' ? 'Choose whether to approve, reject, or reroute.' :
                        mission.status === 'IN_PROGRESS' ? 'Wait for the completion update.' :
                          mission.status === 'EVIDENCE_PENDING' ? 'Send the requested completion photos.' :
                            mission.status === 'COMPLETED' ? 'Review your receipt and rate the engineer.' :
                              mission.status === 'ESCALATED' ? 'Choose whether to retry or add context.' :
                                'Yaler is handling the next step.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {(mission.status === 'IN_PROGRESS' || mission.status === 'EVIDENCE_PENDING') && !rehearsal && (
                <a href={`/evidence/${mission.id}`} className="btn-secondary text-sm py-2.5">
                  Send photos
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-ink-muted">{mandateSummary}</p>
            <span className="text-[10px] text-ink-muted border border-ink/10 rounded-full px-2 py-0.5" title="The agent acts within these rules.">Your rules</span>
          </div>

          {mission.diagnosticBrief && (
            <DiagnosticBriefCard brief={mission.diagnosticBrief} missionId={mission.id} onUpdated={setMission} />
          )}

          {/* Progress — the job as chits moving along the rail */}
          <div className="space-y-3">
            <div className="ticket-rail ticket-rail-sm overflow-x-auto hide-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                {stages.map((st, idx) => {
                  const isPassed = idx < activeStageIdx;
                  const isCurrent = idx === activeStageIdx;
                  return (
                    <div
                      key={st.label}
                      className={`chit chit-sm shrink-0 px-3 pt-4 pb-1.5 ${isCurrent ? 'border-mandate/40' : ''}`}
                      style={{ '--tilt': idx % 2 === 0 ? '-1deg' : '0.8deg' } as React.CSSProperties}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className={`font-machine text-[9px] uppercase tracking-[0.12em] whitespace-nowrap ${
                        isCurrent ? 'text-mandate font-bold' : isPassed ? 'text-ink' : 'text-ink/30'
                      }`}>
                        {isPassed ? '✓ ' : ''}{st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Current stage label on mobile */}
            <p className="text-xs text-ink font-medium sm:hidden">{stages[activeStageIdx]?.label}</p>
            <div className="w-full bg-paper-inset h-1.5 sm:h-1 rounded-full overflow-hidden">
              <div
                className={`bg-mandate h-full transition-[width] duration-500 ease-yaler ${
                  isWorking ? 'animate-pulse' : ''
                }`}
                style={{ width: `${Math.min(100, ((activeStageIdx + 1) / stages.length) * 100)}%` }}
              />
            </div>

            {/* Evidence-state folder: opened, checking, filed. */}
            {(mission.status === 'EVIDENCE_PENDING' || mission.status === 'VERIFYING' || mission.status === 'COMPLETED') && (
              <div className="folder pt-6 pb-4 mt-4">
                {mission.status === 'EVIDENCE_PENDING' && (
                  <>
                    <div className="folder-tab">Evidence dossier</div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="stamp text-escalate">Waiting</span>
                        <p className="text-xs text-ink-muted pt-1">For completion photos from the engineer.</p>
                      </div>
                      <div className="hidden sm:block text-right">
                        <p className="hand-note" aria-hidden>Waiting for engineer’s photo evidence.</p>
                      </div>
                    </div>
                  </>
                )}
                {mission.status === 'VERIFYING' && (
                  <>
                    <div className="folder-tab">Evidence dossier</div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="stamp text-mandate">Checking</span>
                        <p className="text-xs text-ink-muted pt-1">Photos are being checked against what was agreed.</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2" aria-hidden>
                        <div className="dossier-sheet w-10 h-10 flex items-center justify-center shuffle-papers">
                          <svg className="w-5 h-5 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 12a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                            <path d="M21 12a9 9 0 1 0-3.6 7.2" />
                            <path d="M12 3v9" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {mission.status === 'COMPLETED' && (
                  <>
                    <div className="folder-tab">Filed</div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="stamp text-mandate">Verified</span>
                        <p className="text-xs text-ink-muted pt-1">Evidence checked and receipt issued.</p>
                      </div>
                      <div className="hole-punch-row" aria-hidden />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`/missions/${mission.id}/receipt`}
                        className="btn-primary text-sm py-2.5"
                        style={{ viewTransitionName: 'receipt-sheet' } as React.CSSProperties}
                      >
                        Get the receipt
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {mission && !rehearsal && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-ink/10 bg-paper/95 backdrop-blur-sm px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {mission.status === 'COMPLETED' && <a href={`/missions/${mission.id}/receipt`} className="btn-primary min-h-12 w-full text-center">View receipt</a>}
          {mission.status === 'EVIDENCE_PENDING' && <a href={`/evidence/${mission.id}`} className="btn-primary min-h-12 w-full text-center">Send completion photos</a>}
          {mission.status === 'AWAITING_APPROVAL' && <a href="#offers" className="btn-primary min-h-12 w-full text-center">Review the quote</a>}
          {mission.status !== 'COMPLETED' && mission.status !== 'EVIDENCE_PENDING' && mission.status !== 'AWAITING_APPROVAL' && <span className="block text-center text-xs text-ink-muted py-3">No action needed right now</span>}
        </div>
      )}

      {/* Perf-edge separator — the receipt motif, same as the /ops desk */}
      {mission && <div className="receipt-perf" />}

      {/* Matching mechanic — compact by default, detailed state stays in the timeline. */}
      {mission && (mission.status === 'SOURCING' || mission.status === 'OFFERS_RECEIVED') && (          <div id="offers" className="paper-card rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-pop-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mandate animate-pulse" aria-hidden />
            <p className="text-sm font-medium text-ink">Matching in parallel</p>
          </div>
          <p className="text-xs text-ink-muted">Three AI supplier agents get the same short window · first valid fit wins</p>
        </div>
      )}

      {/* Sourcing animation — three AI agents preparing quotes.
          shuffle-papers gives the card a subtle paper-shuffle sway
          so the wait feels alive, not frozen. */}
      {mission && mission.status === 'SOURCING' && (
        <div className="paper-card rounded-2xl p-5 space-y-3 animate-pop-in shuffle-papers">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted font-medium">Three AI supplier agents are preparing quotes</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'London Rapid ColdCare', tier: 'Premium specialist', delay: '0s' },
              { name: 'Capital Kitchen Services', tier: 'Mid-market generalist', delay: '0.4s' },
              { name: 'East London Catering', tier: 'Budget direct fixer', delay: '0.8s' },
            ].map((agent) => (
              <div key={agent.name} className="rounded-xl border border-ink/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mandate animate-pulse" style={{ animationDelay: agent.delay }} />
                  <p className="text-sm font-medium text-ink truncate">{agent.name}</p>
                </div>
                <p className="text-[11px] text-ink-muted">{agent.tier}</p>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/20 animate-pulse" style={{ animationDelay: agent.delay }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/20 animate-pulse" style={{ animationDelay: `${parseFloat(agent.delay) + 0.2}s` }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/20 animate-pulse" style={{ animationDelay: `${parseFloat(agent.delay) + 0.4}s` }} />
                </div>
              </div>
            ))}
          </div>
          <SourcingPulse />
          <SponsorCallout
            sponsor="gemma"
            status="working"
            label="Gemma 3 27B is generating each supplier agent's quote"
            detail="Google's open model role-plays as each engineer — persona, capabilities, and price tier shape an independent quote. Separate from the Gemini 3.5 Flash that extracted your mandate."
          />
        </div>
      )}

      {/* Agent thinking — VISIBLE BY DEFAULT when working */}
      {isWorking && (
        <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-4 animate-pop-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LoadingStatus label="Agent working" />
            </div>
            <button
              type="button"
              onClick={() => setHideWork((h) => !h)}
              className="text-[11px] text-ink-muted hover:text-ink transition-colors"
            >
              {hideWork ? 'show reasoning' : 'hide'}
            </button>
          </div>

          {/* Narrative description of current step */}
          <p className="text-sm text-ink leading-relaxed">
            {agentNarrative(mission?.status)}
          </p>
          {mission?.status === 'SOURCING' && (
            <p className="text-xs text-ink-muted">No response is a timeout; declining is always okay.</p>
          )}

          {/* Sponsor rail — shows which APIs are active at each stage */}
          <SponsorRail active={activeSponsor} completed={completedSponsors} />

          {showWork && (
            <div className="border-t border-ink/10 pt-3 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3" aria-live="polite" aria-atomic="false">
                  <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wider">Reasoning</h3>
                  <ThinkingTrace
                    activeTitle="Working through the job"
                    doneTitle={`${traceRows.length} steps completed`}
                    working={isWorking}
                    rows={traceRows}
                    defaultExpanded={true}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wider">Policy checks</h3>
                  <ToolChips calls={toolCalls} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Perf-edge separator — the receipt motif, same as the /ops desk */}
      {mission && <div className="receipt-perf" />}

      {/* Rate the engineer — closes the reliability loop in the UI buyers see */}
      {mission?.status === 'COMPLETED' && !rehearsal && (
        <FeedbackCard missionId={mission.id} />
      )}

      {/* Perf-edge separator — only when a settled card follows */}
      {mission?.status === 'COMPLETED' && !rehearsal && (
        <div className="receipt-perf" />
      )}

      {/* Settled trace — shown when done, collapsed by default */}
      {!isWorking && events.length > 0 && mission?.status === 'COMPLETED' && (
        <div className="paper-card rounded-2xl p-5 space-y-3" aria-live="polite" aria-atomic="false">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ink">What the agent did</h3>
            <span className="text-[11px] text-ink-muted">{traceRows.length} steps</span>
          </div>
          <ThinkingTrace
            doneTitle={`${traceRows.length} steps completed`}
            working={false}
            rows={traceRows}
            defaultExpanded={false}
          />
        </div>
      )}
    </div>
  );
}

// FeedbackCard — the buyer rates the engineer on a completed job. One
// rating per mission; submitting it recomputes the supplier's
// ReliabilityScore on the backend (the reliability loop).
function FeedbackCard({ missionId }: { missionId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    setError('');
    try {
      await submitMissionFeedback(missionId, rating, comment || undefined);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="paper-card rounded-2xl p-5 space-y-2 animate-pop-in">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mandate/10">
            <span className="text-mandate text-sm">✓</span>
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Thanks — your rating is in</p>
            <p className="text-xs text-ink-muted">It feeds the engineer’s reliability score, so the roster learns from real jobs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card rounded-2xl p-5 space-y-3 animate-pop-in">
      <div>
        <h3 className="text-sm font-medium text-ink">Rate the engineer</h3>
        <p className="text-xs text-ink-muted mt-0.5">One rating per job. It shapes their reliability score — earned, not assumed.</p>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl p-1 transition-transform hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <span className={(hover || rating) >= n ? 'text-mandate' : 'text-ink/20'}>★</span>
          </button>
        ))}
      </div>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional note (what went well, what didn’t)"
        className="field-input text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || rating === 0}
          className="btn-primary text-sm py-2.5 px-4 disabled:opacity-40"
        >
          {submitting ? 'Sending…' : 'Submit rating'}
        </button>
        {error && <span className="text-xs text-escalate">{error}</span>}
      </div>
    </div>
  );
}
