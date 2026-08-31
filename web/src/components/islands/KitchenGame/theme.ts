/**
 * Paper/ink tokens for the Phaser kitchen diorama.
 * These mirror the CSS custom properties in src/styles/global.css
 * and the Tailwind theme in tailwind.config.mjs.
 */

export const COLORS = {
  ink: 0x12212b,
  inkMuted: 0x5c5348,
  paper: 0xf4efe6,
  paperRaised: 0xfffaf3,
  paperInset: 0xe8e1d4,
  mandate: 0x2a6f6a,
  mandateLight: 0xe4f0ef,
  escalate: 0xc45c26,
  escalateLight: 0xf8e6da,
} as const;

export const FONTS = {
  display: '"Source Serif 4", Georgia, "Times New Roman", serif',
  machine: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  hand: '"Caveat", cursive',
} as const;

export const CSS_HEX = {
  ink: '#12212b',
  paper: '#f4efe6',
  paperRaised: '#fffaf3',
  paperInset: '#e8e1d4',
  mandate: '#2a6f6a',
  escalate: '#c45c26',
} as const;
