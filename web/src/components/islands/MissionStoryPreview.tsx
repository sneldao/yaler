import React, { useEffect, useState } from 'react';
import { LoaderGrid } from '../primitives/LoaderGrid';

/**
 * Animated empty state that tells the story of a mission lifecycle.
 * Plays once, then settles into a static state with a CTA.
 */

const STEPS = [
  { label: 'Say what is broken', icon: '💬', delay: 0 },
  { label: 'Agent checks the budget', icon: '🛡️', delay: 800 },
  { label: 'Three quotes come in', icon: '📋', delay: 1600 },
  { label: 'Best one booked', icon: '✓', delay: 2400 },
  { label: 'Photos checked', icon: '📸', delay: 3200 },
  { label: 'Receipt ready', icon: '🧾', delay: 4000 },
];

export default function MissionStoryPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, idx) => {
      timers.push(setTimeout(() => setVisibleCount(idx + 1), STEPS[idx].delay));
    });
    timers.push(setTimeout(() => setSettled(true), STEPS[STEPS.length - 1].delay + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="paper-card rounded-2xl p-6 sm:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-ink-muted">How a mission runs</p>
        {!settled && <LoaderGrid />}
      </div>

      <div className="space-y-2">
        {STEPS.slice(0, visibleCount).map((step, idx) => {
          const isLatest = idx === visibleCount - 1 && !settled;
          return (
            <div
              key={step.label}
              className="flex items-center gap-3 py-1.5 animate-fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                isLatest ? 'bg-mandate/10 ring-1 ring-mandate/30' : 'bg-paper-inset'
              }`}>
                {step.icon}
              </span>
              <span className={`text-sm ${isLatest ? 'text-ink font-medium' : 'text-ink-muted'}`}>
                {step.label}
              </span>
              {idx < visibleCount - 1 && (
                <span className="ml-auto text-mandate text-xs">✓</span>
              )}
              {isLatest && !settled && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-mandate animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {settled && (
        <div className="border-t border-ink/10 pt-4 space-y-3 animate-pop-in">
          <p className="text-sm text-ink leading-relaxed">
            That is the full loop. Say what is broken, set a budget, and we handle the rest — discovery, quotes, booking, evidence, and a receipt.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="/rehearsal" className="btn-primary text-sm text-center py-2.5 flex-1">
              Try the rehearsal
            </a>
            <a href="/missions/new" className="btn-secondary text-sm text-center py-2.5 flex-1">
              Start a real job
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
