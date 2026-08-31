import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { navigate } from 'astro:transitions/client';
import { useStore } from '@nanostores/react';
import { createMission, uploadImage, type DiagnosticMedia } from '../../lib/api';
import { broadcastMissionsChanged } from '../../lib/cache';
import { loadSavedMandate } from '../../lib/rehearsal';
import { districtStore } from '../../stores';
import { LoaderGrid } from '../primitives/LoaderGrid';
import SponsorCallout from '../primitives/SponsorCallout';
import OnboardingTooltip from '../primitives/OnboardingTooltip';
import { getJourneyStage, playUiSound } from '../../lib/delight';

const SpeakNote = lazy(() => import('../primitives/SpeakNote'));

export default function MissionForm() {
  // Journey stage drives both the starter prompt and whether samples are
  // open by default (ChatGPT-style: starter prompts appear automatically for
  // new users, collapse for returning ones).
  const stage = typeof window !== 'undefined' ? getJourneyStage() : 'new';
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [showSamples, setShowSamples] = useState(stage === 'new');
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [diagnosticMedia, setDiagnosticMedia] = useState<DiagnosticMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  // District flows into the sample jobs — picking a district in the picker
  // updates the presets live via the shared nanostore, no reload.
  const district = useStore(districtStore);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, []);

  // Smart pre-fill from context: explicit ?goal= link (book-again) beats
  // saved rules, beats the game handoff, beats the time-aware starter.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get('goal');
    if (fromLink && fromLink.trim()) {
      setGoal(fromLink.trim());
      setSavedHint('Pre-filled from your last receipt. Edit anything that changed.');
      return;
    }

    const saved = loadSavedMandate();
    if (saved) {
      setGoal(`${saved.goalHint}, budget £${saved.budget}, we're in ${saved.postalDistrict}.`);
      setSavedHint(`Using your saved rules: under £${saved.budget} in ${saved.postalDistrict}.`);
      return;
    }

    // Check if coming from the game
    const fromGame = params.get('from');
    if (fromGame === 'game') {
      setGoal("My commercial fridge is down, need repair before lunch, budget £500, we're in N1.");
      setSavedHint('Pre-filled from the game. Edit to match your real situation.');
      return;
    }

    // Starter prompt — never a blank textarea for a brand-new user. Seeded by
    // time of day and the district they picked, so it reads as their kitchen,
    // not our demo script.
    if (stage === 'new') {
      const hour = new Date().getHours();
      const starter =
        hour < 11
          ? `My commercial fridge is down, need repair before lunch, budget £500, we're in ${district}.`
          : hour < 16
            ? `Walk-in freezer is running warm, need someone this afternoon, budget £600, ${district}.`
            : `Extraction hood is due a deep clean before tomorrow's service, budget £350, we're ${district}.`;
      setGoal(starter);
      setSavedHint('A starting point in your district — edit it or clear it.');
    }
  }, [district, stage]);

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
      const mission = await createMission(goal, undefined, diagnosticMedia);
      // Let other tabs' pulses refresh before we leave the page.
      broadcastMissionsChanged();
      navigate(`/missions/${mission.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create the job.');
      setLoading(false);
    }
  };

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
        <div className="rounded-xl border border-ink/10 bg-paper-inset/40 p-3 space-y-2.5">
          <div>
            <p className="text-sm font-medium text-ink">Add a photo if it helps</p>
            <p className="text-xs text-ink-muted">Optional. Choose the view so the engineer knows what they’re looking at.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              ['unit', 'Full unit', 'Show the equipment and surroundings'],
              ['display', 'Display / error', 'Show a temperature or fault code'],
              ['model_plate', 'Model plate', 'Help identify parts and manuals'],
            ].map(([kind, title, hint]) => (
              <label key={kind} className="cursor-pointer rounded-lg border border-ink/10 bg-paper px-2.5 py-2 hover:border-mandate/40 transition-colors">
                <span className="block text-xs font-medium text-ink">{uploadingMedia === kind ? 'Uploading…' : title}</span>
                <span className="block text-[10px] text-ink-muted mt-0.5 leading-snug">{hint}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingMedia !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingMedia(kind);
                    try {
                      const uploaded = await uploadImage(file);
                      setDiagnosticMedia((current) => [...current, { kind: 'photo', url: uploaded.url, label: title }]);
                    } catch (err: any) {
                      setError(err.message || 'Could not add that photo.');
                    } finally {
                      setUploadingMedia(null);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </label>
            ))}
          </div>
          {diagnosticMedia.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {diagnosticMedia.map((media, index) => (
                <button key={`${media.url}-${index}`} type="button" onClick={() => setDiagnosticMedia((current) => current.filter((_, i) => i !== index))} className="text-[11px] text-ink bg-paper border border-ink/10 rounded-full px-2.5 py-1">{media.label} ×</button>
              ))}
            </div>
          )}
        </div>

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
