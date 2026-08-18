import React, { useState } from 'react';
import { createMission } from '../../lib/api';
import { LoaderGrid, useElapsed } from '../primitives/LoaderGrid';

export default function DemoTourController() {
  const [running, setRunning] = useState(false);
  const [stepText, setStepText] = useState<string | null>(null);
  const elapsed = useElapsed();

  const handleStartTour = async () => {
    setRunning(true);
    setStepText('⚡ 1/3: Initializing Emergency Scenario (Commercial Fridge Down in N1)...');

    setTimeout(async () => {
      setStepText('🤖 2/3: Invoking Gemini 2.5 Mandate Engine & Go Policy Auditor...');
      try {
        const goal = "Commercial fridge down, repair before lunch, budget £500, we're in N1.";
        const mission = await createMission(goal);
        setStepText('📡 3/3: Mission Created! Redirecting to Live Agent Network Timeline...');
        setTimeout(() => {
          window.location.href = `/missions/${mission.id}`;
        }, 800);
      } catch (err: any) {
        setStepText(`⚠️ Tour error: ${err.message || 'Failed to trigger tour mission'}`);
        setTimeout(() => setRunning(false), 3000);
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2">
      <button
        type="button"
        onClick={handleStartTour}
        disabled={running}
        className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-80"
      >
        {running ? (
          <LoaderGrid />
        ) : (
          <span className="text-lg group-hover:scale-125 transition-transform">🎬</span>
        )}
        <span>{running ? 'Running Guided Agentic Tour...' : 'Run 60s Live Demo Tour'}</span>
        <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 font-mono text-xs font-extrabold border border-slate-950/20">
          ONE-CLICK
        </span>
      </button>

      {stepText && (
        <div className="p-3 bg-slate-950/90 border border-cyan-500/40 rounded-2xl text-cyan-300 font-mono text-xs animate-pop-in max-w-md text-center shadow-xl flex items-center justify-center gap-3">
          <LoaderGrid />
          <span className="animate-shimmer-text">{stepText}</span>
          <span className="text-slate-500 font-mono text-[11px] tabular-nums">{elapsed}</span>
        </div>
      )}
    </div>
  );
}
