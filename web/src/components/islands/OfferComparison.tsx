import React, { useEffect, useState } from 'react';
import { type Offer, getOffers } from '../../lib/api';
import DiffTable, { type DiffRowData } from '../primitives/DiffTable';
import ApprovalCard, { type QuestionStep } from '../primitives/ApprovalCard';

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
      <div className="glass-panel rounded-3xl p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-lg font-bold">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Diff Table Matrix */}
      <div className="lg:col-span-2">
        <DiffTable
          rows={diffRows}
          title={`Supplier Offers Matrix (${offers.length} Received)`}
          onApply={(selectedIds) => {
            console.log('Selected offer IDs applied:', selectedIds);
          }}
        />
      </div>

      {/* Human Approval Card */}
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
  );
}
