import React, { useEffect, useState } from 'react';
import { getJourneyStage, type JourneyStage } from '../../lib/delight';

/**
 * Progressive nav links that adapt based on journey stage.
 * - new: Try it | How it works
 * - rehearsed: Start a job | How it works | Engineers
 * - returning/active: My jobs | New job | Engineers
 */

interface NavLink {
  href: string;
  label: string;
  primary?: boolean;
}

function getLinks(stage: JourneyStage): NavLink[] {
  switch (stage) {
    case 'returning':
      return [
        { href: '/missions', label: 'My jobs' },
        { href: '/missions/new', label: 'New job', primary: true },
        { href: '/suppliers', label: 'Engineers' },
      ];
    case 'rehearsed':
      return [
        { href: '/missions/new', label: 'Start a job', primary: true },
        { href: '/story', label: 'How it works' },
        { href: '/suppliers', label: 'Engineers' },
      ];
    case 'new':
    default:
      return [
        { href: '/rehearsal', label: 'Try it', primary: true },
        { href: '/story', label: 'How it works' },
        { href: '/play', label: 'Play' },
      ];
  }
}

export default function NavLinks() {
  const [links, setLinks] = useState<NavLink[]>([
    { href: '/rehearsal', label: 'Try it', primary: true },
    { href: '/story', label: 'How it works' },
    { href: '/play', label: 'Play' },
  ]);

  useEffect(() => {
    const stage = getJourneyStage();
    setLinks(getLinks(stage));
  }, []);

  return (
    <>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={
            link.primary
              ? 'text-ink hover:text-mandate transition-colors font-medium'
              : 'text-ink-muted hover:text-ink transition-colors'
          }
        >
          {link.label}
        </a>
      ))}
    </>
  );
}
