/**
 * Consent gate for any analytics inside the extension.
 *
 * Reviewers return extensions that start tracking before the user agrees.
 * Nothing here loads an SDK. If you add one, call `track()` through this gate
 * and keep the SDK import behind `grantConsent()`. Disclose the vendor and
 * what you send in the listing and the privacy policy.
 *
 * The stored value is a UI preference, not a credential or an entitlement,
 * so localStorage is the right place for it.
 */

const CONSENT_KEY = "__APP_SLUG__:analytics-consent";

type ConsentState = "unknown" | "granted" | "denied";

let listeners: Array<(state: ConsentState) => void> = [];

function read(): ConsentState {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  } catch {
    return "unknown";
  }
}

function write(state: ConsentState): void {
  try {
    if (state === "unknown") {
      window.localStorage.removeItem(CONSENT_KEY);
    } else {
      window.localStorage.setItem(CONSENT_KEY, state);
    }
  } catch {
    // Storage can be unavailable. Treat as not granted.
  }
  for (const listener of listeners) listener(state);
}

export function getConsent(): ConsentState {
  return read();
}

export function grantConsent(): void {
  write("granted");
}

export function denyConsent(): void {
  write("denied");
}

export function onConsentChange(listener: (state: ConsentState) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * The only way analytics should leave the extension. It is a no-op until the
 * user grants consent, and it stays a no-op until you wire a vendor in.
 */
export function track(event: string, properties: Record<string, string | number | boolean> = {}): void {
  if (read() !== "granted") return;
  // Wire your analytics vendor here. Never send Webflow tokens, site IDs
  // paired with user identity, or anything from the Designer document.
  void event;
  void properties;
}
