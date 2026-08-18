import React, { useState } from 'react';
import { LoaderGrid } from './LoaderGrid';

export interface TraceRow {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  policyResult?: 'ALLOW' | 'ESCALATE' | 'DENY';
  actor?: string;
}

interface Props {
  activeTitle?: string;
  doneTitle?: string;
  working?: boolean;
  rows: TraceRow[];
  defaultExpanded?: boolean;
}

export default function ThinkingTrace({
  activeTitle = 'Working',
  doneTitle = 'Updates',
  working = false,
  rows,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        {working ? <LoaderGrid /> : <span className="w-1.5 h-1.5 rounded-full bg-mandate" />}
        <span>{working ? activeTitle : doneTitle}</span>
        <svg
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
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
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'var(--ease)',
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1.5 ml-2 pl-4 border-l border-ink/10 space-y-1 py-1">
            {rows.map((row, idx) => (
              <div key={`${row.primary}-${row.secondary}-${idx}`} className="flex items-center gap-2.5 rounded-md px-2 py-1 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  row.policyResult === 'ALLOW' ? 'bg-mandate' :
                  row.policyResult === 'ESCALATE' ? 'bg-escalate' :
                  row.policyResult === 'DENY' ? 'bg-escalate' : 'bg-ink/25'
                }`} />
                <span className="min-w-0 truncate text-ink">{row.primary}</span>
                {row.secondary && (
                  <span className="ml-auto text-[11px] text-ink-muted shrink-0">{row.secondary}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
