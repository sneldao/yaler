import React from 'react';
import { statusLabel, statusTone } from '../../lib/copy';

const TONE_CLASS: Record<string, string> = {
  success: 'bg-mandate-light text-mandate border-mandate/25',
  alert: 'bg-escalate-light text-escalate border-escalate/30',
  progress: 'bg-ink/[0.04] text-ink border-ink/10',
  neutral: 'bg-paper-inset text-ink-muted border-ink/10',
};

export default function StatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${TONE_CLASS[tone]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        tone === 'success' ? 'bg-mandate' : tone === 'alert' ? 'bg-escalate' : tone === 'progress' ? 'bg-mandate/70' : 'bg-ink-muted'
      }`} />
      {statusLabel(status)}
    </span>
  );
}
