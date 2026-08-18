import React, { useState } from 'react';

export interface ToolChipCall {
  icon: 'read' | 'write' | 'run' | 'policy' | 'a2a';
  label: string;
  chip: string;
  detailLines?: string[];
  diffAdd?: number;
  diffDel?: number;
}

interface Props {
  calls: ToolChipCall[];
}

export default function ToolChips({ calls }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (calls.length === 0) {
    return <p className="text-sm text-ink-muted">No checks yet.</p>;
  }

  return (
    <div className="space-y-1.5 w-full">
      <p className="text-xs text-ink-muted">{calls.length} checks</p>
      <div className="space-y-1">
        {calls.map((call, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={`${call.label}-${idx}`} className="rounded-xl bg-paper border border-ink/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx((prev) => (prev === idx ? null : idx))}
                className="w-full flex items-center justify-between p-2.5 text-xs text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-ink font-medium truncate">{call.label}</span>
                  <span className="text-ink-muted truncate">{call.chip}</span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                className="grid transition-[grid-template-rows,opacity] duration-200"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                  transitionTimingFunction: 'var(--ease)',
                }}
              >
                <div className="overflow-hidden bg-paper-inset/60 px-2.5 pb-2.5 text-[11px] text-ink-muted space-y-1">
                  {call.detailLines && call.detailLines.length > 0 ? (
                    call.detailLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))
                  ) : (
                    <div>No extra detail for this check.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
