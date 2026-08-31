import React, { useState } from 'react';
import InlineEvidenceText from '../primitives/InlineEvidenceText';
import FullscreenClipModal from '../primitives/FullscreenClipModal';
import HearReceipt from '../primitives/HearReceipt';
import { LAST_TUESDAY, bestQuote } from '../../lib/lastTuesday';

export default function ProofVaultShowcase() {
  const [redacted, setRedacted] = useState(true);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-mandate mb-1">Last Tuesday · 09:12 — the paper</p>
          <h3 className="font-display text-2xl text-ink">The receipt from that night</h3>
          <p className="text-sm text-ink-muted mt-1">
            The quote sat £{LAST_TUESDAY.overBy} over your £{LAST_TUESDAY.ceiling} ceiling. We stopped,
            you raised the line, and {LAST_TUESDAY.supplier} finished. Names stay hidden until you share.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HearReceipt
            text={`Receipt. The best quote came in at £${LAST_TUESDAY.doneAt} — £${LAST_TUESDAY.overBy} over the £${LAST_TUESDAY.ceiling} ceiling. We stopped rather than book over your line. You raised the ceiling and said yes. ${LAST_TUESDAY.supplier} swapped the compressor in N1. Temperature holding at minus eighteen. Done.`}
          />
          <button
            type="button"
            onClick={() => setRedacted(!redacted)}
            className="btn-secondary text-xs py-2"
          >
            {redacted ? 'Show names' : 'Hide names'}
          </button>
        </div>
      </div>

      <InlineEvidenceText
        prefixText="We checked"
        triggers={[
          {
            id: 'photo_proof',
            label: 'the photo',
            previewType: 'image',
            contentUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          },
          {
            id: 'temp_metric',
            label: '−18°C reading',
            previewType: 'metric',
            metricText: '−18.2°C, holding',
            metricLabel: 'Walk-in freezer',
          },
        ]}
        suffixText={`and released £${LAST_TUESDAY.doneAt} to ${LAST_TUESDAY.supplier}.`}
      />

      <FullscreenClipModal
        title="Walk-in freezer compressor replaced"
        subtitle={`Done in N1 · raised to £${bestQuote()}`}
        amount={`£${LAST_TUESDAY.doneAt}`}
        hash=""
        receiptDetails={[
          'Compressor replaced',
          'Two-hour emergency callout in N1',
          'F-Gas certificate on file',
        ]}
      />

      <div className="grid grid-cols-2 gap-3 text-sm border-t border-ink/10 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Kitchen</p>
          <p className="font-medium text-ink">
            {redacted ? 'A café in N1' : 'Angel Artisan Cafe & Bakery'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Supplier</p>
          <p className="font-medium text-ink">
            {redacted ? 'Checked supplier agent' : 'Dave M., R017485'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Paid</p>
          <p className="font-medium text-ink">
            £{LAST_TUESDAY.doneAt} — raised from £{LAST_TUESDAY.ceiling}
          </p>
        </div>
        <div className="flex items-end">
          <a href="/missions/demo/receipt" className="text-xs text-mandate hover:text-ink transition-colors">
            See the full paper →
          </a>
        </div>
      </div>
    </div>
  );
}
