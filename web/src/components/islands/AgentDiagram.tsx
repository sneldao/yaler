import React, { useEffect, useRef, useState } from 'react';

/**
 * AgentDiagram — "1 agent → 3 quotes" as a tiny visual.
 *
 * One large mandate-coloured dot on the left, three smaller dots
 * branching to the right, connected by thin lines. The three dots
 * light up in sequence when scrolled into view. Replaces the text
 * "1 agent" in the market stats section.
 *
 * Reduced-motion users get the final state immediately.
 */
export default function AgentDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0); // 0 = nothing, 1 = center, 2-4 = branches

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setLit(4);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Center lights first, then branches stagger
          setLit(1);
          [2, 3, 4].forEach((n, i) => {
            setTimeout(() => setLit(n), 200 + i * 180);
          });
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex items-center justify-center" aria-label="One AI agent generates three supplier quotes">
      <svg viewBox="0 0 120 60" className="w-28 h-14" aria-hidden>
        {/* Connecting lines */}
        <line x1="28" y1="30" x2="68" y2="14" stroke="rgb(var(--mandate-rgb) / 0.2)" strokeWidth="1.5" className={`transition-opacity duration-300 ${lit >= 2 ? 'opacity-100' : 'opacity-0'}`} />
        <line x1="28" y1="30" x2="68" y2="30" stroke="rgb(var(--mandate-rgb) / 0.2)" strokeWidth="1.5" className={`transition-opacity duration-300 ${lit >= 3 ? 'opacity-100' : 'opacity-0'}`} />
        <line x1="28" y1="30" x2="68" y2="46" stroke="rgb(var(--mandate-rgb) / 0.2)" strokeWidth="1.5" className={`transition-opacity duration-300 ${lit >= 4 ? 'opacity-100' : 'opacity-0'}`} />

        {/* Center dot — the agent */}
        <circle
          cx="20"
          cy="30"
          r="9"
          fill="rgb(var(--mandate-rgb))"
          className={`transition-all duration-300 ${lit >= 1 ? 'opacity-100 scale-100' : 'opacity-30 scale-75'}`}
          style={{ transformOrigin: '20px 30px' }}
        />

        {/* Three quote dots */}
        <circle cx="72" cy="14" r="5" fill="rgb(var(--mandate-rgb) / 0.6)" className={`transition-all duration-300 ${lit >= 2 ? 'opacity-100' : 'opacity-0'}`} style={{ transformOrigin: '72px 14px' }} />
        <circle cx="72" cy="30" r="5" fill="rgb(var(--mandate-rgb) / 0.6)" className={`transition-all duration-300 ${lit >= 3 ? 'opacity-100' : 'opacity-0'}`} style={{ transformOrigin: '72px 30px' }} />
        <circle cx="72" cy="46" r="5" fill="rgb(var(--mandate-rgb) / 0.6)" className={`transition-all duration-300 ${lit >= 4 ? 'opacity-100' : 'opacity-0'}`} style={{ transformOrigin: '72px 46px' }} />
      </svg>
    </div>
  );
}
