const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8081';

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
}

export interface Offer {
  id: string;
  missionId: string;
  supplierAgentId: string;
  price: number;
  currency: string;
  availability: string;
  terms: string;
  score?: number;
  explanation?: string;
  status: string;
  createdAt: string;
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
