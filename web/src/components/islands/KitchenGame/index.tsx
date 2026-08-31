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
        <div className="absolute inset-0 flex items-center justify-center bg-paper/90 rounded-2xl z-20 animate-pop-in overflow-y-auto p-4">
          <div className="receipt-sheet text-center space-y-4 p-6 max-w-sm w-full text-ink">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted font-machine">Café Noor — Tuesday shift</p>
              <p className="font-display text-3xl text-ink mt-1">
                {result.mode === 'manual' ? 'Phone shift complete' : 'Shift complete'}
              </p>
              <p className={`text-lg mt-1 ${result.mode === 'manual' ? 'text-ink-muted' : 'text-mandate'}`}>
                {'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-6 font-machine">
              {result.mode === 'manual' ? (
                <>
                  <div className="text-center">
                    <p className="font-display text-2xl text-ink">{result.calls}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Calls chased</p>
                  </div>
                  <span className="text-ink/20 text-sm">vs</span>
                  <div className="text-center">
                    <p className="font-display text-2xl text-ink-muted">~11 hrs</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Of shift</p>
                  </div>
                  <span className="text-ink/20 text-sm">|</span>
                  <div className="text-center">
                    <p className="font-display text-2xl text-ink">£{result.totalAllIn}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">All-in</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="font-display text-2xl text-mandate">{result.elapsed}s</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Your shift</p>
                  </div>
                  <span className="text-ink/20 text-sm">vs</span>
                  <div className="text-center">
                    <p className="font-display text-2xl text-ink-muted">~11 hrs</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Manual</p>
                  </div>
                  <span className="text-ink/20 text-sm">|</span>
                  <div className="text-center">
                    <p className="font-display text-2xl text-ink">£{result.totalCost}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Total cost</p>
                  </div>
                </>
              )}
            </div>

            <p className="text-ink-muted text-xs leading-relaxed">
              {result.mode === 'manual'
                ? 'Every quote chased by phone, every wait unpaid — and the fridge warmed anyway. The agent does this before the kettle boils.'
                : result.decisions.includes('rerouted')
                  ? 'Good governance — you rejected the overspend and the agent found a cheaper option.'
                  : result.decisions.includes('approved')
                    ? 'You approved an over-budget spend. Rejecting would have triggered a reroute.'
                    : 'Clean shift. All events resolved within budget.'}
            </p>

            {result.mode !== 'manual' && (
              <p className="text-ink-muted/80 text-[10px]">
                By phone, this same shift is ~11 hrs and ~£2,810 all-in — pricier quotes, spoiled stock, lost covers. Prove it to yourself:
              </p>
            )}

            {/* Chit / stamp motifs */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className="bg-paper-raised border border-ink/10 rounded-full text-[11px] text-ink px-2.5 py-1 font-medium">
                Budget: £500
              </span>
              <span className="bg-paper-raised border border-ink/10 rounded-full text-[11px] text-ink px-2.5 py-1 font-medium">
                District: N1
              </span>
              {result.mode === 'manual' ? (
                <span className="stamp text-escalate text-[11px] px-2.5 py-1">
                  You, on the phone
                </span>
              ) : (
                <span className="stamp text-mandate text-[11px] px-2.5 py-1">
                  Delegate mode
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {result.mode === 'manual' ? (
                <button type="button" onClick={() => handleReplay('yaler')} className="btn-primary text-sm py-2.5 w-full">
                  Play with Yaler instead
                </button>
              ) : (
                <>
                  <a href="/missions/new" className="btn-primary text-sm py-2.5 w-full text-center">
                    Try it with your real kitchen
                  </a>
                  <button type="button" onClick={() => handleReplay('manual')} className="btn-secondary text-sm py-2 w-full">
                    Play the phone version — same shift, no agent
                  </button>
                </>
              )}
              <div className="flex gap-2">
                <a href="/rehearsal?autoplay" className="btn-secondary text-sm py-2 flex-1 text-center">
                  Watch the flow
                </a>
                {result.mode === 'manual' && (
                  <a href="/missions/new" className="btn-secondary text-sm py-2 flex-1 text-center">
                    Start a real job
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn-secondary text-sm py-2 flex-1 flex items-center justify-center gap-1.5"
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
                      Share score
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
