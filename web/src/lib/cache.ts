import { listMissions, type Mission } from './api';

/**
 * Tiny client-side mission store.
 *
 * Two problems solved:
 *  1. Several islands (ActiveJobPill, LiveStrip, ActivityPulse, …) all want
 *     listMissions() at roughly the same time. We dedupe in-flight requests
 *     and serve a short-TTL cached result, so two islands asking within the
 *     same second cause ONE network request, not two.
 *  2. Tabs stay in sync: when this tab creates a mission it broadcasts over
 *     a BroadcastChannel; other tabs invalidate their cache and re-fetch, so
 *     the home page pulse updates without waiting for its next poll.
 */

const TTL_MS = 1000;

let cache: { at: number; data: Mission[] } | null = null;
let inflight: Promise<Mission[]> | null = null;

/** listMissions with in-flight dedupe + 1s TTL cache. */
export function listMissionsCached(force = false): Promise<Mission[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return Promise.resolve(cache.data);
  }
  if (inflight) return inflight;
  inflight = listMissions()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateMissions(): void {
  cache = null;
}

// ─── Cross-tab sync ──────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel('yaler-missions');
    channel.onmessage = (ev) => {
      if (ev.data === 'changed') {
        invalidateMissions();
        listeners.forEach((cb) => cb());
      }
    };
  }
  return channel;
}

/** Call after any mutation that changes the mission list (create, start…). */
export function broadcastMissionsChanged(): void {
  invalidateMissions();
  getChannel()?.postMessage('changed');
  listeners.forEach((cb) => cb());
}

/** Subscribe to mission-list changes from OTHER tabs. Returns unsubscribe. */
export function onMissionsChanged(cb: Listener): () => void {
  getChannel(); // ensure the channel exists so we hear other tabs
  listeners.add(cb);
  return () => listeners.delete(cb);
}
