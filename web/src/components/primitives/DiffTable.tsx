import React, { useState } from 'react';

export interface DiffRowData {
  id: string;
  name: string;
  category: string;
  price: string;
  status: 'recommended' | 'negotiating' | 'countered' | 'rejected';
  delta?: string;
  isAddition?: boolean;
  isRemoval?: boolean;
}

interface Props {
  rows: DiffRowData[];
  onApply?: (selectedIds: string[]) => void;
  title?: string;
}

export default function DiffTable({ rows, onApply, title = 'Supplier Offer Evaluation' }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(rows.filter((r) => r.status === 'recommended' || r.status === 'countered').map((r) => r.id))
  );
  const [applied, setApplied] = useState(false);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08]">
      {/* Bar Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            {title}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Click rows to toggle selection
        </span>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-white/[0.08] text-slate-400 font-mono text-[11px] uppercase bg-slate-900/40">
              <th className="p-3 font-semibold">Supplier / Offer</th>
              <th className="p-3 font-semibold">Category</th>
              <th className="p-3 font-semibold">Price / Delta</th>
              <th className="p-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((row) => {
              const selected = selectedIds.has(row.id);
              const isGreen = row.status === 'recommended' || row.isAddition;
              const isRed = row.status === 'rejected' || row.isRemoval;

              return (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    selected
                      ? isGreen
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                        : isRed
                        ? 'bg-rose-500/10 hover:bg-rose-500/15'
                        : 'bg-cyan-500/10 hover:bg-cyan-500/15'
                      : 'hover:bg-white/[0.03] text-slate-400'
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors ${
                        selected
                          ? isGreen
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                            : 'bg-cyan-400 text-slate-950 border-cyan-300'
                          : 'border-slate-700 bg-slate-900'
                      }`}>
                        {selected ? '✓' : ''}
                      </span>
                      <span className={`font-semibold text-xs ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
                        {row.name}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {row.category}
                    </span>
                  </td>

                  <td className="p-3 font-mono font-bold">
                    <span className={selected ? 'text-cyan-300' : 'text-slate-500'}>{row.price}</span>
                    {row.delta && (
                      <span className={`ml-2 text-[11px] ${row.delta.startsWith('-') ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ({row.delta})
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <span className={`text-[10px] font-mono uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                      row.status === 'recommended'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : row.status === 'countered'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : row.status === 'negotiating'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Action */}
      <div className="p-3 border-t border-white/[0.08] bg-slate-950/40 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">
          {selectedIds.size} of {rows.length} suppliers selected
        </span>

        {applied ? (
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pop-in font-mono">
            <span>✓</span> Selection Applied to Agent Loop
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setApplied(true);
              if (onApply) onApply(Array.from(selectedIds));
            }}
            disabled={selectedIds.size === 0}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-40 cursor-pointer"
          >
            Apply Selected Offers →
          </button>
        )}
      </div>
    </div>
  );
}
