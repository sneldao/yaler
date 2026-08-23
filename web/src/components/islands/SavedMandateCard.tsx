import React, { useEffect, useState } from 'react';
import { loadSavedMandate, clearSavedMandate, type SavedMandate } from '../../lib/rehearsal';
import { formatMoney } from '../../lib/copy';

export default function SavedMandateCard() {
  const [saved, setSaved] = useState<SavedMandate | null>(null);

  useEffect(() => {
    setSaved(loadSavedMandate());
  }, []);

  if (!saved) return null;

  const handleClear = () => {
    clearSavedMandate();
    setSaved(null);
  };

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-mandate font-medium">Your kitchen rules</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          clear
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <p className="font-display text-2xl text-ink">
          {formatMoney(saved.budget)}
        </p>
        <p className="text-sm text-ink-muted">max · district {saved.postalDistrict}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] bg-mandate/5 text-mandate px-2.5 py-1 rounded-full border border-mandate/20 font-medium">
          {saved.autonomyMode === 'DELEGATE' ? 'Handle it' : saved.autonomyMode === 'COLLABORATE' ? 'Ask me first' : 'Just show options'}
        </span>
        <span className="text-[11px] bg-paper-inset text-ink-muted px-2.5 py-1 rounded-full border border-ink/10">
          {saved.serviceCategory?.replace(/_/g, ' ') || 'Any category'}
        </span>
      </div>

      <p className="text-xs text-ink-muted leading-relaxed">
        Next time you say the fridge is down, these are the rules we use. We only stop you if it goes over or nobody can come today.
      </p>

      <a href="/missions/new" className="btn-primary text-sm py-2.5 w-full text-center block">
        Use these rules — start a job
      </a>
    </div>
  );
}
