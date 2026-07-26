import { completeTurnstileChallenge, type TurnstileApi } from './turnstileChallenge';

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SCRIPT_MARKER = 'data-template-agent-turnstile';
/** Loading the challenge script must not be able to hang a turn forever. */
export const TURNSTILE_SCRIPT_TIMEOUT_MS = 10_000;

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

/**
 * Loads the Turnstile script once per document.
 *
 * Two failure modes are handled explicitly, because both left `getSessionToken`
 * pending forever and the composer spinning:
 *
 * 1. A previously injected script that already fired `load` without defining
 *    `window.turnstile` — a listener attached afterwards never fires. A timeout
 *    turns that into a real rejection.
 * 2. A dead script element left in `<head>` after a failure. Reusing it on the
 *    next attempt reproduced the hang, so the marker is removed on failure and
 *    a fresh element is injected.
 */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  const pending = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${TURNSTILE_SCRIPT_MARKER}]`);
    const script = existing ?? document.createElement('script');
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      // The element cannot be trusted for a retry — drop it.
      script.remove();
      reject(new Error('Bot check unavailable.'));
    }, TURNSTILE_SCRIPT_TIMEOUT_MS);

    const succeed = () => {
      if (settled) return;
      if (!window.turnstile) return; // Keep waiting for the timeout to decide.
      settled = true;
      clearTimeout(timeout);
      resolve(window.turnstile);
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.remove();
      reject(new Error('Bot check unavailable.'));
    };

    script.addEventListener('load', succeed, { once: true });
    script.addEventListener('error', fail, { once: true });

    if (existing) {
      // The script may already have finished before this listener attached.
      // Probe immediately; the timeout covers the case where it never defines
      // the global at all.
      succeed();
      return;
    }

    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute(TURNSTILE_SCRIPT_MARKER, 'true');
    document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  turnstileScriptPromise = pending;
  return pending;
}

export async function getTurnstileToken(container: HTMLElement, sitekey: string): Promise<string> {
  const turnstile = await loadTurnstile();
  return completeTurnstileChallenge(turnstile, container, sitekey);
}
