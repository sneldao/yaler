import React, { useState, useEffect } from 'react';
import { type Mission, getMission } from '../../lib/api';
import MandateEditor from './MandateEditor';
import MissionTimeline from './MissionTimeline';
import OfferComparison from './OfferComparison';

interface Props {
  initialMissionId?: string;
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

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function load() {
      if (active) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getMission(id);
        if (active) {
          setMission(data);
          // Stop polling once the mission reaches a terminal state.
          if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
            if (interval) clearInterval(interval);
            interval = null;
          }
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Job not found');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    // Poll so the UI reflects worker-driven state changes (auto-commit in
    // DELEGATE mode, evidence transitions, etc.) without a manual refresh.
    interval = setInterval(load, 3000);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="paper-card rounded-2xl p-10 text-center space-y-2">
        <p className="font-display text-xl text-ink">Opening the job…</p>
        <p className="text-sm text-ink-muted">This should only take a moment.</p>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-4">
        <h2 className="font-display text-2xl text-ink">We couldn’t find that job</h2>
        <p className="text-ink-muted text-sm">{error || 'It may have expired, or the link is wrong.'}</p>
        <a href="/" className="btn-primary inline-flex">Back home</a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {mission.status === 'DRAFT' ? (
        <MandateEditor
          initialMission={mission}
          onStarted={(next) => setMission(next)}
        />
      ) : (
        <>
          <MissionTimeline missionId={mission.id} />
          <OfferComparison missionId={mission.id} missionStatus={mission.status} />
        </>
      )}
    </div>
  );
}
