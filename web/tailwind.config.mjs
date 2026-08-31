/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  // Dark mode is driven by a `.dark` class on <html> (set pre-paint by the
  // inline head script, toggled by the ThemeToggle island). Every brand
  // colour is a `rgb(var(--…-rgb) / <alpha-value>)` channel so opacity
  // modifiers (bg-mandate/20, border-ink/15, text-ink-muted/70, …) keep
  // working; the channel values themselves flip in global.css's `.dark`.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',
          raised: 'rgb(var(--paper-raised-rgb) / <alpha-value>)',
          inset: 'rgb(var(--paper-inset-rgb) / <alpha-value>)',
        },
        mandate: {
          DEFAULT: 'rgb(var(--mandate-rgb) / <alpha-value>)',
          light: 'rgb(var(--mandate-light-rgb) / <alpha-value>)',
        },
        escalate: {
          DEFAULT: 'rgb(var(--escalate-rgb) / <alpha-value>)',
          light: 'rgb(var(--escalate-light-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // The agent's machine voice — a thermal/terminal face for all data
        // (numerals, statuses, timestamps). The human voice stays serif.
        machine: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // The kitchen's handwriting — sharpie margin notes over the machine
        // output. Used sparingly, never for body copy.
        hand: ['"Caveat"', 'cursive'],
      },
      boxShadow: {
        // Theme-aware: --highlight-inset / --shadow-rgb flip in .dark (the
        // white top-glint would glow on a dark card, the ink shadow would
        // vanish — in dark, elevation reads via a lighter surface + black).
        paper: '0 1px 0 var(--highlight-inset) inset, 0 10px 28px -18px rgb(var(--shadow-rgb) / 0.28)',
        // Receipts are physical artifacts — always light paper with the same
        // ink shadow in both themes (see .receipt-sheet in global.css).
        receipt: '0 18px 40px -24px rgba(18, 33, 43, 0.35)',
      },
      // ring-mandate already generates via colors.mandate.DEFAULT (verified);
      // pinned explicitly so the focus-ring colour can't drift. Channel-based
      // so the ring follows the theme (brightened teal in .dark).
      ringColor: {
        mandate: 'rgb(var(--mandate-rgb) / <alpha-value>)',
      },
      transitionTimingFunction: {
        yaler: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
};
