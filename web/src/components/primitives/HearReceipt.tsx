import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';

interface Props {
  text: string;
  label?: string;
}

export default function HearReceipt({ text, label = 'Hear the paper' }: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const play = async () => {
    if (playing || !text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB';
        utterance.onend = () => setPlaying(false);
        setPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={play} disabled={loading || playing} className="btn-secondary text-xs py-2">
      {loading ? 'Preparing…' : playing ? 'Playing…' : label}
    </button>
  );
}
