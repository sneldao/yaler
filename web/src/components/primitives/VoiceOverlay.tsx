import React, { useEffect, useRef, useState } from 'react';

/**
 * VoiceOverlay — a full-screen immersive voice experience.
 *
 * Three phases:
 *   connecting  → pulsing orb, "Connecting to the agent…"
 *   listening   → live transcript appears word by word, pulsing waveform
 *   done        → shows the final transcript + extracted details, "Use these" button
 *
 * Reduced-motion: no animations, content appears immediately.
 */

export type VoicePhase = 'connecting' | 'listening' | 'done';

interface ExtractedField {
  label: string;
  value: string | null;
}

interface Props {
  phase: VoicePhase;
  interimTranscript: string;
  finalTranscript: string;
  extracted: ExtractedField[];
  error: string | null;
  onClose: () => void;
  onUse: () => void;
}

export default function VoiceOverlay({
  phase,
  interimTranscript,
  finalTranscript,
  extracted,
  error,
  onClose,
  onUse,
}: Props) {
  const [reduced, setReduced] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Auto-scroll the transcript to the bottom as new words arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interimTranscript, finalTranscript]);

  const displayText = finalTranscript || interimTranscript;
  const hasExtracted = extracted.some((f) => f.value);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation with the agent"
    >
      {/* Top bar — close button + status */}
      <div className="flex items-center justify-between px-5 py-4 text-paper/60">
        <span className="text-xs uppercase tracking-[0.14em] font-medium">
          {phase === 'connecting' && 'Connecting…'}
          {phase === 'listening' && 'Listening — speak naturally'}
          {phase === 'done' && 'Conversation complete'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-paper/60 hover:text-paper text-sm transition-colors"
          aria-label="Close voice overlay"
        >
          {phase === 'done' ? 'Close' : 'Cancel'}
        </button>
      </div>

      {/* Center — the orb + transcript */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 overflow-hidden">
        {/* The orb */}
        {phase !== 'done' && (
          <div className="relative mb-8 flex items-center justify-center">
            {/* Outer pulse rings */}
            {!reduced && phase === 'listening' && (
              <>
                <span className="absolute w-24 h-24 rounded-full bg-mandate/20 animate-ping" style={{ animationDuration: '2s' }} />
                <span className="absolute w-20 h-20 rounded-full bg-mandate/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              </>
            )}
            {/* The core orb */}
            <div
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                phase === 'connecting'
                  ? 'bg-mandate/30 scale-90'
                  : 'bg-mandate scale-100'
              } ${!reduced && phase === 'connecting' ? 'animate-pulse' : ''}`}
            >
              {/* Microphone icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-paper">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
          </div>
        )}

        {/* Connecting message */}
        {phase === 'connecting' && (
          <p className="text-paper/70 text-sm text-center max-w-sm">
            Connecting to the agent via Vapi…
          </p>
        )}

        {/* Live transcript */}
        {phase !== 'connecting' && (
          <div
            ref={scrollRef}
            className="max-w-lg w-full max-h-[40vh] overflow-y-auto text-center"
          >
            {displayText ? (
              <p className="text-paper text-lg sm:text-xl leading-relaxed font-display">
                {displayText}
                {phase === 'listening' && !reduced && (
                  <span className="inline-block w-0.5 h-5 bg-mandate ml-1 animate-pulse align-middle" />
                )}
              </p>
            ) : (
              <p className="text-paper/40 text-sm">
                {phase === 'listening' ? 'Start speaking…' : ''}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 max-w-sm text-center">
            <p className="text-escalate text-sm">{error}</p>
          </div>
        )}

        {/* Done — extracted details */}
        {phase === 'done' && hasExtracted && (
          <div className="mt-8 max-w-sm w-full space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-mandate font-medium text-center">
              What the agent heard
            </p>
            <div className="space-y-2">
              {extracted.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-paper/15 bg-paper/5 px-4 py-3"
                >
                  <span className="text-xs uppercase tracking-wider text-paper/50">
                    {field.label}
                  </span>
                  <span className={`text-sm font-medium ${field.value ? 'text-paper' : 'text-paper/30'}`}>
                    {field.value || 'Not mentioned'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom — action button */}
      {phase === 'done' && (
        <div className="px-6 pb-8 safe-bottom">
          <div className="max-w-sm mx-auto space-y-2">
            <button
              type="button"
              onClick={onUse}
              className="btn-primary w-full text-sm py-3"
            >
              Use these details →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-paper/50 hover:text-paper text-xs transition-colors w-full text-center"
            >
              Dismiss and type instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
