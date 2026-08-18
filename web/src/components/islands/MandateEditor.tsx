import React, { useState } from 'react';
import { type Mission, updateMandate, startMission } from '../../lib/api';
import { autonomyCopy, formatMoney, humanizeToken } from '../../lib/copy';
import { LoaderGrid } from '../primitives/LoaderGrid';
import StatusBadge from '../primitives/StatusBadge';

interface Props {
  initialMission: Mission;
  onStarted?: (mission: Mission) => void;
}

export default function MandateEditor({ initialMission, onStarted }: Props) {
  const [mission] = useState<Mission>(initialMission);
  const [maxBudget, setMaxBudget] = useState(initialMission.mandate.budget.maxAmount);
  const [autonomyMode, setAutonomyMode] = useState(initialMission.mandate.autonomyMode);
  const [showHowMuch, setShowHowMuch] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
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

      const updated = await updateMandate(mission.id, updatedMandate, true);
      await startMission(mission.id);
      onStarted?.({ ...updated, mandate: updatedMandate, status: 'SOURCING' });
    } catch (err: any) {
      setError(err.message || 'Could not start the search.');
      setLoading(false);
    }
  };

  const mode = autonomyCopy(autonomyMode);

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-6">
      <div className="space-y-2">
        <StatusBadge status={mission.status} />
        <h2 className="font-display text-3xl text-ink tracking-tight">Check the details</h2>
        <p className="text-sm text-ink-muted max-w-xl">
          We took this from your note. Change anything that looks wrong before we start looking.
        </p>
      </div>

      <p className="text-ink leading-relaxed bg-paper rounded-xl p-4 border border-ink/10">
        {mission.goal}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Spend no more than
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="field-input pl-8 font-medium text-lg"
            />
          </div>
          <p className="text-xs text-ink-muted">We will not book anyone over {formatMoney(maxBudget)}.</p>
        </div>

        <div className="bg-paper rounded-xl p-4 border border-ink/10 space-y-1">
          <p className="text-xs uppercase tracking-wider text-ink-muted">Area</p>
          <p className="text-ink font-medium">
            District {mission.mandate.serviceArea.postalDistrict}
          </p>
          <p className="text-xs text-ink-muted">
            Within {mission.mandate.serviceArea.radiusKm} km · {humanizeToken(mission.mandate.serviceCategory)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowHowMuch((open) => !open)}
          className="text-sm text-ink hover:text-mandate transition-colors"
        >
          {showHowMuch ? 'Hide involvement' : 'Change how much I want to be involved'}
        </button>
        <p className="text-xs text-ink-muted">{mode.help}</p>
        {showHowMuch && (
          <div className="space-y-2 animate-pop-in">
            {(['DELEGATE', 'COLLABORATE', 'OBSERVE'] as const).map((value) => {
              const copy = autonomyCopy(value);
              const selected = autonomyMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAutonomyMode(value)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    selected
                      ? 'border-mandate bg-mandate-light'
                      : 'border-ink/10 bg-paper hover:border-ink/20'
                  }`}
                >
                  <div className="text-sm font-medium text-ink">{copy.label}</div>
                  <p className="text-xs text-ink-muted mt-0.5">{copy.help}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowChecklist((open) => !open)}
          className="text-sm text-ink-muted hover:text-ink transition-colors"
        >
          {showChecklist ? 'Hide what we’ll ask for' : 'What we’ll ask the engineer for'}
        </button>
        {showChecklist && (
          <div className="mt-2 flex flex-wrap gap-2 animate-pop-in">
            {mission.mandate.requiredEvidence.map((ev) => (
              <span key={ev} className="text-xs bg-paper border border-ink/10 text-ink px-3 py-1 rounded-full">
                {humanizeToken(ev)}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-escalate-light border border-escalate/25 text-escalate rounded-xl text-sm">
          {error}
        </div>
      )}

      {mission.status === 'DRAFT' && (
        <button
          type="button"
          onClick={handleConfirmAndStart}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <LoaderGrid />
              <span>Starting the search…</span>
            </>
          ) : (
            <span>Looks right — start looking</span>
          )}
        </button>
      )}
    </div>
  );
}
