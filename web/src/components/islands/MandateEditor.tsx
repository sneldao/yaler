import React, { useState } from 'react';
import { type Mission, updateMandate, startMission } from '../../lib/api';
import { LoaderGrid } from '../primitives/LoaderGrid';

interface Props {
  initialMission: Mission;
}

export default function MandateEditor({ initialMission }: Props) {
  const [mission] = useState<Mission>(initialMission);
  const [maxBudget, setMaxBudget] = useState(initialMission.mandate.budget.maxAmount);
  const [autonomyMode, setAutonomyMode] = useState(initialMission.mandate.autonomyMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmAndStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const updatedMandate = {
        ...mission.mandate,
        budget: { ...mission.mandate.budget, maxAmount: Number(maxBudget) },
        autonomyMode,
      };

      await updateMandate(mission.id, updatedMandate, true);
      await startMission(mission.id);

      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm mandate');
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {mission.status}
            </span>
            <span className="text-xs font-mono text-slate-500">ID: {mission.id}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">Mandate Verification & Policy Setup</h2>
          <p className="text-xs text-slate-400 mt-0.5">Review Gemini's extracted operational mandate before enabling autonomous execution.</p>
        </div>
        <div className="text-left sm:text-right font-mono text-xs text-slate-400 space-y-0.5">
          <div>Created: <span className="text-slate-200">{new Date(mission.createdAt).toLocaleTimeString()}</span></div>
          <div>Buyer ID: <span className="text-cyan-400">{mission.buyerId}</span></div>
        </div>
      </div>

      {/* Operational Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/[0.08] space-y-3">
          <label className="block text-xs font-mono font-bold uppercase text-slate-400">
            Maximum Budget Ceiling (£ GBP)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">£</span>
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="w-full bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 rounded-xl py-2.5 pl-8 pr-4 text-white font-mono font-bold text-lg focus:outline-none transition"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Go Policy Engine will auto-block any offer exceeding £{maxBudget}.</p>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/[0.08] space-y-3">
          <label className="block text-xs font-mono font-bold uppercase text-slate-400">
            Autonomy Delegation Mode
          </label>
          <select
            value={autonomyMode}
            onChange={(e) => setAutonomyMode(e.target.value as any)}
            className="w-full bg-slate-900/90 border border-white/[0.12] focus:border-cyan-400 rounded-xl p-2.5 text-white font-semibold text-sm focus:outline-none transition cursor-pointer"
          >
            <option value="DELEGATE">DELEGATE — Autonomous in-policy commitment</option>
            <option value="COLLABORATE">COLLABORATE — Requires buyer sign-off</option>
            <option value="OBSERVE">OBSERVE — Read-only monitoring</option>
          </select>
          <p className="text-[11px] text-slate-400 font-mono">
            {autonomyMode === 'DELEGATE' && 'Agent auto-commits to top ranked offer within budget ceiling.'}
            {autonomyMode === 'COLLABORATE' && 'Agent ranks offers and escalates top pick for manual buyer approval.'}
            {autonomyMode === 'OBSERVE' && 'Agent sources offers without taking binding contractual actions.'}
          </p>
        </div>
      </div>

      {/* Extracted Mandate Scope */}
      <div className="bg-slate-950/60 p-5 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Extracted Scope & Evidence Checklist</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">CATEGORY</span>
            <span className="font-bold text-cyan-300 capitalize">{mission.mandate.serviceCategory}</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">SERVICE AREA</span>
            <span className="font-bold text-slate-200">District {mission.mandate.serviceArea.postalDistrict} ({mission.mandate.serviceArea.radiusKm} km)</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <span className="text-slate-500 block text-[10px]">ALLOWED ACTIONS</span>
            <span className="font-bold text-emerald-400">{mission.mandate.allowedActions.join(', ')}</span>
          </div>
        </div>

        <div className="pt-1">
          <span className="text-slate-400 text-xs block mb-2 font-mono">REQUIRED MILESTONE EVIDENCE</span>
          <div className="flex flex-wrap gap-2">
            {mission.mandate.requiredEvidence.map((ev, i) => (
              <span key={i} className="text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">✓</span> {ev}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl text-xs sm:text-sm font-mono">
          ⚠️ {error}
        </div>
      )}

      {mission.status === 'DRAFT' && (
        <button
          type="button"
          onClick={handleConfirmAndStart}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-70"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <LoaderGrid />
              <span>Launching Autonomous Mission Loop...</span>
            </div>
          ) : (
            <span>Confirm Mandate & Launch Autonomous Loop 🚀</span>
          )}
        </button>
      )}
    </div>
  );
}
