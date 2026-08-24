import React, { useEffect, useState } from 'react';
import {
  type CredentialCheck,
  type FoundEngineer,
  type Offer,
  approveException,
  checkCredential,
  findNearby,
  getOffers,
} from '../../lib/api';
import { LoaderGrid } from '../primitives/LoaderGrid';
import { formatMoney, supplierLabel } from '../../lib/copy';

interface Props {
  missionId?: string;
  missionStatus?: string;
  offers?: Offer[];
  rehearsal?: boolean;
  onBooked?: (offer: Offer) => void;
  district?: string;
  category?: string;
}

// States where the mission is past the booking decision and the confirm
// button must not fire. In DELEGATE mode the worker auto-commits the best
// in-budget offer, so by the time the user sees quotes the mission may
// already be COMMITTED or further along.
const BOOKED_STATES = new Set([
  'COMMITTED',
  'IN_PROGRESS',
  'EVIDENCE_PENDING',
  'VERIFYING',
  'COMPLETED',
]);

export default function OfferComparison({
  missionId,
  missionStatus,
  offers: offersProp,
  rehearsal = false,
  onBooked,
  district = 'N1',
  category = 'commercial_refrigeration',
}: Props) {
  const initialSelected = rehearsal
    ? offersProp?.find((offer) => offer.status === 'BLOCKED')?.id ?? offersProp?.[0]?.id ?? null
    : offersProp?.[0]?.id ?? null;
  const [offers, setOffers] = useState<Offer[]>(offersProp ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [showCompare, setShowCompare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<FoundEngineer[]>([]);
  const [credentials, setCredentials] = useState<Record<string, CredentialCheck>>({});

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

  useEffect(() => {
    findNearby(category, district).then(setFound).catch(() => setFound([]));
  }, [category, district]);

  useEffect(() => {
    const names = offers.map((o) => o.supplierAgentId).filter(Boolean);
    if (names.length === 0) return;
    let cancelled = false;
    Promise.all(names.map(async (name) => {
      const cred = await checkCredential(name);
      return [name, cred] as const;
    })).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, CredentialCheck> = {};
      for (const [name, cred] of pairs) next[name] = cred;
      setCredentials(next);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [offers]);

  if (offers.length === 0) {
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-3 animate-pop-in">
        <div className="flex justify-center">
          <span className="receipt-punch" />
        </div>
        <h3 className="font-display text-xl text-ink">Asking nearby engineers</h3>
        <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
          We’ll bring back quotes as they come in. You don’t need to stay on this page.
        </p>
        <div className="flex justify-center pt-1">
          <LoaderGrid />
        </div>
      </div>
    );
  }

  const selected = offers.find((offer) => offer.id === selectedId) || offers[0];

  const blocked = selected?.status === 'BLOCKED';
  const isAlreadyBooked = !rehearsal && !!missionStatus && BOOKED_STATES.has(missionStatus);
  const isRehearsalQuotes = rehearsal;

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
          const isBlocked = offer.status === 'BLOCKED';
          const isSimulated = offer.simulated === true;
          // Prefer a real (non-simulated) quote as the default selection —
          // a simulated quote is never auto-selected over a real one.
          return (
            <button
              key={offer.id}
              type="button"
              onClick={() => setSelectedId(offer.id)}
              className={`w-full text-left paper-card rounded-2xl p-4 transition-colors ${
                isSelected && isBlocked
                  ? 'border-escalate animate-shake-slow animate-pulse-border'
                  : isSelected
                    ? 'border-mandate'
                    : 'hover:border-ink/20'
              } ${isSimulated ? 'opacity-70' : ''}`}
              disabled={isBlocked}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {offer.status === 'BLOCKED' ? (
                    <p className="text-[11px] uppercase tracking-wider text-escalate mb-1">Over your ceiling</p>
                  ) : isSimulated ? (
                    <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-1">Simulated — not a real offer</p>
                  ) : idx === 0 && !isSimulated ? (
                    <p className="text-[11px] uppercase tracking-wider text-mandate mb-1">Best match · Verified engineer</p>
                  ) : (
                    <p className="text-[11px] uppercase tracking-wider text-mandate mb-1">Verified engineer</p>
                  )}
                  <p className={`font-medium ${isSimulated ? 'text-ink-muted' : 'text-ink'}`}>{supplierLabel(offer.supplierAgentId)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{offer.availability}</p>
                </div>
                <p className={`font-display text-2xl ${isSimulated ? 'text-ink-muted' : 'text-ink'}`}>{formatMoney(offer.price, offer.currency)}</p>
              </div>
              {isSelected && offer.terms && (
                <p className="text-sm text-ink-muted mt-3 border-t border-ink/10 pt-3">{offer.terms}</p>
              )}
              {isSelected && offer.explanation && (
                <p className="text-xs text-ink-muted mt-2">{offer.explanation}</p>
              )}
              <p className="text-[11px] text-ink-muted mt-2">
                {isSimulated
                  ? 'Synthetic roster — auto-generated so the flow runs. No real engineer was asked.'
                  : credentials[offer.supplierAgentId]?.status === 'listed'
                    ? `${credentials[offer.supplierAgentId].register} listed · ${credentials[offer.supplierAgentId].asOf}`
                    : 'Public register: not checked'}
              </p>
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
            {isAlreadyBooked
              ? 'Already booked'
              : blocked
                ? `We will not book ${supplierLabel(selected.supplierAgentId)}`
                : `Book ${supplierLabel(selected.supplierAgentId)}?`}
          </p>
          <p className="text-xs text-ink-muted">
            {isAlreadyBooked
              ? 'The agent booked the best in-budget quote for you.'
              : blocked
                ? `${formatMoney(selected.price, selected.currency)} sits over the ceiling you set.`
                : `${formatMoney(selected.price, selected.currency)} · ${selected.availability}`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || blocked || isAlreadyBooked}
          className="btn-primary text-sm py-2.5"
        >
          {isAlreadyBooked
            ? 'Booked'
            : blocked
              ? 'Blocked by your rules'
              : submitting
                ? 'Booking…'
                : rehearsal
                  ? 'Yes — in the rehearsal'
                  : 'Yes, book them'}
        </button>
      </div>

      {message && <p className="text-sm text-ink-muted animate-pop-in">{message}</p>}

      {found.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-ink">Found this morning</h4>
          <p className="text-xs text-ink-muted">Nearby names from the open web. Not on our roster. Not bookable.</p>
          {found.map((item) => (
            <div key={`${item.name}-${item.url}`} className="paper-card rounded-2xl p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted">{item.label}</p>
              <p className="font-medium text-ink">{item.name}</p>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-mandate break-all">
                  {item.url}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
