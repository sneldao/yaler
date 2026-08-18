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
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Supplier Evidence Portal
        </span>
        <h2 className="text-xl font-bold text-white mt-2">Submit Job Completion Report</h2>
        <p className="text-xs text-slate-400 mt-0.5">Upload service report and photo evidence for instant Gemini verification.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-1.5">
            Technician Service Report
          </label>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={4}
            className="w-full bg-[#060a12] border border-slate-800 focus:border-cyan-500 rounded-xl p-3.5 text-white focus:outline-none text-sm leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase text-slate-400 mb-1.5">
            Photo Evidence Reference URL
          </label>
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full bg-[#060a12] border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-white focus:outline-none text-xs font-mono"
          />
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs sm:text-sm">
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs sm:text-sm space-y-2">
            <p className="font-bold flex items-center gap-2">
              <span>✅ Evidence Verified & Approved by Gemini AI!</span>
            </p>
            {result.evidence?.confidenceScore && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Confidence Score:</span>
                  <span className="font-bold text-emerald-400">{(result.evidence.confidenceScore * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full" style={{ width: `${result.evidence.confidenceScore * 100}%` }} />
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-300 font-mono pt-1">
              Redirecting to mission timeline and proof receipt...
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer text-sm sm:text-base"
        >
          {loading ? 'Verifying Evidence via Gemini...' : 'Submit Evidence & Complete Mission 🚀'}
        </button>
      </form>
    </div>
  );
}
