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

  const toggleRow = (idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-1.5 w-full font-sans">
      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>Agentic Primitives Tool Trace ({calls.length} calls executed)</span>
      </div>

      <div className="space-y-1">
        {calls.map((call, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-all duration-200 hover:border-white/10">
              <button
                type="button"
                onClick={() => toggleRow(idx)}
                className="w-full flex items-center justify-between p-2 text-xs text-left cursor-pointer hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-cyan-400 font-mono text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                    {call.icon.toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-200 truncate">{call.label}</span>
                  <span className="font-mono text-[11px] text-cyan-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 truncate">
                    {call.chip}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {(call.diffAdd !== undefined || call.diffDel !== undefined) && (
                    <span className="font-mono text-[11px]">
                      {call.diffAdd !== undefined && <span className="text-emerald-400">+{call.diffAdd}</span>}{' '}
                      {call.diffDel !== undefined && <span className="text-rose-400">−{call.diffDel}</span>}
                    </span>
                  )}
                  <svg
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>

              {/* Collapsible Details */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <div className="overflow-hidden bg-slate-950/80 p-2.5 border-t border-white/[0.06] font-mono text-[11px] space-y-1">
                  {call.detailLines && call.detailLines.length > 0 ? (
                    call.detailLines.map((line, lIdx) => (
                      <div
                        key={lIdx}
                        className={line.startsWith('+') ? 'text-emerald-400' : line.startsWith('-') ? 'text-rose-400' : 'text-slate-400'}
                      >
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">No diff details provided for this tool execution.</div>
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
