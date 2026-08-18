import React, { useState } from 'react';

export default function ProofVaultShowcase() {
  const [redacted, setRedacted] = useState(true);

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto space-y-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold mb-2">
            <span>🛡️ AUDITABLE PROOF RECEIPT</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Zero-Knowledge Verification Vault</h3>
          <p className="text-xs text-slate-400">Gemini extracts proof metadata while redacting PII before store persistence.</p>
        </div>

        {/* Redaction Toggle Switch */}
        <button
          type="button"
          onClick={() => setRedacted(!redacted)}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 border cursor-pointer ${
            redacted
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
          }`}
        >
          <span>{redacted ? '🔒 Privacy Redacted' : '🔓 Raw Unredacted'}</span>
          <span className="text-[10px] underline">Toggle</span>
        </button>
      </div>

      {/* Proof Card Display */}
      <div className="bg-[#050912] border border-slate-800/90 rounded-xl p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 text-slate-400 text-[11px]">
          <span>RECEIPT ID: <strong className="text-cyan-400">rcpt_m_7718902_proof</strong></span>
          <span>COMPLETED: <strong className="text-emerald-400">14 AUG 2026 14:22 UTC</strong></span>
        </div>

        {/* Verification Summary */}
        <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
          <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Gemini Verification Result</div>
          <p className="text-slate-200 leading-relaxed text-xs">
            "Photo evidence confirms commercial walk-in freezer compressor replacement completed in district N1. Temperature gauge reading stable at -18°C. F-Gas compliance certificate verified."
          </p>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Buyer Business</span>
            <div className="font-bold text-white">
              {redacted ? '[REDACTED CAFE OPERATOR]' : 'Angel Artisan Cafe & Bakery'}
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Service Address</span>
            <div className="font-bold text-white">
              {redacted ? 'Upper St, District N1 [REDACTED]' : '142 Upper St, Islington, London N1 1QP'}
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Technician Signature</span>
            <div className="font-bold text-emerald-400">
              {redacted ? 'Refcom #REF-88192 [VALIDATED]' : 'Dave M. (Refcom #REF-88192)'}
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Final Settlement Amount</span>
            <div className="font-bold text-cyan-400">£480.00 GBP (Within £500 Mandate)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
