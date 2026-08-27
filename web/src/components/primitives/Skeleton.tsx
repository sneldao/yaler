import React from 'react';

/**
 * Paper-toned skeletons — loading placeholders that match the shape of what
 * is loading instead of a centered spinner. The shimmer is a slow warm sweep
 * (paper-inset → paper-raised), not a grey pulse, so it sits in the design
 * system.
 */

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`rounded-lg bg-gradient-to-r from-paper-inset via-paper-raised to-paper-inset bg-[length:200%_100%] animate-[shimmer-text_2.2s_linear_infinite] ${className}`}
      style={style}
    />
  );
}

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Ghosted offer cards — same silhouette as the real quote cards. */
export function SkeletonOfferCards({ count = 3 }: { count?: number }) {
  return (
    <Shell label="Quotes are loading">
      <div className="space-y-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="paper-card rounded-2xl p-4 opacity-70" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Bone className="h-2.5 w-24" />
                <Bone className="h-4 w-40" />
                <Bone className="h-2.5 w-28" />
              </div>
              <Bone className="h-7 w-16" />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Ghosted timeline rows — small event rows with a timestamp gutter. */
export function SkeletonTimelineRows({ count = 4 }: { count?: number }) {
  return (
    <Shell label="The timeline is loading">
      <div className="space-y-2.5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-2 w-2 rounded-full shrink-0" />
            <Bone className="h-3.5 flex-1" style={{ maxWidth: `${72 - i * 9}%` }} />
            <Bone className="h-2.5 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Ghosted receipt — perf edges and ruled lines, like a sheet mid-print. */
export function SkeletonReceipt() {
  return (
    <Shell label="The receipt is loading">
      <div className="paper-card rounded-2xl overflow-hidden opacity-70">
        <div className="receipt-perf" />
        <div className="p-6 space-y-3">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-6 w-3/4" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <div className="flex justify-between items-center pt-3 border-t border-ink/10">
            <Bone className="h-3 w-16" />
            <Bone className="h-7 w-20" />
          </div>
        </div>
        <div className="receipt-perf" />
      </div>
    </Shell>
  );
}
