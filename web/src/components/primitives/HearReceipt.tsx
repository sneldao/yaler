import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';
import SponsorCallout from './SponsorCallout';
import { buildNarration, type NarrationReceipt } from '../../lib/narration';

interface Props {
  /** Raw text to narrate (simple mode) */
  text?: string;
  /** Receipt fields for produced narration (rich mode) */
  receipt?: NarrationReceipt;
  label?: string;
}

/**
 * HearReceipt — plays the receipt aloud via ElevenLabs TTS.
 *
 * Two modes:
 * - Rich mode (receipt fields provided): builds a radio-report-style
 *   narration with intro, the story, evidence, the buyer's verdict,
 *   and an outro. Goes beyond bolting on TTS — the narration is
 *   written for the ear, not the screen.
 * - Simple mode (text provided): reads the text as-is (fallback).
 */
export default function HearReceipt({ text, receipt, label = 'Hear the paper' }: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const narration = receipt ? buildNarration(receipt) : (text || '');

  const play = async () => {
    if (playing || !narration.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narration }),
      });
      if (!res.ok) throw new Error('TTS unavailable');
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      setPlaying(true);
      setLoading(false);
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch (err) {
      console.warn('TTS fallback to Web Speech:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(narration);
        utterance.lang = 'en-GB';
        utterance.onend = () => setPlaying(false);
        setPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={play}
        disabled={loading || playing}
        className={`btn-secondary text-xs py-2 flex items-center gap-2 ${playing ? 'bg-pink-50 text-pink-600 border-pink-200' : ''}`}
      >
        {loading ? 'Preparing…' : playing ? (
          <>
            <span className="flex items-center gap-0.5">
              <span className="w-1 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
            Playing…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {label}
          </>
        )}
      </button>
      {loading && (
        <SponsorCallout
          sponsor="elevenlabs"
          status="working"
          label="Generating narration with ElevenLabs"
          detail="ElevenLabs reads the receipt as a produced narration — the story, the evidence, the buyer's verdict. Written for the ear, not the screen."
        />
      )}
    </div>
  );
}
