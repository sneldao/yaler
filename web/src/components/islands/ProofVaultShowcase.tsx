import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';
import InlineEvidenceText from '../primitives/InlineEvidenceText';
import FullscreenClipModal from '../primitives/FullscreenClipModal';

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
    <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto space-y-6 relative overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold mb-2">
            <span>🛡️ AUDITABLE PROOF RECEIPT</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Zero-Knowledge Verification Vault</h3>
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
                : 'bg-white/[0.05] text-slate-200 border-white/10 hover:bg-white/[0.1]'
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

      {/* Codrops Inline Evidence Typography Primitive */}
      <InlineEvidenceText
        prefixText="Yaler AI agent verified"
        triggers={[
          {
            id: 'photo_proof',
            label: 'Photo Evidence',
            previewType: 'image',
            contentUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          },
          {
            id: 'temp_metric',
            label: '-18°C Telemetry',
            previewType: 'metric',
            metricText: '-18.2°C Stable Freeze',
            metricLabel: 'COMMERCIAL FREEZER TELEMETRY',
          },
          {
            id: 'rsa_sig',
            label: 'RSA-2048 Token',
            previewType: 'signature',
          },
        ]}
        suffixText="and auto-released £480.00 escrow settlement to London Rapid ColdCare."
      />

      {/* Codrops Fullscreen Clip Expansion Component */}
      <FullscreenClipModal
        title="Walk-In Freezer Compressor Replacement"
        subtitle="Completed in District N1 • Verified by Gemini Vision"
        amount="£480.00 GBP"
        hash="0x8f72a4920e1189c42a00bf82e"
        receiptDetails={[
          'Commercial Compressor Replacement (#REF-88192)',
          '2-Hour Emergency Response in District N1',
          'F-Gas Safety Compliance Certificate #FG-99120',
        ]}
      />

      {/* Metadata Details Grid */}
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/[0.08] font-mono text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 text-slate-400 text-[11px]">
          <span>RECEIPT ID: <strong className="text-cyan-300">rcpt_m_7718902_proof</strong></span>
          <span>COMPLETED: <strong className="text-emerald-400">14 AUG 2026 14:22 UTC</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-white/[0.06] space-y-1">
            <span className="text-slate-500">Buyer Business</span>
            <div className="font-bold text-white">
              {redacted ? '[REDACTED CAFE OPERATOR]' : 'Angel Artisan Cafe & Bakery'}
            </div>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-white/[0.06] space-y-1">
            <span className="text-slate-500">Service Address</span>
            <div className="font-bold text-white">
              {redacted ? 'Upper St, District N1 [REDACTED]' : '142 Upper St, Islington, London N1 1QP'}
            </div>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-white/[0.06] space-y-1">
            <span className="text-slate-500">Technician Signature</span>
            <div className="font-bold text-emerald-400">
              {redacted ? 'Refcom #REF-88192 [VALIDATED]' : 'Dave M. (Refcom #REF-88192)'}
            </div>
          </div>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-white/[0.06] space-y-1">
            <span className="text-slate-500">Final Settlement Amount</span>
            <div className="font-bold text-cyan-300">£480.00 GBP (Within £500 Mandate)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
