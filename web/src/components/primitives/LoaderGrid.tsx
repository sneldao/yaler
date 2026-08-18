import React, { useEffect, useState } from 'react';

const CHEVRON = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 80;
});

export function LoaderGrid({ round = false }: { round?: boolean }) {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[2px]">
      {CHEVRON.map((delay, index) => (
        <span
          key={index}
          className={`size-[4px] bg-mandate ${round ? 'rounded-full' : 'rounded-[1px]'}`}
          style={{
            opacity: 0.2,
            animation: `pixel-on 650ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export function LoadingStatus({ label, timer = true }: { label: string; timer?: boolean }) {
  const elapsed = useElapsed();
  return (
    <div role="status" className="flex items-center gap-2.5">
      <LoaderGrid />
      <span className="animate-shimmer-text text-xs font-medium">
        {label}
      </span>
      {timer && (
        <span className="text-[11px] text-ink-muted tabular-nums">
          {elapsed}
        </span>
      )}
    </div>
  );
}
