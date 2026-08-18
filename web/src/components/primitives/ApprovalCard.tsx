import React, { useState } from 'react';

export interface QuestionStep {
  id: string;
  question: string;
  subtitle?: string;
  options: string[];
  type?: 'radio' | 'checkbox';
}

interface Props {
  questions: QuestionStep[];
  onSubmitted: (answers: Record<string, string[]>) => void;
  title?: string;
}

export default function ApprovalCard({ questions, onSubmitted, title = 'Human Policy Check Required' }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQ = questions[activeIdx];
  const isLast = activeIdx === questions.length - 1;
  const selectedOptions = answers[currentQ.id] || [];
  const hasValue = selectedOptions.length > 0 || Boolean(customText[currentQ.id]?.trim());

  const handleSelectOption = (option: string) => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id] || [];
      if (currentQ.type === 'checkbox') {
        const next = existing.includes(option) ? existing.filter((o) => o !== option) : [...existing, option];
        return { ...prev, [currentQ.id]: next };
      }
      return { ...prev, [currentQ.id]: [option] };
    });

    if (currentQ.type !== 'checkbox') {
      if (isLast) {
        setTimeout(() => {
          setSubmitted(true);
          onSubmitted(answers);
        }, 300);
      } else {
        setTimeout(() => setActiveIdx((idx) => idx + 1), 300);
      }
    }
  };

  if (submitted) {
    return (
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 animate-pop-in">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            ✓
          </span>
          <div>
            <div className="text-xs font-bold text-emerald-400">Human Approval Confirmed</div>
            <div className="text-[11px] text-slate-400 font-mono">Agent authorized to proceed with execution</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setActiveIdx(0);
          }}
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
        >
          Review Decisions
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-2xl space-y-4 max-w-lg w-full transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
            {title}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Step {activeIdx + 1} of {questions.length}
        </span>
      </div>

      {/* Active Question */}
      <div className="space-y-3 animate-fade-up" key={currentQ.id}>
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{currentQ.question}</h4>
          {currentQ.subtitle && <p className="text-xs text-slate-400 mt-0.5">{currentQ.subtitle}</p>}
        </div>

        {/* Options */}
        <div className="space-y-1.5">
          {currentQ.options.map((opt) => {
            const isPicked = selectedOptions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-left transition-all duration-150 cursor-pointer ${
                  isPicked
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <span>{opt}</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border transition-colors ${
                  isPicked ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold' : 'border-slate-700'
                }`}>
                  {isPicked ? '✓' : ''}
                </span>
              </button>
            );
          })}

          {/* Custom Input Option */}
          <div className="pt-1">
            <input
              type="text"
              placeholder="Or type custom instruction..."
              value={customText[currentQ.id] || ''}
              onChange={(e) => setCustomText((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
              className="w-full bg-slate-950/60 border border-white/[0.08] focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Footer Pager + Action Button */}
      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
        {/* Ring Dot Pager */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? 'w-3.5 h-3.5 border-2 border-cyan-400 bg-cyan-400/20'
                  : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Submit or Next Button */}
        <button
          type="button"
          disabled={!hasValue}
          onClick={() => {
            if (isLast) {
              setSubmitted(true);
              onSubmitted(answers);
            } else {
              setActiveIdx((i) => i + 1);
            }
          }}
          className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          <span>{isLast ? 'Authorize Mandate ⚡' : 'Next Question →'}</span>
        </button>
      </div>
    </div>
  );
}
