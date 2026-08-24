import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listCallouts, listMissions, listSuppliers, onboardSupplier, resumeMission, submitCalloutOffer, type Callout, type Mission, type Supplier } from '../../lib/api';

/**
 * OpsConsole — the concierge's cockpit (internal tool, linked from docs/SUPPLY-SIDE.md).
 *
 * Lists missions that are actively sourcing (SOURCING / OFFERS_RECEIVED) with
 * their callouts, lets the concierge copy a drafted callout message for
 * WhatsApp/phone outreach, and records a supplier's real quote or decline.
 * Also has a quick manual-onboarding form for verified suppliers.
 *
 * If PUBLIC_OPS_TOKEN is set on the frontend deploy it is sent as the
 * X-Ops-Token header; otherwise the backend stays open in local demo mode.
 */

const ACTIVE_STATUSES = new Set(['SOURCING', 'OFFERS_RECEIVED']);
const ESCALATED_STATUS = 'ESCALATED';

const STATUS_LABEL: Record<string, string> = {
  SOURCING: 'Sourcing — waiting for quotes',
  OFFERS_RECEIVED: 'Quotes in — evaluating',
  ESCALATED: 'Escalated — needs action',
};

const CALLOUT_LABEL: Record<string, string> = {
  SENT: 'Asked — awaiting reply',
  OFFERED: 'Quote in',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
};

function formatGBP(amount: number): string {
  return Number.isInteger(amount) ? `£${amount}` : `£${amount.toFixed(2)}`;
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.round(ms / 60_000))}m left`;
}

interface CalloutRow {
  callout: Callout;
  supplier?: Supplier;
}

function CalloutCard({ row, budget, onChanged }: { row: CalloutRow; budget: number; onChanged: () => void }) {
  const { callout, supplier } = row;
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [terms, setTerms] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await submitCalloutOffer(callout.id, {
        price: parseFloat(price),
        eta: eta || undefined,
        terms: terms || undefined,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record quote');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!window.confirm(`Mark ${supplier?.displayName ?? 'this supplier'} as declining this job?`)) return;
    setBusy(true);
    setError('');
    try {
      await submitCalloutOffer(callout.id, { decline: true, terms: 'Declined by supplier' });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record decline');
    } finally {
      setBusy(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(callout.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const priceNum = parseFloat(price);
  const overBudget = priceNum > 0 && priceNum > budget;

  return (
    <div className="paper-card rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{supplier?.displayName ?? callout.supplierId}</p>
          <p className="text-[11px] text-ink-muted">
            {supplier?.verified ? (
              <span className="text-mandate font-medium">Verified · </span>
            ) : (
              <span className="text-amber-700 font-medium">Synthetic roster · </span>
            )}
            {supplier?.serviceArea.postalDistrict ?? ''} · {CALLOUT_LABEL[callout.status]}
          </p>
        </div>
        {(callout.status === 'SENT') && (
          <span className="text-[10px] text-escalate font-medium whitespace-nowrap">{timeLeft(callout.expiresAt)}</span>
        )}
      </div>

      {/* Drafted callout message, ready to paste into WhatsApp */}
      <div className="relative">
        <pre className="text-[11px] leading-relaxed text-ink-muted whitespace-pre-wrap bg-paper-inset border border-ink/10 rounded-lg p-2.5 pr-16">{callout.message}</pre>
        <button
          onClick={copyMessage}
          className="absolute top-1.5 right-1.5 btn-secondary text-[10px] px-2 py-1"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {overBudget && (
        <p className="text-[11px] text-escalate font-medium">Above budget — will trigger the over-budget stop at commitment.</p>
      )}

      {callout.status === 'SENT' && (
        <>
          <form onSubmit={submit} className="grid grid-cols-12 gap-1.5">
            <input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price £"
              required
              className="field-input text-sm col-span-3"
            />
            <input
              type="text"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              placeholder="ETA (e.g. today 5pm)"
              className="field-input text-sm col-span-4"
            />
            <input
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Terms (optional)"
              className="field-input text-sm col-span-3"
            />
            <button type="submit" disabled={busy} className="btn-primary text-xs py-2 col-span-2 disabled:opacity-60">
              {busy ? '...' : 'Quote'}
            </button>
          </form>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={decline}
              disabled={busy}
              className="text-[11px] text-escalate hover:underline disabled:opacity-50"
            >
              Decline — can't take it
            </button>
            {callout.simulated && (
              <span className="text-[10px] text-ink-muted italic">Simulated quote for synthetic roster</span>
            )}
          </div>
        </>
      )}

      {callout.status === 'OFFERED' && (
        <p className="text-[11px] text-mandate font-medium">Quote recorded — mission will advance when offers are in.</p>
      )}
      {callout.status === 'DECLINED' && (
        <p className="text-[11px] text-ink-muted">Supplier declined. Try another callout or onboard someone new.</p>
      )}
      {callout.status === 'EXPIRED' && (
        <p className="text-[11px] text-escalate">Callout expired with no response — re-approach or escalate.</p>
      )}

      {error && <p className="text-[11px] text-escalate">{error}</p>}
    </div>
  );
}

// An escalated mission is the sweeper's output: every callout declined or
// expired, no quotes. The concierge's move is to re-run sourcing (fresh
// callouts go out to the current roster) or onboard someone new first.
function EscalatedCard({ mission, onChanged }: { mission: Mission; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resume = async () => {
    setBusy(true);
    setError('');
    try {
      await resumeMission(mission.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume mission');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="paper-card rounded-xl p-4 space-y-2 border-l-2 border-l-escalate">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{mission.goal}</p>
          <p className="text-[11px] text-ink-muted">
            {mission.mandate.serviceArea.postalDistrict} · budget {formatGBP(mission.mandate.budget.maxAmount)} · {mission.id}
          </p>
        </div>
        <span className="text-[10px] text-escalate font-medium whitespace-nowrap">{STATUS_LABEL[mission.status]}</span>
      </div>
      <p className="text-[11px] text-ink-muted leading-relaxed">
        Every supplier declined or timed out with no quote. Re-run sourcing to send fresh callouts to the current roster, or onboard a new verified supplier first.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={resume}
          disabled={busy}
          className="btn-primary text-xs py-2 px-3 disabled:opacity-60"
        >
          {busy ? 'Re-running…' : 'Re-run sourcing'}
        </button>
        {error && <span className="text-[11px] text-escalate">{error}</span>}
      </div>
    </div>
  );
}

function OnboardForm({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [district, setDistrict] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onboardSupplier({
        displayName: name,
        contact,
        postalDistrict: district.toUpperCase(),
        capabilities: capabilities.split(',').map((c) => c.trim()).filter(Boolean),
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setName('');
        setContact('');
        setDistrict('');
        setCapabilities('');
      }, 1200);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to onboard supplier');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-2 px-3">+ Onboard a verified supplier</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="paper-card rounded-xl p-4 space-y-2.5">
      <p className="text-xs text-ink-muted">
        Only after you've run the find-and-verify playbook (register lookup + a real phone call). See <span className="font-medium text-ink">docs/SUPPLY-SIDE.md</span>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" required className="field-input text-sm" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone / WhatsApp" required className="field-input text-sm" />
        <input value={district} onChange={(e) => setDistrict(e.target.value.toUpperCase())} placeholder="Postal district (N1)" required maxLength={4} className="field-input text-sm" />
        <input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="Capabilities, comma-separated" required className="field-input text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary text-sm py-2 px-3 disabled:opacity-60">
          {busy ? 'Onboarding...' : done ? 'Onboarded ✓' : 'Onboard (verified)'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-ink-muted hover:underline">Cancel</button>
      </div>
      {error && <p className="text-[11px] text-escalate">{error}</p>}
    </form>
  );
}

export default function OpsConsole() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [calloutsByMission, setCalloutsByMission] = useState<Record<string, Callout[]>>({});
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [ms, sups] = await Promise.all([listMissions(), listSuppliers()]);
        if (cancelled) return;
        setMissions(ms);
        setSuppliers(Object.fromEntries(sups.map((s) => [s.id, s])));
        setError('');

        const actionable = ms.filter((m) => ACTIVE_STATUSES.has(m.status) || m.status === ESCALATED_STATUS);
        const perMission = await Promise.all(
          actionable.map(async (m) => [m.id, await listCallouts(m.id)] as const)
        );
        if (cancelled) return;
        setCalloutsByMission(Object.fromEntries(perMission));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load missions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  const active = useMemo(() => missions.filter((m) => ACTIVE_STATUSES.has(m.status)), [missions]);
  const escalated = useMemo(() => missions.filter((m) => m.status === ESCALATED_STATUS), [missions]);

  return (
    <div className="space-y-4">
      <OnboardForm onChanged={refresh} />

      {error && <p className="text-xs text-escalate">{error}</p>}

      {loading && <p className="text-xs text-ink-muted">Loading the desk…</p>}

      {!loading && active.length === 0 && escalated.length === 0 && (
        <div className="paper-card rounded-2xl p-6 text-center space-y-2">
          <p className="text-ink font-medium">No jobs waiting on a quote right now</p>
          <p className="text-xs text-ink-muted">When a mission reaches sourcing, its callouts appear here. This page refreshes itself every 10s.</p>
          <a href="/missions/new" className="btn-secondary text-xs py-2 px-3 inline-block">Start a job</a>
        </div>
      )}

      {escalated.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs uppercase tracking-wider text-escalate font-medium">Escalated — needs action ({escalated.length})</p>
          {escalated.map((m) => {
            const callouts = calloutsByMission[m.id] ?? [];
            return (
              <div key={m.id} className="space-y-1.5">
                <EscalatedCard mission={m} onChanged={refresh} />
                {callouts.length > 0 && (
                  <p className="text-[11px] text-ink-muted pl-2">
                    {callouts.filter(c => c.status === 'DECLINED').length} declined · {callouts.filter(c => c.status === 'EXPIRED').length} expired
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        {active.map((m) => {
          const callouts = calloutsByMission[m.id] ?? [];
          const calloutRows: CalloutRow[] = callouts
            .map((c) => ({ callout: c, supplier: suppliers[c.supplierId] }))
            .sort((a, b) => (a.callout.simulated === b.callout.simulated ? 0 : a.callout.simulated ? 1 : -1));
          return (
            <div key={m.id} className="space-y-2.5">				<div className="flex items-start justify-between gap-3 pb-3 border-b border-ink/10">
					<div className="min-w-0">
						<p className="text-sm font-medium text-ink truncate">{m.goal}</p>
						<p className="text-[11px] text-ink-muted">
							{m.mandate.serviceArea.postalDistrict} · budget {formatGBP(m.mandate.budget.maxAmount)} · {m.id}
						</p>
					</div>
					<span className="text-[10px] text-mandate font-medium whitespace-nowrap">{STATUS_LABEL[m.status] ?? m.status}</span>
				</div>
				{calloutRows.length === 0 && (
					<p className="text-[11px] text-ink-muted italic">No callouts yet.</p>
				)}
				{calloutRows.map((row) => (
					<CalloutCard key={row.callout.id} row={row} budget={m.mandate.budget.maxAmount} onChanged={refresh} />
				))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
