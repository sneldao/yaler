import React, { useCallback, useEffect, useRef, useState } from 'react';
import { listMissionsCached, onMissionsChanged } from '../../lib/cache';
import { statusLabel } from '../../lib/copy';

/**
 * Ambient "agent at work" presence on the home hero. Pulls the real active
 * mission count from /api/missions (via the shared cached store) and rotates
 * through the live jobs. Cross-tab: when another tab starts a mission, the
 * shared BroadcastChannel invalidates the cache and this pulse changes.
 * Falls back to a quiet "standing by" line when nothing is in flight.
 */

function ago(iso?: string): string {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function ActivityPulse() {
  const [lines, setLines] = useState<string[]>([]);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [show, setShow] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const missions = await listMissionsCached(true);
      const active = (Array.isArray(missions) ? missions : []).filter(
        (m) => m.status !== 'COMPLETED' && m.status !== 'CANCELLED',
      );
      if (active.length === 0) {
        setLines(['Standing by — nothing broken right now']);
        return;
      }
      const next = active.slice(0, 4).map((m) => {
        const district = m.mandate?.serviceArea?.postalDistrict;
        const where = district ? ` in ${district}` : '';
        return `${statusLabel(m.status)}${where} · ${ago(m.updatedAt || m.createdAt)}`;
      });
      if (active.length > 1) {
        next.unshift(`${active.length} job${active.length === 1 ? '' : 's'} in flight right now`);
      }
      setLines(next);
    } catch {
      setLines([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const off = onMissionsChanged(refresh);
    return () => {
      clearInterval(interval);
      off();
    };
  }, [refresh]);

  // Rotate through the lines with a soft fade-up.
  useEffect(() => {
    if (lines.length <= 1) return;
    timerRef.current = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setVisibleIdx((i) => (i + 1) % lines.length);
        setShow(true);
      }, 300);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lines.length]);

  if (lines.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 overflow-hidden h-6" role="status" aria-live="polite">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mandate opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-mandate" />
      </span>
      <p
        className={`text-xs text-ink-muted transition-all duration-300 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <span className="text-ink">{lines[visibleIdx % lines.length]}</span>
      </p>
    </div>
  );
}

