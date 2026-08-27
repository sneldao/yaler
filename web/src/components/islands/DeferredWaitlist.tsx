import React, { useEffect, useState } from 'react';
import WaitlistCapture from './WaitlistCapture';

/**
 * DeferredWaitlist — the waitlist is not in the initial DOM at all. It
 * mounts after the user has seen the hero (3 seconds elapsed) or has
 * scrolled past the first viewport — whichever comes first. Users who
 * already joined never see it again. Less HTML on first paint, and the ask
 * lands when the visitor has context.
 */
export default function DeferredWaitlist() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already joined (or the offline fallback captured them) — never ask again.
    try {
      if (localStorage.getItem('yaler_waitlist')) return;
    } catch {
      /* private mode — carry on */
    }

    const reveal = () => setShow(true);
    const timer = setTimeout(reveal, 3000);

    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5) {
        reveal();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="animate-fade-up">
      <WaitlistCapture variant="general" source="home" />
    </div>
  );
}
