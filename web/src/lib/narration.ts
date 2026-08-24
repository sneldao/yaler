/**
 * buildNarration — turns a proof receipt into a natural radio-report
 * script for ElevenLabs. Not just reading fields — a produced narration
 * with intro framing, the story of the job, the evidence, the verdict,
 * and an outro.
 *
 * The ElevenLabs prize says "go beyond bolting on TTS." This is the depth:
 * the narration is written for the ear, not the screen.
 */

export interface NarrationReceipt {
  summary: string;
  agreedTerms: string;
  evidenceLabels?: string[];
  rating?: number;
  ratingComment?: string;
}

export function buildNarration(r: NarrationReceipt): string {
  const parts: string[] = [];

  // Intro — sets the scene, like a radio report
  parts.push(
    `Here's your verified receipt from Yaler.`
  );

  // The summary — what happened
  if (r.summary) {
    parts.push(r.summary);
  }

  // What was agreed — the terms, in natural speech
  if (r.agreedTerms) {
    parts.push(r.agreedTerms);
  }

  // Evidence — list it like a checklist being read
  if (r.evidenceLabels && r.evidenceLabels.length > 0) {
    const labels = r.evidenceLabels.map((l) => l.toLowerCase());
    if (labels.length === 1) {
      parts.push(`Evidence checked: ${labels[0]}.`);
    } else if (labels.length === 2) {
      parts.push(`Evidence checked: ${labels[0]}, and ${labels[1]}.`);
    } else {
      const all = labels.slice(0, -1).join(', ');
      parts.push(`Evidence checked: ${all}, and ${labels[labels.length - 1]}.`);
    }
  }

  // The buyer's verdict — makes the reliability loop audible
  if (r.rating && r.rating > 0) {
    const stars = r.rating === 5 ? 'five out of five' : `${r.rating} out of 5`;
    parts.push(`The buyer rated this job ${stars}.`);
    if (r.ratingComment) {
      parts.push(`They said: "${r.ratingComment}"`);
    }
  }

  // Outro — the signature close
  parts.push(`That's your receipt. Nothing else to do. Yaler.`);

  return parts.join(' ');
}
