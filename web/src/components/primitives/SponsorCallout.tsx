import React from 'react';
import { LoaderGrid } from './LoaderGrid';

/**
 * SponsorCallout — a branded "thinking" card that surfaces which sponsor
 * API is actively working in the mission flow.
 *
 * This is the #1 hackathon scoring lever: judges explicitly score "Use of
 * sponsor tools" and there are dedicated prize tracks for Vapi, Apify,
 * ElevenLabs, GMI Cloud, and Exa. Making each API fire visibly turns the
 * invisible plumbing into a visible, branded motif.
 *
 * Usage:
 *   <SponsorCallout sponsor="gemini" status="working" label="Extracting mandate from your note" />
 *   <SponsorCallout sponsor="exa" status="done" label="Found 3 engineers near N1" />
 */

export type SponsorId = 'gemini' | 'vapi' | 'exa' | 'apify' | 'elevenlabs';

type Status = 'working' | 'done' | 'error' | 'skipped';

interface SponsorMeta {
  name: string;
  short: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const SPONSORS: Record<SponsorId, SponsorMeta> = {
  gemini: {
    name: 'Gemini',
    short: 'G',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Google DeepMind',
  },
  vapi: {
    name: 'Vapi',
    short: 'V',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    description: 'Voice AI',
  },
  exa: {
    name: 'Exa',
    short: 'E',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Web search',
  },
  apify: {
    name: 'Apify',
    short: 'A',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: 'Data extraction',
  },
  elevenlabs: {
    name: 'ElevenLabs',
    short: '11',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    description: 'Voice & audio',
  },
};

interface Props {
  sponsor: SponsorId;
  status: Status;
  label: string;
  detail?: string;
  /** Compact mode — just the chip, no card. For inline use in traces/timelines. */
  compact?: boolean;
}

export default function SponsorCallout({ sponsor, status, label, detail, compact }: Props) {
  const meta = SPONSORS[sponsor];

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.color} font-medium`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'working' ? 'bg-current animate-pulse' : status === 'done' ? 'bg-current' : 'bg-ink/20'}`} />
        {meta.name}
      </span>
    );
  }

  return (
    <div className={`paper-card rounded-xl p-3.5 flex items-start gap-3 animate-pop-in border-l-2 ${meta.border.replace('border-', 'border-l-')}`}>
      {/* Sponsor badge */}
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${meta.bg} ${meta.border} border shrink-0`}>
        <span className={`font-display text-sm font-bold ${meta.color}`}>{meta.short}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.name}</span>
          <span className="text-[10px] text-ink-muted">{meta.description}</span>
        </div>
        <p className="text-sm text-ink leading-snug">{label}</p>
        {detail && (
          <p className="text-[11px] text-ink-muted leading-relaxed">{detail}</p>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0 pt-0.5">
        {status === 'working' && <LoaderGrid />}
        {status === 'done' && (
          <span className="text-mandate text-sm">✓</span>
        )}
        {status === 'error' && (
          <span className="text-escalate text-sm">✕</span>
        )}
        {status === 'skipped' && (
          <span className="text-ink-muted text-xs">—</span>
        )}
      </div>
    </div>
  );
}

/**
 * SponsorRail — a compact strip showing all sponsor APIs used in the flow.
 * Lights up the one that's currently active. Useful as a persistent footer
 * or header element so the full stack is visible at a glance.
 */
export function SponsorRail({ active, completed }: { active?: SponsorId; completed?: SponsorId[] }) {
  const allSponsors: SponsorId[] = ['gemini', 'vapi', 'exa', 'apify', 'elevenlabs'];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-ink-muted mr-1">Powered by</span>
      {allSponsors.map((id) => {
        const meta = SPONSORS[id];
        const isActive = id === active;
        const isDone = completed?.includes(id);
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
              isActive
                ? `${meta.bg} ${meta.border} ${meta.color} font-medium`
                : isDone
                  ? `${meta.bg} ${meta.border} ${meta.color}`
                  : 'bg-paper-inset border-ink/10 text-ink-muted'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-current animate-pulse' : isDone ? 'bg-current' : 'bg-ink/20'}`} />
            {meta.name}
          </span>
        );
      })}
    </div>
  );
}
