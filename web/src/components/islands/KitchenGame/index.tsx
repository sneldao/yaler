import React, { useEffect, useRef, useState } from 'react';

interface GameResult {
  elapsed: number;
  equipment: string;
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

  const shareText = result
    ? `I fixed a virtual ${result.equipment} in ${result.elapsed}s with an AI agent. Usually takes 4 hours of phone calls. Try it:`
    : '';

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/play` : '/play';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Yaler Kitchen Game', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReplay = () => {
    setStatus('loading');
    setResult(null);
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
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] rounded-2xl z-10">
          <p className="text-sm text-white/60 animate-pulse">Loading kitchen...</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full aspect-video rounded-2xl overflow-hidden shadow-paper bg-[#1a1a2e]"
      />

      {status === 'done' && result && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/85 rounded-2xl z-20 animate-pop-in backdrop-blur-sm">
          <div className="text-center space-y-5 p-6 max-w-sm">
            <p className="font-display text-3xl text-white">Job done.</p>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="font-display text-2xl text-mandate">{result.elapsed}s</p>
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Your time</p>
              </div>
              <span className="text-white/30 text-lg">vs</span>
              <div className="text-center">
                <p className="font-display text-2xl text-white/60">~4 hrs</p>
                <p className="text-[11px] text-white/50 uppercase tracking-wider">Phone calls</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Every step mapped to a real system: discovery, quotes, budget check, booking, evidence, receipt.
            </p>
            <div className="flex flex-col gap-2">
              <a href="/rehearsal" className="btn-primary text-sm py-2.5 w-full text-center">
                Try it with your real kitchen
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="btn-secondary text-sm py-2 flex-1"
                >
                  Play again
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn-secondary text-sm py-2 flex-1 flex items-center justify-center gap-1.5"
                >
                  {copied ? '✓ Copied' : 'Share time'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
