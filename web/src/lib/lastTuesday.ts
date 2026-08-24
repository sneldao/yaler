import type { ProofReceipt } from './api';

/**
 * One source of truth for last Tuesday's N1 fridge story.
 *
 * The home story, the tactical radar, the proof receipt, and the demo
 * receipt page all read from here so the numbers can't drift between the
 * narrative and the paper. Edit them in one place, not in each island.
 *
 * The arc: ceiling £240 → best quote £80 over (£320) → we stop → you raise
 * the ceiling → done at £320.
 */
export const LAST_TUESDAY = {
  district: 'N1',
  supplier: 'London Rapid ColdCare',
  ceiling: 240,
  overBy: 80,
  doneAt: 320,
} as const;

export function bestQuote(): number {
  return LAST_TUESDAY.ceiling + LAST_TUESDAY.overBy;
}

export function lastTuesdayReceipt(): ProofReceipt {
  return {
    id: 'last-tuesday-n1-fridge',
    missionId: 'demo',
    summary: 'Walk-in freezer compressor swapped. Done in N1 at £320 after you raised the £240 ceiling.',
    agreedTerms:
      `${LAST_TUESDAY.supplier} quoted £${bestQuote()} — £${LAST_TUESDAY.overBy} over your £${LAST_TUESDAY.ceiling} ceiling. We stopped there rather than book over your line. You raised the ceiling and said yes. The job finished the same evening, a receipt you'd be happy to show an EHO.`,
    milestones: ['Stopped at £80 over', 'Ceiling raised by you', 'Photo verified'],
    evidenceLabels: ['Completion photo', 'Temperature reading -18C', 'F-Gas certificate on file'],
    redactedEvidence: {
      kitchen: 'A cafe in N1',
      engineer: LAST_TUESDAY.supplier,
      paid: `£${LAST_TUESDAY.doneAt}`,
    },
    shareToken: 'last-tuesday-n1',
    humanReviewed: true,
    createdAt: '2026-08-11T09:12:00.000Z',
    rating: 5,
    ratingComment: 'Fixed before lunch. No food lost. Would book again.',
  };
}
