import React, { useState, useEffect } from 'react';
import { createMission } from '../../lib/api';

export default function MissionForm() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto relative overflow-hidden">
      {/* Ambient Card Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg shadow-inner">
            ⚡
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Create Operational Mission</h2>
            <p className="text-xs sm:text-sm text-slate-400">Speak or type your operational callout. Gemini extracts the mandate automatically.</p>
          </div>
        </div>

        {/* Hands-Free Voice Button */}
        <button
          type="button"
          onClick={handleVoiceInput}
          className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            listening
              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
              : 'bg-slate-800/90 hover:bg-slate-800 text-cyan-400 border-slate-700 hover:border-cyan-500/40'
          }`}
        >
          <span className={listening ? 'animate-bounce' : ''}>🎙️</span>
          <span>{listening ? 'Listening...' : 'Voice Input'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
            rows={4}
            className="w-full bg-[#060a12] border border-slate-800 focus:border-cyan-500/80 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm sm:text-base leading-relaxed"
            disabled={loading}
          />
          {goal.length > 0 && (
            <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">
              {goal.length} chars
            </span>
          )}
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sample Prompt Templates */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Sample Operational Scenarios</span>
            <span className="text-[10px] font-normal text-slate-400">Click to fill</span>
          </p>

          <div className="grid grid-cols-1 gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGoal(p.text)}
                className="group text-left bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition">{p.title}</div>
                  <p className="text-xs text-slate-400 line-clamp-1">"{p.text}"</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-900 group-hover:bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded border border-slate-800 shrink-0">
                  {p.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !goal.trim()}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 text-slate-950 font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Extracting Mandate via Gemini...</span>
            </>
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
