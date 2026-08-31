import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { districtStore, setDistrict as setDistrictStore } from '../../stores';

/**
 * DistrictPicker — lets the user set their postal district.
 * Stored in localStorage, defaults to N1. Flows through to
 * DiscoveryBadge, MissionForm presets, and the mandate via the
 * shared districtStore (nanostores). See docs/ARCHITECTURE.md
 * "Cross-island state."
 *
 * For the SF hackathon audience: London N1 is the default
 * (Cafe Noor, Dalston story), but any UK postcode works.
 */
const POPULAR = ['N1', 'E1', 'SE1', 'SW1', 'W1', 'EC1', 'WC1', 'NW1'];

export default function DistrictPicker() {
  const district = useStore(districtStore);
  const [open, setOpen] = useState(false);
  const [justSet, setJustSet] = useState(false);

  const choose = (d: string) => {
    setDistrictStore(d);
    setOpen(false);
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
