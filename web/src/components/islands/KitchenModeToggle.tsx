import React, { useEffect, useState } from 'react';
import { isKitchenModeEnabled, setKitchenMode, playUiSound } from '../../lib/delight';

/**
 * Opt-in sound toggle for the nav bar. When enabled, UI sounds play
 * on key events so kitchen staff don't have to watch the screen.
 */

export default function KitchenModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isKitchenModeEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setKitchenMode(next);
    if (next) playUiSound('ding'); // Confirm sound works
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'Sound on (kitchen mode)' : 'Sound off'}
      className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150 ${
        enabled ? 'bg-mandate/10 text-mandate' : 'text-ink-muted hover:text-ink hover:bg-paper-inset'
      }`}
      aria-label={enabled ? 'Disable kitchen mode sounds' : 'Enable kitchen mode sounds'}
      aria-pressed={enabled}
    >
      {enabled ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
