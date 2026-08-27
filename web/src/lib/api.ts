const PRODUCTION_API = 'https://yaler-backend-48617502162.europe-west2.run.app';

const getApiBase = () => {
  if (import.meta.env.PUBLIC_API_URL) return import.meta.env.PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return PRODUCTION_API;
  }
  return 'http://localhost:8081';
};
export const API_BASE = getApiBase();

export interface Mandate {
  goal: string;
  budget: { maxAmount: number; currency: string };
  serviceCategory: string;
  serviceArea: { postalDistrict: string; radiusKm: number };
  latestCompletionAt: string;
  allowedActions: string[];
  requiredEvidence: string[];
  autonomyMode: 'DELEGATE' | 'COLLABORATE' | 'OBSERVE';
  expiresAt: string;
}

export interface Mission {
  id: string;
  goal: string;
  status: string;
  mandate: Mandate;
  buyerId: string;
  selectedSupplierId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  experimentCohort?: string;
}

export interface Offer {
  id: string;
  missionId: string;
  supplierAgentId: string;
  calloutId?: string;
  price: number;
  currency: string;
  availability: string;
  terms: string;
  score?: number;
  explanation?: string;
  status: string;
  createdAt: string;
  simulated?: boolean;
}

export interface Event {
  id: string;
  missionId: string;
  type: string;
  actor: string;
  payload: any;
  policyResult: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface ProofReceipt {
  id: string;
  missionId: string;
  summary: string;
  agreedTerms: string;
  milestones: string[];
  evidenceLabels: string[];
  redactedEvidence: Record<string, string>;
  shareToken: string;
  humanReviewed: boolean;
  createdAt: string;
  rating?: number;
  ratingComment?: string;
  selectionRationale?: string;
}

export interface Supplier {
  id: string;
  displayName: string;
  capabilities: string[];
  serviceArea: { postalDistrict: string; radiusKm: number };
  availability: string;
  reliabilityScore: number;
  priceTier: string;
  evidence: string[];
  status: string;
  verified?: boolean;
  contact?: string;
  source?: string;
}

export type CalloutStatus = 'SENT' | 'OFFERED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export interface Callout {
  id: string;
  missionId: string;
  supplierId: string;
  status: CalloutStatus;
  message: string;
  sentAt: string;
  expiresAt: string;
  respondedAt?: string;
  simulated: boolean;
}

export interface CalloutOfferResult {
  callout: Callout;
  offer: Offer;
  mission: Mission | null;
}

export async function listCallouts(missionId: string): Promise<Callout[]> {
  const res = await fetch(`${API_BASE}/api/missions/${missionId}/callouts`);
  if (!res.ok) throw new Error('Failed to list callouts');
  return res.json();
}

export async function submitCalloutOffer(calloutId: string, body: { price?: number; currency?: string; eta?: string; terms?: string; decline?: boolean }): Promise<CalloutOfferResult> {
  const res = await fetch(`${API_BASE}/api/callouts/${calloutId}/offer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.PUBLIC_OPS_TOKEN ? { 'X-Ops-Token': import.meta.env.PUBLIC_OPS_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Failed to submit quote (${res.status})${err ? `: ${err}` : ''}`);
  }
  return res.json();
}

export async function onboardSupplier(input: {
  displayName: string;
  contact: string;
  postalDistrict: string;
  radiusKm?: number;
  capabilities: string[];
  priceTier?: string;
  availability?: string;
  evidence?: string[];
}): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/api/suppliers/onboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.PUBLIC_OPS_TOKEN ? { 'X-Ops-Token': import.meta.env.PUBLIC_OPS_TOKEN } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to onboard supplier');
  return res.json();
}

// Resume a stalled mission: an ESCALATED mission moves back to
// MANDATE_CONFIRMED and re-runs sourcing with fresh callouts (FR-6).
export async function resumeMission(missionId: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/missions/${missionId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.PUBLIC_OPS_TOKEN ? { 'X-Ops-Token': import.meta.env.PUBLIC_OPS_TOKEN } : {}),
    },
    body: '{}',
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Failed to resume mission (${res.status})${err ? `: ${err}` : ''}`);
  }
  return res.json();
}

// Buyer rates a completed job (1..5). Recomputes the supplier's
// ReliabilityScore from their full feedback history.
export interface MissionFeedback {
  id: string;
  missionId: string;
  supplierId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export async function submitMissionFeedback(
  missionId: string,
  rating: number,
  comment?: string,
): Promise<{ feedback: MissionFeedback; supplier: Supplier }> {
  const res = await fetch(`${API_BASE}/api/missions/${missionId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Failed to submit feedback (${res.status})${err ? `: ${err}` : ''}`);
  }
  return res.json();
}

export async function createMission(goal: string, buyerId = 'buyer_london_cafe_1'): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/missions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, buyerId }),
  });
  if (!res.ok) throw new Error('Failed to create mission');
  return res.json();
}

export async function getMission(id: string): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/missions/${id}`);
  if (!res.ok) throw new Error('Mission not found');
  return res.json();
}

export async function listMissions(): Promise<Mission[]> {
  const res = await fetch(`${API_BASE}/api/missions`);
  if (!res.ok) throw new Error('Failed to list missions');
  return res.json();
}

export async function updateMandate(id: string, mandate: Mandate, confirm = false): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/mandate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mandate, confirm }),
  });
  if (!res.ok) throw new Error('Failed to update mandate');
  return res.json();
}

export async function startMission(id: string): Promise<{ message: string; missionId: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/start`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start mission');
  return res.json();
}

export async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/events`);
  if (!res.ok) throw new Error('Failed to get events');
  return res.json();
}

export async function getOffers(id: string): Promise<Offer[]> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/offers`);
  if (!res.ok) throw new Error('Failed to get offers');
  return res.json();
}

export async function approveException(id: string, action: 'APPROVE' | 'REJECT' | 'REROUTE', selectedOfferId?: string, newMaxBudget?: number): Promise<Mission> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, selectedOfferId, newMaxBudget }),
  });
  if (!res.ok) throw new Error('Failed to process approval');
  return res.json();
}

export async function submitEvidence(id: string, milestoneId: string, textReport: string, photoUrl?: string): Promise<{ mission: Mission; evidence: any }> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneId, textReport, photoUrl }),
  });
  if (!res.ok) throw new Error('Failed to submit evidence');
  return res.json();
}

export async function getProofReceipt(id: string): Promise<ProofReceipt> {
  const res = await fetch(`${API_BASE}/api/missions/${id}/receipt`);
  if (!res.ok) throw new Error('Proof receipt not found');
  return res.json();
}

export async function getProofReceiptByToken(token: string): Promise<ProofReceipt> {
  const res = await fetch(`${API_BASE}/api/receipts/share/${token}`);
  if (!res.ok) throw new Error('Invalid or expired proof receipt token');
  return res.json();
}

export interface FoundEngineer {
  name: string;
  url: string;
  label: string;
  bookable: boolean;
}

export interface CredentialCheck {
  name: string;
  status: 'listed' | 'not_checked';
  register?: string;
  asOf?: string;
  detail?: string;
}

export async function findNearby(category = 'commercial_refrigeration', district = 'N1'): Promise<FoundEngineer[]> {
  const res = await fetch(`${API_BASE}/api/discovery?category=${encodeURIComponent(category)}&district=${encodeURIComponent(district)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.found) ? data.found : [];
}

export async function checkCredential(name: string): Promise<CredentialCheck> {
  const res = await fetch(`${API_BASE}/api/credentials?name=${encodeURIComponent(name)}`);
  if (!res.ok) return { name, status: 'not_checked' };
  return res.json();
}

// Probe a real credential check against a known roster supplier. Used by
// the ops console to surface whether the Companies House/Apify check is
// actually working (and to expose the one-click Apify approval link when
// Apify refuses to run the actor before account approval).
export async function probeCredentialCheck(): Promise<CredentialCheck> {
  const res = await fetch(
    `${API_BASE}/api/credentials?name=${encodeURIComponent('Commercial Refrigeration Services London')}`,
  );
  if (!res.ok) return { name: 'Commercial Refrigeration Services London', status: 'not_checked' };
  return res.json();
}

export async function listSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/api/suppliers`);
  if (!res.ok) throw new Error('Failed to list suppliers');
  return res.json();
}

export async function uploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}

export interface Stats {
  completed: number;
  distinctBuyers: number;
  totalMissions: number;
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
