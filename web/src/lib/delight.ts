/**
 * Delight utilities — micro-celebrations, progressive copy, journey tracking.
 */

// ─── Journey Stage ─────────────────────────────────────────

export type JourneyStage = 'new' | 'rehearsed' | 'active' | 'completed' | 'returning';

export function getJourneyStage(): JourneyStage {
  if (typeof window === 'undefined') return 'new';

  const visits = getVisitCount();
  const savedMandate = localStorage.getItem('yaler_saved_mandate');
  const completedJobs = parseInt(localStorage.getItem('yaler_completed_jobs') || '0', 10);

  if (completedJobs >= 1) return 'returning';
  if (savedMandate) return 'rehearsed';
  if (visits > 1) return 'rehearsed'; // came back without completing
  return 'new';
}

export function getVisitCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = parseInt(localStorage.getItem('yaler_visit_count') || '0', 10);
  return count;
}

export function incrementVisitCount(): void {
  if (typeof window === 'undefined') return;
  const count = getVisitCount() + 1;
  localStorage.setItem('yaler_visit_count', String(count));
}

export function markJobCompleted(): void {
  if (typeof window === 'undefined') return;
  const count = parseInt(localStorage.getItem('yaler_completed_jobs') || '0', 10);
  localStorage.setItem('yaler_completed_jobs', String(count + 1));
}

// ─── Progressive Greeting ──────────────────────────────────

export function getGreeting(): { headline: string; subtext: string } {
  const stage = getJourneyStage();
  const visits = getVisitCount();

  switch (stage) {
    case 'returning':
      return {
        headline: 'Another one sorted.',
        subtext: 'Same rules, new job. Say what\'s broken.',
      };
    case 'rehearsed':
      return {
        headline: 'Ready to do this for real?',
        subtext: 'Your rules are saved. Say the word and we start looking.',
      };
    case 'new':
    default:
      if (visits > 2) {
        return {
          headline: 'The usual?',
          subtext: 'Try the rehearsal first, or jump straight in.',
        };
      }
      return {
        headline: 'Fridge down. Say it once.',
        subtext: 'An autonomous agent finds a local engineer, stays inside your budget, and sends a receipt when the job is done. 3 hours of phone calls become 15 minutes.',
      };
  }
}

// ─── Tooltips (first-visit) ────────────────────────────────

export function hasSeenTooltip(id: string): boolean {
  if (typeof window === 'undefined') return true;
  const seen = JSON.parse(localStorage.getItem('yaler_tooltips_seen') || '[]');
  return seen.includes(id);
}

export function markTooltipSeen(id: string): void {
  if (typeof window === 'undefined') return;
  const seen = JSON.parse(localStorage.getItem('yaler_tooltips_seen') || '[]');
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem('yaler_tooltips_seen', JSON.stringify(seen));
  }
}

// ─── Micro-celebrations ────────────────────────────────────

/** Trigger a confetti burst (CSS-only, self-cleaning) */
export function celebrate(element?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  playHaptic('success');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const container = element || document.body;
  const burst = document.createElement('div');
  burst.className = 'confetti-burst';
  burst.setAttribute('aria-hidden', 'true');

  // Create 12 particles
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('span');
    particle.className = 'confetti-particle';
    particle.style.setProperty('--angle', `${(i * 30) + Math.random() * 15}deg`);
    particle.style.setProperty('--distance', `${40 + Math.random() * 30}px`);
    particle.style.setProperty('--color', i % 3 === 0 ? '#2a6f6a' : i % 3 === 1 ? '#ffcc44' : '#44aaff');
    burst.appendChild(particle);
  }

  container.style.position = 'relative';
  container.appendChild(burst);
  setTimeout(() => burst.remove(), 800);
}

/** Trigger a screen shake (over-budget stop) */
export function shake(element?: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  playHaptic('error');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const target = element || document.body;
  target.classList.add('animate-shake-slow');
  setTimeout(() => target.classList.remove('animate-shake-slow'), 500);
}

/** Trigger a stamp animation */
export function stamp(element: HTMLElement | null): void {
  if (!element) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  element.classList.add('stamp-verified');
  setTimeout(() => element.classList.remove('stamp-verified'), 600);
}

// ─── Haptics ───────────────────────────────────────────────

/**
 * Vibration patterns per UI event. Kept short — a notification buzz on
 * a phone should be a whisper, not an alarm. Ignored entirely on
 * desktop (no vibrate support) and when the user has asked the OS to
 * calm things down.
 */
const HAPTIC_PATTERNS: Record<'ding' | 'paper' | 'ping' | 'stop' | 'success' | 'error', number | number[]> = {
  ding: 12,
  paper: 8,
  ping: 16,
  stop: [20, 40, 20],
  success: [10, 30, 25],
  error: [35, 30, 35],
};

export function playHaptic(event: keyof typeof HAPTIC_PATTERNS): void {
  if (typeof window === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (localStorage.getItem('yaler_haptics_enabled') === 'false') return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[event]);
  } catch { /* vibration refused (no gesture, unsupported) */ }
}

export function areHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('yaler_haptics_enabled') !== 'false';
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('yaler_haptics_enabled', String(enabled));
}

// ─── Sound (kitchen mode) ──────────────────────────────────

let audioCtx: AudioContext | null = null;

export function isKitchenModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('yaler_kitchen_mode') === 'true';
}

export function setKitchenMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('yaler_kitchen_mode', String(enabled));
}

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playUiSound(type: 'ding' | 'paper' | 'ping' | 'stop'): void {
  // Haptics fire regardless of kitchen mode — sound is opt-in because it's
  // audible to bystanders; a 12ms buzz on the owner's own phone isn't.
  playHaptic(type);
  if (!isKitchenModeEnabled()) return;
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'ding':
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
        break;
      case 'paper':
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        break;
      case 'ping':
        osc.frequency.value = 587;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
        break;
      case 'stop':
        osc.frequency.value = 330;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
        break;
    }
  } catch { /* audio not available */ }
}
