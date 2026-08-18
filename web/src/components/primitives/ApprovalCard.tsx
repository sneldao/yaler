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

export default function ApprovalCard({ questions, onSubmitted, title = 'Needs a yes from you' }: Props) {
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
  };

  if (submitted) {
    return (
      <div className="paper-card rounded-2xl p-4 flex items-center justify-between gap-4 animate-pop-in">
        <div>
          <div className="text-sm font-medium text-mandate">Confirmed</div>
          <div className="text-xs text-ink-muted">We’ll carry on from here.</div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setActiveIdx(0);
          }}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Review
        </button>
      </div>
    );
  }

  return (
    <div className="paper-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-escalate">{title}</span>
        <span className="text-xs text-ink-muted">
          {activeIdx + 1} of {questions.length}
        </span>
      </div>

      <div className="space-y-3" key={currentQ.id}>
        <div>
          <h4 className="text-sm font-medium text-ink">{currentQ.question}</h4>
          {currentQ.subtitle && <p className="text-xs text-ink-muted mt-0.5">{currentQ.subtitle}</p>}
        </div>

        <div className="space-y-1.5">
          {currentQ.options.map((opt) => {
            const isPicked = selectedOptions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-colors ${
                  isPicked
                    ? 'bg-mandate-light border-mandate/40 text-ink'
                    : 'bg-paper border-ink/10 text-ink hover:border-ink/20'
                }`}
              >
                <span>{opt}</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                  isPicked ? 'bg-mandate text-paper border-mandate' : 'border-ink/20'
                }`}>
                  {isPicked ? '✓' : ''}
                </span>
              </button>
            );
          })}

          <input
            type="text"
            placeholder="Or write your own note…"
            value={customText[currentQ.id] || ''}
            onChange={(e) => setCustomText((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
            className="field-input text-xs py-2"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all duration-200 ${
                i === activeIdx ? 'w-3 h-3 bg-mandate' : 'w-2 h-2 bg-ink/20'
              }`}
            />
          ))}
        </div>

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
          className="btn-primary text-xs py-2 px-3"
        >
          {isLast ? 'Confirm' : 'Next'}
        </button>
      </div>
    </div>
  );
}
