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

export default function DiffTable({ rows, onApply, title = 'Quotes' }: Props) {
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
    <div className="paper-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-ink/10">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span className="text-xs text-ink-muted">Tap a row to include it</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
              <th className="p-3 font-medium">Engineer</th>
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`cursor-pointer ${selected ? 'bg-mandate-light' : 'hover:bg-paper'}`}
                >
                  <td className="p-3 text-ink font-medium">{row.name}</td>
                  <td className="p-3 text-ink-muted">{row.category}</td>
                  <td className="p-3">
                    {row.price}
                    {row.delta && <span className="ml-2 text-xs text-mandate">{row.delta}</span>}
                  </td>
                  <td className="p-3 text-right text-xs text-ink-muted capitalize">{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-ink/10 flex items-center justify-between">
        <span className="text-xs text-ink-muted">{selectedIds.size} of {rows.length} selected</span>
        {applied ? (
          <span className="text-xs text-mandate">Saved</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setApplied(true);
              onApply?.(Array.from(selectedIds));
            }}
            disabled={selectedIds.size === 0}
            className="btn-primary text-xs py-2 px-3"
          >
            Use selected
          </button>
        )}
      </div>
    </div>
  );
}
