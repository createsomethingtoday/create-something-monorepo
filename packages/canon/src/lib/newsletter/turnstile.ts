/** One explicit-render script per document; each caller owns only its widget. */
export interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
let pending: Promise<TurnstileApi> | undefined;
export function loadTurnstile(): Promise<TurnstileApi> {
  const win = window as Window & { turnstile?: TurnstileApi };
  if (win.turnstile) return Promise.resolve(win.turnstile);
  if (pending) return pending;
  pending = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    const created = !script;
    script ??= document.createElement('script');
    const element = script;
    const cleanup = () => {
      clearTimeout(timeout);
      element.removeEventListener('load', loaded);
      element.removeEventListener('error', failed);
    };
    const loaded = () => {
      cleanup();
      if (win.turnstile) resolve(win.turnstile);
      else { element.remove(); reject(new Error('Verification is unavailable.')); }
    };
    const failed = () => {
      cleanup();
      element.remove();
      reject(new Error('Verification could not load. Please retry.'));
    };
    const timeout = setTimeout(failed, 15000);
    element.addEventListener('load', loaded, { once: true });
    element.addEventListener('error', failed, { once: true });
    if (created) {
      element.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      element.async = true;
      document.head.appendChild(element);
    }
  }).catch((error) => { pending = undefined; throw error; });
  return pending;
}
