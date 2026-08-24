import React, { useEffect, useRef, useState } from 'react';

interface GameResult {
  elapsed: number;
  stars: number;
  totalCost: number;
  decisions: string[];
}

export default function KitchenGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'done'>('loading');
  const [result, setResult] = useState<GameResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('./config').then(({ createGame }) => {
      if (destroyed) return;
      const game = createGame(containerRef.current!);
      gameRef.current = game;
      setStatus('playing');
    });

    const handleComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail as GameResult;
      setResult(detail);
      setStatus('done');
    };
    window.addEventListener('yaler:game-complete', handleComplete);

    return () => {
      destroyed = true;
      window.removeEventListener('yaler:game-complete', handleComplete);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play` : '/play';
  const shareText = result
    ? `Café Noor shift complete: 3 repairs in ${result.elapsed}s, £${result.totalCost} total. ${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)} Try the Yaler kitchen game:`
    : '';

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

  const handleReplay = () => {
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
        const game = createGame(containerRef.current!);
        gameRef.current = game;
        setStatus('playing');
      });
    }, 100);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1a2e] rounded-2xl z-10">
          <span className="receipt-punch" />
          <p className="font-display text-lg text-white/80">Loading Café Noor…</p>
          <p className="text-xs text-white/40">This should only take a moment.</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full aspect-video rounded-2xl overflow-hidden shadow-paper bg-[#1a1a2e]"
      />

      {status === 'done' && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/85 rounded-2xl z-20 animate-pop-in backdrop-blur-sm">
          <div className="text-center space-y-4 p-5 max-w-sm w-full">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Café Noor — Tuesday shift</p>
              <p className="font-display text-3xl text-white mt-1">Shift complete</p>
              <p className="text-mandate text-lg mt-1">{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</p>
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="font-display text-2xl text-mandate">{result.elapsed}s</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Your shift</p>
              </div>
              <span className="text-white/20 text-sm">vs</span>
              <div className="text-center">
                <p className="font-display text-2xl text-white/60">~12 hrs</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Manual</p>
              </div>
              <span className="text-white/20 text-sm">|</span>
              <div className="text-center">
                <p className="font-display text-2xl text-white/80">£{result.totalCost}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Total cost</p>
              </div>
            </div>

            <p className="text-white/50 text-xs leading-relaxed">
              {result.decisions.includes('rerouted')
                ? 'Good governance — you rejected the overspend and the agent found a cheaper option.'
                : result.decisions.includes('approved')
                  ? 'You approved an over-budget spend. Rejecting would have triggered a reroute.'
                  : 'Clean shift. All events resolved within budget.'}
            </p>

            {/* Mandate pill motifs */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className="text-[11px] bg-white/10 text-white/70 px-2.5 py-1 rounded-full border border-white/20 font-medium">
                Budget: £500
              </span>
              <span className="text-[11px] bg-white/10 text-white/70 px-2.5 py-1 rounded-full border border-white/20 font-medium">
                District: N1
              </span>
              <span className="text-[11px] bg-mandate/20 text-mandate px-2.5 py-1 rounded-full border border-mandate/30 font-medium">
                Delegate mode
              </span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a href="/missions/new" className="btn-primary text-sm py-2.5 w-full text-center">
                Try it with your real kitchen
              </a>
              <div className="flex gap-2">
                <a href="/rehearsal?autoplay" className="btn-secondary text-sm py-2 flex-1 text-center">
                  Watch the flow
                </a>
                <button type="button" onClick={handleReplay} className="btn-secondary text-sm py-2 flex-1">
                  Play again
                </button>
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
