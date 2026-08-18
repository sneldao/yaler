import React, { useState } from 'react';
import { type Offer } from '../../lib/api';
import { formatMoney, supplierLabel } from '../../lib/copy';

interface Props {
  offers: Offer[];
  onSelectOffer?: (offer: Offer) => void;
}

export default function OfferStack({ offers, onSelectOffer }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeOffer = offers[activeIdx] || offers[0];

  if (!offers || offers.length === 0) return null;

  return (
    <div className="paper-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Quotes</p>
        <button
          type="button"
          onClick={() => setActiveIdx((activeIdx + 1) % offers.length)}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Next ({activeIdx + 1}/{offers.length})
        </button>
      </div>

      <div className="space-y-3">
        <div>
          {activeIdx === 0 && (
            <p className="text-[11px] uppercase tracking-wider text-mandate mb-1">Best match</p>
          )}
          <h4 className="font-display text-2xl text-ink">{supplierLabel(activeOffer.supplierAgentId)}</h4>
          <p className="text-sm text-ink-muted">{activeOffer.availability}</p>
        </div>
        <p className="font-display text-3xl text-ink">{formatMoney(activeOffer.price, activeOffer.currency)}</p>
        {activeOffer.terms && <p className="text-sm text-ink-muted">{activeOffer.terms}</p>}
        <button
          type="button"
          onClick={() => onSelectOffer?.(activeOffer)}
          className="btn-primary text-sm"
        >
          Book this engineer
        </button>
      </div>
    </div>
  );
}
