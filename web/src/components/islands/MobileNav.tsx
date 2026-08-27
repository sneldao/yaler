import React, { useState, useEffect } from 'react';

interface Props {
  currentPage: string;
}

/** True when the given route is the one the user is currently viewing. */
function isActive(path: string, currentPage: string): boolean {
  if (path === currentPage) return true;
  if (path === '/missions/new' && currentPage.startsWith('/missions/')) return true;
  return false;
}

/**
 * MobileNav — hamburger menu for small screens.
 * Renders the toggle button and a slide-down panel with active-state tracking.
 * Only mounts on client (used with client:load).
 */

export default function MobileNav({ currentPage }: Props) {
  const [open, setOpen] = useState(false);

  // Close on route change (Astro view transitions)
  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener('astro:after-swap', close);
    return () => document.removeEventListener('astro:after-swap', close);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navItems: { path: string; label: string }[] = [
    { path: '/rehearsal', label: 'Try the rehearsal' },
    { path: '/story', label: 'How it works' },
    { path: '/suppliers', label: 'Engineers' },
    { path: '/play', label: 'Play the game' },
    { path: '/missions/new', label: 'Start a real job' },
  ];

  return (
    <>
      {/* Hamburger button — visible only on mobile (sm:hidden in layout) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-ink hover:bg-paper-inset transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Overlay + slide-down menu */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-ink/30 z-40 animate-pop-in"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-12 left-0 right-0 z-50 bg-paper border-b border-ink/10 shadow-paper animate-pop-in">
            <nav className="max-w-3xl mx-auto px-5 py-4 flex flex-col gap-1" aria-label="Main navigation">
              {navItems.map(({ path, label }) => {
                const active = isActive(path, currentPage);
                return (
                  <a
                    key={path}
                    href={path}
                    className={[
                      'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                      active
                        ? 'text-mandate font-semibold bg-mandate/8'
                        : 'text-ink-muted hover:bg-paper-inset hover:text-ink',
                    ].join(' ')}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={[
                        'w-2 h-2 rounded-full shrink-0',
                        active ? 'bg-mandate' : 'bg-ink/20',
                      ].join(' ')}
                      aria-hidden
                    />
                    {label}
                  </a>
                );
              })}
              <div className="border-t border-ink/10 mt-2 pt-2">
                <p className="px-3 text-[11px] text-ink-muted">Cafe Noor · Dalston · N1</p>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
