import { completeTurnstileChallenge, type TurnstileApi } from './turnstileChallenge';

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  const pending = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-template-agent-turnstile]');
    const script = existing ?? document.createElement('script');
    const finish = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Bot check unavailable.')));
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Bot check unavailable.')), { once: true });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.templateAgentTurnstile = 'true';
      document.head.appendChild(script);
    }
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
