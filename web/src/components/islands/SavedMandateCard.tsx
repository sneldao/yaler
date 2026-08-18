import React, { useEffect, useState } from 'react';
import { loadSavedMandate, type SavedMandate } from '../../lib/rehearsal';
import { formatMoney } from '../../lib/copy';

export default function SavedMandateCard() {
  const [saved, setSaved] = useState<SavedMandate | null>(null);

  useEffect(() => {
    setSaved(loadSavedMandate());
  }, []);

  if (!saved) return null;

  return (
    <div className="paper-card rounded-2xl p-5 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-mandate">Rules on this phone</p>
      <p className="font-display text-xl text-ink">
        Stay under {formatMoney(saved.budget)} in {saved.postalDistrict}
      </p>
      <p className="text-sm text-ink-muted">
        We’ll use these when you say the fridge is actually down. Until then, nobody is called.
      </p>
    </div>
  );
}
