import React, { useEffect, useState } from 'react';
import { type Offer, approveException, getOffers } from '../../lib/api';
import { formatMoney, supplierLabel } from '../../lib/copy';

interface Props {
  missionId?: string;
  offers?: Offer[];
  rehearsal?: boolean;
  onBooked?: (offer: Offer) => void;
}

export default function OfferComparison({
  missionId,
  offers: offersProp,
  rehearsal = false,
  onBooked,
}: Props) {
  const initialSelected = rehearsal
    ? offersProp?.find((offer) => offer.status === 'BLOCKED')?.id ?? offersProp?.[0]?.id ?? null
    : offersProp?.[0]?.id ?? null;
  const [offers, setOffers] = useState<Offer[]>(offersProp ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [showCompare, setShowCompare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (offersProp) {
      setOffers(offersProp);
      if (!selectedId) {
        const blockedId = rehearsal ? offersProp.find((offer) => offer.status === 'BLOCKED')?.id : undefined;
        setSelectedId(blockedId ?? offersProp[0]?.id ?? null);
      }
      return;
    }
    if (!missionId) return;
    getOffers(missionId)
      .then((next) => {
        setOffers(next);
        if (next[0]) setSelectedId(next[0].id);
      })
      .catch(console.error);
  }, [missionId, offersProp]);

  if (offers.length === 0) {
    return (
      <div className="paper-card rounded-2xl p-6 text-center space-y-2">
        <h3 className="font-display text-xl text-ink">Asking nearby engineers</h3>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          We’ll bring back quotes as they come in. You don’t need to stay on this page.
        </p>
      </div>
    );
  }

  const selected = offers.find((offer) => offer.id === selectedId) || offers[0];

  const blocked = selected?.status === 'BLOCKED';

  const handleConfirm = async () => {
    if (!selected || blocked) return;
    setSubmitting(true);
    setMessage(null);
    try {
      if (rehearsal) {
        onBooked?.(selected);
        setMessage(`In a real job we would book ${supplierLabel(selected.supplierAgentId)} for ${formatMoney(selected.price, selected.currency)}. Nothing was booked.`);
        return;
      }
      if (!missionId) return;
      await approveException(missionId, 'APPROVE', selected.id);
      setMessage(`Booked ${supplierLabel(selected.supplierAgentId)} for ${formatMoney(selected.price, selected.currency)}.`);
    } catch (err: any) {
      setMessage(err.message || 'Could not confirm that engineer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">Quotes</h3>
          <p className="text-sm text-ink-muted">
            {rehearsal ? 'One is over the ceiling. We stopped there first.' : `${offers.length} in. Best match is first.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCompare((open) => !open)}
          className="text-sm text-ink-muted hover:text-ink transition-colors"
        >
          {showCompare ? 'Hide comparison' : 'Compare all'}
        </button>
      </div>

      <div className="space-y-2">
        {offers.map((offer, idx) => {
          const isSelected = offer.id === selected.id;
          return (
            <button
              key={offer.id}
              type="button"
              onClick={() => setSelectedId(offer.id)}
              className={`w-full text-left paper-card rounded-2xl p-4 transition-colors ${
                isSelected && offer.status === 'BLOCKED'
                  ? 'border-escalate'
                  : isSelected
                    ? 'border-mandate'
                    : 'hover:border-ink/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {offer.status === 'BLOCKED' ? (
                    <p className="text-[11px] uppercase tracking-wider text-escalate mb-1">Over your ceiling</p>
                  ) : idx === 0 && (
                    <p className="text-[11px] uppercase tracking-wider text-mandate mb-1">Best match</p>
                  )}
                  <p className="font-medium text-ink">{supplierLabel(offer.supplierAgentId)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{offer.availability}</p>
                </div>
                <p className="font-display text-2xl text-ink">{formatMoney(offer.price, offer.currency)}</p>
              </div>
              {isSelected && offer.terms && (
                <p className="text-sm text-ink-muted mt-3 border-t border-ink/10 pt-3">{offer.terms}</p>
              )}
              {isSelected && offer.explanation && (
                <p className="text-xs text-ink-muted mt-2">{offer.explanation}</p>
              )}
            </button>
          );
        })}
      </div>

      {showCompare && (
        <div className="overflow-x-auto paper-card rounded-2xl animate-pop-in">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink-muted border-b border-ink/10">
                <th className="p-3 font-medium">Engineer</th>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-3 text-ink">{supplierLabel(offer.supplierAgentId)}</td>
                  <td className="p-3 text-ink-muted">{offer.availability}</td>
                  <td className="p-3 font-medium">{formatMoney(offer.price, offer.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">
            {blocked
              ? `We will not book ${supplierLabel(selected.supplierAgentId)}`
              : `Book ${supplierLabel(selected.supplierAgentId)}?`}
          </p>
          <p className="text-xs text-ink-muted">
            {blocked
              ? `${formatMoney(selected.price, selected.currency)} sits over the ceiling you set.`
              : `${formatMoney(selected.price, selected.currency)} · ${selected.availability}`}
          </p>
        </div>
        <button type="button" onClick={handleConfirm} disabled={submitting || blocked} className="btn-primary text-sm py-2.5">
          {blocked ? 'Blocked by your rules' : submitting ? 'Booking…' : rehearsal ? 'Yes — in the rehearsal' : 'Yes, book them'}
        </button>
      </div>

      {message && <p className="text-sm text-ink-muted animate-pop-in">{message}</p>}
    </div>
  );
}
