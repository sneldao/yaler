import React, { useEffect, useState } from 'react';

/**
 * Shows a "found this morning" badge with the number of engineers
 * discovered near the user's district. Makes the system feel alive.
 */

interface Props {
  district?: string;
}

export default function DiscoveryBadge({ district = 'N1' }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8081';
    fetch(`${apiUrl}/api/discovery?district=${encodeURIComponent(district)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.found && Array.isArray(data.found)) {
          setCount(data.found.length);
        }
      })
      .catch(() => {
        // Silently degrade — don't show badge if discovery fails
        setCount(null);
      });
  }, [district]);

  if (count === null || count === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-mandate/5 border border-mandate/20 rounded-full px-3 py-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-mandate" />
      </span>
      <p className="text-xs text-ink">
        <span className="font-medium">{count} engineers</span>
        <span className="text-ink-muted"> found near {district} this morning</span>
      </p>
    </div>
  );
}
