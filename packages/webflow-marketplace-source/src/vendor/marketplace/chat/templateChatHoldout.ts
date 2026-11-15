// Launcher holdout for the TemplateChat causal experiment.
//
// The July-2026 observational read could not separate chat's effect from
// self-selection: chat users convert at engaged-browser rates, but chat users
// are people who were already shopping seriously. The causal question — does
// the launcher's presence lift visitor→purchase conversion? — needs an
// exposure-randomized control. This module assigns each device a stable arm:
// 'visible' renders the floating launcher exactly as today, 'hidden'
// suppresses the component entirely. Both arms emit a `holdout_assigned`
// event, so per-arm funnels (assignments → detail purchase CTA clicks) are
// plain aggregate counts — no user-level join required, which matters because
// the Analytics Engine sink deliberately stores no device identifier.
//
// The experiment is OFF unless the component's Holdout Percent prop is set
// above zero in the Designer, so shipping this code changes nothing on its
// own. Assignments persist across visits (localStorage) and survive pauses:
// setting the percent back to 0 shows the launcher to everyone but keeps the
// stored arm, so a resumed experiment does not reshuffle devices.

export type ChatHoldoutArm = 'visible' | 'hidden';

export const CHAT_HOLDOUT_STORAGE_KEY = 'wf_tm_chat_holdout_v1';

function isArm(value: unknown): value is ChatHoldoutArm {
  return value === 'visible' || value === 'hidden';
}

/**
 * The stored arm, if this device was ever assigned. Never assigns — surfaces
 * that only *stamp* events with the arm (the template detail page) must not
 * create assignments, or the hidden arm would fill with devices that never
 * visited a launcher surface.
 */
export function getStoredChatHoldoutArm(): ChatHoldoutArm | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage?.getItem(CHAT_HOLDOUT_STORAGE_KEY);
    return isArm(stored) ? stored : null;
  } catch {
    return null;
  }
}

function randomUnit(): number {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] / 0x1_0000_0000;
    }
  } catch {
    // Fall through to Math.random.
  }
  return Math.random();
}

/**
 * Resolve (and persist) this device's arm for a launcher surface.
 *
 * `percentHidden` is the share of devices assigned to the hidden arm, 0–100.
 * At <= 0 the experiment is off: every device sees the launcher and any
 * stored assignment is left untouched for a later resume. SSR always resolves
 * 'visible' without persisting — assignment happens on the client, where the
 * render decision is actually made.
 */
export function resolveChatHoldoutArm(percentHidden: number): ChatHoldoutArm {
  if (typeof window === 'undefined') return 'visible';
  if (!Number.isFinite(percentHidden) || percentHidden <= 0) return 'visible';

  const stored = getStoredChatHoldoutArm();
  if (stored) return stored;

  const arm: ChatHoldoutArm = randomUnit() * 100 < Math.min(percentHidden, 100) ? 'hidden' : 'visible';
  try {
    window.localStorage?.setItem(CHAT_HOLDOUT_STORAGE_KEY, arm);
  } catch {
    // Storage unavailable (privacy mode): the arm still applies this page,
    // it just re-randomizes next visit. Aggregate counts stay valid.
  }
  return arm;
}
