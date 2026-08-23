import React, { useEffect, useState } from 'react';
import { hasSeenTooltip, markTooltipSeen } from '../../lib/delight';

/**
 * OnboardingTooltip — shows once per user per tooltip ID.
 * Positioned relative to its parent (which should have position: relative).
 */

interface Props {
  id: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number; // ms before showing
}

export default function OnboardingTooltip({ id, text, position = 'bottom', delay = 1000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSeenTooltip(id)) return;

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [id, delay]);

  const dismiss = () => {
    setVisible(false);
    markTooltipSeen(id);
  };

  if (!visible) return null;

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 rotate-45',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 rotate-45',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 rotate-45',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 rotate-45',
  };

  return (
    <div
      className={`absolute z-50 ${positionClasses[position]} animate-pop-in`}
      role="tooltip"
    >
      <div className="relative bg-mandate text-paper text-xs leading-relaxed px-3 py-2 rounded-lg shadow-lg max-w-[220px]">
        <p>{text}</p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-1 text-[10px] text-paper/70 hover:text-paper underline"
        >
          got it
        </button>
        <span className={`absolute w-2 h-2 bg-mandate ${arrowClasses[position]}`} />
      </div>
    </div>
  );
}
