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

  return (
    <div className="space-y-6">
      {mission && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {mission.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {mission.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">{mission.goal}</h1>
          </div>

          <div className="flex items-center gap-3">
            {mission.status === 'COMPLETED' && (
              <a
                href={`/missions/${mission.id}/receipt`}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
              >
                <span>View Redacted Proof Receipt 📄</span>
              </a>
            )}
            <a
              href={`/evidence/${mission.id}`}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition text-sm"
            >
              Supplier Evidence Portal 📷
            </a>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <span>Audit Event Timeline</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </h3>

        <div className="relative border-l-2 border-slate-800 ml-3 space-y-6">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500 ml-6">No events recorded yet.</p>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="relative ml-6">
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-cyan-500" />
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{evt.type}</span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Actor:</span>
                    <span className="font-semibold text-slate-200">{evt.actor}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">Policy:</span>
                    <span className={`font-semibold ${evt.policyResult === 'ALLOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {evt.policyResult}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800/50 overflow-x-auto">
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
