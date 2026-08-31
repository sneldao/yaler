import React from 'react';
import { formatMoney } from '../../lib/copy';

/**
 * AgentQuotePreview — a static, always-visible preview of the three AI
 * supplier agents responding to a job. Shown on the landing page so a
 * visitor sees the product's core mechanic (3 distinct AI agents, 3
 * distinct quotes) without needing to click through to a live mission.
 *
 * The data mirrors the real persona-driven output from Gemini 3.5 Flash.
 */

interface AgentQuote {
  supplierId: string;
  name: string;
  persona: string;
  tier: string;
  price: number;
  currency: string;
  availability: string;
  terms: string;
  evidence: string[];
  highlight?: boolean;
}

const QUOTES: AgentQuote[] = [
  {
    supplierId: 'sup_rapid_coldcare',
    name: 'London Rapid ColdCare',
    persona: 'Premium emergency specialist',
    tier: 'PREMIUM',
    price: 480,
    currency: 'GBP',
    availability: 'Today, within 2 hours',
    terms: 'Guaranteed 2-hour emergency response. Full F-Gas compliance paperwork and a 12-month parts warranty included.',
    evidence: ['F-Gas Certified', 'Refcom Registered'],
    highlight: true,
  },
  {
    supplierId: 'sup_capital_kitchen',
    name: 'Capital Kitchen Services',
    persona: 'Mid-market generalist',
    tier: 'MODERATE',
    price: 380,
    currency: 'GBP',
    availability: 'Tomorrow morning',
    terms: 'Standard callout fee with up to two hours of on-site diagnostics. Parts quoted transparently on-site.',
    evidence: ['Safe Contractor Approved'],
  },
  {
    supplierId: 'sup_east_catering',
    name: 'East London Catering',
    persona: 'Budget direct fixer',
    tier: 'BUDGET',
    price: 395,
    currency: 'GBP',
    availability: 'Today, within 4 hours',
    terms: "No fancy frills or endless paperwork, just a direct, reliable fix to get your temperature back down today.",
    evidence: ['NVQ Level 3 Technicians'],
  },
];

export default function AgentQuotePreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted font-medium">
            Three AI agents. Three quotes. In their own words.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-mandate font-medium shrink-0">
          Gemini 3.5 Flash
        </span>
      </div>

      <div className="space-y-2">
        {QUOTES.map((q) => (
          <div
            key={q.supplierId}
            className={`paper-card rounded-2xl p-4 ${q.highlight ? 'border-mandate' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-mandate mb-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-mandate" />
                  AI agent quote
                </p>
                <p className="font-medium text-ink">{q.name}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{q.persona} · {q.availability}</p>
              </div>
              <p className="font-display text-2xl tabular-nums text-ink shrink-0">
                {formatMoney(q.price, q.currency)}
              </p>
            </div>
            <p className="text-sm text-ink-muted mt-3 border-t border-ink/10 pt-3 leading-relaxed">
              {q.terms}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {q.evidence.map((ev) => (
                <span
                  key={ev}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-mandate/10 text-mandate border border-mandate/20 font-medium"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink-muted text-center">
        Each agent reasons independently about the job, budget, and deadline — then quotes in its own voice.
      </p>
    </div>
  );
}
