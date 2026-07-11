export interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: 'interaction-only';
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
      'timeout-callback': () => void;
      'unsupported-callback': () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

const TURNSTILE_TIMEOUT_MS = 30_000;

// Rendering starts the challenge immediately. Deferring removal until the next
// task lets Turnstile finish its own callback bookkeeping before the iframe is
// torn down, avoiding the production "Nothing to reset" lifecycle failure.
export function completeTurnstileChallenge(
  turnstile: TurnstileApi,
  container: HTMLElement,
  sitekey: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let widgetId = '';
    let settled = false;
    const cleanup = () => {
      if (!widgetId) return;
      setTimeout(() => {
        try {
          turnstile.remove(widgetId);
        } catch {
          // The component may have unmounted while Turnstile was completing.
        }
      }, 0);
    };
    const timeoutId = setTimeout(() => finish(), TURNSTILE_TIMEOUT_MS);
    const finish = (token?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      if (token) resolve(token);
      else reject(new Error('Bot check could not be completed.'));
    };

    try {
      widgetId = turnstile.render(container, {
        sitekey,
        action: 'template-agent-session',
        appearance: 'interaction-only',
        callback: (token) => finish(token),
        'error-callback': () => finish(),
        'expired-callback': () => finish(),
        'timeout-callback': () => finish(),
        'unsupported-callback': () => finish(),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      settled = true;
      reject(error);
    }
  });
}
