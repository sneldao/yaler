import React from 'react';

export default function RehearsalBanner() {
  return (
    <div className="rounded-xl border border-ink/15 bg-paper-inset px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Rehearsal — Cafe Noor, N1</p>
        <p className="text-sm text-ink mt-0.5">Nothing will be booked. This is Priya's fridge from last Tuesday.</p>
      </div>
      <a href="/play" className="text-xs text-mandate hover:text-ink transition-colors whitespace-nowrap">
        Play the game version
      </a>
    </div>
  );
}
