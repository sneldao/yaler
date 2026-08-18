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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Waiting for supplier agents to return structured offers...
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">Supplier Offers & Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {offers.map((off, idx) => (
          <div key={off.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 relative">
            {idx === 0 && (
              <span className="absolute -top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full shadow">
                Top Recommendation
              </span>
            )}
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white text-base">{off.supplierAgentId}</h4>
                <p className="text-xs text-slate-400 font-mono">Offer ID: {off.id}</p>
              </div>
              <span className="text-lg font-bold text-cyan-400">£{off.price.toFixed(2)}</span>
            </div>

            <div className="text-xs space-y-1 text-slate-300">
              <p><span className="text-slate-500">Availability:</span> {off.availability}</p>
              <p><span className="text-slate-500">Terms:</span> {off.terms}</p>
              <p><span className="text-slate-500">Status:</span> <span className="font-semibold text-emerald-400">{off.status}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
