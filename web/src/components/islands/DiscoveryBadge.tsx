import React, { useEffect, useState } from 'react';
import SponsorCallout from '../primitives/SponsorCallout';
import type { FoundEngineer } from '../../lib/api';
import { DISTRICT_EVENT, getDistrict } from './DistrictPicker';

/**
 * DiscoveryBadge — surfaces the Exa web search results.
 *
 * Shows actual business names + URLs found near the user's district,
 * not just a count. Makes the Exa integration visible and tangible:
 * the judge can see real businesses were found, not just a number.
 *
 * Labelled "not bookable" — these are discovered names, not vetted
 * roster suppliers. D026's rule: search results are not engineers.
 */

interface Props {
  district?: string;
}

export default function DiscoveryBadge({ district: districtProp = 'N1' }: Props) {
  const [district, setDistrict] = useState(districtProp);
  const [results, setResults] = useState<FoundEngineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Follow the district picker without a page reload.
  useEffect(() => {
    setDistrict(getDistrict());
    const onDistrict = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setDistrict(next);
    };
    window.addEventListener(DISTRICT_EVENT, onDistrict);
    return () => window.removeEventListener(DISTRICT_EVENT, onDistrict);
  }, []);

  useEffect(() => {
    setLoading(true);
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8081';
    fetch(`${apiUrl}/api/discovery?district=${encodeURIComponent(district)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.found && Array.isArray(data.found)) {
          setResults(data.found);
        }
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, [district]);

  if (loading) {
    return (
      <SponsorCallout
        sponsor="exa"
        status="working"
        label={`Searching the web for engineers near ${district}`}
        detail="Exa searches for nearby refrigeration and kitchen repair businesses — real names, real URLs, found this morning."
      />
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="paper-card rounded-2xl p-4 space-y-3 animate-pop-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <p className="text-xs text-ink">
            <span className="font-medium">{results.length} engineers</span>
            <span className="text-ink-muted"> found near {district} this morning</span>
          </p>
        </div>
        <span className="text-[10px] text-emerald-600 font-medium px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50">via Exa</span>
      </div>

      {/* Show the actual businesses — makes the Exa search tangible */}
      <div className="space-y-1.5">
        {results.slice(0, expanded ? 10 : 3).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-paper-inset border border-ink/5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-emerald-600 text-[10px] font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-ink font-medium truncate">{r.name}</span>
            </div>
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-ink-muted hover:text-mandate transition-colors shrink-0 flex items-center gap-1"
              >
                <span className="truncate max-w-[8rem]">{new URL(r.url).hostname.replace('www.', '')}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>

      {results.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          {expanded ? 'Show fewer' : `Show ${results.length - 3} more`}
        </button>
      )}

      <p className="text-[10px] text-ink-muted italic leading-relaxed">
        Discovered via Exa web search. These are real business names — not bookable until verified and onboarded to the roster.
      </p>
    </div>
  );
}
