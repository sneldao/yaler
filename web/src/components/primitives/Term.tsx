import React, { useState } from 'react';

/**
 * Term — inline keyword with a hover/tap definition tooltip.
 * Renders as a dotted-underline span that reveals a 1-line definition.
 */

const DEFINITIONS: Record<string, string> = {
  mandate: 'Your rules: budget, area, deadline, and what the agent can do without asking.',
  delegate: 'Handle it without asking. Stop only if it goes over budget or nobody can come.',
  collaborate: 'Find quotes and bring them back for a yes before booking.',
  observe: 'Look around and report back. No booking.',
  'policy engine': 'Deterministic code that validates every action. Gemini proposes, this decides.',
  escalation: 'The agent stops and asks you because something is outside the rules.',
  reroute: 'Reject the current option and search again with tighter constraints.',
  receipt: 'A verified record of what was requested, who accepted, and what happened.',
  'proof receipt': 'A verified record with photo evidence, PII redacted, and a share token.',
};

interface Props {
  children: string;
  definition?: string;
}

export default function Term({ children, definition }: Props) {
  const [show, setShow] = useState(false);

  const def = definition || DEFINITIONS[children.toLowerCase()] || null;
  if (!def) return <span>{children}</span>;

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow((s) => !s)}
    >
      <span className="border-b border-dashed border-ink/40 text-ink">
        {children}
      </span>
      {show && (
        <span
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-56 px-3 py-2 rounded-lg bg-ink text-paper text-xs leading-relaxed shadow-lg animate-pop-in pointer-events-none"
          role="tooltip"
        >
          {def}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-ink rotate-45 -mt-1" />
        </span>
      )}
    </span>
  );
}
