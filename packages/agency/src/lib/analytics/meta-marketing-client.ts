export interface MetaMarketingConsent {
  marketing: boolean;
  available: boolean;
  blocked: boolean;
}

interface MetaMarketingClientOptions {
  sanitizePageUrl: (url: URL) => string | undefined;
  fetch?: typeof fetch;
  privacyBlocked?: () => boolean;
  eventId?: () => string;
}

const unavailable = (): MetaMarketingConsent => ({ marketing: false, available: false, blocked: false });

export function browserBlocksMetaMarketing(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
  return navigator.doNotTrack === '1' ||
    (window as Window & { doNotTrack?: string }).doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** No consent or identifiers are persisted by the browser client. The server owns the receipt. */
export function createMetaMarketingClient(options: MetaMarketingClientOptions) {
  const send = options.fetch ?? fetch;
  const privacyBlocked = options.privacyBlocked ?? browserBlocksMetaMarketing;
  const eventId = options.eventId ?? (() => crypto.randomUUID());
  let state = unavailable();
  let choiceVersion = 0;
  let writes: Promise<unknown> = Promise.resolve();
  let lastPage: string | undefined;
  let locallyWithdrawn = false;

  async function request(marketing?: boolean): Promise<MetaMarketingConsent> {
    const response = await send('/api/marketing/consent', {
      method: marketing === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      ...(marketing === undefined ? {} : {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketing })
      })
    });
    if (!response.ok) throw new Error('We could not save your privacy choice. Please try again.');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' ||
      !('marketing' in result) || typeof result.marketing !== 'boolean' ||
      !('available' in result) || typeof result.available !== 'boolean' ||
      !('blocked' in result) || typeof result.blocked !== 'boolean') {
      throw new Error('We could not confirm your privacy choice. Please try again.');
    }
    const blocked = result.blocked || privacyBlocked();
    return { marketing: result.marketing && result.available && !blocked, available: result.available, blocked };
  }

  async function setConsent(marketing: boolean): Promise<MetaMarketingConsent> {
    const version = ++choiceVersion;
    locallyWithdrawn = !marketing || privacyBlocked();
    state = { ...state, marketing: false, blocked: privacyBlocked() };
    lastPage = undefined;
    // Serialize writes so a pending opt-in cannot complete after withdrawal.
    const write = writes.catch(() => {}).then(() => request(marketing && !privacyBlocked()));
    writes = write;
    try {
      const result = await write;
      if (version === choiceVersion) state = { ...result, marketing: result.marketing && !locallyWithdrawn };
      return state;
    } catch {
      if (version === choiceVersion) state = { ...unavailable(), blocked: privacyBlocked() };
      throw new Error('We could not save your privacy choice. Please try again.');
    }
  }

  async function refresh(): Promise<MetaMarketingConsent> {
    if (privacyBlocked()) return setConsent(false);
    const version = choiceVersion;
    try {
      await writes.catch(() => {});
      if (version !== choiceVersion) return state;
      const result = await request();
      if (version === choiceVersion) state = { ...result, marketing: result.marketing && !locallyWithdrawn };
      return state;
    } catch {
      if (version === choiceVersion) state = unavailable();
      throw new Error('We could not confirm your privacy choice. Please try again.');
    }
  }

  async function trackPage(url: URL): Promise<MetaMarketingConsent> {
    const consent = await refresh();
    const page = options.sanitizePageUrl(url);
    if (!consent.marketing || privacyBlocked() || !page || lastPage === page) return state;
    const version = choiceVersion;
    lastPage = page;
    try {
      const response = await send('/api/marketing/page-view', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ url: page, eventId: eventId() })
      });
      if (!response.ok && version === choiceVersion && lastPage === page) lastPage = undefined;
    } catch {
      if (version === choiceVersion && lastPage === page) lastPage = undefined;
    }
    return state;
  }

  return { get state() { return state; }, refresh, setConsent, trackPage };
}
