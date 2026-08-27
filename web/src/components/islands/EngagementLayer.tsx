import React from 'react';
import InstallPrompt from './InstallPrompt';
import OnboardingGate from './OnboardingGate';
import OfflineBanner from './OfflineBanner';
import PullToRefresh from './PullToRefresh';

/**
 * EngagementLayer — single mount point (in Layout) for the engagement
 * islands: the offline strip, the first-visit onboarding gate, the
 * PWA install prompt, and the mobile pull-to-refresh gesture. Each
 * child decides for itself whether it has anything to say, so this
 * wrapper stays deliberately dumb.
 */
export default function EngagementLayer() {
  return (
    <>
      <OfflineBanner />
      <OnboardingGate />
      <InstallPrompt />
      <PullToRefresh />
    </>
  );
}
