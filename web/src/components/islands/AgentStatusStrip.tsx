import React, { useEffect, useState } from 'react';
import type { Mission } from '../../lib/api';
import { agentNarrative, isIdleStatus } from '../../lib/copy';

interface Props {
  mission: Mission;
  /** Live quote count, when known — makes the narrative concrete. */
  offerCount?: number;
  /** ISO timestamp of the most recent timeline event. */
  lastEventAt?: string;
}

/** Subtle 3-dot pulse — the agent is thinking, not spinning. */
function ThinkingDots() {
  return (
    <span aria-hidden className="inline-flex items-end gap-[3px] shrink-0 h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-mandate"
          style={{ animation: `pixel-on 1.1s ease-in-out ${i * 180}ms infinite`, opacity: 0.25 }}
        />
      ))}
    </span>
  );
}

function agoLabel(iso?: string, now = Date.now()): string {
  if (!iso) return 'just now';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'just now';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/**
 * AgentStatusStrip — a persistent paper-card strip near the top of the
 * mission page narrating what the agent is doing right now, in plain
 * English. Not a status badge: a live sentence, a thinking pulse, and a
 * last-action timestamp. Idle missions stand by.
 */
export default function AgentStatusStrip({ mission, offerCount, lastEventAt }: Props) {
  const idle = isIdleStatus(mission.status) && mission.status !== 'DRAFT';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const narrative = idle
    ? 'Standing by — say or type when something breaks.'
    : agentNarrative(mission.status, {
        offerCount,
        budgetMax: mission.mandate?.budget?.maxAmount,
        currency: mission.mandate?.budget?.currency,
      });

  const when = lastEventAt ?? mission.updatedAt ?? mission.createdAt;

  return (
    <div
      className="paper-card rounded-2xl px-4 py-3.5 flex items-center gap-3 animate-pop-in"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {idle ? (
        <span aria-hidden className="h-2 w-2 rounded-full bg-ink-muted/50 shrink-0" />
      ) : (
        <ThinkingDots />
      )}
      <p className="text-sm text-ink leading-snug flex-1 min-w-0">
        {narrative}
      </p>
      <span className="text-[11px] text-ink-muted tabular-nums shrink-0" title={when ? new Date(when).toLocaleString('en-GB') : undefined}>
        {idle ? 'idle' : `last action ${agoLabel(when, now)}`}
      </span>
    </div>
  );
}
