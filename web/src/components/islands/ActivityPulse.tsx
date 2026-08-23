import React, { useEffect, useState } from 'react';

/**
 * Shows a live-feeling ticker of recent anonymized activity.
 * Uses synthetic events to signal that the system is active.
 */

const ACTIVITIES = [
  { text: 'Fridge repair completed in N1', time: '14 min ago', type: 'done' },
  { text: 'Hood extraction quote accepted in EC1', time: '28 min ago', type: 'done' },
  { text: 'Grease trap clean booked in E2', time: '42 min ago', type: 'booked' },
  { text: 'Emergency plumbing sourced in N7', time: '1 hr ago', type: 'sourcing' },
  { text: 'Ice machine repair verified in SE1', time: '1.5 hrs ago', type: 'done' },
];

export default function ActivityPulse() {
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setVisibleIdx((i) => (i + 1) % ACTIVITIES.length);
        setShow(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activity = ACTIVITIES[visibleIdx];

  return (
    <div className="flex items-center gap-2.5 overflow-hidden h-6">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-mandate" />
      </span>
      <p
        className={`text-xs text-ink-muted transition-all duration-300 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <span className="text-ink">{activity.text}</span>
        <span className="mx-1.5 text-ink/30">·</span>
        <span>{activity.time}</span>
      </p>
    </div>
  );
}
