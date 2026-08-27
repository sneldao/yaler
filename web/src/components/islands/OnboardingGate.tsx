import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getJourneyStage, playUiSound } from '../../lib/delight';

/**
 * OnboardingGate — first-visit interstitial that steers brand-new visitors
 * to the 60-second rehearsal before anything else.
 *
 * Shows once, ever: the 'yaler-onboarded' flag is written whether they
 * watch the rehearsal, explore on their own, or press Escape. Never shows
 * on /rehearsal itself (nothing to gate — they're already there). Focus is
 * moved to the primary action, Escape closes, and focus returns to
 * whatever had it before. Body scroll is locked while open.
 */

const FLAG_KEY = 'yaler-onboarded';

function setOnboardedFlag(): void {
  try {
    localStorage.setItem(FLAG_KEY, 'true');
  } catch {
    /* private mode — they may see it again next session; acceptable */
  }
}

export default function OnboardingGate() {
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOnboardedFlag();
    setOpen(false);
  }, []);

  // Decide once, on mount (client only).
  useEffect(() => {
    if (window.location.pathname.startsWith('/rehearsal')) return;
    try {
      if (localStorage.getItem(FLAG_KEY)) return;
    } catch {
      /* private mode — carry on */
    }
    if (getJourneyStage() !== 'new') return;
    setOpen(true);
  }, []);

  // While open: lock scroll, focus the primary CTA, handle Escape, and keep
  // Tab inside the card (there are only two focusable elements, but a modal
  // shouldn't leak focus into the page behind it).
  useEffect(() => {
    if (!open) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ctaRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'Tab') {
        const card = cardRef.current;
        if (!card) return;
        const focusable = Array.from(
          card.querySelectorAll<HTMLElement>('a[href], button')
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      const el = returnFocusRef.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open, close]);

  // Never sit on top of /rehearsal — covers view-transition navigations
  // while this island is still mounted.
  useEffect(() => {
    const onSwap = () => {
      if (window.location.pathname.startsWith('/rehearsal')) {
        setOnboardedFlag(); // they found the rehearsal — job done
        setOpen(false);
      }
    };
    document.addEventListener('astro:after-swap', onSwap);
    return () => document.removeEventListener('astro:after-swap', onSwap);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-ink/50 flex items-center justify-center p-4">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-copy"
        className="paper-card shadow-paper rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 text-center animate-pop-in"
      >
        <h2
          id="onboarding-title"
          className="font-display text-2xl sm:text-3xl text-ink tracking-tight leading-tight"
        >
          See it work in 60 seconds
        </h2>
        <p
          id="onboarding-copy"
          className="mt-3 text-ink-muted text-sm sm:text-base leading-relaxed"
        >
          Watch a real job from voice note to receipt — no sign-up, nobody gets called.
        </p>
        <a
          ref={ctaRef}
          href="/rehearsal"
          onClick={() => {
            setOnboardedFlag();
            playUiSound('ding');
          }}
          className="btn-primary w-full mt-6"
        >
          Watch the rehearsal
        </a>
        <button
          type="button"
          onClick={close}
          className="mt-4 text-sm text-ink-muted hover:text-ink underline underline-offset-4 transition-colors"
        >
          Explore on my own
        </button>
      </div>
    </div>
  );
}
