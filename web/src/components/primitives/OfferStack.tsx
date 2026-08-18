import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { type Offer } from '../../lib/api';

interface Props {
  offers: Offer[];
  onSelectOffer?: (offer: Offer) => void;
}

export default function OfferStack({ offers, onSelectOffer }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOffer = offers[activeIdx] || offers[0];

  const handleNextCard = () => {
    const nextIdx = (activeIdx + 1) % offers.length;

    // Animate active card out with 3D flip spring
    const cards = containerRef.current?.querySelectorAll('.stack-card');
    if (cards && cards[0]) {
      gsap.to(cards[0], {
        x: 180,
        rotation: 12,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setActiveIdx(nextIdx);
          gsap.fromTo(
            cards[0],
            { x: -100, rotation: -8, opacity: 0, scale: 0.9 },
            { x: 0, rotation: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
          );
        },
      });
    } else {
      setActiveIdx(nextIdx);
    }
  };

  if (!offers || offers.length === 0) return null;

  return (
    <div ref={containerRef} className="glass-panel rounded-3xl p-6 shadow-2xl relative space-y-6 overflow-hidden">
      {/* Bar Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            3D Interactive Offer Deck ({offers.length} Bids)
          </span>
        </div>
        <button
          type="button"
          onClick={handleNextCard}
          className="text-xs font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>Cycle Offer Deck 🎴</span>
          <span className="text-[10px] opacity-70">({activeIdx + 1}/{offers.length})</span>
        </button>
      </div>

      {/* 3D Stack Canvas */}
      <div className="relative min-h-[220px] flex items-center justify-center py-4 perspective-1000">
        {offers.map((off, idx) => {
          // Calculate 3D stacking depth based on relative index
          const offset = (idx - activeIdx + offers.length) % offers.length;
          const isTop = offset === 0;

          const translateY = offset * 14;
          const scale = 1 - offset * 0.05;
          const zIndex = offers.length - offset;
          const opacity = offset > 2 ? 0 : 1 - offset * 0.25;

          return (
            <div
              key={off.id}
              onClick={() => {
                if (!isTop) setActiveIdx(idx);
              }}
              style={{
                transform: `translate3d(0, ${translateY}px, ${-offset * 30}px) scale(${scale})`,
                zIndex,
                opacity,
              }}
              className={`stack-card absolute top-0 left-0 right-0 p-5 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer ${
                isTop
                  ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border-cyan-500/50 shadow-2xl shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/80 border-white/[0.08] hover:border-white/20'
              }`}
            >
              {isTop && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 px-3 py-0.5 rounded-full shadow-md">
                    ★ Gemini Top AI Match
                  </span>
                  <span className="text-xs font-mono text-slate-400">Policy Approved</span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-white text-base sm:text-lg tracking-tight">{off.supplierAgentId}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {off.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-300 font-mono">£{off.price.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400 block font-mono">{off.currency}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/[0.08] font-mono text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-500 text-[10px] block">AVAILABILITY</span>
                  <span className="text-slate-200 font-semibold">{off.availability}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-500 text-[10px] block">TERMS</span>
                  <span className="text-cyan-300 font-semibold truncate block">{off.terms}</span>
                </div>
              </div>

              {isTop && (
                <div className="mt-4 pt-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>In-Policy Commitment Ready</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectOffer) onSelectOffer(off);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    Commit Offer ⚡
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
