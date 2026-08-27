import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { navigate } from 'astro:transitions/client';
import { createMission } from '../../lib/api';
import { broadcastMissionsChanged } from '../../lib/cache';
import { loadSavedMandate } from '../../lib/rehearsal';
import { DISTRICT_EVENT, getDistrict } from './DistrictPicker';
import { LoaderGrid } from '../primitives/LoaderGrid';
import SponsorCallout from '../primitives/SponsorCallout';
import OnboardingTooltip from '../primitives/OnboardingTooltip';
import { getJourneyStage, playUiSound } from '../../lib/delight';

const SpeakNote = lazy(() => import('../primitives/SpeakNote'));

export default function MissionForm() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [district, setDistrict] = useState('N1');
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // District flows into the sample jobs — picking a district in the picker
  // updates the presets live, no reload.
  useEffect(() => {
    setDistrict(getDistrict());
    const onDistrict = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setDistrict(next);
    };
    window.addEventListener(DISTRICT_EVENT, onDistrict);
    return () => window.removeEventListener(DISTRICT_EVENT, onDistrict);
  }, []);

  useEffect(() => {
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, []);

  // Smart pre-fill from context
  useEffect(() => {
    const saved = loadSavedMandate();
    if (saved) {
      setGoal(`${saved.goalHint}, budget £${saved.budget}, we're in ${saved.postalDistrict}.`);
      setSavedHint(`Using your saved rules: under £${saved.budget} in ${saved.postalDistrict}.`);
      return;
    }

    // Check if coming from the game
    const params = new URLSearchParams(window.location.search);
    const fromGame = params.get('from');
    if (fromGame === 'game') {
      setGoal("My commercial fridge is down, need repair before lunch, budget £500, we're in N1.");
      setSavedHint('Pre-filled from the game. Edit to match your real situation.');
    }
  }, []);

  // Auto-focus textarea when confirmed
  useEffect(() => {
    if (confirmed && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [confirmed]);

  // Sample jobs speak in the user's chosen district — the visible connection
  // between the district picker and the form.
  const presets = [
    { title: 'Fridge down before lunch', text: `My commercial fridge is down, need repair before lunch, budget £500, we're in ${district}.`, badge: `${district} · £500` },
    { title: 'Hood clean before inspection', text: `Hood extraction needs a deep clean before our food safety inspection Thursday, can go to £350, we're ${district}.`, badge: `${district} · £350` },
    { title: 'Walk-in freezer running warm', text: `Walk-in freezer is running warm at 6 degrees, need someone today, budget £600, ${district}.`, badge: `${district} · £600` },
  ];

  const typePreset = (text: string) => {
    if (typingRef.current) clearInterval(typingRef.current);
    setGoal('');
    let index = 0;
    typingRef.current = setInterval(() => {
      index++;
      setGoal(text.slice(0, index));
      if (index >= text.length && typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    }, 12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) {
      // Nudge instead of failing silently — the button stays disabled, so
      // this fires on Enter / any implicit submission.
      setAttemptedSubmit(true);
      return;
    }

    setAttemptedSubmit(false);
    setLoading(true);
    setError(null);
    playUiSound('ping');
    try {
      const mission = await createMission(goal);
      // Let other tabs' pulses refresh before we leave the page.
      broadcastMissionsChanged();
      navigate(`/missions/${mission.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create the job.');
      setLoading(false);
    }
  };

  const stage = typeof window !== 'undefined' ? getJourneyStage() : 'new';

  // Confirmation gate — replaced the <details> element
  if (!confirmed) {
    return (
      <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-4 relative">
        <OnboardingTooltip
          id="real-job-gate"
          text="This is live. The rehearsal is safe to try first."
          position="top"
          delay={2000}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">This is a real job</p>
          <p className="text-xs text-ink-muted leading-relaxed">
            {stage === 'rehearsed'
              ? "You've done the rehearsal. Ready to do it for real? Someone may be booked."
              : "If you only wanted to feel the flow, the rehearsal is free and nothing gets booked."}
          </p>
        </div>
        {savedHint && (
          <p className="text-xs text-mandate">{savedHint}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setConfirmed(true)}
            className="btn-primary text-sm py-2.5 flex-1"
          >
            Yes, something is actually broken
          </button>
          {stage === 'new' && (
            <a href="/rehearsal" className="btn-secondary text-sm py-2.5 text-center flex-1">
              Try the rehearsal first
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-5 animate-pop-in">
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-ink">What's broken?</h2>
        <p className="text-sm text-ink-muted">
          Speak it — that's the fastest way. Or type if you prefer.
        </p>
        {savedHint && <p className="text-xs text-mandate mt-2">{savedHint}</p>}
      </div>

      {/* Voice-first entry — Vapi is the primary input method */}
      <Suspense fallback={null}>
        <SpeakNote
          onTranscript={(text) => setGoal((prev) => (prev ? `${prev} ${text}` : text))}
        />
      </Suspense>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="mission-goal-input" className="sr-only">
          Describe the job — what's broken, your budget, and your postcode area
        </label>
        <textarea
          id="mission-goal-input"
          ref={textareaRef}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
          rows={4}
          className="field-input text-base leading-relaxed"
          disabled={loading}
        />

        {attemptedSubmit && !goal.trim() && (
          <p className="text-xs text-mandate leading-relaxed animate-pop-in" role="status">
            Tell us what's broken first — one sentence is enough, e.g. 'Fridge down, need repair before lunch, budget £500, N1.'
          </p>
        )}

        {loading && (
          <SponsorCallout
            sponsor="gemini"
            status="working"
            label="Extracting mandate from your note"
            detail="Gemini reads your text and pulls out budget, area, deadline, and service category into a structured mandate you check before anything moves."
          />
        )}

        {error && (
          <div className="p-4 bg-escalate-light border border-escalate/25 rounded-xl space-y-3 animate-pop-in" role="alert">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-escalate">That didn't go through</p>
              <p className="text-sm text-escalate">{error}</p>
              <p className="text-xs text-escalate/80 leading-relaxed">
                Usually the backend is still waking up, or the note didn't include a budget/area we could read.
              </p>
              <p className="text-xs text-escalate/80 leading-relaxed">
                Try again in a few seconds — or start from a sample job and edit it to fit.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAttemptedSubmit(false);
                  typePreset(presets[0].text);
                }}
                className="btn-primary text-sm py-2.5 flex-1"
              >
                Use a sample job
              </button>
              <a href="/rehearsal" className="btn-secondary text-sm py-2.5 text-center flex-1">
                Try the rehearsal instead
              </a>
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowSamples((s) => !s)}
            aria-expanded={showSamples}
            aria-controls="sample-jobs"
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            {showSamples ? 'Hide sample jobs' : 'Use a sample job'}
          </button>
          {showSamples && (
            <div id="sample-jobs" className="grid grid-cols-1 gap-2 mt-2 animate-pop-in">
              {presets.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => typePreset(p.text)}
                  className="cursor-pointer text-left bg-paper hover:bg-paper-inset border border-ink/10 rounded-xl p-3 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{p.title}</div>
                    <p className="text-xs text-ink-muted line-clamp-1">{p.text}</p>
                  </div>
                  <span className="text-[11px] text-mandate shrink-0">{p.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The wrapper catches clicks while the button is disabled (empty
            goal) so we can nudge helpfully instead of ignoring the tap. */}
        <div
          onClick={() => {
            if (!loading && !goal.trim()) setAttemptedSubmit(true);
          }}
        >
          <button
            type="submit"
            disabled={loading || !goal.trim()}
            className={`btn-primary w-full${!loading && !goal.trim() ? ' pointer-events-none' : ''}`}
          >
            {loading ? (
              <><LoaderGrid /><span>Reading your note...</span></>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
