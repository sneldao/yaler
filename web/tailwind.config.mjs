/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12212B',
          muted: '#5C5348',
        },
        paper: {
          DEFAULT: '#F4EFE6',
          raised: '#FFFAF3',
          inset: '#E8E1D4',
        },
        mandate: {
          DEFAULT: '#2A6F6A',
          light: '#E4F0EF',
        },
        escalate: {
          DEFAULT: '#C45C26',
          light: '#F8E6DA',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        paper: '0 1px 0 rgba(255,255,255,0.65) inset, 0 10px 28px -18px rgba(18, 33, 43, 0.28)',
        receipt: '0 18px 40px -24px rgba(18, 33, 43, 0.35)',
      },
      // ring-mandate already generates via colors.mandate.DEFAULT (verified);
      // pinned explicitly so the focus-ring colour can't drift.
      ringColor: {
        mandate: '#2A6F6A',
      },
      transitionTimingFunction: {
        yaler: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
};
