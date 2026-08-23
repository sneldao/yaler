import React, { useState, useEffect, useCallback } from 'react';
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
