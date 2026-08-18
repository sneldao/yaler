import React from 'react';

/** Quiet paper grain. No cursor tracking, no aurora, no React state. */
export default function SpotlightBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 paper-grain opacity-80" />
      <div className="absolute -top-24 right-[-8%] w-[28rem] h-[28rem] rounded-full bg-mandate/[0.06]" />
      <div className="absolute bottom-[-12%] left-[-6%] w-[22rem] h-[22rem] rounded-full bg-escalate/[0.05]" />
    </div>
  );
}
