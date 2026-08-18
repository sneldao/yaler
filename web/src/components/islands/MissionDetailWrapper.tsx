import React, { useState, useEffect } from 'react';
import { type Mission, getMission } from '../../lib/api';
import MandateEditor from './MandateEditor';
import MissionTimeline from './MissionTimeline';
import OfferComparison from './OfferComparison';

interface Props {
  initialMissionId?: string;
}

export default function MissionDetailWrapper({ initialMissionId }: Props) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract ID from prop or window location pathname
  const getEffectiveId = () => {
    if (initialMissionId && initialMissionId !== 'demo') return initialMissionId;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('missions');
      if (idx !== -1 && parts[idx + 1]) {
        return parts[idx + 1];
      }
    }
    return initialMissionId || 'demo';
  };

  const id = getEffectiveId();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMission(id);
        if (active) setMission(data);
      } catch (err: any) {
        if (active) setError(err.message || 'Mission not found');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/20">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Fetching Live Mission State...
        </div>
        <p className="text-slate-400 text-sm font-mono">Querying A2A Network for ID: {id}</p>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-white">Mission Not Found</h2>
        <p className="text-slate-400 text-sm">{error || `Could not load mission with ID: ${id}`}</p>
        <a href="/" className="inline-block bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm hover:bg-cyan-400 transition">
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {mission.status === 'DRAFT' ? (
        <MandateEditor initialMission={mission} />
      ) : (
        <>
          <MissionTimeline missionId={mission.id} />
          <OfferComparison missionId={mission.id} />
        </>
      )}
    </div>
  );
}
