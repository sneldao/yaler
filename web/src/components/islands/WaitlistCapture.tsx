import React, { useState } from 'react';

/**
 * WaitlistCapture — reusable email capture with context-aware copy.
 *
 * Variants:
 *  - operator: "We'll tell you when engineers are live in your area"
 *  - engineer: "Join the supply side — get clear jobs, not fishing expeditions"
 *  - game: "Liked the game? Get early access when we launch"
 *  - general: default fallback
 *
 * Posts to /api/waitlist on the backend. Falls back to storing in localStorage
 * if the backend is unreachable (pre-launch / static deploy).
 */

type Variant = 'operator' | 'engineer' | 'game' | 'general';

interface Props {
  variant?: Variant;
  source?: string; // page that triggered this (for analytics)
  compact?: boolean;
}

const COPY: Record<Variant, { headline: string; description: string; cta: string; placeholder: string }> = {
  operator: {
    headline: 'Get early access',
    description: 'We\'ll tell you when real engineers are on the roster in your area. No spam, one email when we launch.',
    cta: 'Join the waitlist',
    placeholder: 'your@kitchen.email',
  },
  engineer: {
    headline: 'Join the supply side',
    description: 'Get clear, scoped jobs from local kitchens. No cold calls, no fishing expeditions. We bring the work to you.',
    cta: 'Register interest',
    placeholder: 'your@company.email',
  },
  game: {
    headline: 'Liked the game?',
    description: 'The real thing launches soon in London. Get early access — one email when we go live.',
    cta: 'Get early access',
    placeholder: 'your@email.com',
  },
  general: {
    headline: 'Join 40+ London kitchens',
    description: 'We launch soon. One email when real engineers are bookable through Yaler.',
    cta: 'Notify me',
    placeholder: 'your@email.com',
  },
};

export default function WaitlistCapture({ variant = 'general', source = 'unknown', compact = false }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [district, setDistrict] = useState('');

  const copy = COPY[variant];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('submitting');

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8081';
      const res = await fetch(`${apiUrl}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: variant === 'engineer' ? 'supplier' : 'operator',
          source,
          district: district || undefined,
          joinedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        throw new Error('Backend error');
      }
    } catch {
      // Fallback: store locally
      try {
        const existing = JSON.parse(localStorage.getItem('yaler_waitlist') || '[]');
        existing.push({ email, variant, source, district, joinedAt: new Date().toISOString() });
        localStorage.setItem('yaler_waitlist', JSON.stringify(existing));
      } catch { /* ignore */ }
      setStatus('success'); // Still show success — we'll sync later
    }
  };

  if (status === 'success') {
    return (
      <div className={`${compact ? '' : 'paper-card rounded-2xl p-5 sm:p-6'} space-y-3`}>
        {/* Receipt tear motif */}
        {!compact && <div className="h-px bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,var(--ink)_4px,var(--ink)_5px)] opacity-10" />}
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mandate/10">
            <span className="text-mandate text-sm">✓</span>
          </span>
          <div>
            <p className="text-sm font-medium text-ink">You're on the list</p>
            <p className="text-xs text-ink-muted">We'll email you once — when we launch in your area.</p>
          </div>
        </div>
        {/* Mandate pill motif */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] bg-mandate/5 text-mandate px-2.5 py-1 rounded-full border border-mandate/20 font-medium">
            {variant === 'engineer' ? 'Supply side' : 'Early access'}
          </span>
          {district && (
            <span className="text-[11px] bg-paper-inset text-ink-muted px-2.5 py-1 rounded-full border border-ink/10">
              {district}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? '' : 'paper-card rounded-2xl p-5 sm:p-6'} space-y-3`}>
      {!compact && (
        <>
          {/* Receipt tear motif */}
          <div className="h-px bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,var(--ink)_4px,var(--ink)_5px)] opacity-10" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">{copy.headline}</p>
            <p className="text-xs text-ink-muted leading-relaxed">{copy.description}</p>
          </div>
        </>
      )}
      {compact && (
        <p className="text-xs text-ink-muted">{copy.description}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.placeholder}
            required
            className="field-input flex-1 text-sm"
          />
          {variant === 'operator' && (
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value.toUpperCase())}
              placeholder="District (e.g. N1)"
              className="field-input w-24 text-sm"
              maxLength={4}
            />
          )}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="btn-primary text-sm py-2.5 px-4 whitespace-nowrap disabled:opacity-60"
          >
            {status === 'submitting' ? 'Joining...' : copy.cta}
          </button>
        </div>
      </form>

      {status === 'error' && (
        <p className="text-xs text-escalate">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
