import type { Event, Mandate, Mission, Offer, ProofReceipt } from './api';

export const REHEARSAL_STORAGE_KEY = 'yaler.savedMandate';

export interface SavedMandate {
  budget: number;
  postalDistrict: string;
  autonomyMode: Mandate['autonomyMode'];
  serviceCategory: string;
  goalHint: string;
  savedAt: string;
}

export const REHEARSAL_MANDATE: Mandate = {
  goal: "Commercial fridge down before lunch. Stay under £500. We're in N1.",
  budget: { maxAmount: 500, currency: 'GBP' },
  serviceCategory: 'commercial_refrigeration',
  serviceArea: { postalDistrict: 'N1', radiusKm: 8 },
  latestCompletionAt: 'today-before-lunch',
  allowedActions: ['SOURCE', 'COMPARE', 'COMMIT'],
  requiredEvidence: ['completion_photo', 'temperature_reading'],
  autonomyMode: 'DELEGATE',
  expiresAt: 'today',
};

export function rehearsalMission(status: string, overrides: Partial<Mission> = {}): Mission {
  const now = '2026-08-11T10:12:00.000Z';
  return {
    id: 'rehearsal-n1-fridge',
    goal: REHEARSAL_MANDATE.goal,
    status,
    mandate: REHEARSAL_MANDATE,
    buyerId: 'rehearsal_n1_cafe',
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const REHEARSAL_OFFERS: Offer[] = [
  {
    id: 'reh_off_coldcare',
    missionId: 'rehearsal-n1-fridge',
    supplierAgentId: 'London Rapid ColdCare',
    price: 480,
    currency: 'GBP',
    availability: 'Today, within 2 hours',
    terms: 'Emergency callout. F-Gas certified. Photo of the gauge when done.',
    explanation: 'In N1, same day, under your £500 ceiling.',
    status: 'OFFERED',
    createdAt: '2026-08-11T10:14:00.000Z',
  },
  {
    id: 'reh_off_capital',
    missionId: 'rehearsal-n1-fridge',
    supplierAgentId: 'Capital Kitchen Services',
    price: 420,
    currency: 'GBP',
    availability: 'Tomorrow morning',
    terms: 'Cheaper, but not before lunch service.',
    explanation: 'Under budget. Cannot make today.',
    status: 'OFFERED',
    createdAt: '2026-08-11T10:14:20.000Z',
  },
  {
    id: 'reh_off_east',
    missionId: 'rehearsal-n1-fridge',
    supplierAgentId: 'East London Catering Technicians',
    price: 580,
    currency: 'GBP',
    availability: 'Today, within 4 hours',
    terms: 'Can come today, but this sits £80 over your ceiling.',
    explanation: 'Blocked by your rules. We will not book this unless you raise the budget.',
    status: 'BLOCKED',
    createdAt: '2026-08-11T10:14:40.000Z',
  },
];

export const REHEARSAL_BLOCKED_OFFER_ID = 'reh_off_east';

export function rehearsalEvents(upTo: 'sourcing' | 'quotes' | 'booked' | 'done', bookedName?: string): Event[] {
  const base: Event[] = [
    {
      id: 'reh_ev_1',
      missionId: 'rehearsal-n1-fridge',
      type: 'MISSION_CREATED',
      actor: 'you',
      payload: { note: 'Fridge down before lunch' },
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_1',
      createdAt: '2026-08-11T10:12:00.000Z',
    },
    {
      id: 'reh_ev_2',
      missionId: 'rehearsal-n1-fridge',
      type: 'MANDATE_CONFIRMED',
      actor: 'you',
      payload: { max: 500, area: 'N1' },
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_2',
      createdAt: '2026-08-11T10:12:40.000Z',
    },
    {
      id: 'reh_ev_3',
      missionId: 'rehearsal-n1-fridge',
      type: 'SOURCING_STARTED',
      actor: 'yaler',
      payload: { district: 'N1' },
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_3',
      createdAt: '2026-08-11T10:13:00.000Z',
    },
  ];

  if (upTo === 'sourcing') return base;

  base.push(
    {
      id: 'reh_ev_4',
      missionId: 'rehearsal-n1-fridge',
      type: 'OFFERS_RECEIVED',
      actor: 'yaler',
      payload: { count: 3 },
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_4',
      createdAt: '2026-08-11T10:14:40.000Z',
    },
    {
      id: 'reh_ev_5',
      missionId: 'rehearsal-n1-fridge',
      type: 'POLICY_ESCALATE',
      actor: 'yaler',
      payload: { reason: 'One quote is £80 over the £500 ceiling' },
      policyResult: 'ESCALATE',
      idempotencyKey: 'reh_5',
      createdAt: '2026-08-11T10:14:45.000Z',
    },
  );

  if (upTo === 'quotes') return base;

  base.push({
    id: 'reh_ev_6',
    missionId: 'rehearsal-n1-fridge',
    type: 'COMMITTED',
    actor: 'you',
    payload: { engineer: bookedName || 'London Rapid ColdCare' },
    policyResult: 'ALLOW',
    idempotencyKey: 'reh_6',
    createdAt: '2026-08-11T10:16:00.000Z',
  });

  if (upTo === 'booked') return base;

  base.push(
    {
      id: 'reh_ev_7',
      missionId: 'rehearsal-n1-fridge',
      type: 'EVIDENCE_VERIFIED',
      actor: 'yaler',
      payload: { photo: 'gauge at 3°C' },
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_7',
      createdAt: '2026-08-11T12:40:00.000Z',
    },
    {
      id: 'reh_ev_8',
      missionId: 'rehearsal-n1-fridge',
      type: 'RECEIPT_ISSUED',
      actor: 'yaler',
      payload: {},
      policyResult: 'ALLOW',
      idempotencyKey: 'reh_8',
      createdAt: '2026-08-11T12:41:00.000Z',
    },
  );

  return base;
}

export function rehearsalReceipt(engineer: string, amount: number): ProofReceipt {
  return {
    id: 'reh_rcpt_n1_fridge',
    missionId: 'rehearsal-n1-fridge',
    summary: `Walk-in fridge back up in N1. ${engineer} attended before lunch.`,
    agreedTerms: `${engineer} replaced the compressor relay, stayed on site until the gauge held at 3°C, and left a photo. Paid £${amount} of a £500 ceiling.`,
    milestones: ['Booked', 'On site', 'Photo checked'],
    evidenceLabels: ['Completion photo', 'Temperature reading 3°C', 'Within the £500 ceiling'],
    redactedEvidence: {
      kitchen: 'A café in N1',
      engineer,
      paid: `£${amount}`,
    },
    rating: 5,
    ratingComment: 'Fixed before lunch. No food lost. Would book again.',
    shareToken: 'rehearsal-n1',
    humanReviewed: false,
    createdAt: '2026-08-11T12:41:00.000Z',
  };
}

export function loadSavedMandate(): SavedMandate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REHEARSAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedMandate;
  } catch {
    return null;
  }
}

export function saveMandate(next: SavedMandate): void {
  window.localStorage.setItem(REHEARSAL_STORAGE_KEY, JSON.stringify(next));
}

export function clearSavedMandate(): void {
  window.localStorage.removeItem(REHEARSAL_STORAGE_KEY);
}
