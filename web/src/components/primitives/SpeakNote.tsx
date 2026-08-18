import React, { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = '374778cc-e3a0-4557-a9f2-3908ca8dbdbd';

const SYSTEM_PROMPT =
  'You are Yaler Voice Assistant for London kitchen managers. Ask what equipment emergency they need help with (commercial fridge, extraction hood, freezer), their district (e.g. N1, E1), and budget. Keep it short.';

interface Props {
  onTranscript: (text: string) => void;
  label?: string;
  className?: string;
}

export default function SpeakNote({ onTranscript, label = 'Speak it', className = '' }: Props) {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [vapiActive, setVapiActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const instance = new Vapi(VAPI_PUBLIC_KEY);
      instance.on('call-start', () => setVapiActive(true));
      instance.on('call-end', () => setVapiActive(false));
      instance.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final' && message.transcript) {
          onTranscriptRef.current(message.transcript);
        }
      });
      setVapi(instance);
    } catch (e) {
      console.warn('Vapi init error:', e);
    }
  }, []);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice is not available in this browser. Type it instead.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.onstart = () => {
        setListening(true);
        setError(null);
      };
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) onTranscript(transcript);
      };
      recognition.onerror = (event: any) => {
        setError(`Voice input error: ${event.error}`);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognition.start();
    } catch {
      setError('Could not start the microphone.');
      setListening(false);
    }
  };

  const toggle = async () => {
    if (!vapi) {
      handleVoiceInput();
      return;
    }
    if (vapiActive) {
      vapi.stop();
      setVapiActive(false);
      return;
    }
    setError(null);
    try {
      await vapi.start({
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }],
        },
        voice: { provider: 'playht', voiceId: 'jennifer' },
      });
    } catch (err) {
      console.warn('Vapi start error, using Web Speech fallback:', err);
      handleVoiceInput();
    }
  };

  const live = vapiActive || listening;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
          live
            ? 'bg-mandate-light text-mandate border-mandate/30'
            : 'bg-paper text-ink border-ink/10 hover:border-ink/25'
        }`}
      >
        {live ? 'Listening… tap to stop' : label}
      </button>
      {error && <p className="text-xs text-escalate mt-1">{error}</p>}
    </div>
  );
}
