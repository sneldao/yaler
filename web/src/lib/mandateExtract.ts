/**
 * Client-side mandate extraction from a free-text transcript.
 *
 * In a real job, Gemini does this on the backend. In the rehearsal,
 * we use lightweight regex to pull budget, area, deadline, and category
 * from what the user said — so the mandate chips update when they speak.
 */

export interface ExtractedMandate {
  budget: number | null;
  currency: string;
  postalDistrict: string | null;
  deadlineHint: string | null;
  category: string | null;
}

const POSTCODE_RE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/g;

const CATEGORY_KEYWORDS: { pattern: RegExp; category: string }[] = [
  { pattern: /\bfridge\b|\brefrigerat/i, category: 'commercial_refrigeration' },
  { pattern: /\bfreezer\b/i, category: 'freezer_maintenance' },
  { pattern: /\bextract/i, category: 'extraction_cleaning' },
  { pattern: /\boven\b|\brange\b|\bcooker\b/i, category: 'catering_equipment' },
  { pattern: /\bdishwash/i, category: 'catering_equipment' },
  { pattern: /\bemergency\b|\burgent\b/i, category: 'emergency_repair' },
];

const DEADLINE_KEYWORDS: { pattern: RegExp; hint: string }[] = [
  { pattern: /\bbefore lunch\b|\blunch\b/i, hint: 'today-before-lunch' },
  { pattern: /\bbefore (?:service|dinner|opening)\b/i, hint: 'today-before-service' },
  { pattern: /\btoday\b|\basap\b|\bnow\b|\bright now\b/i, hint: 'today' },
  { pattern: /\btomorrow\b/i, hint: 'tomorrow' },
  { pattern: /\bthis (?:evening|afternoon)\b/i, hint: 'today-evening' },
  { pattern: /\bend of (?:the )?day\b/i, hint: 'today-eod' },
];

export function extractMandate(transcript: string): ExtractedMandate {
  const text = transcript.trim();
  if (!text) {
    return { budget: null, currency: 'GBP', postalDistrict: null, deadlineHint: null, category: null };
  }

  // Budget: "£500", "500 pounds", "budget of 300", "300 quid"
  const budgetMatch = text.match(/(?:£|gbp|pounds?|quid)\s*(\d{2,5})|(\d{2,5})\s*(?:£|gbp|pounds?|quid)/i);
  const budgetNum = budgetMatch ? Number(budgetMatch[1] || budgetMatch[2]) : null;

  // Also check "budget of N" / "budget N" / "up to N" / "spend N"
  const budgetPhraseMatch = !budgetNum
    ? text.match(/(?:budget(?:\s+(?:of|is|around))?\s+|up to\s+|spend(?:ing)?\s+|max(?:imum)?\s+|ceiling\s+)(\d{2,5})/i)
    : null;
  const finalBudget = budgetNum || (budgetPhraseMatch ? Number(budgetPhraseMatch[1]) : null);

  // Postcode district
  const upperText = text.toUpperCase();
  const postcodeMatches = [...upperText.matchAll(POSTCODE_RE)];
  // Filter out common false positives (single letters like "I" or "A")
  const validPostcodes = postcodeMatches
    .map((m) => m[1])
    .filter((pc) => /^[A-Z]{1,2}\d/.test(pc));
  const postalDistrict = validPostcodes[0] || null;

  // Deadline
  const deadlineMatch = DEADLINE_KEYWORDS.find((d) => d.pattern.test(text));
  const deadlineHint = deadlineMatch?.hint || null;

  // Category
  const categoryMatch = CATEGORY_KEYWORDS.find((c) => c.pattern.test(text));
  const category = categoryMatch?.category || null;

  return {
    budget: finalBudget,
    currency: 'GBP',
    postalDistrict,
    deadlineHint,
    category,
  };
}

/**
 * Apply extracted mandate fields to a partial mandate object.
 * Only overwrites fields that were detected (non-null).
 */
export function applyExtractedMandate<T extends {
  budget: { maxAmount: number; currency: string };
  serviceArea: { postalDistrict: string };
  latestCompletionAt: string;
  serviceCategory: string;
}>(
  base: T,
  extracted: ExtractedMandate,
): T {
  return {
    ...base,
    budget: extracted.budget
      ? { ...base.budget, maxAmount: extracted.budget, currency: extracted.currency }
      : base.budget,
    serviceArea: extracted.postalDistrict
      ? { ...base.serviceArea, postalDistrict: extracted.postalDistrict }
      : base.serviceArea,
    serviceCategory: extracted.category || base.serviceCategory,
  };
}
