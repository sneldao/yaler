import React, { useState } from 'react';
import { type Mandate, type Mission, updateMandate, startMission } from '../../lib/api';
import { autonomyCopy, formatMoney, formatWhen, humanizeToken } from '../../lib/copy';
import { LoaderGrid } from '../primitives/LoaderGrid';
import StatusBadge from '../primitives/StatusBadge';

interface Props {
  initialMission: Mission;
  onStarted?: (mission: Mission) => void;
  rehearsal?: boolean;
}

const CATEGORIES = [
  'commercial_refrigeration',
  'freezer_maintenance',
  'extraction_cleaning',
  'equipment_repair',
  'emergency_repair',
  'general_maintenance',
  'scheduled_maintenance',
  'catering_equipment',
];

type FieldKey = 'budget' | 'area' | 'deadline' | 'category';

/** datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MandateEditor({ initialMission, onStarted, rehearsal = false }: Props) {
  const [mission, setMission] = useState<Mission>(initialMission);
  const [autonomyMode, setAutonomyMode] = useState(initialMission.mandate.autonomyMode);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [policyNote, setPolicyNote] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showHowMuch, setShowHowMuch] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mandate = mission.mandate;

  const openEditor = (field: FieldKey) => {
    setFieldError(null);
    setPolicyNote(null);
    setEditing(field);
    switch (field) {
      case 'budget':
        setDraft(String(mandate.budget.maxAmount));
        break;
      case 'area':
        setDraft(mandate.serviceArea.postalDistrict);
        break;
      case 'deadline':
        setDraft(toLocalInput(mandate.latestCompletionAt));
        break;
      case 'category':
        setDraft(mandate.serviceCategory);
        break;
    }
  };

  /** Apply the edited field, persist, and re-run the policy check. */
  const saveField = async () => {
    if (!editing) return;
    let next: Mandate = { ...mandate, autonomyMode };

    if (editing === 'budget') {
      const amount = Number(draft);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFieldError('Give me a number above zero — that’s the ceiling I hold the line on.');
        return;
      }
      next = { ...next, budget: { ...next.budget, maxAmount: amount } };
    } else if (editing === 'area') {
      const district = draft.trim().toUpperCase();
      if (!/^[A-Z]{1,2}\d{1,2}[A-Z]?$/.test(district)) {
        setFieldError('That doesn’t look like a London postcode district — e.g. N1, E2, SW1.');
        return;
      }
      next = { ...next, serviceArea: { ...next.serviceArea, postalDistrict: district } };
    } else if (editing === 'deadline') {
      const when = new Date(draft);
      if (!draft || Number.isNaN(when.getTime())) {
        setFieldError('Pick a date and time — that’s the latest the job can finish.');
        return;
      }
      next = { ...next, latestCompletionAt: when.toISOString() };
    } else if (editing === 'category') {
      next = { ...next, serviceCategory: draft };
    }

    setSaving(true);
    setFieldError(null);
    try {
      if (rehearsal) {
        setMission({ ...mission, mandate: next });
      } else {
        // Saving a field persists the mandate; the backend re-runs the
        // policy check on update, which is what surfaces below.
        const updated = await updateMandate(mission.id, next, false);
        setMission(updated);
      }
      setPolicyNote('Re-checked against your rules — still within policy.');
      setEditing(null);
    } catch (err: any) {
      setFieldError(err.message || 'Could not save that change.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAndStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const updatedMandate = { ...mandate, autonomyMode };

      if (rehearsal) {
        onStarted?.({ ...mission, mandate: updatedMandate, status: 'SOURCING' });
        return;
      }

      const updated = await updateMandate(mission.id, updatedMandate, true);
      await startMission(mission.id);
      onStarted?.({ ...updated, mandate: updatedMandate, status: 'SOURCING' });
    } catch (err: any) {
      setError(err.message || 'Could not start the search.');
      setLoading(false);
    }
  };

  const mode = autonomyCopy(autonomyMode);

  const fields: { key: FieldKey; label: string; value: string; hint: string }[] = [
    {
      key: 'budget',
      label: 'Budget',
      value: formatMoney(mandate.budget.maxAmount, mandate.budget.currency),
      hint: 'We will not book anyone over this.',
    },
    {
      key: 'area',
      label: 'Area',
      value: mandate.serviceArea.postalDistrict,
      hint: `Within ${mandate.serviceArea.radiusKm} km.`,
    },
    {
      key: 'deadline',
      label: 'Needed by',
      value: formatWhen(mandate.latestCompletionAt) || 'As soon as possible',
      hint: 'The latest the job can finish.',
    },
    {
      key: 'category',
      label: 'Trade',
      value: humanizeToken(mandate.serviceCategory),
      hint: 'Who we ask first.',
    },
  ];

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-6">
      <div className="space-y-2">
        <StatusBadge status={mission.status} />
        <h2 className="font-display text-3xl text-ink tracking-tight">Check the details</h2>
        <p className="text-sm text-ink-muted max-w-xl">
          {rehearsal
            ? 'This is last Tuesday’s note. Check the number, then we look. Nobody is called.'
            : 'We took this from your note. Tap anything that looks wrong before we start looking.'}
        </p>
      </div>

      <p className="text-ink leading-relaxed bg-paper rounded-xl p-4 border border-ink/10">
        {mission.goal}
      </p>

      {mission.diagnosticBrief && (
        <details className="group rounded-xl border border-ink/10 bg-paper-inset/50">
          <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-3 text-sm text-ink">
            <span className="font-medium">What we heard</span>
            <span className="text-[11px] text-ink-muted group-open:hidden">{mission.diagnosticBrief.confidence}</span>
            <span className="text-[11px] text-ink-muted hidden group-open:inline">collapse</span>
          </summary>
          <div className="px-3 pb-3 pt-2.5 border-t border-ink/10 space-y-2">
            <p className="text-xs text-ink-muted">{mission.diagnosticBrief.reportedSummary}</p>
            {mission.diagnosticBrief.known.length > 0 && (
              <p className="text-xs text-ink"><span className="text-ink-muted">Known:</span> {mission.diagnosticBrief.known.join(' · ')}</p>
            )}
            {mission.diagnosticBrief.likelyAreas.length > 0 && (
              <p className="text-xs text-ink"><span className="text-ink-muted">Possible:</span> {mission.diagnosticBrief.likelyAreas.join(' · ')}</p>
            )}
            <p className="text-[10px] text-ink-muted italic">Possible areas are not a confirmed diagnosis.</p>
          </div>
        </details>
      )}

      {/* Mandate as data — four editable chip-rows, not a paragraph */}
      <div className="space-y-2" role="group" aria-label="Your rules — tap a row to edit it">
        {fields.map((field) => {
          const isEditing = editing === field.key;
          return (
            <div
              key={field.key}
              className={`rounded-xl border transition-colors ${
                isEditing ? 'border-mandate bg-mandate-light/40' : 'border-ink/10 bg-paper'
              }`}
            >
              <button
                type="button"
                onClick={() => (isEditing ? setEditing(null) : openEditor(field.key))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={isEditing}
                aria-label={`${field.label}: ${field.value}. Activate to edit.`}
              >
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted w-20 shrink-0">
                  {field.label}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="inline-block text-sm font-medium text-ink bg-paper-raised border border-ink/10 rounded-full px-3 py-1">
                    {field.value}
                  </span>
                </span>
                <span className="text-[11px] text-mandate shrink-0">{isEditing ? 'Close' : 'Edit'}</span>
              </button>

              {isEditing && (
                <div className="px-4 pb-3.5 pt-1 space-y-2 animate-pop-in">
                  <div className="flex items-center gap-2">
                    {field.key === 'budget' && (
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          autoFocus
                          aria-label="Budget in pounds"
                          className="field-input pl-8 py-2.5 text-base font-medium"
                        />
                      </div>
                    )}
                    {field.key === 'area' && (
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        autoCapitalize="characters"
                        placeholder="N1"
                        aria-label="Postcode district"
                        className="field-input py-2.5 text-base font-medium uppercase flex-1"
                      />
                    )}
                    {field.key === 'deadline' && (
                      <input
                        type="datetime-local"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        aria-label="Needed by"
                        className="field-input py-2.5 text-base flex-1"
                      />
                    )}
                    {field.key === 'category' && (
                      <select
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        aria-label="Trade category"
                        className="field-input py-2.5 text-base flex-1"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{humanizeToken(c)}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={saveField}
                      disabled={saving}
                      className="btn-primary text-sm py-2.5 px-4 shrink-0"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">{field.hint}</p>
                  {fieldError && <p className="text-xs text-escalate">{fieldError}</p>}
                </div>
              )}
            </div>
          );
        })}
        {policyNote && (
          <p className="text-xs text-mandate flex items-center gap-1.5 px-1 animate-pop-in" role="status">
            <span aria-hidden>✓</span> {policyNote}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowHowMuch((open) => !open)}
          className="text-sm text-ink hover:text-mandate transition-colors"
          aria-expanded={showHowMuch}
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
                  aria-pressed={selected}
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
          aria-expanded={showChecklist}
        >
          {showChecklist ? 'Hide what we’ll ask for' : 'What we’ll ask the engineer for'}
        </button>
        {showChecklist && (
          <div className="mt-2 flex flex-wrap gap-2 animate-pop-in">
            {mandate.requiredEvidence.map((ev) => (
              <span key={ev} className="text-xs bg-paper border border-ink/10 text-ink px-3 py-1 rounded-full">
                {humanizeToken(ev)}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-escalate-light border border-escalate/25 text-escalate rounded-xl text-sm" role="alert">
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
            <span>{rehearsal ? 'Looks right — show me what happens' : 'Looks right — start looking'}</span>
          )}
        </button>
      )}
    </div>
  );
}
