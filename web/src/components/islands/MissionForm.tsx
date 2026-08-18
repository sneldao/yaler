import React, { useState, useEffect } from 'react';
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
      title: 'Commercial Refrigeration Emergency',
      text: "My commercial fridge is down, need repair before lunch, budget £500, we're in N1.",
      badge: 'N1 • £500',
    },
    {
      title: 'Grease Extract Duct Cleaning',
      text: 'Extraction hood cleaning required before food safety inspection tomorrow, budget £350 in E1.',
      badge: 'E1 • £350',
    },
    {
      title: 'Walk-In Freezer Temperature Warning',
      text: 'Walk-in freezer temperature warning 6°C, urgent technician callout needed in SW1, budget £600.',
      badge: 'SW1 • £600',
    },
  ];

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please use Chrome/Safari/Edge.');
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
      setError('Failed to activate microphone input');
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
      window.location.href = `/missions/${mission.id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to create mission');
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto relative overflow-hidden">
      {/* Ambient Accent Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-lg shadow-inner">
            ⚡
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Create Operational Mission</h2>
            <p className="text-xs sm:text-sm text-slate-400">Speak or type your operational callout. Gemini extracts the mandate automatically.</p>
          </div>
        </div>

        {/* Hands-Free Vapi Voice Button */}
        <button
          type="button"
          onClick={toggleVapiVoice}
          className={`px-3.5 py-2 rounded-2xl border text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            vapiActive || listening
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse shadow-lg shadow-emerald-500/20'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border-white/[0.08] hover:border-cyan-500/40'
          }`}
        >
          <span className={vapiActive || listening ? 'animate-bounce' : ''}>🎙️</span>
          <span>{vapiActive ? 'Vapi Live Call Active' : listening ? 'Listening...' : 'Vapi AI Voice'}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
            VAPI
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
            rows={4}
            className="w-full bg-slate-950/70 border border-white/[0.1] focus:border-cyan-400 rounded-2xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none transition-all text-sm sm:text-base leading-relaxed font-sans"
            disabled={loading}
          />
          {goal.length > 0 && (
            <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">
              {goal.length} chars
            </span>
          )}
        </div>

        {loading && (
          <div className="p-3.5 bg-slate-950/90 border border-cyan-500/30 rounded-2xl font-mono text-xs space-y-1.5 text-cyan-300 animate-pop-in">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
              <span>Agentic Mission Pipeline</span>
              <span className="text-emerald-400 animate-pulse">Running</span>
            </div>
            <div className="flex items-center gap-2">
              <LoaderGrid />
              <p className="animate-shimmer-text">⚡ GEMINI 2.5: Parsing intent & extracting budget ceiling...</p>
            </div>
            <p className="text-slate-400 pl-6">🛡️ GO POLICY ENGINE: Validating mandate boundaries (≤ £1,000)...</p>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs sm:text-sm flex items-center gap-2 font-mono">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sample Prompt Templates */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Sample Operational Scenarios</span>
            <span className="text-[10px] font-normal text-slate-500">Click to auto-fill</span>
          </p>

          <div className="grid grid-cols-1 gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => typePreset(p.text)}
                className="group text-left bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-cyan-500/40 rounded-2xl p-3 transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">{p.title}</div>
                  <p className="text-xs text-slate-400 line-clamp-1">"{p.text}"</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 group-hover:bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-full border border-slate-800 shrink-0">
                  {p.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !goal.trim()}
          className="w-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-40 text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <LoaderGrid />
              <span>Extracting Mandate via Gemini...</span>
            </div>
          ) : (
            <>
              <span>Extract Mandate & Proceed to Review</span>
              <span className="text-lg">→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
