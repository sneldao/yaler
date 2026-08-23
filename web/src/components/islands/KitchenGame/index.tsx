import React, { useEffect, useRef, useState } from 'react';

export default function KitchenGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'done'>('loading');

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    import('./config').then(({ createGame }) => {
      if (destroyed) return;
      const game = createGame(containerRef.current!);
      gameRef.current = game;
      setStatus('playing');

      // Listen for game completion
      const handleComplete = () => setStatus('done');
      window.addEventListener('yaler:game-complete', handleComplete);

      return () => {
        window.removeEventListener('yaler:game-complete', handleComplete);
      };
    });

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

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
      {status === 'done' && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80 rounded-2xl z-20 animate-pop-in">
          <div className="text-center space-y-4 p-6">
            <p className="font-display text-3xl text-white">Job done.</p>
            <p className="text-white/70 text-sm">30 seconds. Last time it took 4 hours of phone calls.</p>
            <a href="/rehearsal" className="btn-primary text-sm py-2.5 px-6 inline-block">
              Try it with your real kitchen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
