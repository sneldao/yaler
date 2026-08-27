import React, { useEffect, useState } from 'react';

/**
 * ThemeToggle — cycles system → light → dark. The choice persists to
 * localStorage('yaler-theme'); "system" means no stored value and the
 * pre-paint head script follows prefers-color-scheme. The .dark class is
 * applied to <html>; every colour resolves through the channel vars in
 * global.css, so this component only ever flips one class.
 */

type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'yaler-theme';

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* private mode */
  }
  return 'system';
}

function apply(choice: ThemeChoice): void {
  const dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<ThemeChoice, string> = {
  system: 'Theme follows your device. Activate for light mode.',
  light: 'Light mode. Activate for dark mode.',
  dark: 'Dark mode. Activate to follow your device.',
};

export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    const initial = readChoice();
    setChoice(initial);
    apply(initial);
    // If set to system, follow OS changes live.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (readChoice() === 'system') apply('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const cycle = () => {
    const next = NEXT[choice];
    setChoice(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* private mode */
    }
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={LABEL[choice]}
      aria-pressed={choice === 'dark'}
      title={LABEL[choice]}
      className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
    >
      {choice === 'dark' ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : choice === 'light' ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" strokeLinecap="round" />
        </svg>
      )}
      <span className="text-[11px]">{choice === 'system' ? 'Auto' : choice === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
