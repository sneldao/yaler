import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';

export default function ProofVaultShowcase() {
  const [redacted, setRedacted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const playVoiceBriefing = async () => {
    if (playing) return;
    setLoading(true);
    try {
      const summaryText = "Yaler Zero-Knowledge Verification Receipt. Photo evidence confirms commercial walk-in freezer compressor replacement completed in London district N1. Temperature gauge reading stable at -18°C. Settlement amount: £480, within the £500 mandate ceiling.";
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summaryText })
      });

      if (!res.ok) {
        throw new Error('TTS service unavailable');
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      setPlaying(true);
      setLoading(false);

      audio.onended = () => {
        setPlaying(false);
      };

      await audio.play();
    } catch (err) {
      console.warn('ElevenLabs TTS fallback to Web Speech:', err);
      // Fallback to Web Speech API if ElevenLabs backend API key is not bound
      if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("Yaler Zero-Knowledge Verification Receipt. Walk-in freezer repair verified in district N1 at minus 18 degrees Celsius. Settlement within budget.");
        utterance.onend = () => setPlaying(false);
        setPlaying(true);
        synth.speak(utterance);
      }
      setLoading(false);
    }
  };

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

        <div className="flex items-center gap-2">
          {/* ElevenLabs Voice Briefing Button */}
          <button
            type="button"
            onClick={playVoiceBriefing}
            disabled={loading}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              playing
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            <span>{loading ? '⏳ Generating...' : playing ? '🔊 Playing Audio...' : '🔊 ElevenLabs Voice Brief'}</span>
          </button>

          {/* Redaction Toggle Switch */}
          <button
            type="button"
            onClick={() => setRedacted(!redacted)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 border cursor-pointer ${
              redacted
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
            }`}
          >
            <span>{redacted ? '🔒 Redacted' : '🔓 Unredacted'}</span>
          </button>
        </div>
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
