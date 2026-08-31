import React, { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';

interface GameResult {
  elapsed: number;
  stars: number;
  totalCost: number;
  decisions: string[];
  mode?: 'yaler' | 'manual';
  totalAllIn?: number;
  calls?: number;
}

export default function KitchenGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const modeRef = useRef<'yaler' | 'manual'>('yaler');
  const [status, setStatus] = useState<'loading' | 'playing' | 'done'>('loading');
  const [result, setResult] = useState<GameResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let destroyed = false;
    let started = false;

    // Phaser + the scene only ever load through this dynamic import, so they
    // never land in the initial bundle — and the heavy chunk isn't fetched
    // until the game scrolls near the viewport.
    const start = () => {
      if (started || destroyed) return;
      started = true;
      import('./config').then(({ createGame }) => {
        if (destroyed) return;
        const game = createGame(container, modeRef.current);
        gameRef.current = game;
        setStatus('playing');
      });
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            start();
          }
        },
        { rootMargin: '240px' },
      );
      observer.observe(container);
    } else {
      start();
    }

    const handleComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail as GameResult;
      setResult(detail);
      setStatus('done');
    };
    window.addEventListener('yaler:game-complete', handleComplete);

    return () => {
      destroyed = true;
      observer?.disconnect();
      window.removeEventListener('yaler:game-complete', handleComplete);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play` : '/play';
  const shareText = !result
    ? ''
    : result.mode === 'manual'
      ? `I ran Café Noor's shift WITHOUT Yaler: ${result.calls} calls, ${result.elapsed}s of my life, £${result.totalAllIn} all-in with spoilage. There has to be a better way:`
      : `Café Noor shift complete: 3 repairs in ${result.elapsed}s, £${result.totalCost} total. ${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)} Try the Yaler kitchen game:`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Yaler Kitchen Game', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { /* fallback */ }
    }
  };

  const handleReplay = (nextMode?: 'yaler' | 'manual') => {
    if (nextMode) modeRef.current = nextMode;
    setStatus('loading');
    setResult(null);
    setCopied(false);
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setTimeout(() => {
      if (!containerRef.current) return;
      import('./config').then(({ createGame }) => {
        const game = createGame(containerRef.current!, modeRef.current);
        gameRef.current = game;
        setStatus('playing');
      });
    }, 100);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper rounded-2xl z-10">
          <span className="receipt-punch" />
          <p className="font-display text-lg text-ink">Loading Café Noor…</p>
          <p className="text-xs text-ink-muted">This should only take a moment.</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full aspect-video rounded-2xl overflow-hidden shadow-paper bg-paper border border-ink/10"
      />

      {status === 'done' && result && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-20 animate-pop-in overflow-y-auto">
          <div className="receipt-sheet max-w-sm w-full p-6 space-y-4 relative">
            <div className="absolute -left-1.5 top-10 receipt-punch" />
            <div className="absolute -right-1.5 top-10 receipt-punch" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted font-machine">Café Noor — N1</p>
                <h2 className="font-display text-2xl text-ink mt-0.5">
                  {result.mode === 'manual' ? 'Phone shift' : 'Shift complete'}
                </h2>
              </div>
              <span className={`stamp ${result.mode === 'manual' ? 'text-escalate' : 'text-mandate'}`}>
                {result.mode === 'manual' ? 'Phone' : 'Delegate'}
              </span>
            </div>

            <p className="text-2xl text-ink leading-none tracking-tight">
              {'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}
              <span className="text-sm text-ink-muted ml-2 font-medium align-middle">
                {result.stars === 3 ? 'Clean shift' : result.stars === 2 ? 'One overspend' : 'Rough morning'}
              </span>
            </p>

            <div className="flex items-center justify-between gap-2">
              {result.mode === 'manual' ? (
                <>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '-0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-ink">{result.calls}</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">calls</p>
                  </div>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-ink">~11 hrs</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">shift</p>
                  </div>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '-0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-escalate">£{result.totalAllIn}</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">all-in</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '-0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-mandate">{result.elapsed}s</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">shift</p>
                  </div>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-ink">~11 hrs</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">manual</p>
                  </div>
                  <div className="chit chit-sm px-3 pt-4 pb-1.5 flex-1 text-center" style={{ '--tilt': '-0.5deg' } as React.CSSProperties}>
                    <p className="font-display text-lg text-ink">£{result.totalCost}</p>
                    <p className="font-machine text-[9px] uppercase tracking-wider text-ink-muted">cost</p>
                  </div>
                </>
              )}
            </div>

            <p className="text-sm text-ink-muted leading-relaxed">
              {result.mode === 'manual'
                ? 'Every quote chased by phone — and the fridge still warmed.'
                : result.decisions.includes('rerouted')
                  ? 'You rejected the overspend and the agent found a cheaper option.'
                  : result.decisions.includes('approved')
                    ? 'You approved an over-budget spend.'
                    : 'All three events resolved within budget.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {result.mode === 'manual' ? (
                <button type="button" onClick={() => handleReplay('yaler')} className="btn-primary text-sm py-2.5 flex-1">
                  Play with Yaler
                </button>
              ) : (
                <>
                  <a href="/missions/new" className="btn-primary text-sm py-2.5 flex-1 text-center">
                    Try your kitchen
                  </a>
                  <button type="button" onClick={() => handleReplay('manual')} className="btn-secondary text-sm py-2.5 flex-1">
                    Phone version
                  </button>
                </>
              )}
              <a href="/rehearsal" className="btn-secondary text-sm py-2.5 flex-1 text-center">
                Try the real interface
              </a>
              <button
                type="button"
                onClick={handleShare}
                className="btn-secondary text-sm py-2.5 flex-1 flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <><span className="text-mandate">✓</span> Copied</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="16,6 12,2 8,6" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
