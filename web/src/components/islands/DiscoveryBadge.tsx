import React, { useEffect, useState } from 'react';
import SponsorCallout from '../primitives/SponsorCallout';

/**
 * Shows a "found this morning" badge with the number of engineers
 * discovered near the user's district. Makes the system feel alive.
 */

interface Props {
  district?: string;
}

export default function DiscoveryBadge({ district = 'N1' }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8081';
    fetch(`${apiUrl}/api/discovery?district=${encodeURIComponent(district)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.found && Array.isArray(data.found)) {
          setCount(data.found.length);
        }
        setLoading(false);
      })
      .catch(() => {
        setCount(null);
        setLoading(false);
      });
  }, [district]);

  if (loading) {
    return (
      <SponsorCallout
        sponsor="exa"
        status="working"
        label={`Searching for engineers near ${district}`}
        detail="Exa searches the web for nearby refrigeration and kitchen repair businesses."
      />
    );
  }

  if (count === null || count === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
      </span>
      <p className="text-xs text-ink">
        <span className="font-medium">{count} engineers</span>
        <span className="text-ink-muted"> found near {district} this morning</span>
      </p>
      <span className="text-[10px] text-emerald-600 font-medium ml-1">via Exa</span>
    </div>
  );
}
