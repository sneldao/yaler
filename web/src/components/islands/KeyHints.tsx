import React, { useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';

/**
 * Global keyboard shortcuts + a floating cheat-sheet.
 *
 *  /  — focus the job box (only exists on /missions/new)
 *  r  — go to the rehearsal
 *  ?  — toggle this cheat-sheet
 *  Esc — close the cheat-sheet (other modals keep handling their own Escape)
 *
 * Shortcuts never fire while the user is typing in a field, and never with
 * a modifier held (so Cmd+R etc. keep working).
 */

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Jump to the job box (new-job page)' },
  { keys: ['R'], label: 'Go to the rehearsal' },
  { keys: ['?'], label: 'Show or hide this card' },
  { keys: ['Esc'], label: 'Close this card' },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export default function KeyHints() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Escape only ever closes OUR cheat-sheet — nothing else is hijacked.
      if (e.key === 'Escape') {
        if (openRef.current) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }

      if (isTypingTarget(e.target)) return;

      // '?' is shift+'/' on most layouts — check it before '/'.
      if (e.key === '?') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.key === '/') {
        const textarea = document.getElementById('mission-goal-input') as HTMLTextAreaElement | null;
        if (textarea) {
          e.preventDefault();
          textarea.focus();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        navigate('/rehearsal');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      className="fixed bottom-4 right-4 z-[100] w-72 max-w-[calc(100vw-2rem)] paper-card rounded-2xl shadow-paper p-4 animate-pop-in"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-display text-base text-ink">Keyboard shortcuts</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close keyboard shortcuts"
          className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-paper-inset transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>
      <ul className="space-y-2.5">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm text-ink-muted">
            <span>{s.label}</span>
            <span className="flex gap-1 shrink-0">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="inline-block min-w-[1.5rem] text-center rounded-md border border-ink/15 bg-paper-inset px-1.5 py-0.5 text-[11px] font-mono text-ink shadow-[0_1px_0_rgba(18,33,43,0.15)]"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
