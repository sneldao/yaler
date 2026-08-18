import React, { useState } from 'react';
import { submitEvidence } from '../../lib/api';

interface Props {
  missionId: string;
}

export default function EvidenceForm({ missionId }: Props) {
  const [report, setReport] = useState("Technician replaced faulty compressor relay, verified temperature dropping to 3°C.");
  const [photoUrl, setPhotoUrl] = useState("https://storage.googleapis.com/yaler-evidence/proof_temp_check.jpg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitEvidence(missionId, `ms_${missionId}`, report, photoUrl);
      setResult(res);
      setTimeout(() => {
        window.location.href = `/missions/${missionId}`;
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit evidence');
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto shadow-xl space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Supplier Evidence Portal
        </span>
        <h2 className="text-xl font-semibold text-white mt-2">Submit Completion Report</h2>
        <p className="text-sm text-slate-400">Upload job report and completion photo for AI verification.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Technician Text Report</label>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Photo Reference URL</label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 text-sm font-mono"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm space-y-1">
            <p className="font-bold">✅ Evidence Verified & Accepted by Gemini!</p>
            <p className="text-xs text-slate-300">Redirecting to mission timeline and proof receipt...</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          {loading ? 'Verifying Evidence via Gemini...' : 'Submit Evidence & Complete Mission 🚀'}
        </button>
      </form>
    </div>
  );
}
