import React, { useEffect, useMemo, useState } from 'react';
import {
  type CredentialCheck,
  type FoundEngineer,
  type Offer,
  type Supplier,
  approveException,
  checkCredential,
  findNearby,
  getOffers,
  listSuppliers,
} from '../../lib/api';
import { SkeletonOfferCards } from '../primitives/Skeleton';
import SponsorCallout from '../primitives/SponsorCallout';
import { EMPTY_STATE_COPY, formatMoney, supplierLabel } from '../../lib/copy';

interface Props {
  missionId?: string;
  missionStatus?: string;
  offers?: Offer[];
  rehearsal?: boolean;
  onBooked?: (offer: Offer) => void;
  district?: string;
  category?: string;
  /** Buyer ceiling — drives the "Within mandate" confidence sub-score. */
  budgetMax?: number;
}

/**
 * Confidence is three sub-signals, not just price:
 *  - Within Mandate: how far the price sits under the buyer's ceiling.
 *  - Verified Business: the Companies House check result.
 *  - Past Reliability: the supplier's earned reliability score (0–1 → %).
 * The weighted aggregate (0–100) drives the ordering of the cards — it is
 * literally why the agent ranks one quote above another.
 */
interface Confidence {
  mandate: number;
  mandateNote: string;
  verified: number;
  verifiedNote: string;
  reliability: number;
  reliabilityNote: string;
  aggregate: number;
}

function normalise(name?: string): string {
  return (name || '').toLowerCase().replace(/^sup[_-]?/i, '').replace(/[^a-z0-9]/g, '');
}

function computeConfidence(
  offer: Offer,
  budgetMax: number | undefined,
  cred: CredentialCheck | undefined,
  suppliers: Supplier[],
): Confidence {
  // — Within mandate —
  let mandate = 55;
  let mandateNote = 'No ceiling on record — price unchecked against a budget.';
  if (budgetMax && budgetMax > 0) {
    if (offer.price <= budgetMax * 0.6) {
      mandate = 100;
      mandateNote = `${formatMoney(offer.price, offer.currency)} — comfortably inside your ${formatMoney(budgetMax)} ceiling.`;
    } else if (offer.price <= budgetMax) {
      mandate = Math.round(100 - ((offer.price - budgetMax * 0.6) / (budgetMax * 0.4)) * 45);
      mandateNote = `${formatMoney(offer.price, offer.currency)} — inside your ${formatMoney(budgetMax)} ceiling, close to the top.`;
    } else {
      mandate = Math.max(0, Math.round(40 - ((offer.price - budgetMax) / budgetMax) * 100));
      mandateNote = `${formatMoney(offer.price, offer.currency)} — over your ${formatMoney(budgetMax)} ceiling.`;
    }
  }

  // — Verified business —
  const verified = cred?.status === 'listed' ? 95 : cred ? 35 : 50;
  const verifiedNote =
    cred?.status === 'listed'
      ? `${cred.register || 'Public register'} listed${cred.asOf ? ` · ${cred.asOf}` : ''}`
      : cred
        ? 'Not found on the public register.'
        : 'Register check still running.';

  // — Past reliability —
  const needle = normalise(offer.supplierAgentId);
  const sup = suppliers.find(
    (s) => normalise(s.id) === needle || normalise(s.displayName) === needle,
  );
  const reliability = sup
    ? Math.round(sup.reliabilityScore * 100)
    : offer.simulated
      ? 30
      : 50;
  const reliabilityNote = sup
    ? `${reliability}% from ${sup.displayName}'s completed jobs and ratings.`
    : offer.simulated
      ? 'Simulated roster entry — no track record.'
      : 'No track record on the roster yet.';

  const aggregate = Math.round(mandate * 0.5 + verified * 0.25 + reliability * 0.25);
  return { mandate, mandateNote, verified, verifiedNote, reliability, reliabilityNote, aggregate };
}

/** One sub-signal: a label, a tiny bar, and a hover tooltip with the raw signal. */
function SubBar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <span className="group/bar relative inline-flex flex-col gap-1" title={note} aria-label={`${label}: ${value} out of 100. ${note}`}>
      <span className="text-[9px] uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="block h-1.5 w-14 rounded-full bg-paper-inset overflow-hidden">
        <span
          className={`block h-full rounded-full ${value >= 70 ? 'bg-mandate' : value >= 45 ? 'bg-ink-muted' : 'bg-escalate'}`}
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </span>
      {/* Tooltip — the raw signal, on hover/focus */}
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden w-48 rounded-lg paper-card p-2 text-[10px] leading-snug text-ink group-hover/bar:block group-focus-within/bar:block">
        {note}
      </span>
    </span>
  );
}

function ConfidenceMeter({ confidence }: { confidence: Confidence }) {
  return (
    <div className="mt-3 flex items-end justify-between gap-3 border-t border-ink/5 pt-3">
      <div className="flex items-start gap-3" role="group" aria-label={`Confidence ${confidence.aggregate} out of 100`}>
        <SubBar label="Mandate" value={confidence.mandate} note={confidence.mandateNote} />
        <SubBar label="Verified" value={confidence.verified} note={confidence.verifiedNote} />
        <SubBar label="Reliable" value={confidence.reliability} note={confidence.reliabilityNote} />
      </div>
      <div className="text-right shrink-0" title="Confidence — weighted from mandate fit, business verification, and past reliability. Drives the ordering.">
        <p className="font-display text-xl leading-none text-ink tabular-nums">{confidence.aggregate}</p>
        <p className="text-[9px] uppercase tracking-wider text-ink-muted mt-0.5">confidence</p>
      </div>
    </div>
  );
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
  budgetMax,
}: Props) {
  const initialSelected = rehearsal
    ? offersProp?.find((offer) => offer.status === 'BLOCKED')?.id ?? offersProp?.[0]?.id ?? null
    : offersProp?.[0]?.id ?? null;
  const [offers, setOffers] = useState<Offer[]>(offersProp ?? []);
  const [loaded, setLoaded] = useState(!!offersProp || !missionId);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [showCompare, setShowCompare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<FoundEngineer[]>([]);
  const [credentials, setCredentials] = useState<Record<string, CredentialCheck>>({});
  const [checkingCreds, setCheckingCreds] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (offersProp) {
      setOffers(offersProp);
      setLoaded(true);
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
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [missionId, offersProp]);

  useEffect(() => {
    findNearby(category, district).then(setFound).catch(() => setFound([]));
  }, [category, district]);

  // Roster lookup for the Past Reliability sub-signal.
  useEffect(() => {
    listSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    const names = offers.map((o) => o.supplierAgentId).filter(Boolean);
    if (names.length === 0) return;
    let cancelled = false;
    setCheckingCreds(true);
    Promise.all(names.map(async (name) => {
      const cred = await checkCredential(name);
      return [name, cred] as const;
    })).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, CredentialCheck> = {};
      for (const [name, cred] of pairs) next[name] = cred;
      setCredentials(next);
      setCheckingCreds(false);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [offers]);

  // Confidence per offer; the aggregate drives the ordering.
  const confidenceById = useMemo(() => {
    const map = new Map<string, Confidence>();
    for (const offer of offers) {
      map.set(offer.id, computeConfidence(offer, budgetMax, credentials[offer.supplierAgentId], suppliers));
    }
    return map;
  }, [offers, budgetMax, credentials, suppliers]);

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      // Blocked quotes always sink below bookable ones.
      const aBlocked = a.status === 'BLOCKED' ? 1 : 0;
      const bBlocked = b.status === 'BLOCKED' ? 1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      return (confidenceById.get(b.id)?.aggregate ?? 0) - (confidenceById.get(a.id)?.aggregate ?? 0);
    });
  }, [offers, confidenceById]);

  // Skeletons, not spinners — ghosted offer cards while the first load runs.
  if (!loaded) {
    return <SkeletonOfferCards count={3} />;
  }

  if (offers.length === 0) {
    const enRoute = missionStatus === 'COMMITTED' || missionStatus === 'IN_PROGRESS';
    const copy = enRoute ? EMPTY_STATE_COPY.engineerEnRoute : EMPTY_STATE_COPY.waitingForQuotes;
    return (
      <div className="paper-card rounded-2xl p-8 text-center space-y-3 animate-pop-in">
        <div className="flex justify-center">
          <span className="receipt-punch" />
        </div>
        <h3 className="font-display text-xl text-ink">{copy.title}</h3>
        <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
          {copy.body}
        </p>
      </div>
    );
  }

  const selected = sortedOffers.find((offer) => offer.id === selectedId) || sortedOffers[0];

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
      {checkingCreds && (
        <SponsorCallout
          sponsor="apify"
          status="working"
          label="Checking Companies House register"
          detail="Apify scrapes the UK public register to verify each engineer is a real registered business. Fails closed to 'not checked' on any error."
        />
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-ink">Quotes</h3>
          <p className="text-sm text-ink-muted">
            {rehearsal ? 'One is over the ceiling. We stopped there first.' : `${offers.length} responses · best fit is first`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCompare((open) => !open)}
          className="min-h-11 px-2 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          {showCompare ? 'Hide comparison' : 'Compare all details'}
        </button>
      </div>

      <div className="space-y-2">
        {sortedOffers.map((offer, idx) => {
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
              className={`w-full min-h-[11rem] text-left paper-card rounded-2xl p-4 transition-colors ${
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
                <p className={`font-display text-2xl tabular-nums sm:text-3xl ${isSimulated ? 'text-ink-muted' : 'text-ink'}`}>{formatMoney(offer.price, offer.currency)}</p>
              </div>
              {/* Confidence — why the agent ranks this quote where it does */}
              {confidenceById.get(offer.id) && (
                <ConfidenceMeter confidence={confidenceById.get(offer.id)!} />
              )}
              {isSelected && offer.terms && (
                <p className="text-sm text-ink-muted mt-3 border-t border-ink/10 pt-3">{offer.terms}</p>
              )}
              {isSelected && offer.explanation && (
                <p className="text-xs text-ink-muted mt-2">{offer.explanation}</p>
              )}
              {isSelected && confidenceById.get(offer.id) && (
                <details className="sm:hidden mt-3 border-t border-ink/10 pt-2">
                  <summary className="min-h-11 flex items-center text-xs font-medium text-ink-muted cursor-pointer">Why this fit</summary>
                  <div className="space-y-1 text-xs text-ink-muted pb-1">
                    <p>Budget: {confidenceById.get(offer.id)!.mandateNote}</p>
                    <p>Business: {confidenceById.get(offer.id)!.verifiedNote}</p>
                    <p>Reliability: {confidenceById.get(offer.id)!.reliabilityNote}</p>
                  </div>
                </details>
              )}
              <p className="text-[11px] text-ink-muted mt-2 flex items-center gap-1.5">
                {isSimulated
                  ? 'Demo response — no real engineer was asked.'
                  : (
                    <>
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600 font-medium">Apify</span>
                      {credentials[offer.supplierAgentId]?.status === 'listed'
                        ? `${credentials[offer.supplierAgentId].register} listed · ${credentials[offer.supplierAgentId].asOf}`
                        : 'Public register: not checked'}
                    </>
                  )}
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
                <th className="p-3 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedOffers.map((offer) => (
                <tr key={offer.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-3 text-ink">{supplierLabel(offer.supplierAgentId)}</td>
                  <td className="p-3 text-ink-muted">{offer.availability}</td>
                  <td className="p-3 font-medium">{formatMoney(offer.price, offer.currency)}</td>
                  <td className="p-3 text-ink-muted tabular-nums">{confidenceById.get(offer.id)?.aggregate ?? '—'}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:static sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 bg-paper/95 backdrop-blur-sm">
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
          {!isAlreadyBooked && !blocked && !isRehearsalQuotes && (
            <p className="text-[11px] text-ink-muted mt-1">Selected against your budget, timing, and reliability rules.</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || blocked || isAlreadyBooked}
          className="btn-primary text-sm py-3 min-h-11 w-full sm:w-auto"
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
