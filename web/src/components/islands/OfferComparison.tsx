import React, { useEffect, useState } from 'react';
import { type Offer, getOffers } from '../../lib/api';

interface Props {
  missionId: string;
}

export default function OfferComparison({ missionId }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    getOffers(missionId).then(setOffers).catch(console.error);
  }, [missionId]);

  if (offers.length === 0) {
    return (
      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-lg font-bold">
          📡
        </div>
        <h3 className="text-base font-bold text-white">Sourcing & Slicing Supplier Offers</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Yaler buyer agent is requesting structured offers from matching London service providers in real time...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Supplier Offers & Gemini AI Ranking</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold border border-cyan-500/20">
            {offers.length} Offers
          </span>
        </h3>
        <span className="text-xs font-mono text-slate-400">Policy Checked</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((off, idx) => (
          <div
            key={off.id}
            className={`bg-[#060a12] border rounded-2xl p-5 space-y-3.5 relative transition-all shadow-lg ${
              idx === 0
                ? 'border-emerald-500/50 shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {idx === 0 && (
              <span className="absolute -top-3 right-4 text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-3 py-0.5 rounded-full shadow-md">
                ★ Top AI Match — Pre-Approved
              </span>
            )}

            <div className="flex justify-between items-start pt-1">
              <div>
                <h4 className="font-bold text-white text-base tracking-tight">{off.supplierAgentId}</h4>
                <p className="text-[11px] text-slate-500 font-mono">ID: {off.id}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-cyan-400 font-mono">£{off.price.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block font-mono">{off.currency}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-500">Availability:</span>
                <span className="font-semibold text-slate-200">{off.availability}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Terms:</span>
                <span className="font-semibold text-slate-300 truncate max-w-[150px]">{off.terms}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/60">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-400">{off.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
