import React, { useState } from 'react';

interface Props {
  thumbnailUrl?: string;
  title: string;
  subtitle: string;
  hash?: string;
  amount?: string;
  receiptDetails?: string[];
}

export default function FullscreenClipModal({
  thumbnailUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  title,
  subtitle,
  hash = '0x8f72a4...b19e02',
  amount = '£450.00',
  receiptDetails = ['Commercial Fridge Compressor Replaced', '2-Hour Emergency Onsite Callout', '6-Month Parts Warranty Included'],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Compact Trigger Button / Card */}
      <div
        onClick={() => setIsOpen(true)}
        className="glass-panel glass-panel-hover rounded-2xl p-4 cursor-pointer flex items-center justify-between gap-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition">{title}</h4>
            <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 transition flex items-center gap-1.5 shrink-0"
        >
          <span>Expand Receipt 📄</span>
        </button>
      </div>

      {/* Fullscreen Clip Path Overlay Canvas */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-2xl transition-all duration-300"
          style={{
            clipPath: 'circle(150% at 50% 50%)',
            animation: 'pop-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
          }}
        >
          <div className="glass-panel rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 border border-white/15 shadow-2xl relative">
            {/* Close Cross */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 flex items-center justify-center font-bold text-sm transition cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                ✓ Verified Proof Receipt
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-2">{title}</h2>
              <p className="text-xs font-mono text-slate-400">Cryptographic Hash: <span className="text-cyan-300">{hash}</span></p>
            </div>

            {/* Image Preview */}
            <div className="rounded-2xl overflow-hidden border border-white/10 h-48 sm:h-56 relative">
              <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl text-[11px] font-mono text-emerald-300 border border-emerald-500/30">
                ★ Gemini Vision Stamp Passed
              </div>
            </div>

            {/* Receipt Breakdown */}
            <div className="space-y-2 bg-slate-950/80 p-4 rounded-2xl border border-white/[0.08] font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase text-[10px] mb-2 border-b border-white/[0.08] pb-1">
                Line Item Verification
              </div>
              {receiptDetails.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span>• {item}</span>
                  <span className="text-emerald-400">Verified</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-white/[0.08] text-sm">
                <span className="font-bold text-white">Total Amount Executed:</span>
                <span className="text-xl font-extrabold text-cyan-300">{amount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/20 transition cursor-pointer"
            >
              Close Proof Inspection Canvas
            </button>
          </div>
        </div>
      )}
    </>
  );
}
