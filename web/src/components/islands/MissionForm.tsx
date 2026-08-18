import React, { useState } from 'react';
import { createMission } from '../../lib/api';

export default function MissionForm() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    "My commercial fridge is down, need repair before lunch, budget £500, we're in N1.",
    "Extraction hood cleaning required before food safety inspection tomorrow, budget £350 in E1.",
    "Walk-in freezer temperature warning 6°C, urgent technician callout needed in SW1, budget £600.",
  ];

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
          ⚡
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Create Operational Mission</h2>
          <p className="text-sm text-slate-400">Describe the urgent job in plain English. Gemini extracts the mandate.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. My commercial fridge is down, need repair before lunch, budget £500, we're in N1."
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition text-base"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sample Prompt Templates:</p>
          <div className="flex flex-col gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGoal(preset)}
                className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 text-slate-300 hover:text-white transition"
              >
                "{preset}"
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !goal.trim()}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold py-3.5 px-6 rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
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
            <span>Generate Mandate & Review &rarr;</span>
          )}
        </button>
      </form>
    </div>
  );
}
