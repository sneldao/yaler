import React from 'react';
import { statusLabel, statusTone } from '../../lib/copy';

// State is an inked rubber stamp, not a pill badge. Colour comes from
// currentColor so the stamp border, text, and second ink pass all follow
// the tone. See .stamp in global.css.
const TONE_TEXT: Record<string, string> = {
  success: 'text-mandate',
  alert: 'text-escalate',
  progress: 'text-ink',
  neutral: 'text-ink-muted',
};

export default function StatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  const tone = statusTone(status);
  return <span className={`stamp ${TONE_TEXT[tone]} ${className}`}>{statusLabel(status)}</span>;
}
