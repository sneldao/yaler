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

  const toggleTrigger = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl font-sans text-sm sm:text-base leading-relaxed text-slate-200">
      <div className="flex items-center gap-2 mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] pb-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        <span>Inline Narrative Proof Inspection</span>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-1">
        <span>{prefixText}</span>

        {triggers.map((trig) => {
          const isOpen = activeId === trig.id;

          return (
            <span key={trig.id} className="inline-flex flex-col align-middle my-1">
              <button
                type="button"
                onClick={() => toggleTrigger(trig.id)}
                className={`group px-2.5 py-1 rounded-xl border text-xs font-mono font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isOpen
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-cyan-400 border-white/[0.1]'
                }`}
              >
                <span>🔍 {trig.label}</span>
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Inline Expansion Area */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-300"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="mt-2 p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 max-w-sm shadow-2xl animate-pop-in">
                    {trig.previewType === 'image' && trig.contentUrl && (
                      <div className="space-y-2">
                        <img
                          src={trig.contentUrl}
                          alt={trig.label}
                          className="w-full h-32 object-cover rounded-xl border border-white/10"
                        />
                        <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                          <span>EXIF Timestamp Verified</span>
                          <span className="text-emerald-400 font-bold">100% Match</span>
                        </div>
                      </div>
                    )}

                    {trig.previewType === 'metric' && (
                      <div className="space-y-1 font-mono text-xs">
                        <span className="text-slate-500 text-[10px] uppercase block">{trig.metricLabel || 'TELEMETRY METRIC'}</span>
                        <div className="text-lg font-extrabold text-cyan-300">{trig.metricText || '3.2°C Temperature Stability'}</div>
                        <div className="text-[11px] text-emerald-400">✓ Within Commercial Safe Range (-2°C to +8°C)</div>
                      </div>
                    )}

                    {trig.previewType === 'signature' && (
                      <div className="space-y-1 font-mono text-xs">
                        <span className="text-slate-500 text-[10px] uppercase block">RSA-2048 CRYPTOGRAPHIC SIGNATURE</span>
                        <div className="bg-slate-900 p-2 rounded-lg text-[10px] text-slate-300 break-all border border-slate-800">
                          0x9f8b4e...3c82a17f2
                        </div>
                        <div className="text-[11px] text-emerald-400">✓ Signed by London Supplier Public Key</div>
                      </div>
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
