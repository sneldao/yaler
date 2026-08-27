import React, { useEffect, useState } from 'react';
import { getVisitCount, playUiSound } from '../../lib/delight';

/**
 * InstallPrompt — a small, non-blocking nudge to add Yaler to the home screen.
 *
 * Chromium fires `beforeinstallprompt` once the app is installable; we hold
 * on to that event and only ask once the visitor has had a proper look —
 * 30 seconds on site, or their second visit, whichever comes first.
 * "Not now" is remembered forever. iOS Safari never fires the event, so
 * there we show Share → Add to Home Screen instructions instead. Already
 * installed (standalone display-mode)? We stay out of the way entirely.
 */

/** Fired by Chromium before its own install UI. Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'yaler-install-dismissed';
const ARM_AFTER_MS = 30_000;

/** Module-level cache: the event fires once per page load and view
 *  transitions can remount this island — don't lose it on a soft nav. */
let cachedPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iPhone/iPad (including iPadOS posing as macOS) that isn't already installed. */
function needsManualInstall(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const appleMobile =
    /iphone|ipad/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return appleMobile && nav.standalone !== true;
}

function persistDismissal(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'true');
  } catch {
    /* private mode — we simply won't remember */
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [manual, setManual] = useState(false); // iOS instructions variant
  const [armed, setArmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed, or they've said no before — never nag.
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode — carry on */
    }

    setManual(needsManualInstall());
    if (cachedPrompt) setDeferred(cachedPrompt);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar — we ask later, politely
      cachedPrompt = e as BeforeInstallPromptEvent;
      setDeferred(cachedPrompt);
    };
    const onInstalled = () => {
      cachedPrompt = null;
      setDeferred(null);
      setDismissed(true);
      persistDismissal();
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Arm on the second visit, or after 30s on site — whichever comes first.
    let timer: number | undefined;
    if (getVisitCount() >= 2) {
      setArmed(true);
    } else {
      timer = window.setTimeout(() => setArmed(true), ARM_AFTER_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // Nothing to offer until we're armed AND can actually install (native
  // event captured, or an iOS device we can give instructions to).
  const visible = armed && !dismissed && (deferred !== null || manual);

  useEffect(() => {
    if (visible) playUiSound('ding');
  }, [visible]);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') persistDismissal();
    } catch {
      /* very old Chromium builds can reject — treat as dismissed */
    }
    cachedPrompt = null;
    setDeferred(null);
    setDismissed(true);
  };

  const handleNotNow = () => {
    persistDismissal();
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Add Yaler to your home screen"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-md paper-card shadow-paper rounded-2xl p-4 animate-pop-in"
    >
      {manual && !deferred ? (
        <>
          <p className="font-display text-base text-ink">Add Yaler to your home screen</p>
          <p className="mt-1 text-sm text-ink-muted leading-relaxed">
            One tap from the fryer to a booked engineer. Tap{' '}
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" strokeLinecap="round" />
              </svg>
              Share
            </span>{' '}
            in Safari, then <span className="font-medium text-ink">Add to Home Screen</span>.
          </p>
          <button type="button" onClick={handleNotNow} className="btn-secondary w-full mt-3">
            Got it
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink leading-relaxed">
            Add Yaler to your home screen — one tap from the fryer to a booked engineer.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={handleInstall} className="btn-primary flex-1">
              Install
            </button>
            <button
              type="button"
              onClick={handleNotNow}
              className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-paper-inset transition-colors"
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
