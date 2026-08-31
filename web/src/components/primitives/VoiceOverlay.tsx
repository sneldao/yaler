import React, { useEffect, useRef, useState } from 'react';

/**
 * VoiceOverlay — a voice experience in the paper world.
 *
 * Three phases:
 *   connecting  → paper card with "Connecting to the agent…"
 *   listening   → transcript appears on paper, mic card pulses subtly
 *   done        → transcript + editable extracted details on paper cards
 *
 * Visual language: same paper-card, ink, mandate, and font-display as
 * the rest of the app. No dark void, no glowing orb, no glassmorphism.
 * The overlay is a sheet of paper sliding over the page.
 */

export type VoicePhase = 'connecting' | 'listening' | 'done';

export interface ExtractedField {
  label: string;
  value: string | null;
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

  useEffect(() => {
    const vals: Record<string, string> = {};
    for (const f of extracted) {
      vals[f.key] = f.value || '';
    }
    setFieldValues(vals);
  }, [extracted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interimTranscript, finalTranscript]);

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

  const displayText = finalTranscript || interimTranscript;
  const hasFields = extracted.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-paper animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation with the agent"
    >
      {/* Top bar — same rhythm as the app header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10">
        <span className="text-xs uppercase tracking-[0.14em] text-ink-muted font-medium">
          {phase === 'connecting' && 'Connecting…'}
          {phase === 'listening' && 'Listening — speak naturally'}
          {phase === 'done' && 'Conversation complete'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-ink-muted hover:text-ink transition-colors"
          aria-label="Close voice overlay"
        >
          {phase === 'done' ? 'Close' : 'Cancel'}
        </button>
      </div>

      {/* Content — paper cards on paper, same as every other page */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm space-y-5">

          {/* The mic card — replaces the glowing orb */}
          {phase !== 'done' && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={phase === 'listening' ? (onStop || onClose) : undefined}
                disabled={phase === 'connecting'}
                className={`paper-card rounded-2xl w-16 h-16 flex items-center justify-center transition-all duration-300 ${
                  phase === 'connecting' && !reduced ? 'animate-pulse' : ''
                } ${phase === 'listening' ? 'hover:shadow-lg active:scale-95 cursor-pointer' : ''}`}
                aria-label={phase === 'listening' ? 'Tap to stop recording' : 'Connecting'}
              >
                {phase === 'listening' ? (
                  /* Stop square */
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-mandate">
                    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
                  </svg>
                ) : (
                  /* Mic */
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-mandate">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>
              {phase === 'listening' && (
                <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                  Tap to stop
                </p>
              )}
            </div>
          )}

          {/* Connecting message */}
          {phase === 'connecting' && (
            <div className="paper-card rounded-2xl p-5 text-center space-y-2">
              <p className="text-sm text-ink font-medium">Connecting to the agent</p>
              <p className="text-xs text-ink-muted">Via Vapi — this takes a second.</p>
            </div>
          )}

          {/* Live transcript — ink on paper, font-display like the receipt */}
          {phase !== 'connecting' && phase !== 'done' && (
            <div
              ref={scrollRef}
              className="paper-card rounded-2xl p-5 max-h-[40vh] overflow-y-auto text-center"
            >
              {displayText ? (
                <p className="text-ink text-lg leading-relaxed font-display">
                  {displayText}
                  {phase === 'listening' && !reduced && (
                    <span className="inline-block w-0.5 h-5 bg-mandate ml-1 animate-pulse align-middle" />
                  )}
                </p>
              ) : (
                <p className="text-ink-muted text-sm">
                  {phase === 'listening' ? 'Start speaking…' : ''}
                </p>
              )}
            </div>
          )}

          {/* Error — same escalate styling as the app */}
          {error && (
            <div className="paper-card rounded-2xl p-4 border-escalate/25 bg-escalate-light/30 text-center">
              <p className="text-escalate text-sm">{error}</p>
            </div>
          )}

          {/* Done — transcript + editable fields, same cards as MandateEditor */}
          {phase === 'done' && (
            <>
              {/* What was said */}
              {finalText && (
                <div className="paper-card rounded-2xl p-5 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">You said</p>
                  <p className="text-ink text-sm leading-relaxed italic">"{finalText}"</p>
                </div>
              )}

              {/* Extracted fields — same chip-row pattern as MandateEditor */}
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
                        className={`rounded-xl border transition-colors ${
                          isEditing
                            ? 'border-mandate bg-mandate-light/40'
                            : 'border-ink/10 bg-paper hover:border-ink/20'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 p-3">
                            <span className="text-xs uppercase tracking-wider text-ink-muted w-20 shrink-0">
                              {field.label}
                            </span>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                              className="flex-1 bg-paper text-ink text-sm font-medium rounded-lg px-3 py-1.5 border border-ink/10 outline-none focus:border-mandate"
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
                            className="w-full flex items-center justify-between gap-3 text-left p-3"
                          >
                            <span className="text-xs uppercase tracking-wider text-ink-muted">
                              {field.label}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${currentValue ? 'text-ink' : 'text-ink-muted'}`}>
                                {currentValue || 'Not mentioned'}
                              </span>
                              <span className="text-[10px] text-ink-muted uppercase tracking-wider">Edit</span>
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions — same buttons as the rest of the app */}
              <div className="space-y-2 pt-2">
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
                  className="text-ink-muted hover:text-ink text-xs transition-colors w-full text-center"
                >
                  Dismiss and type instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
