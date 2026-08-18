import React, { useState, useEffect } from 'react';
import { navigate } from 'astro:transitions/client';
import Vapi from '@vapi-ai/web';
import { createMission } from '../../lib/api';
import { LoaderGrid } from '../primitives/LoaderGrid';

const VAPI_PUBLIC_KEY = '374778cc-e3a0-4557-a9f2-3908ca8dbdbd';

export default function MissionForm() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [vapiActive, setVapiActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSamples, setShowSamples] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const instance = new Vapi(VAPI_PUBLIC_KEY);
        instance.on('call-start', () => setVapiActive(true));
        instance.on('call-end', () => setVapiActive(false));
        instance.on('message', (message: any) => {
          if (message.type === 'transcript' && message.transcriptType === 'final') {
            setGoal((prev) => (prev ? `${prev} ${message.transcript}` : message.transcript));
          }
        });
        setVapi(instance);
      } catch (e) {
        console.warn('Vapi init error:', e);
      }
    }
  }, []);

  const toggleVapiVoice = async () => {
    if (!vapi) {
      handleVoiceInput();
      return;
    }
    if (vapiActive) {
      vapi.stop();
      setVapiActive(false);
    } else {
      setError(null);
      try {
        await vapi.start({
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are Yaler Voice Assistant for London kitchen managers. Ask what equipment emergency they need help with (commercial fridge, extraction hood, freezer), their district (e.g. N1, E1), and budget.',
              },
            ],
          },
          voice: {
            provider: 'playht',
            voiceId: 'jennifer',
          },
        });
      } catch (err: any) {
        console.warn('Vapi start error, using Web Speech fallback:', err);
        handleVoiceInput();
      }
    }
  };

  const presets = [
    {
      title: 'Fridge down before lunch',
      text: "My commercial fridge is down, need repair before lunch, budget £500, we're in N1.",
      badge: 'N1 · £500',
    },
    {
      title: 'Hood clean before inspection',
      text: 'Extraction hood cleaning required before food safety inspection tomorrow, budget £350 in E1.',
      badge: 'E1 · £350',
    },
    {
      title: 'Walk-in freezer warning',
      text: 'Walk-in freezer temperature warning 6°C, urgent technician callout needed in SW1, budget £600.',
      badge: 'SW1 · £600',
    },
  ];

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice is not available in this browser. Type it instead, or try Chrome or Safari.');
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
        if (transcript) {
          setGoal(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Voice input error: ${event.error}`);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setError('Could not start the microphone.');
      setListening(false);
    }
  };

  const typePreset = (text: string) => {
    setGoal('');
    let index = 0;
    const interval = setInterval(() => {
      setGoal((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const mission = await createMission(goal);
      navigate(`/missions/${mission.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create the job.');
      setLoading(false);
    }
  };

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl text-ink">What’s broken?</h2>
          <p className="text-sm text-ink-muted mt-1">
            Speak or type it. We’ll pull out the budget, area, and deadline for you to check.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVapiVoice}
          className={`self-start px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            vapiActive || listening
              ? 'bg-mandate-light text-mandate border-mandate/30'
              : 'bg-paper text-ink border-ink/10 hover:border-ink/25'
          }`}
        >
          {vapiActive || listening ? 'Listening… tap to stop' : 'Speak it'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
          rows={4}
          className="field-input text-base leading-relaxed"
          disabled={loading}
        />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-muted animate-pop-in">
            <LoaderGrid />
            <span>Reading your note and checking the budget…</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-escalate-light border border-escalate/25 text-escalate rounded-xl text-sm">
            {error}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowSamples((open) => !open)}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            {showSamples ? 'Hide sample jobs' : 'Use a sample job'}
          </button>
          {showSamples && (
            <div className="grid grid-cols-1 gap-2 mt-2 animate-pop-in">
              {presets.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => typePreset(p.text)}
                  className="text-left bg-paper hover:bg-paper-inset border border-ink/10 rounded-xl p-3 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-ink">{p.title}</div>
                    <p className="text-xs text-ink-muted line-clamp-1">{p.text}</p>
                  </div>
                  <span className="text-[11px] text-mandate shrink-0">{p.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !goal.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <LoaderGrid />
              <span>Reading your note…</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </form>
    </div>
  );
}
