import React, { useEffect, useState } from 'react';
import { getGreeting } from '../../lib/delight';

/**
 * ProgressiveGreeting — swaps the hero headline based on the visitor's
 * journey stage (new, rehearsed, returning). The server renders a
 * sensible default; this island replaces it on mount so returning
 * visitors feel recognized without a flash of wrong content.
 *
 * The default (first visit) headline is "An AI agent that gets your
 * kitchen fixed." — the same string the page renders statically, so
 * first-time visitors see no change.
 */
const GREETINGS: Record<string, { headline: string; subtext: string }> = {
  new: {
    headline: 'An AI agent that gets your kitchen fixed.',
    subtext: '',
  },
  rehearsed: {
    headline: 'Ready to do this for real?',
    subtext: 'Your rules are saved. Say the word and we start looking.',
  },
  returning: {
    headline: 'Another one sorted.',
    subtext: 'Same rules, new job. Say what\u2019s broken.',
  },
};

export default function ProgressiveGreeting() {
  const [greeting, setGreeting] = useState(GREETINGS.new);

  useEffect(() => {
    const next = getGreeting();
    // Only update if the stage is something other than the default —
    // avoids a redundant DOM swap on first visit.
    if (next.headline !== GREETINGS.new.headline) {
      setGreeting(next);
    }
  }, []);

  return (
    <div className="space-y-2">
      <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight leading-[1.1] animate-fade-up">
        {greeting.headline}
      </h1>
      {greeting.subtext && (
        <p className="text-ink-muted text-sm sm:text-base leading-relaxed max-w-xl animate-fade-up">
          {greeting.subtext}
        </p>
      )}
    </div>
  );
}
