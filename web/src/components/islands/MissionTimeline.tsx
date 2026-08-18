import React, { useEffect, useState } from 'react';
import { type Event, type Mission, getEvents, getMission } from '../../lib/api';
import ThinkingTrace, { type TraceRow } from '../primitives/ThinkingTrace';
import { LoadingStatus } from '../primitives/LoaderGrid';
import ToolChips, { type ToolChipCall } from '../primitives/ToolChips';
import StatusBadge from '../primitives/StatusBadge';
import { eventLabel, formatMoney, nextActionLabel } from '../../lib/copy';

interface Props {
  missionId?: string;
  mission?: Mission;
  events?: Event[];
  rehearsal?: boolean;
}

export default function MissionTimeline({
  missionId,
  mission: missionProp,
  events: eventsProp,
  rehearsal = false,
}: Props) {
  const [mission, setMission] = useState<Mission | null>(missionProp ?? null);
  const [events, setEvents] = useState<Event[]>(eventsProp ?? []);
  const [showWork, setShowWork] = useState(false);

  useEffect(() => {
    if (missionProp) setMission(missionProp);
    if (eventsProp) setEvents(eventsProp);
  }, [missionProp, eventsProp]);

  const fetchLatest = async () => {
    if (!missionId || rehearsal) return;
    try {
      const [m, evs] = await Promise.all([getMission(missionId), getEvents(missionId)]);
      setMission(m);
      setEvents(evs);
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  useEffect(() => {
    if (!missionId || rehearsal) return;
    fetchLatest();
    const interval = setInterval(fetchLatest, 2000);
    return () => clearInterval(interval);
  }, [missionId, rehearsal]);

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

  const traceRows: TraceRow[] = events.map((evt) => ({
    primary: eventLabel(evt.type),
    secondary: new Date(evt.createdAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
    policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
    actor: evt.actor,
    mono: false,
  }));

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
    <div className="space-y-5">
      {mission && (
        <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <StatusBadge status={mission.status} />
              <h1 className="font-display text-3xl text-ink tracking-tight leading-tight">{mission.goal}</h1>
              <p className="text-sm text-ink-muted">{nextActionLabel(mission.status, rehearsal)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {mission.status === 'COMPLETED' && !rehearsal && (
                <a href={`/missions/${mission.id}/receipt`} className="btn-primary text-sm py-2.5">
                  Get the receipt
                </a>
              )}
              {(mission.status === 'IN_PROGRESS' || mission.status === 'EVIDENCE_PENDING') && !rehearsal && (
                <a href={`/evidence/${mission.id}`} className="btn-secondary text-sm py-2.5">
                  Send photos
                </a>
              )}
            </div>
          </div>

          <p className="text-sm text-ink-muted">
            Up to {formatMoney(mission.mandate.budget.maxAmount)} · {mission.mandate.serviceArea.postalDistrict}
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-ink-muted overflow-x-auto pb-1">
              {stages.map((st, idx) => {
                const isPassed = idx <= activeStageIdx;
                const isCurrent = idx === activeStageIdx;
                return (
                  <div key={st.label} className="flex items-center gap-1.5 shrink-0 px-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isCurrent ? 'bg-mandate' : isPassed ? 'bg-mandate/50' : 'bg-ink/15'
                    }`} />
                    <span className={isCurrent ? 'text-ink font-medium' : isPassed ? 'text-ink-muted' : 'text-ink/30'}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-paper-inset h-1 rounded-full overflow-hidden">
              <div
                className="bg-mandate h-full transition-[width] duration-500 ease-yaler"
                style={{ width: `${Math.min(100, ((activeStageIdx + 1) / stages.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowWork((open) => !open)}
        className="text-sm text-ink-muted hover:text-ink transition-colors"
      >
        {showWork ? 'Hide what we’re doing' : 'Show what we’re doing'}
      </button>

      {showWork && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pop-in">
          <div className="paper-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">What’s happening</h3>
              {isWorking && <LoadingStatus label="Working" />}
            </div>
            <ThinkingTrace
              activeTitle="Working through the job"
              doneTitle={`${traceRows.length} updates`}
              working={isWorking}
              rows={traceRows}
              defaultExpanded={false}
            />
          </div>

          <div className="paper-card rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-medium text-ink">Checks we ran</h3>
            <ToolChips calls={toolCalls} />
          </div>
        </div>
      )}
    </div>
  );
}
