import React, { useEffect, useState } from 'react';
import { LoaderGrid } from '../primitives/LoaderGrid';
import type { CredentialCheck, Mission, Offer } from '../../lib/api';
import { checkCredential } from '../../lib/api';
import {
  REHEARSAL_MANDATE,
  REHEARSAL_OFFERS,
  rehearsalEvents,
  rehearsalMission,
  rehearsalReceipt,
  saveMandate,
  type SavedMandate,
} from '../../lib/rehearsal';
import MandateEditor from './MandateEditor';
import MissionTimeline from './MissionTimeline';
import OfferComparison from './OfferComparison';
import RehearsalBanner from '../primitives/RehearsalBanner';
import SpeakNote from '../primitives/SpeakNote';
import HearReceipt from '../primitives/HearReceipt';
import WaitlistCapture from './WaitlistCapture';
import { formatMoney } from '../../lib/copy';

type Phase = 'details' | 'looking' | 'quotes' | 'receipt';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'looking', label: 'Looking' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'receipt', label: 'Receipt' },
];

const GUIDE: Record<Phase, string> = {
  details: 'Check the number. Then we look. Nobody is called.',
  looking: 'Asking the three N1 engineers on the practice roster…',
  quotes: 'One quote is £80 over. We stopped. Tap it, then pick someone in budget.',
  receipt: 'This is the paper you’d pin up. Save the rules if they look right.',
};

export default function RehearsalPlaythrough() {
  const [phase, setPhase] = useState<Phase>('details');
  const [mission, setMission] = useState<Mission>(rehearsalMission('DRAFT'));
  const [booked, setBooked] = useState<Offer | null>(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bookedCred, setBookedCred] = useState<CredentialCheck | null>(null);

  useEffect(() => {
    if (phase !== 'looking') return;
    const t = window.setTimeout(() => setPhase('quotes'), 1600);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleStarted = (next: Mission) => {
    setMission({ ...next, status: 'SOURCING' });
    setPhase('looking');
  };

  const handleBooked = (offer: Offer) => {
    setBooked(offer);
    setMission((prev) => ({
      ...prev,
      status: 'COMPLETED',
      selectedSupplierId: offer.supplierAgentId,
    }));
    setPhase('receipt');
    checkCredential(offer.supplierAgentId).then(setBookedCred).catch(() => {
      setBookedCred({ name: offer.supplierAgentId, status: 'not_checked' });
    });
  };

  const persistRules = () => {
    const payload: SavedMandate = {
      budget: mission.mandate.budget.maxAmount,
      postalDistrict: mission.mandate.serviceArea.postalDistrict,
      autonomyMode: mission.mandate.autonomyMode,
      serviceCategory: mission.mandate.serviceCategory,
      goalHint: 'Commercial fridge down, need repair before lunch',
      savedAt: new Date().toISOString(),
    };
    saveMandate(payload);
    setSaved(true);
    setToast(`Rules pinned. Next time you say "fridge down", these are the ones we use.`);
    window.setTimeout(() => setToast(null), 5000);
  };

  const lookingMission: Mission = { ...mission, status: 'SOURCING' };
  const quoteMission: Mission = { ...mission, status: 'AWAITING_APPROVAL' };
  const doneMission: Mission = { ...mission, status: 'COMPLETED' };
  const receipt = rehearsalReceipt(
    booked?.supplierAgentId || 'London Rapid ColdCare',
    booked?.price || 480,
  );
  const activeIdx = PHASES.findIndex((step) => step.id === phase);

  return (
    <div className="space-y-5">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]">
          <div className="paper-card rounded-2xl px-5 py-4 flex items-start gap-3 animate-receipt-slice-in shadow-paper">
            <span className="text-mandate mt-0.5 shrink-0">✓</span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">Rules pinned</p>
              <p className="text-xs text-ink-muted leading-relaxed">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-ink-muted hover:text-ink text-xs shrink-0"
            >
              dismiss
            </button>
          </div>
        </div>
      )}
      <RehearsalBanner />

      <ol className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-ink-muted">
        {PHASES.map((step, idx) => {
          const isCurrent = step.id === phase;
          const isPassed = idx < activeIdx;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isCurrent ? 'bg-mandate' : isPassed ? 'bg-mandate/50' : 'bg-ink/15'
              }`} />
              <span className={isCurrent ? 'text-ink font-medium' : isPassed ? 'text-ink-muted' : 'text-ink/30'}>
                {idx + 1}. {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-ink leading-relaxed bg-paper rounded-xl px-4 py-3 border border-ink/10">
        {GUIDE[phase]}
      </p>

      {phase === 'details' && (
        <>
          <div className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-ink">Hands wet? Speak last Tuesday’s job. We’ll still show the written note below.</p>
            <SpeakNote
              label="Speak last Tuesday’s job"
              onTranscript={(text) => {
                setMission((prev) => ({
                  ...prev,
                  goal: text,
                  mandate: { ...prev.mandate, goal: text },
                }));
              }}
            />
          </div>
          <MandateEditor
            key={mission.goal}
            initialMission={mission}
            rehearsal
            onStarted={handleStarted}
          />
        </>
      )}

      {phase === 'looking' && (
        <>
          <MissionTimeline
            rehearsal
            mission={lookingMission}
            events={rehearsalEvents('sourcing')}
          />
          <div className="paper-card rounded-2xl p-8 text-center space-y-3 animate-pop-in">
            <div className="flex justify-center">
              <span className="receipt-punch" />
            </div>
            <h3 className="font-display text-xl text-ink">Asking nearby engineers</h3>
            <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
              In a real job this can take a few minutes. Here it is last Tuesday, sped up.
            </p>
            <div className="flex justify-center pt-1">
              <LoaderGrid />
            </div>
          </div>
        </>
      )}

      {phase === 'quotes' && (
        <>
          <MissionTimeline
            rehearsal
            mission={quoteMission}
            events={rehearsalEvents('quotes')}
          />
          <OfferComparison
            rehearsal
            offers={REHEARSAL_OFFERS}
            onBooked={handleBooked}
          />
        </>
      )}

      {phase === 'receipt' && booked && (
        <>
          <MissionTimeline
            rehearsal
            mission={doneMission}
            events={rehearsalEvents('done', booked.supplierAgentId)}
          />

          <article className="receipt-sheet rounded-sm relative overflow-hidden">
            <div className="absolute -left-2 top-16 receipt-punch" />
            <div className="absolute -right-2 top-16 receipt-punch" />
            <div className="receipt-perf" />
            <div className="px-7 py-8 space-y-5">
              <header>
                <p className="text-[11px] uppercase tracking-[0.18em] text-mandate">Rehearsal receipt — N1</p>
                <h2 className="font-display text-3xl text-ink mt-1">Job done</h2>
                <p className="text-xs text-ink-muted mt-1">Nothing was booked. This is how the paper would look.</p>
              </header>
              <p className="font-display text-xl leading-snug text-ink">{receipt.summary}</p>
              <p className="text-sm text-ink leading-relaxed">{receipt.agreedTerms}</p>
              <ul className="space-y-1.5">
                {receipt.evidenceLabels.map((lbl) => (
                  <li key={lbl} className="text-sm text-ink flex items-start gap-2">
                    <span className="text-mandate mt-0.5">✓</span>
                    <span>{lbl}</span>
                  </li>
                ))}
              </ul>
              {receipt.rating && receipt.rating > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">Buyer's verdict</p>
                  <div className="flex items-center gap-2">
                    <span className="text-mandate text-lg leading-none">{'★'.repeat(receipt.rating)}<span className="text-ink/15">{'★'.repeat(5 - receipt.rating)}</span></span>
                    <span className="text-sm text-ink font-medium">{receipt.rating} / 5</span>
                  </div>
                  {receipt.ratingComment && (
                    <p className="text-sm text-ink-muted italic leading-relaxed">“{receipt.ratingComment}”</p>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center border-t border-ink/10 pt-3">
                <span className="text-sm text-ink-muted">Paid</span>
                <span className="font-display text-2xl text-ink">{formatMoney(booked.price, booked.currency)}</span>
              </div>
              <p className="text-xs text-ink-muted">
                {bookedCred?.status === 'listed'
                  ? `${bookedCred.register} listed · ${bookedCred.asOf}`
                  : 'Public register: not checked'}
              </p>
              <HearReceipt
                text={`Receipt. ${receipt.summary} ${receipt.agreedTerms} Nothing was booked. This was a rehearsal.`}
              />
            </div>
            <div className="receipt-perf" />
          </article>
          <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-4">
            {/* Time-saved nudge */}
            <div className="flex items-center gap-3 bg-mandate/5 rounded-xl px-4 py-3 border border-mandate/20">
              <span className="text-mandate font-display text-2xl">~12 min</span>
              <p className="text-sm text-ink-muted leading-snug">
                In a real job, this takes about 12 minutes instead of the usual 3-4 hours of phone calls.
              </p>
            </div>

            <h3 className="font-display text-2xl text-ink">That was a rehearsal</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Nothing was booked. Next time it is real, these are the rules we will keep: stay under {formatMoney(mission.mandate.budget.maxAmount)}, district {mission.mandate.serviceArea.postalDistrict}, and only stop you if it goes over or nobody can come today.
            </p>
            {!saved && (
              <button type="button" onClick={persistRules} className="btn-secondary w-full">
                Save these rules for next time
              </button>
            )}
            {saved && (
              <p className="text-sm text-mandate">Rules saved on this phone.</p>
            )}

            {/* Always-visible next steps */}
            <div className="border-t border-ink/10 pt-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-ink-muted">What next?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a href="/missions/new" className="btn-primary text-sm text-center py-2.5">
                  Start a real job
                </a>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-secondary text-sm py-2.5"
                >
                  Try again
                </button>
                <a href="/" className="btn-secondary text-sm text-center py-2.5">
                  Back home
                </a>
              </div>
            </div>
          </div>

          {/* Waitlist capture */}
          <WaitlistCapture variant="operator" source="rehearsal" />
        </>
      )}
    </div>
  );
}
