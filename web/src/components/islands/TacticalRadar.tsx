import React, { useState } from 'react';

interface SupplierPing {
  id: string;
  name: string;
  district: string;
  tier: string;
  score: number;
  x: number;
  y: number;
  active: boolean;
}

export default function TacticalRadar({ activeDistrict = 'N1' }: { activeDistrict?: string }) {
  const [pings] = useState<SupplierPing[]>([
    { id: 'sup_1', name: 'London Rapid ColdCare', district: 'N1', tier: 'PREMIUM', score: 0.96, x: -25, y: -20, active: true },
    { id: 'sup_2', name: 'Capital Kitchen Services', district: 'N1', tier: 'MODERATE', score: 0.92, x: 30, y: -15, active: true },
    { id: 'sup_3', name: 'East London Catering', district: 'E1', tier: 'BUDGET', score: 0.88, x: 40, y: 30, active: true },
    { id: 'sup_4', name: 'West End Refrigeration', district: 'WC1', tier: 'PREMIUM', score: 0.95, x: -35, y: 25, active: false },
  ]);

  return (
    <div className="glass-panel glass-panel-hover rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
          </span>
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
            A2A Agent Network Radar
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 font-bold">
          <span>TARGET: DISTRICT {activeDistrict}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Radar Graphic Canvas */}
        <div className="md:col-span-5 relative flex items-center justify-center p-2">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-cyan-500/25 bg-[#040812] relative overflow-hidden flex items-center justify-center shadow-inner">
            {/* Concentric Radar Rings */}
            <div className="w-36 h-36 rounded-full border border-cyan-500/20 absolute" />
            <div className="w-24 h-24 rounded-full border border-cyan-500/20 absolute" />
            <div className="w-12 h-12 rounded-full border border-cyan-500/20 absolute" />

            {/* Crosshairs */}
            <div className="w-full h-[1px] bg-cyan-500/20 absolute top-1/2 left-0 -translate-y-1/2" />
            <div className="h-full w-[1px] bg-cyan-500/20 absolute left-1/2 top-0 -translate-x-1/2" />

            {/* Radar Sweep Line */}
            <div className="absolute inset-0 rounded-full animate-spin pointer-events-none origin-center" style={{ animationDuration: '3.6s' }}>
              <div className="w-1/2 h-1/2 bg-gradient-to-tr from-cyan-500/30 via-cyan-500/5 to-transparent origin-bottom-right rounded-tl-full" />
            </div>

            {/* Agent Blips */}
            {pings.map((p) => (
              <div
                key={p.id}
                className="absolute transition-all duration-500 group cursor-pointer"
                style={{
                  transform: `translate(${p.x * 2}px, ${p.y * 2}px)`,
                }}
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-150 ${
                  p.district === activeDistrict
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse'
                    : 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                }`}>
                  <div className="w-1 h-1 bg-slate-950 rounded-full" />
                </div>
                {/* Hover Tooltip */}
                <div className="absolute left-5 top-1/2 -translate-y-1/2 hidden group-hover:block bg-slate-950 text-white text-[10px] font-mono p-2.5 rounded-xl border border-cyan-500/40 whitespace-nowrap z-20 shadow-2xl animate-pop-in">
                  <div className="font-bold text-cyan-300">{p.name}</div>
                  <div className="text-slate-400">Area: {p.district} • Tier: {p.tier}</div>
                  <div className="text-emerald-400 font-bold">Reliability: {(p.score * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}

            <div className="w-2 h-2 rounded-full bg-cyan-400 z-10 shadow-[0_0_8px_#06b6d4]" />
          </div>
        </div>

        {/* Live A2A Registered Agents List */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>A2A Active Agent Protocol</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">JSON-RPC 2.0 Live</span>
          </div>

          <div className="space-y-2">
            {pings.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border text-xs transition-all flex items-center justify-between gap-3 ${
                  p.district === activeDistrict
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-100'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.district === activeDistrict && (
                      <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        MATCHING AREA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    District: <strong className="text-slate-200">{p.district}</strong> • Score: <strong className="text-emerald-400">{(p.score * 100).toFixed(0)}%</strong>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px]">
                  <div className="text-cyan-300 font-bold">{p.tier}</div>
                  <div className="text-slate-500">RSA-2048 Signed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
