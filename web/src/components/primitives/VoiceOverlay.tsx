import React, { useEffect, useRef, useState } from 'react';

/**
 * VoiceOverlay — a full-screen immersive voice experience.
 *
 * Three phases:
 *   connecting  → pulsing orb, "Connecting to the agent…"
 *   listening   → live transcript appears word by word, pulsing waveform
 *   done        → shows the final transcript + editable extracted details
 *
 * In the done phase, each field is tappable to correct. The user can fix
 * anything the agent got wrong before confirming.
 *
 * Reduced-motion: no animations, content appears immediately.
 */

export type VoicePhase = 'connecting' | 'listening' | 'done';

export interface ExtractedField {
  label: string;
  value: string | null;
  /** Key identifies which field this is — used for the edit callback. */
  key: string;
}

interface Props {
  phase: VoicePhase;
  interimTranscript: string;
  finalTranscript: string;
  extracted: ExtractedField[];
  error: string | null;
  onClose: () => void;
  onUse: (editedFields: Record<string, string>) => void;
  onStop?: () => void;
}

export default function VoiceOverlay({
  phase,
  interimTranscript,
  finalTranscript,
  extracted,
  error,
  onClose,
  onUse,
  onStop,
}: Props) {
  const [reduced, setReduced] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // When extracted fields arrive, seed the editable values
  useEffect(() => {
    const vals: Record<string, string> = {};
    for (const f of extracted) {
      vals[f.key] = f.value || '';
    }
    setFieldValues(vals);
  }, [extracted]);

  // Auto-scroll the transcript to the bottom as new words arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interimTranscript, finalTranscript]);

  // Focus the edit input when opened
  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingKey]);

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(fieldValues[key] || '');
  };

  const saveEdit = () => {
    if (editingKey) {
      setFieldValues((prev) => ({ ...prev, [editingKey]: editValue.trim() }));
    }
    setEditingKey(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const displayText = finalTranscript || interimTranscript;
  const hasFields = extracted.length > 0;

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
        {/* The orb — tappable to stop during listening */}
        {phase !== 'done' && (
          <div className="relative mb-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={phase === 'listening' ? (onStop || onClose) : undefined}
              disabled={phase === 'connecting'}
              className={`relative flex items-center justify-center transition-all duration-300 ${
                phase === 'connecting'
                  ? 'w-16 h-16 rounded-full bg-mandate/30 scale-90'
                  : 'w-20 h-20 rounded-full bg-mandate scale-100 hover:scale-105 active:scale-95 cursor-pointer'
              } ${!reduced && phase === 'connecting' ? 'animate-pulse' : ''}`}
              aria-label={phase === 'listening' ? 'Tap to stop recording' : 'Connecting'}
            >
              {/* Outer pulse rings */}
              {!reduced && phase === 'listening' && (
                <>
                  <span className="absolute w-24 h-24 rounded-full bg-mandate/20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
                  <span className="absolute w-20 h-20 rounded-full bg-mandate/15 animate-ping pointer-events-none" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                </>
              )}
              {/* Icon — stop square during listening, mic during connecting */}
              {phase === 'listening' ? (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-paper relative z-10">
                  <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-paper relative z-10">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>
            {/* Hint below the orb */}
            {phase === 'listening' && (
              <p className="text-paper/50 text-xs uppercase tracking-[0.14em]">
                Tap to stop
              </p>
            )}
          </div>
        )}

        {/* Connecting message */}
        {phase === 'connecting' && (
          <p className="text-paper/70 text-sm text-center max-w-sm">
            Connecting to the agent via Vapi…
          </p>
        )}

        {/* Live transcript */}
        {phase !== 'connecting' && phase !== 'done' && (
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

        {/* Done — transcript summary + editable extracted details */}
        {phase === 'done' && (
          <div className="max-w-sm w-full space-y-5 overflow-y-auto">
            {/* What was said */}
            {finalText && (
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-[0.14em] text-paper/40">You said</p>
                <p className="text-paper/80 text-sm leading-relaxed italic">"{finalText}"</p>
              </div>
            )}

            {/* Extracted fields — tappable to edit */}
            {hasFields && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-mandate font-medium text-center">
                  What the agent heard — tap to fix
                </p>
                {extracted.map((field) => {
                  const isEditing = editingKey === field.key;
                  const currentValue = fieldValues[field.key] || '';
                  return (
                    <div
                      key={field.key}
                      className={`rounded-xl border px-4 py-3 transition-colors ${
                        isEditing
                          ? 'border-mandate bg-mandate/10'
                          : 'border-paper/15 bg-paper/5 hover:border-paper/30'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-paper/50 w-20 shrink-0">
                            {field.label}
                          </span>
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="flex-1 bg-paper/10 text-paper text-sm font-medium rounded-lg px-3 py-1.5 border border-paper/20 outline-none focus:border-mandate"
                            placeholder="Enter value…"
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="text-xs text-mandate hover:text-mandate/80 font-medium shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(field.key)}
                          className="w-full flex items-center justify-between gap-3 text-left"
                        >
                          <span className="text-xs uppercase tracking-wider text-paper/50">
                            {field.label}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${currentValue ? 'text-paper' : 'text-paper/30'}`}>
                              {currentValue || 'Not mentioned'}
                            </span>
                            <span className="text-[10px] text-paper/30 uppercase tracking-wider">Edit</span>
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom — action button */}
      {phase === 'done' && (
        <div className="px-6 pb-8 safe-bottom">
          <div className="max-w-sm mx-auto space-y-2">
            <button
              type="button"
              onClick={() => onUse(fieldValues)}
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
