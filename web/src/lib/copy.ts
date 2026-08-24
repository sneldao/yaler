export type StatusTone = 'neutral' | 'progress' | 'success' | 'alert';

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
