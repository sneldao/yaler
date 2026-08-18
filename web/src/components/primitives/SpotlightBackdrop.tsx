import React, { useEffect, useState } from 'react';

export default function SpotlightBackdrop() {
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const xPct = Math.round((e.clientX / window.innerWidth) * 100);
      const yPct = Math.round((e.clientY / window.innerHeight) * 100);
      setPos({ x: xPct, y: yPct });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Dynamic Cursor Spotlight Layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500 opacity-60"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, rgba(6, 182, 212, 0.08), transparent 80%)`,
        }}
      />

      {/* Living Aurora Orbs */}
      <div className="aurora-blob-1 absolute -top-40 left-1/4 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-cyan-500/15 via-teal-500/10 to-transparent blur-[100px] pointer-events-none" />
      <div className="aurora-blob-2 absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-indigo-500/10 via-cyan-500/10 to-transparent blur-[110px] pointer-events-none" />
      <div className="aurora-blob-1 absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-600/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Structural Micro-Grid Mesh Layer */}
      <div className="absolute inset-0 grid-mesh pointer-events-none opacity-80" />

      {/* Tactile Noise Grain Texture Layer */}
      <div className="absolute inset-0 noise-texture pointer-events-none opacity-40 mix-blend-overlay" />
    </div>
  );
}
