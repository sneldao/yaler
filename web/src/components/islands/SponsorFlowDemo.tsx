import React, { useEffect, useState } from 'react';

/**
 * SponsorFlowDemo — the 5-second wow on the home page.
 *
 * Auto-cycles through the 5 sponsor APIs in mission order (Gemini → Exa →
 * Apify → Vapi → ElevenLabs), showing what each does. Between transitions,
 * a gooey SVG blob morphs the active sponsor chip — drawn from the
 * gooey-search inspiration (Lucas Bebber's gooey filter).
 *
 * This is the "watch it work" moment — no click required. A voter landing
 * on the home page sees the full sponsor stack light up in 5 seconds.
 */

type Sponsor = {
  id: string;
  name: string;
  short: string;
  color: string;
  bg: string;
  border: string;
  action: string;
  detail: string;
};

const FLOW: Sponsor[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    short: 'G',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    action: 'Extracting mandate',
    detail: '“Walk-in fridge is down in N1, need it before lunch” → structured job spec',
  },
  {
    id: 'exa',
    name: 'Exa',
    short: 'E',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    action: 'Finding engineers',
    detail: '3 verified commercial refrigeration specialists near N1, found this morning',
  },
  {
    id: 'apify',
    name: 'Apify',
    short: 'A',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    action: 'Checking the register',
    detail: 'Companies House lookup — is this business actually registered and active?',
  },
  {
    id: 'vapi',
    name: 'Vapi',
    short: 'V',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    action: 'Taking the call',
    detail: 'You speak the job once. The agent hears it, scopes it, and acts.',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    short: '11',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    action: 'Reading the receipt',
    detail: 'The completed receipt narrated back — a radio report, not a field read.',
  },
];

const CYCLE_MS = 2200;

export default function SponsorFlowDemo() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % FLOW.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, []);

  const current = FLOW[idx];
  const completed = FLOW.slice(0, idx);

  return (
    <div className="relative">
      {/* Gooey SVG filter — the blob transition between sponsor chips */}
      <svg className="absolute w-px h-px -left-px -top-px" aria-hidden>
        <defs>
          <filter id="gooey-sponsor">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* The flow strip */}
      <div className="paper-card rounded-2xl p-4 sm:p-5 space-y-3">
        {/* Sponsor chips with gooey blob */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-ink-muted mr-1">
            Watch it work
          </span>
          <div
            style={{ filter: 'url(#gooey-sponsor)' }}
            className="flex items-center gap-1"
          >
            {FLOW.map((s, i) => {
              const isActive = i === idx;
              const isDone = i < idx;
              return (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all duration-500 ${
                    isActive
                      ? `${s.bg} ${s.border} ${s.color} font-medium scale-110`
                      : isDone
                        ? `${s.bg} ${s.border} ${s.color} opacity-60`
                        : 'bg-paper-inset border-ink/10 text-ink-muted opacity-40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-current animate-pulse' : isDone ? 'bg-current' : 'bg-ink/20'
                    }`}
                  />
                  {s.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Active sponsor detail card */}
        <div
          key={current.id}
          className="flex items-start gap-3 animate-pop-in"
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg ${current.bg} ${current.border} border shrink-0`}
          >
            <span className={`font-display text-base font-bold ${current.color}`}>
              {current.short}
            </span>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${current.color}`}>{current.name}</span>
              <span className="text-[10px] text-ink-muted">{current.action}</span>
            </div>
            <p className="text-sm text-ink leading-snug">{current.detail}</p>
          </div>
        </div>

        {/* Progress rail */}
        <div className="flex items-center gap-1.5">
          {FLOW.map((s, i) => (
            <div
              key={s.id}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                i <= idx ? s.color.replace('text-', 'bg-') : 'bg-ink/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
