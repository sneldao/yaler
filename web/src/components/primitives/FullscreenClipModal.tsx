import React, { useEffect, useRef, useState } from 'react';

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
  amount = '£450',
  receiptDetails = ['Commercial fridge compressor replaced', 'Two-hour emergency callout', 'Six-month parts warranty'],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember what opened the modal so focus returns there on close.
    triggerRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initial focus lands on the Close button.
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      // Focus trap — Tab/Shift+Tab cycles only inside the modal.
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !sheet.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !sheet.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) trigger.focus();
      triggerRef.current = null;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="paper-card paper-card-hover rounded-xl p-4 w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-ink/10 shrink-0">
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-medium text-ink text-sm">{title}</h4>
            <p className="text-xs text-ink-muted">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs text-mandate shrink-0">Open receipt</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-pop-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="receipt-sheet max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-perf" />
            <div className="p-6 space-y-5">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-5 right-5 text-ink-muted hover:text-ink text-sm"
              >
                Close
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-mandate">Receipt</p>
                <h2 className="font-display text-2xl text-ink pt-1">{title}</h2>
                <p className="text-xs text-ink-muted mt-1">{subtitle}</p>
              </div>
              <img src={thumbnailUrl} alt="" className="w-full h-44 object-cover rounded-lg" />
              <ul className="space-y-1.5 text-sm">
                {receiptDetails.map((item) => (
                  <li key={item} className="flex justify-between gap-3 text-ink">
                    <span>{item}</span>
                    <span className="text-mandate">Checked</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center border-t border-ink/10 pt-3">
                <span className="text-sm text-ink-muted">Paid</span>
                <span className="font-display text-2xl text-ink">{amount}</span>
              </div>
            </div>
            <div className="receipt-perf" />
          </div>
        </div>
      )}
    </>
  );
}
