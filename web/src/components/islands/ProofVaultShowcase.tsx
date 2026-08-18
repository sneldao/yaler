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
      const summaryText = "Receipt. Photo confirms the walk-in freezer compressor was replaced in N1. Temperature is stable at minus 18. Settlement was £480, inside the £500 ceiling.";
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
      console.warn('TTS fallback to Web Speech:', err);
      if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("Receipt. Walk-in freezer repair checked in N1 at minus 18 degrees. Settlement within budget.");
        utterance.onend = () => setPlaying(false);
        setPlaying(true);
        synth.speak(utterance);
      }
      setLoading(false);
    }
  };

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-mandate mb-1">A sample receipt</p>
          <h3 className="font-display text-2xl text-ink">Proof you can share</h3>
          <p className="text-sm text-ink-muted mt-1">Names stay hidden unless you choose to show them.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playVoiceBriefing}
            disabled={loading}
            className="btn-secondary text-xs py-2"
          >
            {loading ? 'Preparing…' : playing ? 'Playing…' : 'Hear it'}
          </button>
          <button
            type="button"
            onClick={() => setRedacted(!redacted)}
            className="btn-secondary text-xs py-2"
          >
            {redacted ? 'Show names' : 'Hide names'}
          </button>
        </div>
      </div>

      <InlineEvidenceText
        prefixText="We checked"
        triggers={[
          {
            id: 'photo_proof',
            label: 'the photo',
            previewType: 'image',
            contentUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          },
          {
            id: 'temp_metric',
            label: '−18°C reading',
            previewType: 'metric',
            metricText: '−18.2°C, holding',
            metricLabel: 'Walk-in freezer',
          },
        ]}
        suffixText="and released £480 to London Rapid ColdCare."
      />

      <FullscreenClipModal
        title="Walk-in freezer compressor replaced"
        subtitle="Done in N1"
        amount="£480"
        hash=""
        receiptDetails={[
          'Compressor replaced',
          'Two-hour emergency callout in N1',
          'F-Gas certificate on file',
        ]}
      />

      <div className="bg-paper rounded-xl p-4 border border-ink/10 text-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-ink-muted">Kitchen</p>
            <p className="font-medium text-ink">
              {redacted ? 'A café in N1' : 'Angel Artisan Cafe & Bakery'}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Address</p>
            <p className="font-medium text-ink">
              {redacted ? 'Upper St, N1' : '142 Upper St, Islington, London N1 1QP'}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Engineer</p>
            <p className="font-medium text-ink">
              {redacted ? 'Checked engineer' : 'Dave M. (Refcom #REF-88192)'}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Paid</p>
            <p className="font-medium text-ink">£480 of £500</p>
          </div>
        </div>
      </div>
    </div>
  );
}
