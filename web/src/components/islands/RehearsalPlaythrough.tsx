import React, { useEffect, useState, lazy, Suspense } from 'react';
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
import { applyExtractedMandate, type ExtractedMandate } from '../../lib/mandateExtract';
import MandateEditor from './MandateEditor';
import MissionTimeline from './MissionTimeline';
import OfferComparison from './OfferComparison';
import RehearsalBanner from '../primitives/RehearsalBanner';
const SpeakNote = lazy(() => import('../primitives/SpeakNote'));
import HearReceipt from '../primitives/HearReceipt';
import WaitlistCapture from './WaitlistCapture';
import { formatMoney, formatWhen, humanizeToken } from '../../lib/copy';

type Phase = 'details' | 'looking' | 'quotes' | 'receipt';
type Mode = 'autoplay' | 'interactive';

const REHEARSAL_SEEN_KEY = 'yaler_rehearsal_seen';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'looking', label: 'Looking' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'receipt', label: 'Receipt' },
];

interface Props {
  /** Auto-advance through all phases — for the 30-second demo surface. */
  autoplay?: boolean;
}

const GUIDE: Record<Phase, string> = {
  details: 'Check the number. Then we look. Nobody is called.',
  looking: 'Asking the three N1 engineers on the practice roster…',
  quotes: 'One quote is £80 over. We stopped. Tap it, then pick someone in budget.',
  receipt: 'This is the paper you’d pin up. Save the rules if they look right.',
};

const GUIDE_AUTOPLAY: Record<Phase, string> = {
  details: 'Here’s a real job from last Tuesday. Watch how it flows.',
  looking: 'Three AI supplier agents are preparing their quotes…',
  quotes: 'One quote came in £80 over budget. The agent stopped — and picked the in-budget option.',
  receipt: 'Receipt issued. Nothing was booked — this is practice.',
};

export default function RehearsalPlaythrough({ autoplay: autoplayProp }: Props) {
  // Always start with the SSR-safe value. The actual mode is resolved
  // in a useEffect after hydration to avoid hydration mismatches.
  const [mode, setMode] = useState<Mode>(autoplayProp ? 'autoplay' : 'interactive');
  const [autoPlayed, setAutoPlayed] = useState(false);
  const [phase, setPhase] = useState<Phase>('details');
  const [mission, setMission] = useState<Mission>(rehearsalMission('DRAFT'));
  const [booked, setBooked] = useState<Offer | null>(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bookedCred, setBookedCred] = useState<CredentialCheck | null>(null);

  // After hydration: if no explicit ?autoplay, check localStorage to decide
  // whether this is a first-time visitor (autoplay) or returning (interactive).
  useEffect(() => {
    if (autoplayProp) return; // explicit override, already set
    try {
      if (!localStorage.getItem(REHEARSAL_SEEN_KEY)) {
        setMode('autoplay');
      }
    } catch { /* ignore */ }
  }, [autoplayProp]);

  // Auto-play: advance through the phases on a timer, ending on the receipt.
  useEffect(() => {
    if (mode !== 'autoplay') return;
    const timers: number[] = [];
    const advance = (delay: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, delay));
    };

    // details 1s → looking, looking 2s → quotes (auto-picks the in-budget offer), quotes 2.5s → receipt
    setPhase('details');
    setMission(rehearsalMission('DRAFT'));
    setBooked(null);
    advance(1200, () => {
      setPhase('looking');
      setMission((prev) => ({ ...prev, status: 'SOURCING' }));
    });
    advance(4400, () => {
      setPhase('quotes');
      setMission((prev) => ({ ...prev, status: 'AWAITING_APPROVAL' }));
    });
    advance(7200, () => {
      const chosen = REHEARSAL_OFFERS[1]; // in-budget pick
      setBooked(chosen);
      setMission((prev) => ({ ...prev, status: 'COMPLETED', selectedSupplierId: chosen.supplierAgentId }));
      setPhase('receipt');
      setAutoPlayed(true);
      try { localStorage.setItem(REHEARSAL_SEEN_KEY, '1'); } catch { /* ignore */ }
      checkCredential(chosen.supplierAgentId).then(setBookedCred).catch(() => {
        setBookedCred({ name: chosen.supplierAgentId, status: 'not_checked' });
      });
    });
    return () => timers.forEach(clearTimeout);
  }, [mode]);

  useEffect(() => {
    if (phase !== 'looking') return;
    if (mode === 'autoplay') return; // autoplay handles its own timing
    const t = window.setTimeout(() => setPhase('quotes'), 1600);
    return () => window.clearTimeout(t);
  }, [phase, mode]);

  const switchToInteractive = () => {
    setMode('interactive');
    setPhase('details');
    setBooked(null);
    setMission(rehearsalMission('DRAFT'));
    try { localStorage.setItem(REHEARSAL_SEEN_KEY, '1'); } catch { /* ignore */ }
  };

  const switchToAutoplay = () => {
    setAutoPlayed(false);
    setMode('autoplay');
  };

  const handleStarted = (next: Mission) => {
    setMission({ ...next, status: 'SOURCING' });
    setPhase('looking');
  };

  const handleMandateExtracted = (extracted: ExtractedMandate) => {
    setMission((prev) => ({
      ...prev,
      mandate: applyExtractedMandate(prev.mandate, extracted),
    }));
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
    booked?.supplierAgentId?.replace(/^sup[_-]?/i, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'London Rapid ColdCare',
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
        {mode === 'autoplay' ? GUIDE_AUTOPLAY[phase] : GUIDE[phase]}
      </p>

      {phase === 'details' && mode === 'autoplay' && (
        // Autoplay: show the mandate as a read-only display, not a form
        <div className="paper-card rounded-2xl p-5 space-y-4 animate-pop-in">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-ink-muted">The job</p>
            <p className="text-ink font-medium leading-snug">{mission.goal}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Budget</p>
              <p className="text-ink font-medium">{formatMoney(mission.mandate.budget.maxAmount, mission.mandate.budget.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Area</p>
              <p className="text-ink font-medium">{mission.mandate.serviceArea.postalDistrict}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Deadline</p>
              <p className="text-ink font-medium">{formatWhen(mission.mandate.deadline)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Category</p>
              <p className="text-ink font-medium">{humanizeToken(mission.mandate.serviceCategory)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-mandate animate-pulse" />
            Starting automatically…
          </div>
        </div>
      )}

      {phase === 'details' && mode === 'interactive' && (
        <>
          <div className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-ink">Hands wet? Speak last Tuesday’s job. We’ll still show the written note below.</p>
            <Suspense fallback={<span className="text-xs text-ink-muted">Loading voice…</span>}>
              <SpeakNote
                label="Speak last Tuesday's job"
                onTranscript={(text) => {
                  setMission((prev) => ({
                    ...prev,
                    goal: text,
                    mandate: { ...prev.mandate, goal: text },
                  }));
                }}
                onMandateExtracted={handleMandateExtracted}
              />
            </Suspense>
          </div>
          <MandateEditor
            key={mission.goal}
            initialMission={mission}
            rehearsal
            onStarted={handleStarted}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={switchToAutoplay}
              className="text-xs text-ink-muted hover:text-mandate transition-colors"
            >
              ↺ Watch the demo instead
            </button>
          </div>
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
            <h3 className="font-display text-xl text-ink">Asking AI supplier agents</h3>
            <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
              Three AI supplier agents are preparing quotes. In a real job this takes a few minutes. Here it is last Tuesday, sped up.
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

          <article className="receipt-sheet rounded-sm relative overflow-hidden animate-receipt-print">
            <div className="receipt-stamp">Verified</div>
            <div className="receipt-fold" style={{ top: '33%' }} />
            <div className="receipt-fold" style={{ top: '66%' }} />
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
                receipt={{
                  summary: `${receipt.summary} Nothing was booked — this was a rehearsal.`,
                  agreedTerms: receipt.agreedTerms,
                  evidenceLabels: receipt.evidenceLabels,
                  rating: receipt.rating,
                  ratingComment: receipt.ratingComment,
                }}
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
              {mode === 'autoplay' && autoPlayed ? (
                <>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    You just watched the whole flow. Now try it yourself — change the budget, pick a different supplier, feel the stop.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={switchToInteractive}
                      className="btn-primary text-sm py-2.5"
                    >
                      Try it yourself
                    </button>
                    <a href="/missions/new" className="btn-secondary text-sm text-center py-2.5">
                      Start a real job
                    </a>
                    <a href="/" className="btn-secondary text-sm text-center py-2.5">
                      Back home
                    </a>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <a href="/missions/new" className="btn-primary text-sm text-center py-2.5">
                    Start a real job
                  </a>
                  <button
                    type="button"
                    onClick={switchToInteractive}
                    className="btn-secondary text-sm py-2.5"
                  >
                    Try again
                  </button>
                  <a href="/" className="btn-secondary text-sm text-center py-2.5">
                    Back home
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Waitlist capture */}
          <WaitlistCapture variant="operator" source="rehearsal" />
        </>
      )}
    </div>
  );
}
