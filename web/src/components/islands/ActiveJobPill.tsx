import React, { useEffect, useState } from 'react';
import { listMissions, type Mission } from '../../lib/api';
import { statusLabel } from '../../lib/copy';

/**
 * A small pill in the nav bar showing the current active mission status.
 * Polls every 5s for any non-terminal mission.
 */

export default function ActiveJobPill() {
  const [mission, setMission] = useState<Mission | null>(null);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const missions = await listMissions();
        if (!active) return;
        // Find the most recent non-terminal mission
        const activeMission = missions.find(
          (m: Mission) => m.status !== 'COMPLETED' && m.status !== 'CANCELLED'
        );
        setMission(activeMission || null);
      } catch {
        if (active) setMission(null);
      }
    };

    check();
    const interval = setInterval(check, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!mission) return null;

  const isUrgent = mission.status === 'AWAITING_APPROVAL' || mission.status === 'ESCALATED';

  return (
    <a
      href={`/missions/${mission.id}`}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
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
      <span className="font-medium truncate max-w-[120px]">{statusLabel(mission.status)}</span>
    </a>
  );
}
