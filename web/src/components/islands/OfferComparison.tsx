import React, { useEffect, useState } from 'react';
import { type Offer, getOffers } from '../../lib/api';
import DiffTable, { type DiffRowData } from '../primitives/DiffTable';
import ApprovalCard, { type QuestionStep } from '../primitives/ApprovalCard';
import OfferStack from '../primitives/OfferStack';

interface Props {
  missionId: string;
}

export default function OfferComparison({ missionId }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [viewMode, setViewMode] = useState<'stack' | 'matrix'>('stack');

  useEffect(() => {
    getOffers(missionId).then(setOffers).catch(console.error);
  }, [missionId]);

  if (offers.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto text-lg font-bold">
          📡
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">Sourcing & Slicing Supplier Offers</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
          Yaler buyer agent is requesting structured offers from matching London service providers in real time...
        </p>
      </div>
    );
  }

  // Convert offers to DiffTable rows
  const diffRows: DiffRowData[] = offers.map((off, idx) => ({
    id: off.id,
    name: off.supplierAgentId,
    category: off.availability,
    price: `£${off.price.toFixed(2)}`,
    status: idx === 0 ? 'recommended' : off.status === 'COUNTERED' ? 'countered' : 'negotiating',
    delta: idx === 0 ? '-£50 vs budget' : undefined,
    isAddition: idx === 0,
  }));

  // Approval card questions
  const approvalQuestions: QuestionStep[] = [
    {
      id: 'commit_target',
      question: 'Which supplier offer should Yaler commit to?',
      subtitle: 'Top match complies with policy constraints (Budget <= £500)',
      options: offers.map((o) => `${o.supplierAgentId} — £${o.price.toFixed(2)} (${o.availability})`),
    },
    {
      id: 'payment_terms',
      question: 'Confirm Escrow Release Terms',
      subtitle: 'Funds released automatically upon proof receipt verification',
      options: ['Instant auto-release upon photo proof', 'Require manual buyer review within 2 hours'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* View Switcher Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Supplier Offers & Gemini AI Ranking</span>
        </div>

        <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-white/[0.08] font-mono text-xs">
          <button
            type="button"
            onClick={() => setViewMode('stack')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              viewMode === 'stack'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎴 3D Offer Stack
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Diff Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Offer View (3D Card Stack or Diff Matrix) */}
        <div className="lg:col-span-2">
          {viewMode === 'stack' ? (
            <OfferStack
              offers={offers}
              onSelectOffer={(off) => {
                console.log('Committed offer via 3D stack:', off);
              }}
            />
          ) : (
            <DiffTable
              rows={diffRows}
              title={`Supplier Offers Matrix (${offers.length} Received)`}
              onApply={(selectedIds) => {
                console.log('Selected offer IDs applied:', selectedIds);
              }}
            />
          )}
        </div>

        {/* Human Authorization Approval Card */}
        <div>
          <ApprovalCard
            title="Human Authorization"
            questions={approvalQuestions}
            onSubmitted={(answers) => {
              console.log('Approval card submitted:', answers);
            }}
          />
        </div>
      </div>
    </div>
  );
}
