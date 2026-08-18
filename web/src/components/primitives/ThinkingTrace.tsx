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
  activeTitle = 'Thinking & Auditing Policy Rules',
  doneTitle = 'Audited 4 Agentic Primitives',
  working = false,
  rows,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="flex w-full flex-col font-sans">
      {/* Trace Header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="-mx-1.5 flex w-fit items-center gap-2.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors duration-150 hover:bg-white/[0.04] hover:text-slate-200 cursor-pointer"
      >
        {working ? (
          <LoaderGrid />
        ) : (
          <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        )}

        <span className="font-mono text-[12.5px] font-medium">
          {working ? (
            <span className="animate-shimmer-text">{activeTitle}</span>
          ) : (
            <span className="text-slate-300">{doneTitle}</span>
          )}
        </span>

        <svg
          className="w-3.5 h-3.5 text-slate-500 transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expandable Trace Body with Smooth Interpolation */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1.5 ml-2 pl-4 border-l border-white/[0.08] space-y-1 py-1">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-md px-2 py-1 text-xs hover:bg-white/[0.03] transition-colors"
                style={{ animation: `fade-up 280ms cubic-bezier(0.23, 1, 0.32, 1) ${idx * 60}ms both` }}
              >
                {/* Status Dot */}
                <span className="shrink-0 flex items-center justify-center">
                  {row.policyResult === 'ALLOW' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  ) : row.policyResult === 'ESCALATE' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  ) : row.policyResult === 'DENY' ? (
                    <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  )}
                </span>

                {/* Primary Content */}
                <span className={`min-w-0 truncate text-[12.5px] ${row.mono ? 'font-mono text-cyan-300' : 'text-slate-200 font-medium'}`}>
                  {row.primary}
                </span>

                {/* Actor Badge */}
                {row.actor && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50 shrink-0">
                    {row.actor}
                  </span>
                )}

                {/* Secondary Info */}
                {row.secondary && (
                  <span className="ml-auto text-[11px] font-mono text-slate-400 shrink-0">
                    {row.secondary}
                  </span>
                )}

                {/* Diff stats (+ / -) */}
                {(row.add !== undefined || row.del !== undefined) && (
                  <span className="font-mono text-[11px] tabular-nums shrink-0 ml-auto">
                    {row.add !== undefined && <span className="text-emerald-400">+{row.add}</span>}{' '}
                    {row.del !== undefined && <span className="text-rose-400">−{row.del}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
