import React, { useState, useEffect } from 'react';

/**
 * DistrictPicker — lets the user set their postal district.
 * Stored in localStorage, defaults to N1. Flows through to
 * DiscoveryBadge, MissionForm presets, and the mandate.
 *
 * For the SF hackathon audience: London N1 is the default
 * (Cafe Noor, Dalston story), but any UK postcode works.
 */
const STORAGE_KEY = 'yaler-district';

/** Custom event name — islands subscribe to district changes, no reload. */
export const DISTRICT_EVENT = 'yaler:district';

const POPULAR = ['N1', 'E1', 'SE1', 'SW1', 'W1', 'EC1', 'WC1', 'NW1'];

export default function DistrictPicker() {
  const [district, setDistrict] = useState('N1');
  const [open, setOpen] = useState(false);
  const [justSet, setJustSet] = useState(false);

  useEffect(() => {
    const saved = getDistrict();
    if (saved) setDistrict(saved);
    // Stay in sync if another picker on the page changes the district.
    const onDistrict = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setDistrict(next);
    };
    window.addEventListener(DISTRICT_EVENT, onDistrict);
    return () => window.removeEventListener(DISTRICT_EVENT, onDistrict);
  }, []);

  const choose = (d: string) => {
    const clean = d.trim().toUpperCase();
    if (!clean) return;
    setDistrict(clean);
    localStorage.setItem(STORAGE_KEY, clean);
    setOpen(false);
    // No reload — tell every island on the page (MissionForm presets,
    // DiscoveryBadge…) so the app reads as live, not as a page refresh.
    window.dispatchEvent(new CustomEvent(DISTRICT_EVENT, { detail: clean }));
    setJustSet(true);
    setTimeout(() => setJustSet(false), 1800);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Your district is ${district}. Activate to change it.`}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
          justSet
            ? 'border-mandate/40 bg-mandate-light text-mandate'
            : 'text-ink-muted hover:text-ink border-ink/10 bg-paper'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium text-ink">{district}</span>
        {justSet && <span className="text-[10px] text-mandate">set</span>}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 paper-card rounded-xl p-3 space-y-2 min-w-[180px] animate-pop-in">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Your district</p>
          <div className="flex flex-wrap gap-1">
            {POPULAR.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => choose(d)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  d === district
                    ? 'bg-mandate/10 text-mandate border-mandate/30 font-medium'
                    : 'bg-paper-inset text-ink-muted border-ink/10 hover:border-ink/25'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements[0] as HTMLInputElement);
              choose(input.value);
            }}
            className="flex gap-1.5"
          >
            <input
              type="text"
              placeholder="Other..."
              maxLength={4}
              className="field-input text-xs py-1.5 flex-1"
            />
            <button type="submit" className="btn-secondary text-xs py-1.5 px-2">Set</button>
          </form>
        </div>
      )}
    </div>
  );
}

export function getDistrict(): string {
  if (typeof window === 'undefined') return 'N1';
  return localStorage.getItem(STORAGE_KEY) || 'N1';
}
