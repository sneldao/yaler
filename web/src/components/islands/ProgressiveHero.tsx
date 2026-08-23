import React, { useEffect, useState } from 'react';
import { getGreeting, incrementVisitCount } from '../../lib/delight';

/**
 * ProgressiveHero — shows context-aware headline based on journey stage.
 * Increments visit count on mount.
 */

export default function ProgressiveHero() {
  const [greeting, setGreeting] = useState({ headline: '', subtext: '' });

  useEffect(() => {
    incrementVisitCount();
    setGreeting(getGreeting());
  }, []);

  if (!greeting.headline) return null;

  return (
    <div className="space-y-2">
      <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight leading-[1.12]">
        {greeting.headline}
      </h1>
      <p className="text-ink-muted text-base sm:text-lg leading-relaxed max-w-xl">
        {greeting.subtext}
      </p>
    </div>
  );
}
