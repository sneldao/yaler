import React, { useEffect, useState } from 'react';
import { type Event, type Mission, getEvents, getMission } from '../../lib/api';

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

  return (
    <div className="space-y-6">
      {mission && (
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                  mission.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  mission.status === 'COMMITTED' || mission.status === 'IN_PROGRESS' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                  mission.status === 'AWAITING_APPROVAL' || mission.status === 'ESCALATED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {mission.status}
                </span>
                <span className="text-xs font-mono text-slate-500">ID: {mission.id}</span>
              </div>
              <h1 className="text-2xl font-bold text-white mt-2">{mission.goal}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {mission.status === 'COMPLETED' && (
                <a
                  href={`/missions/${mission.id}/receipt`}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>View Proof Receipt 📄</span>
                </a>
              )}
              <a
                href={`/evidence/${mission.id}`}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-slate-700/80 transition text-xs sm:text-sm flex items-center gap-2"
              >
                <span>Supplier Evidence Portal 📷</span>
              </a>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-slate-400 overflow-x-auto pb-1">
              {stages.map((st, idx) => {
                const isPassed = idx <= activeStageIdx;
                const isCurrent = idx === activeStageIdx;
                return (
                  <div key={idx} className="flex items-center gap-1.5 shrink-0 px-1">
                    <span className={`w-2 h-2 rounded-full ${
                      isCurrent ? 'bg-cyan-400 animate-pulse ring-4 ring-cyan-500/20' :
                      isPassed ? 'bg-emerald-400' : 'bg-slate-800'
                    }`} />
                    <span className={isCurrent ? 'text-cyan-400 font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600'}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((activeStageIdx + 1) / stages.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit Event Log */}
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span>Audit Event Feed</span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Polling active (2s interval)</span>
        </div>

        <div className="relative border-l-2 border-slate-800/80 ml-3 space-y-6">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500 ml-6 py-4 font-mono">Initializing event audit pipeline...</p>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="relative ml-6 group">
                <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 ${
                  evt.policyResult === 'ALLOW' ? 'border-emerald-400 shadow-sm shadow-emerald-400/50' :
                  evt.policyResult === 'ESCALATE' ? 'border-amber-400 shadow-sm shadow-amber-400/50' : 'border-red-400'
                }`} />

                <div className="bg-[#060a12] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 space-y-2.5 transition">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                      {evt.type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                    <span className="text-slate-400">Actor: <strong className="text-slate-200">{evt.actor}</strong></span>
                    <span className="text-slate-700">•</span>
                    <span className="text-slate-400">Policy:
                      <strong className={`ml-1 px-1.5 py-0.2 rounded ${
                        evt.policyResult === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        evt.policyResult === 'ESCALATE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {evt.policyResult}
                      </strong>
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 overflow-x-auto">
                    {typeof evt.payload === 'object' ? JSON.stringify(evt.payload, null, 2) : String(evt.payload)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
