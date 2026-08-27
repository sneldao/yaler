import React, { useState } from 'react';

export interface InlineTrigger {
  id: string;
  label: string;
  previewType: 'image' | 'metric' | 'signature';
  contentUrl?: string;
  metricText?: string;
  metricLabel?: string;
}

interface Props {
  prefixText: string;
  triggers: InlineTrigger[];
  suffixText?: string;
}

export default function InlineEvidenceText({ prefixText, triggers, suffixText }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="bg-paper rounded-xl p-4 border border-ink/10 text-sm sm:text-base leading-relaxed text-ink">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span>{prefixText}</span>

        {triggers.map((trig) => {
          const isOpen = activeId === trig.id;
          return (
            <span key={trig.id} className="inline-flex flex-col align-middle my-1">
              <button
                type="button"
                onClick={() => setActiveId((prev) => (prev === trig.id ? null : trig.id))}
                className={`px-2 py-0.5 rounded-md border text-xs transition-colors ${
                  isOpen
                    ? 'bg-mandate-light text-mandate border-mandate/30'
                    : 'bg-paper-raised text-mandate border-ink/10 hover:border-mandate/30'
                }`}
              >
                {trig.label}
              </button>

              <div
                className="grid transition-[grid-template-rows,opacity] duration-200"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                  transitionTimingFunction: 'var(--ease)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="mt-2 p-3 rounded-xl bg-paper-raised border border-ink/10 max-w-sm">
                    {trig.previewType === 'image' && trig.contentUrl && (
                      <img
                        src={trig.contentUrl}
                        alt={trig.label || 'Evidence photo'}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                    {trig.previewType === 'metric' && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-ink-muted">{trig.metricLabel}</p>
                        <p className="font-display text-xl text-ink">{trig.metricText}</p>
                      </div>
                    )}
                    {trig.previewType === 'signature' && (
                      <p className="text-xs text-ink-muted">Signed by the engineer.</p>
                    )}
                  </div>
                </div>
              </div>
            </span>
          );
        })}

        {suffixText && <span>{suffixText}</span>}
      </p>
    </div>
  );
}
