/**
 * Cross-island state — nanostores.
 *
 * React Context does not cross Astro island boundaries (each island is
 * a separate React root). Nanostores are the Astro-recommended pattern
 * for shared client-side state. See docs/ARCHITECTURE.md "Cross-island
 * state."
 *
 * One store per concern. Islands subscribe with `useStore()` from
 * `@nanostores/react`; non-React code reads with `store.get()`.
 */

import { atom } from 'nanostores';

// ─── District ───────────────────────────────────────────────
// Replaces the localStorage + custom-event pattern in DistrictPicker.
// The store is the single source of truth; localStorage is the
// persistence layer, kept in sync by the store's listeners.

const DISTRICT_KEY = 'yaler-district';

function readDistrict(): string {
  if (typeof window === 'undefined') return 'N1';
  return localStorage.getItem(DISTRICT_KEY) || 'N1';
}

export const districtStore = atom<string>(readDistrict());

/** Set the district — updates the store and persists to localStorage. */
export function setDistrict(d: string): void {
  const clean = d.trim().toUpperCase();
  if (!clean) return;
  districtStore.set(clean);
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISTRICT_KEY, clean);
  }
}

/**
 * Read the current district outside React (e.g. in Astro frontmatter
 * or non-island code). Backward-compatible with the old `getDistrict()`
 * export from DistrictPicker.
 */
export function getDistrict(): string {
  return districtStore.get();
}

// ─── Scenario ───────────────────────────────────────────────
// The landing page scenario the visitor has chosen (or the default).
// When wired into AgentQuotePreview, this lets the three quotes
// re-render for the visitor's selected scenario instead of being
// static pre-baked data.

export type Scenario = 'fridge' | 'oven' | 'hood' | 'gas';

export const scenarioStore = atom<Scenario>('fridge');

export function setScenario(s: Scenario): void {
  scenarioStore.set(s);
}

// ─── Active job count ───────────────────────────────────────
// A lightweight count of active (non-terminal) missions, shared
// across islands so the nav pill and the landing page activity
// pulse read from the same source. Updated by ActiveJobPill's
// existing poll; consumed by anything that needs to know "is
// something happening right now."

export const activeJobCountStore = atom<number>(0);

export function setActiveJobCount(n: number): void {
  activeJobCountStore.set(n);
}
