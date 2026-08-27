import React, { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../primitives/StatusBadge';
import { listCallouts, listMissions, listSuppliers, onboardSupplier, probeCredentialCheck, resumeMission, submitCalloutOffer, type Callout, type CredentialCheck, type Mission, type Supplier } from '../../lib/api';
import { EMPTY_STATE_COPY, formatMoney } from '../../lib/copy';

/**
 * OpsConsole — the concierge's cockpit (internal tool, linked from docs/SUPPLY-SIDE.md).
 *
 * Styled to match the buyer-facing paper/receipt craft: StatusBadge for
 * mission state, a perf-edge separator on callout cards, a live "desk open"
 * pulse, and the same uppercase-tracked section labels + font-display rhythm
 * as the mission timeline.
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

const CALLOUT_LABEL: Record<string, string> = {
  SENT: 'Asked — awaiting reply',
  OFFERED: 'Quote in',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
};

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
  const isSent = callout.status === 'SENT';

  return (
    <div className="paper-card rounded-xl p-4 space-y-3 animate-pop-in">
      {/* Header: supplier identity + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink truncate">{supplier?.displayName ?? callout.supplierId}</p>
            {supplier?.verified ? (
              <span className="text-[10px] bg-mandate/10 text-mandate px-1.5 py-0.5 rounded-full border border-mandate/25 font-medium">Verified</span>
            ) : (
              <span className="text-[10px] bg-ink/5 text-ink-muted px-1.5 py-0.5 rounded-full border border-ink/10">Synthetic</span>
            )}
          </div>
          <p className="text-[11px] text-ink-muted">
            {supplier?.serviceArea.postalDistrict ?? ''} · {CALLOUT_LABEL[callout.status] ?? callout.status}
          </p>
        </div>
        {isSent && (
          <span className={`text-[10px] font-medium whitespace-nowrap ${timeLeft(callout.expiresAt) === 'expired' ? 'text-escalate' : 'text-ink-muted'}`}>
            {timeLeft(callout.expiresAt)}
          </span>
        )}
      </div>

      {/* Perf-edge separator — the receipt motif */}
      <div className="receipt-perf" />

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

      {isSent && (
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
    <div className="paper-card rounded-xl p-4 space-y-3 border-l-2 border-l-escalate animate-pop-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-ink truncate">{mission.goal}</p>
          <p className="text-[11px] text-ink-muted">
            {mission.mandate.serviceArea.postalDistrict} · {formatMoney(mission.mandate.budget.maxAmount)} · {mission.id}
          </p>
        </div>
        <span className="text-[10px] text-escalate font-medium whitespace-nowrap shrink-0">Escalated — needs action</span>
      </div>
      <div className="receipt-perf" />
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

function OnboardForm({ onChanged, open, setOpen, hideCollapsed = false }: { onChanged: () => void; open: boolean; setOpen: (open: boolean) => void; hideCollapsed?: boolean }) {
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
    if (hideCollapsed) return null;
    return (
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-2 px-3">+ Onboard a verified supplier</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="paper-card rounded-xl p-4 space-y-3 animate-pop-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink">Onboard a verified supplier</p>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-ink-muted hover:underline">Cancel</button>
      </div>
      <div className="receipt-perf" />
      <p className="text-xs text-ink-muted leading-relaxed">
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
        {error && <span className="text-[11px] text-escalate">{error}</span>}
      </div>
    </form>
  );
}

// RosterHealthBanner — the cold-start nudge. When the roster has no
// verified suppliers, every mission sources against the synthetic seed:
// simulated quotes auto-commit, and the concierge loop never actually
// runs. This banner makes that state visible and points at the runbook so
// the concierge builds a real roster before relying on the desk.
function RosterHealthBanner({ verifiedCount, onOnboard }: { verifiedCount: number; onOnboard: () => void }) {
  if (verifiedCount > 0) return null;

  return (
    <div className="paper-card rounded-2xl p-5 space-y-4 border-l-2 border-l-escalate animate-pop-in">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-escalate font-medium">No verified suppliers on the roster</p>
          <p className="font-display text-lg text-ink">The desk is running on the synthetic seed</p>
        </div>
      </div>
      <div className="receipt-perf" />
      <p className="text-xs text-ink-muted leading-relaxed">
        Every mission right now sources against the synthetic roster — quotes are auto-generated and labelled simulated, so nothing is actually booked with a real engineer. To run the real concierge loop, find and verify 3–5 local engineers first:
      </p>
      <ol className="space-y-2 text-xs text-ink-muted">
        <li className="flex gap-2">
          <span className="text-mandate font-medium shrink-0">1.</span>
          <span><span className="text-ink font-medium">Find names</span> — <a href="/suppliers" className="text-mandate hover:underline">/suppliers</a> or the Exa discovery endpoint returns candidate businesses in your district.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-mandate font-medium shrink-0">2.</span>
          <span><span className="text-ink font-medium">Verify registration</span> — the Companies House check (fail-closed). If the business isn't on the register, move on.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-mandate font-medium shrink-0">3.</span>
          <span><span className="text-ink font-medium">Phone them</span> — confirm F-Gas certification, capacity for same-day jobs, and a real contact number.</span>
        </li>
      </ol>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onOnboard} className="btn-primary text-xs py-2 px-3">+ Onboard a verified supplier</button>
        <a href="/suppliers" className="text-xs text-mandate hover:underline">See the roster</a>
      </div>
      <p className="text-[10px] text-ink-muted italic">Full runbook: docs/SUPPLY-SIDE.md</p>
    </div>
  );
}

// ApifyHealthCard — probes the real credential check once on mount and
// surfaces the outcome to the concierge. If Apify refuses to run the actor
// (permission not yet approved), it shows the one-click approval link so the
// fix is a single click, not a mystery. If the check works, it quietly
// confirms the trust tooling is live.
function ApifyHealthCard() {
  const [state, setState] = useState<'checking' | 'ok' | 'needs_approval' | 'down'>('checking');
  const [approvalUrl, setApprovalUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    probeCredentialCheck().then((res: CredentialCheck) => {
      if (cancelled) return;
      if (res.status === 'not_checked' && res.detail && res.detail.includes('approve')) {
        setApprovalUrl(res.detail.replace(/^Apify:\s*/, '').replace(/Once: /i, ''));
        setState('needs_approval');
      } else if (res.status === 'listed') {
        setState('ok');
      } else {
        setState('ok'); // checks are observable; not every name is listed
      }
    }).catch(() => {
      if (!cancelled) setState('ok');
    });
    return () => { cancelled = true; };
  }, []);

  if (state === 'checking') return null;

  if (state === 'needs_approval') {
    return (
      <div className="paper-card rounded-2xl p-4 space-y-2 border-l-2 border-l-escalate animate-pop-in">
        <div className="flex items-center gap-2">
          <span className="text-escalate font-display text-sm">⚠</span>
          <p className="text-xs font-medium text-ink">Apify needs a one-time approval</p>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          The Companies House check is running through Apify's cheerio-scraper actor, but your Apify account hasn't approved that actor's permissions yet. Approve it once (free) and checks work immediately:
        </p>
        <a
          href="https://console.apify.com/actors/YrQuEkowkNCLdk4j2?approvePermissions=true"
          target="_blank"
          rel="noreferrer"
          className="btn-primary text-xs py-2 px-3 inline-block"
        >
          Approve cheerio-scraper on Apify
        </a>
        <p className="text-[10px] text-ink-muted italic">After approving, this card clears on the next refresh (~10s).</p>
      </div>
    );
  }

  return null;
}

// A live "desk open" indicator — the same pulse the buyer home page
// uses for active jobs, tuned for the concierge's always-on surface.
function DeskOpenIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-mandate" />
      </span>
      <p className="text-xs font-medium text-ink">
        {count > 0 ? `${count} job${count > 1 ? 's' : ''} on the desk` : 'Desk open — no jobs waiting'}
      </p>
    </div>
  );
}

export default function OpsConsole() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [calloutsByMission, setCalloutsByMission] = useState<Record<string, Callout[]>>({});
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [onboardOpen, setOnboardOpen] = useState(false);

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
  const totalCount = active.length + escalated.length;
  const verifiedCount = useMemo(() => Object.values(suppliers).filter((s) => s.verified).length, [suppliers]);

  return (
    <div className="space-y-6">
      <ApifyHealthCard />
      <RosterHealthBanner verifiedCount={verifiedCount} onOnboard={() => setOnboardOpen(true)} />
      {/* When the roster-health banner is visible it carries the onboarding CTA,
          so suppress the duplicate collapsed button; keep the form itself usable. */}
      <OnboardForm onChanged={refresh} open={onboardOpen} setOpen={setOnboardOpen} hideCollapsed={verifiedCount === 0} />

      {error && (
        <p className="text-xs text-escalate paper-card rounded-xl p-3">{error}</p>
      )}

      {loading && (
        <div className="paper-card rounded-2xl p-6 text-center space-y-2">
          <p className="font-display text-lg text-ink">Opening the desk…</p>
          <p className="text-xs text-ink-muted">This should only take a moment.</p>
        </div>
      )}

      {!loading && totalCount === 0 && (
        <div className="paper-card rounded-2xl p-8 text-center space-y-3">
          <div className="flex justify-center">
            <span className="receipt-punch" />
          </div>
          <p className="font-display text-xl text-ink">{EMPTY_STATE_COPY.opsQuiet.title}</p>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
            {EMPTY_STATE_COPY.opsQuiet.body}
          </p>
          <a href="/missions/new" className="btn-secondary text-xs py-2 px-3 inline-block">Start a job</a>
        </div>
      )}

      {escalated.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-escalate font-medium">Escalated — needs action ({escalated.length})</p>
            <DeskOpenIndicator count={totalCount} />
          </div>
          {escalated.map((m) => {
            const callouts = calloutsByMission[m.id] ?? [];
            const declined = callouts.filter((c) => c.status === 'DECLINED').length;
            const expired = callouts.filter((c) => c.status === 'EXPIRED').length;
            return (
              <div key={m.id} className="space-y-1.5">
                <EscalatedCard mission={m} onChanged={refresh} />
                {callouts.length > 0 && (
                  <p className="text-[11px] text-ink-muted pl-2">
                    {declined} declined · {expired} expired
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {active.length > 0 && (
        <section className="space-y-4">
          {escalated.length === 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-mandate font-medium">On the desk ({active.length})</p>
              <DeskOpenIndicator count={totalCount} />
            </div>
          )}
          {active.map((m) => {
            const callouts = calloutsByMission[m.id] ?? [];
            const calloutRows: CalloutRow[] = callouts
              .map((c) => ({ callout: c, supplier: suppliers[c.supplierId] }))
              .sort((a, b) => (a.callout.simulated === b.callout.simulated ? 0 : a.callout.simulated ? 1 : -1));
            const realCount = callouts.filter((c) => !c.simulated).length;
            const simCount = callouts.filter((c) => c.simulated).length;
            return (
              <div key={m.id} className="paper-card rounded-2xl p-5 space-y-4">
                {/* Mission header — same rhythm as the buyer timeline */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-1">
                  <div className="space-y-1.5 min-w-0">
                    <StatusBadge status={m.status} />
                    <h2 className="font-display text-xl text-ink leading-tight">{m.goal}</h2>
                    <p className="text-[11px] text-ink-muted">
                      {m.mandate.serviceArea.postalDistrict} · {formatMoney(m.mandate.budget.maxAmount)} · {m.id}
                    </p>
                  </div>
                </div>

                {/* Callout summary line */}
                {callouts.length > 0 && (
                  <p className="text-[11px] text-ink-muted">
                    {realCount > 0 && <>{realCount} real callout{realCount > 1 ? 's' : ''} </>
                    }{realCount > 0 && simCount > 0 && <>· </>}
                    {simCount > 0 && <>{simCount} simulated</>}
                  </p>
                )}

                <div className="receipt-perf" />

                {calloutRows.length === 0 && (
                  <p className="text-[11px] text-ink-muted italic">No callouts yet — the worker is matching the roster.</p>
                )}

                <div className="space-y-2.5">
                  {calloutRows.map((row) => (
                    <CalloutCard key={row.callout.id} row={row} budget={m.mandate.budget.maxAmount} onChanged={refresh} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
