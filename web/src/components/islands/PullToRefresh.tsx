import { useEffect, useRef, useState } from 'react';
import { invalidateMissions, listMissionsCached } from '../../lib/cache';
import { playHaptic } from '../../lib/delight';

// How far the user must drag before releasing triggers a refresh.
const THRESHOLD_PX = 70;
// Hard cap on the visual drag, so a long fling doesn't shove the page.
const MAX_PULL_PX = 110;
// Only arm near the very top of the document.
const ARM_SCROLL_Y = 4;

/**
 * PullToRefresh — mobile-native refresh. Drag down from the top of the
 * page and a small spinner indicator follows your finger; release past
 * the threshold and the mission cache is force-refetched (which also
 * refreshes every island subscribed via onMissionsChanged).
 *
 * Deliberately conservative: touch devices only, only while the page is
 * scrolled to the very top, and the pull is scaled (rubber-band) so it
 * feels native rather than elastic-slippery. Pulling still scrolls the
 * page normally if you never cross the threshold.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  // Mirror pull into a ref so touchend (bound once) reads the latest value.
  const pullRef = useRef(0);
  pullRef.current = pull;

  useEffect(() => {
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

    const onTouchStart = (e: TouchEvent) => {
      // Don't arm mid-refresh or while scrolled down.
      if (refreshing) return;
      if (window.scrollY > ARM_SCROLL_Y) return;
      // Ignore multi-touch (pinch).
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      // Only a downward pull counts; upward cancels arming entirely.
      if (dy <= 0) {
        if (pulling.current) {
          pulling.current = false;
          startY.current = null;
          setPull(0);
        }
        return;
      }
      if (window.scrollY > ARM_SCROLL_Y) return;

      pulling.current = true;
      // Rubber-band: the first 40px move 1:1, then resistance.
      const scaled = dy < 40 ? dy : 40 + (dy - 40) / 2.4;
      setPull(Math.min(scaled, MAX_PULL_PX));
      // Prevent the browser's own pull-to-refresh / overscroll bounce
      // while we're owning the gesture.
      if (scaled > 8 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (startY.current === null) return;
      const wasPulling = pulling.current;
      const finalPull = pullRef.current;
      startY.current = null;
      pulling.current = false;

      if (wasPulling && finalPull >= THRESHOLD_PX) {
        setRefreshing(true);
        setPull(THRESHOLD_PX);
        playHaptic('ping');
        invalidateMissions();
        try {
          await listMissionsCached(true);
        } catch {
          /* offline — the OfflineBanner covers this case */
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    const opts = { passive: false } as const;
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, opts);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [refreshing]);

  const armed = pull >= THRESHOLD_PX || refreshing;
  const visible = pull > 4 || refreshing;

  return (
    <div
      aria-hidden
      className="fixed left-1/2 z-50 pointer-events-none"
      style={{
        top: `${Math.max(-28, pull - 28)}px`,
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
        transition: pulling.current ? 'none' : 'top 220ms ease, opacity 180ms ease',
      }}
    >
      <span
        className={`flex items-center justify-center w-9 h-9 rounded-full paper-card shadow-sm ${
          armed ? 'text-mandate' : 'text-ink-muted'
        }`}
        style={{
          transform: `rotate(${(pull / THRESHOLD_PX) * 270}deg)`,
          transition: pulling.current ? 'none' : 'transform 220ms ease',
        }}
      >
        {refreshing ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.2-8.56" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </div>
  );
}
