import React, { useEffect, useState } from 'react';
import { type Event, type Mission, getEvents, getMission } from '../../lib/api';
import ThinkingTrace, { type TraceRow } from '../primitives/ThinkingTrace';
import { LoadingStatus } from '../primitives/LoaderGrid';
import ToolChips, { type ToolChipCall } from '../primitives/ToolChips';

interface Props {
  missionId: string;
}

export default function MissionTimeline({ missionId }: Props) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  const fetchLatest = async () => {
    try {
      const [m, evs] = await Promise.all([getMission(missionId), getEvents(missionId)]);
      setMission(m);
      setEvents(evs);
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 2000);
    return () => clearInterval(interval);
  }, [missionId]);

  const stages = [
    { label: 'Mandate', status: ['DRAFT', 'MANDATE_CONFIRMED'] },
    { label: 'Sourcing', status: ['SOURCING'] },
    { label: 'Offers', status: ['OFFERS_RECEIVED', 'NEGOTIATING'] },
    { label: 'Committed', status: ['COMMITTED', 'AWAITING_APPROVAL'] },
    { label: 'In Progress', status: ['IN_PROGRESS', 'EVIDENCE_PENDING'] },
    { label: 'Verifying', status: ['VERIFYING'] },
    { label: 'Completed', status: ['COMPLETED'] },
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

  // Map events to ThinkingTrace rows
  const traceRows: TraceRow[] = events.map((evt) => ({
    primary: evt.type,
    secondary: new Date(evt.createdAt).toLocaleTimeString(),
    policyResult: evt.policyResult as 'ALLOW' | 'ESCALATE' | 'DENY',
    actor: evt.actor,
    mono: true,
  }));

  // Map events to ToolChips calls
  const toolCalls: ToolChipCall[] = events.map((evt) => {
    const isAllow = evt.policyResult === 'ALLOW';
    return {
      icon: evt.type.includes('COMMITTED') ? 'a2a' : evt.type.includes('POLICY') ? 'policy' : 'run',
      label: evt.type.replace(/_/g, ' '),
      chip: evt.actor,
      detailLines: [
        `Policy Check: ${evt.policyResult}`,
        `Payload: ${typeof evt.payload === 'object' ? JSON.stringify(evt.payload) : String(evt.payload)}`,
      ],
      diffAdd: isAllow ? 1 : 0,
      diffDel: isAllow ? 0 : 1,
    };
  });

  return (
    <div className="space-y-6">
      {mission && (
        <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                  mission.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  mission.status === 'COMMITTED' || mission.status === 'IN_PROGRESS' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' :
                  mission.status === 'AWAITING_APPROVAL' || mission.status === 'ESCALATED' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {mission.status}
                </span>
                <span className="text-xs font-mono text-slate-500">ID: {mission.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">{mission.goal}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {mission.status === 'COMPLETED' && (
                <a
                  href={`/missions/${mission.id}/receipt`}
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>View Proof Receipt 📄</span>
                </a>
              )}
              <a
                href={`/evidence/${mission.id}`}
                className="bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Supplier Evidence Portal 📷</span>
              </a>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-slate-400 overflow-x-auto pb-1">
              {stages.map((st, idx) => {
                const isPassed = idx <= activeStageIdx;
                const isCurrent = idx === activeStageIdx;
                return (
                  <div key={idx} className="flex items-center gap-1.5 shrink-0 px-1">
                    <span className={`w-2 h-2 rounded-full ${
                      isCurrent ? 'bg-cyan-400 animate-ping ring-4 ring-cyan-500/20' :
                      isPassed ? 'bg-emerald-400' : 'bg-slate-800'
                    }`} />
                    <span className={isCurrent ? 'text-cyan-300 font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600'}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-slate-950/80 h-1.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: `${Math.min(100, ((activeStageIdx + 1) / stages.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Agentic Trace & Tool Calls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thinking Trace */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
              <span>Agentic Thinking Trace</span>
            </h3>
            {isWorking && <LoadingStatus label="Auditing Policy" />}
          </div>

          <ThinkingTrace
            activeTitle="Executing Autonomous Agent Loop"
            doneTitle={`Audit Trace (${traceRows.length} Policy Checks Completed)`}
            working={isWorking}
            rows={traceRows}
            defaultExpanded={true}
          />
        </div>

        {/* Tool Chips Trace */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
              <span>Tool Call Inspections</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">A2A Protocol</span>
          </div>

          <ToolChips calls={toolCalls} />
        </div>
      </div>
    </div>
  );
}
