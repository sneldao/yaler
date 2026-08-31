import React, { useState } from 'react';
import { LAST_TUESDAY } from '../../lib/lastTuesday';

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

export default function TacticalRadar({ activeDistrict = LAST_TUESDAY.district }: { activeDistrict?: string }) {
  const [pings] = useState<SupplierPing[]>([
    { id: 'sup_1', name: 'London Rapid ColdCare', district: 'N1', tier: 'Usually dearer', score: 0.96, x: -25, y: -20, active: true },
    { id: 'sup_2', name: 'Capital Kitchen Services', district: 'N1', tier: 'Mid range', score: 0.92, x: 30, y: -15, active: true },
    { id: 'sup_3', name: 'East London Catering', district: 'E1', tier: 'Keeps costs down', score: 0.88, x: 40, y: 30, active: true },
    { id: 'sup_4', name: 'West End Refrigeration', district: 'WC1', tier: 'Usually dearer', score: 0.95, x: -35, y: 25, active: false },
  ]);

  return (
    <div className="paper-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-muted">Last Tuesday · 06:51</p>
          <h3 className="font-display text-xl text-ink">Who heard about the job</h3>
        </div>
        <span className="text-xs text-ink-muted text-right max-w-[12rem]">
          Three AI supplier agents in {activeDistrict} — anything over budget or out of area never gets a call.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-5 relative flex items-center justify-center p-2">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-ink/15 bg-paper relative overflow-hidden flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border border-ink/10 absolute" />
            <div className="w-20 h-20 rounded-full border border-ink/10 absolute" />
            <div className="w-10 h-10 rounded-full border border-ink/10 absolute" />
            <div className="w-full h-px bg-ink/10 absolute top-1/2 left-0" />
            <div className="h-full w-px bg-ink/10 absolute left-1/2 top-0" />

            {pings.map((p) => (
              <div
                key={p.id}
                className="absolute group"
                style={{ transform: `translate(${p.x * 2}px, ${p.y * 2}px)` }}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${
                  p.district === activeDistrict ? 'bg-mandate' : 'bg-ink/30'
                }`} />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden group-hover:block bg-paper-raised text-ink text-[10px] p-2 rounded-lg border border-ink/10 whitespace-nowrap z-20 shadow-paper">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-ink-muted">{p.district} · {Math.round(p.score * 100)}% on time</div>
                </div>
              </div>
            ))}
            <div className="w-1.5 h-1.5 rounded-full bg-ink z-10" />
          </div>
        </div>

        <div className="md:col-span-7 space-y-2">
          {pings.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-xl border text-sm flex items-center justify-between gap-3 ${
                p.district === activeDistrict
                  ? 'bg-mandate-light border-mandate/25'
                  : 'bg-paper border-ink/10'
              }`}
            >
              <div>
                <div className="font-medium text-ink">{p.name}</div>
                <div className="text-xs text-ink-muted">
                  {p.district} · {Math.round(p.score * 100)}% on time
                </div>
              </div>
              <div className="text-xs text-ink-muted">{p.tier}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
