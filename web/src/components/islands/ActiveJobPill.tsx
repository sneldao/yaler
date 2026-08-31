import React, { useEffect, useState } from 'react';
import { type Mission } from '../../lib/api';
import { listMissionsCached, onMissionsChanged } from '../../lib/cache';
import { statusLabel } from '../../lib/copy';
import { setActiveJobCount } from '../../stores';

/**
 * A small pill in the nav bar showing the current active job:
 * "N1 · In progress · 12m". Polls every 5s (deduped through the shared
 * cache), refreshes instantly when another tab changes the mission list,
 * and ticks the elapsed time every 30s.
 */

function formatElapsed(createdAt: string, now: number): string {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return '';
  const mins = Math.max(0, Math.floor((now - start) / 60000));
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ActiveJobPill() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const missions = await listMissionsCached();
        if (!active) return;
        // Find the most recent non-terminal mission
        const activeMissions = missions.filter(
          (m: Mission) => m.status !== 'COMPLETED' && m.status !== 'CANCELLED'
        );
        const activeMission = activeMissions[0] || null;
        setMission(activeMission);
        // Publish the count to the shared store so other islands
        // (landing page activity pulse, etc.) can read it.
        setActiveJobCount(activeMissions.length);
      } catch {
        if (active) {
          setMission(null);
          setActiveJobCount(0);
        }
      }
    };

    check();
    const interval = setInterval(check, 5000);
    // Another tab created/changed a job — refresh right away (the broadcast
    // has already invalidated the shared cache).
    const unsubscribe = onMissionsChanged(() => {
      check();
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Elapsed-time ticker — cheap re-render every 30s.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  if (!mission) return null;

  const isUrgent = mission.status === 'AWAITING_APPROVAL' || mission.status === 'ESCALATED';
  const district = mission.mandate?.serviceArea?.postalDistrict || 'Job';
  const elapsed = formatElapsed(mission.createdAt, now);
  const text = [district, statusLabel(mission.status), elapsed].filter(Boolean).join(' · ');

  return (
    <a
      href={`/missions/${mission.id}`}
      className={`flex items-center gap-2 text-xs px-3 min-h-9 sm:min-h-11 py-1.5 rounded-full border transition-colors ${
        isUrgent
          ? 'border-escalate/30 bg-escalate/5 text-escalate hover:bg-escalate/10'
          : 'border-mandate/30 bg-mandate/5 text-mandate hover:bg-mandate/10'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${
          isUrgent ? 'bg-escalate' : 'bg-mandate'
        }`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
          isUrgent ? 'bg-escalate' : 'bg-mandate'
        }`} />
      </span>
      <span className="font-medium truncate max-w-[170px] sm:max-w-[220px]">{text}</span>
    </a>
  );
}
