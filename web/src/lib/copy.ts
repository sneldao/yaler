export type StatusTone = 'neutral' | 'progress' | 'success' | 'alert';

/**
 * Empty-state copy library — the single source of truth for "nothing here
 * yet" moments. No inline empty-state strings in components; import these.
 */
export const EMPTY_STATE_COPY = {
  waitingForQuotes: {
    title: 'Waiting for the first quote…',
    body: 'Nearby engineers have been asked. Quotes land here as they come back — you don’t need to stay on this page.',
  },
  engineerEnRoute: {
    title: 'Engineer is en route…',
    body: 'The booking is locked in. We’ll update this page the moment the engineer reports from site.',
  },
  comparingQuotes: (count: number, budget: string) =>
    `Comparing ${count} quote${count === 1 ? '' : 's'} against your ${budget} budget…`,
  verifyingPhotos: {
    title: 'Verifying photos…',
    body: 'The engineer sent photo evidence. We’re checking it against what was agreed before anything is marked done.',
  },
  standingBy: {
    title: 'Standing by.',
    body: 'Say or type when something breaks — we’ll take it from there.',
  },
  mandateExtracting: {
    title: 'Mandate being extracted',
    body: 'We’re reading your note and pulling out the budget, area, deadline and category. The rules appear here in a moment.',
  },
  noEventsYet: {
    title: 'Nothing on the timeline yet',
    body: 'As the agent works — asking engineers, checking rules, receiving quotes — each step is recorded here.',
  },
  noOtherJobs: {
    title: 'No other jobs in flight right now',
    body: 'When other kitchens put the agent to work, their live jobs show up here.',
  },
  opsQuiet: {
    title: 'The desk is quiet',
    body: 'When a mission asks engineers for quotes, callouts land here for the concierge desk to work.',
  },
} as const;

/**
 * Agent narrative — plain-English "what the agent is thinking right now".
 * Used by the AgentStatusStrip so a live mission reads as a story, not a
 * status badge.
 */
export function agentNarrative(status?: string, opts: { offerCount?: number; budgetMax?: number; currency?: string } = {}): string {
  const budget = opts.budgetMax !== undefined ? formatMoney(opts.budgetMax, opts.currency || 'GBP') : undefined;
  const n = opts.offerCount ?? 0;
  switch (status) {
    case 'DRAFT':
      return 'Reading your note and pulling out the rules — budget, area, deadline.';
    case 'MANDATE_CONFIRMED':
      return 'Rules confirmed. Lining up the search for nearby engineers.';
    case 'SOURCING':
      return 'Asking verified engineers near you who can take the job…';
    case 'OFFERS_RECEIVED':
      return n > 0 && budget
        ? `Comparing ${n} quote${n === 1 ? '' : 's'} against your ${budget} budget…`
        : 'Weighing the quotes that came back against your rules…';
    case 'NEGOTIATING':
      return 'Checking whether a counter-offer keeps us inside your rules…';
    case 'COMMITTED':
      return 'Booking locked in. Confirming the engineer and the arrival window.';
    case 'AWAITING_APPROVAL':
      return 'Paused — one quote sits outside your rules. It needs your call.';
    case 'IN_PROGRESS':
      return 'Engineer is on the job. Listening for the completion update.';
    case 'EVIDENCE_PENDING':
      return 'Asking the engineer for photos of the finished work.';
    case 'VERIFYING':
      return 'Checking the photos against what was agreed…';
    case 'COMPLETED':
      return 'Done and verified. The receipt is on the wall.';
    case 'ESCALATED':
      return 'Every engineer declined or timed out. Working out the next move.';
    default:
      return 'Standing by — say or type when something breaks.';
  }
}

/** True when the mission is idle — the agent has nothing in flight. */
export function isIdleStatus(status?: string): boolean {
  return !status || status === 'DRAFT' || status === 'COMPLETED' || status === 'CANCELLED';
}

/**
 * Agent toolbelt — the canonical list of tools the agent can fire, in the
 * order they tend to fire. The ToolTraceRail lights each chip as matching
 * events land on the timeline.
 */
export const AGENT_TOOLS: { id: string; label: string; eventTypes: string[] }[] = [
  { id: 'extract_mandate', label: 'extract_mandate', eventTypes: ['MANDATE_EXTRACTED', 'MISSION_CREATED'] },
  { id: 'policy_check', label: 'policy_check', eventTypes: ['POLICY_CHECK', 'POLICY_ALLOW', 'POLICY_DENY', 'POLICY_ESCALATE', 'POLICY_BLOCKED', 'MANDATE_CONFIRMED', 'MANDATE_UPDATED'] },
  { id: 'search_supplier_agents', label: 'search_supplier_agents', eventTypes: ['SOURCING_STARTED', 'SUPPLIERS_SOURCED', 'NO_SUPPLIERS', 'MISSION_RESUMED'] },
  { id: 'request_offer', label: 'request_offer', eventTypes: ['CALLOUT_SENT', 'CALLOUT_DECLINED', 'CALLOUT_EXPIRED'] },
  { id: 'compare_offers', label: 'compare_offers', eventTypes: ['OFFER_RECEIVED', 'QUOTE_RECEIVED', 'OFFERS_RECEIVED', 'OFFERS_RANKED', 'NEGOTIATING', 'NO_QUOTES'] },
  { id: 'commit_booking', label: 'commit_booking', eventTypes: ['COMMITTED'] },
  { id: 'record_evidence', label: 'record_evidence', eventTypes: ['EVIDENCE_SUBMITTED', 'EVIDENCE_VERIFIED'] },
  { id: 'issue_receipt', label: 'issue_receipt', eventTypes: ['RECEIPT_ISSUED', 'COMPLETED'] },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Check the details',
  MANDATE_CONFIRMED: 'Ready',
  SOURCING: 'Asking nearby engineers',
  OFFERS_RECEIVED: 'Quotes in',
  NEGOTIATING: 'Comparing quotes',
  COMMITTED: 'Booked',
  AWAITING_APPROVAL: 'Needs you',
  IN_PROGRESS: 'In progress',
  EVIDENCE_PENDING: 'Waiting on photos',
  VERIFYING: 'Checking the photos',
  COMPLETED: 'Done',
  ESCALATED: 'Escalated — re-asking',
};

const EVENT_LABELS: Record<string, string> = {
  MISSION_CREATED: 'Job created',
  MANDATE_EXTRACTED: 'Details taken from your note',
  MANDATE_CONFIRMED: 'Rules confirmed',
  MANDATE_UPDATED: 'Rules updated',
  SOURCING_STARTED: 'Asking nearby engineers',
  SUPPLIERS_SOURCED: 'Asked nearby engineers',
  CALLOUT_SENT: 'Asked an engineer',
  CALLOUT_DECLINED: 'Engineer declined',
  CALLOUT_EXPIRED: 'Ask timed out',
  NO_SUPPLIERS: 'No engineers on the roster',
  NO_QUOTES: 'No quotes came back',
  OFFER_RECEIVED: 'Quote in',
  QUOTE_RECEIVED: 'Quote in',
  OFFERS_RECEIVED: 'Quotes in',
  OFFERS_RANKED: 'Quotes compared',
  NEGOTIATING: 'Comparing quotes',
  COMMITTED: 'Booked',
  POLICY_CHECK: 'Checked against your rules',
  POLICY_ALLOW: 'Within your rules',
  POLICY_DENY: 'Blocked by your rules',
  POLICY_ESCALATE: 'Needs your call',
  POLICY_BLOCKED: 'Blocked by your rules',
  EVIDENCE_SUBMITTED: 'Photos sent',
  EVIDENCE_VERIFIED: 'Photos checked',
  RECEIPT_ISSUED: 'Receipt ready',
  COMPLETED: 'Done',
  MISSION_RESUMED: 'Re-running the search',
  FEEDBACK_RECORDED: 'You rated the job',
  ESCALATED: 'Escalated',
  WORKER_FAILED: 'Something went wrong',
};

const AUTONOMY_COPY: Record<string, { label: string; help: string }> = {
  DELEGATE: {
    label: 'Handle it',
    help: 'Book the best in-budget engineer. Only ask if it goes over or nobody can come.',
  },
  COLLABORATE: {
    label: 'Find quotes, then I’ll pick',
    help: 'Gather quotes and bring the best one back for a yes.',
  },
  OBSERVE: {
    label: 'Just show me options',
    help: 'Look around and report back. No booking.',
  },
};

export function statusLabel(status?: string): string {
  if (!status) return 'Working';
  return STATUS_LABELS[status] || humanizeToken(status);
}

export function statusTone(status?: string): StatusTone {
  if (status === 'COMPLETED') return 'success';
  if (status === 'AWAITING_APPROVAL') return 'alert';
  if (status === 'ESCALATED') return 'alert';
  if (status === 'DRAFT' || status === 'MANDATE_CONFIRMED') return 'neutral';
  return 'progress';
}

export function nextActionLabel(status?: string, rehearsal = false): string {
  if (rehearsal) {
    switch (status) {
      case 'DRAFT':
        return 'Check the number. Then we look. Nobody is called.';
      case 'SOURCING':
        return 'Asking the three N1 engineers on the practice roster…';
      case 'AWAITING_APPROVAL':
      case 'ESCALATED':
        return 'One quote is £80 over. We stopped. Tap it, then pick someone in budget.';
      case 'COMPLETED':
        return 'This is the paper you’d pin up. Save the rules if they look right. Rate the engineer to build the roster.';
      default:
        return 'Practice only. Nothing is booked.';
    }
  }

  switch (status) {
    case 'DRAFT':
      return 'Check the budget and area, then start the search.';
    case 'SOURCING':
      return 'Asking nearby engineers and waiting for real quotes. You don’t need to stay here.';
    case 'AWAITING_APPROVAL':
      return 'We need a yes from you before anyone is booked.';
    case 'ESCALATED':
      return 'Every engineer declined or timed out. We’ll re-run the search — or you can add a verified one.';
    case 'EVIDENCE_PENDING':
      return 'Waiting for the engineer to send photos.';
    case 'VERIFYING':
      return 'Checking the photos against what was agreed.';
    case 'COMPLETED':
      return 'Job done. The receipt is ready. Rate the engineer so the roster learns.';
    case 'COMMITTED':
    case 'IN_PROGRESS':
      return 'An engineer is booked. We’ll update you as they go.';
    default:
      return 'We’re on it. We’ll only stop you if something sits outside your rules.';
  }
}

export function eventLabel(type?: string): string {
  if (!type) return 'Update';
  return EVENT_LABELS[type] || humanizeToken(type);
}

export function autonomyCopy(mode?: string) {
  return AUTONOMY_COPY[mode || 'DELEGATE'] || AUTONOMY_COPY.DELEGATE;
}

export function humanizeToken(value?: string): string {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatMoney(amount?: number, currency = 'GBP'): string {
  if (amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `£${amount}`;
  }
}

export function formatWhen(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDay(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function supplierLabel(id?: string): string {
  if (!id) return 'Engineer';
  if (id.includes(' ') || id.length < 28) return humanizeToken(id.replace(/^sup[_-]?/i, ''));
  return 'Local engineer';
}
