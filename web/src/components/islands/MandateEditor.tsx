import React, { useState } from 'react';
import { type Mission, updateMandate, startMission } from '../../lib/api';

interface Props {
  initialMission: Mission;
}

export default function MandateEditor({ initialMission }: Props) {
  const [mission, setMission] = useState<Mission>(initialMission);
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

      // 1. Confirm mandate
      await updateMandate(mission.id, updatedMandate, true);

      // 2. Start execution loop
      await startMission(mission.id);

      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm mandate');
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            {mission.status}
          </span>
          <h2 className="text-xl font-semibold text-white mt-2">Mandate Verification</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Created</p>
          <p className="text-xs text-slate-300 font-mono">{new Date(mission.createdAt).toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-xs font-medium text-slate-400 mb-1">Max Budget (£ GBP)</label>
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-xs font-medium text-slate-400 mb-1">Autonomy Delegation Mode</label>
          <select
            value={autonomyMode}
            onChange={(e) => setAutonomyMode(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="DELEGATE">DELEGATE (In-policy autonomous commit)</option>
            <option value="COLLABORATE">COLLABORATE (Requires buyer sign-off)</option>
            <option value="OBSERVE">OBSERVE (Read-only)</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-sm">
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Service Category:</span>
          <span className="font-semibold text-cyan-400 capitalize">{mission.mandate.serviceCategory}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Service Area:</span>
          <span>District {mission.mandate.serviceArea.postalDistrict} ({mission.mandate.serviceArea.radiusKm} km radius)</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Required Evidence:</span>
          <span className="text-xs font-mono">{mission.mandate.requiredEvidence.join(', ')}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {mission.status === 'DRAFT' && (
        <button
          onClick={handleConfirmAndStart}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          {loading ? 'Confirming & Launching Mission...' : 'Confirm Mandate & Start Autonomous Loop 🚀'}
        </button>
      )}
    </div>
  );
}
