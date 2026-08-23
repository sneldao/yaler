import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { navigate } from 'astro:transitions/client';
import { createMission } from '../../lib/api';
import { loadSavedMandate } from '../../lib/rehearsal';
import { LoaderGrid } from '../primitives/LoaderGrid';
import OnboardingTooltip from '../primitives/OnboardingTooltip';
import { getJourneyStage, playUiSound } from '../../lib/delight';

const SpeakNote = lazy(() => import('../primitives/SpeakNote'));

export default function MissionForm() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const presets = [
    { title: 'Fridge down before lunch', text: "My commercial fridge is down, need repair before lunch, budget £500, we're in N1.", badge: 'N1 · £500' },
    { title: 'Hood clean before inspection', text: 'Extraction hood cleaning required before food safety inspection tomorrow, budget £350 in E1.', badge: 'E1 · £350' },
    { title: 'Walk-in freezer warning', text: 'Walk-in freezer temperature warning 6C, urgent technician callout needed in SW1, budget £600.', badge: 'SW1 · £600' },
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
    if (!goal.trim()) return;

    setLoading(true);
    setError(null);
    playUiSound('ping');
    try {
      const mission = await createMission(goal);
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">What's broken?</h2>
          <p className="text-sm text-ink-muted mt-1">
            Speak or type it. We'll pull out the budget, area, and deadline for you to check.
          </p>
          {savedHint && <p className="text-xs text-mandate mt-2">{savedHint}</p>}
        </div>
        <Suspense fallback={null}>
          <SpeakNote
            className="self-start"
            onTranscript={(text) => setGoal((prev) => (prev ? `${prev} ${text}` : text))}
          />
        </Suspense>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          ref={textareaRef}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
          rows={4}
          className="field-input text-base leading-relaxed"
          disabled={loading}
        />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted animate-pop-in">
            <LoaderGrid />
            <span>Reading your note and checking the budget...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-escalate-light border border-escalate/25 text-escalate rounded-xl text-sm">
            {error}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowSamples((s) => !s)}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            {showSamples ? 'Hide sample jobs' : 'Use a sample job'}
          </button>
          {showSamples && (
            <div className="grid grid-cols-1 gap-2 mt-2 animate-pop-in">
              {presets.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => typePreset(p.text)}
                  className="text-left bg-paper hover:bg-paper-inset border border-ink/10 rounded-xl p-3 transition-colors flex items-center justify-between gap-3"
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

        <button
          type="submit"
          disabled={loading || !goal.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <><LoaderGrid /><span>Reading your note...</span></>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </form>
    </div>
  );
}
