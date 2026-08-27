import React, { useEffect, useRef, useState } from 'react';
import { playUiSound } from '../../lib/delight';

/**
 * OfflineBanner — a slim fixed strip under the header that appears the
 * moment the connection drops and slides away when it returns.
 *
 * Fixed positioning means zero layout shift; the strip lives below the
 * sticky header (z-50) at z-40. On reconnect we flash a mandate-toned
 * "Back online" for ~2s before sliding out. Announced politely to screen
 * readers via role="status".
 */

type Status = 'offline' | 'back';

const BACK_FLASH_MS = 2_000;
const SLIDE_OUT_MS = 350;

export default function OfflineBanner() {
  // Always start null so SSR and first client render agree; the mount
  // effect catches anyone who loaded the page already offline.
  const [status, setStatus] = useState<Status | null>(null);
  const [shown, setShown] = useState(false);
  const statusRef = useRef<Status | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Slide in after paint whenever a strip appears.
  useEffect(() => {
    if (status === null) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    const goOffline = () => {
      clearTimers();
      setStatus('offline');
    };

    const goOnline = () => {
      clearTimers();
      if (statusRef.current === null) return; // never went offline — nothing to announce
      setStatus('back');
      playUiSound('ping');
      timers.current.push(window.setTimeout(() => setShown(false), BACK_FLASH_MS));
      timers.current.push(window.setTimeout(() => setStatus(null), BACK_FLASH_MS + SLIDE_OUT_MS));
    };

    if (!navigator.onLine) setStatus('offline');
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      clearTimers();
    };
  }, []);

  if (status === null) return null;

  const isOffline = status === 'offline';

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed left-0 right-0 z-40 border-b transition-all duration-300 ease-yaler',
        // Tuck directly under the sticky header (h-12 / sm:h-16 + notch inset).
        'top-[calc(3rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))]',
        shown ? 'translate-y-0' : '-translate-y-[110%]',
        isOffline
          ? 'bg-escalate-light text-escalate border-escalate/20'
          : 'bg-mandate-light text-mandate border-mandate/20',
      ].join(' ')}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-5 py-2 flex items-center gap-2 text-sm">
        <span
          className={['w-2 h-2 rounded-full shrink-0', isOffline ? 'bg-escalate' : 'bg-mandate'].join(' ')}
          aria-hidden
        />
        <p>
          {isOffline
            ? "You're offline — we'll keep your place. Reconnect to send or update jobs."
            : "Back online — you're connected."}
        </p>
      </div>
    </div>
  );
}
