export interface CompanionSettings {
  apiBaseUrl: string;
  token: string;
  reviewId: string;
  reviewVersionId: string;
  expiresAt: string;
}

export interface PairedCompanion {
  settings: CompanionSettings;
  run: unknown;
}

interface PairingSessionResponse {
  session: {
    token: string;
    expiresAt: string;
    reviewId: string;
    reviewVersionId: string;
    actorRole: 'developer' | 'reviewer';
    evidenceTrust: 'partner_supplied' | 'webflow_observed';
  };
}

async function responseBody<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { message?: string; error?: string };
  if (!response.ok) {
    throw new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
  }
  return body;
}

export async function redeemAndBeginCompanion({
  code,
  apiBaseUrl,
  fetcher = fetch
}: {
  code: string;
  apiBaseUrl: string;
  fetcher?: typeof fetch;
}): Promise<PairedCompanion> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const redeemed = await responseBody<PairingSessionResponse>(
    await fetcher(`${base}/v1/companion-pairings/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code })
    })
  );
  const settings: CompanionSettings = {
    apiBaseUrl: base,
    token: redeemed.session.token,
    reviewId: redeemed.session.reviewId,
    reviewVersionId: redeemed.session.reviewVersionId,
    expiresAt: redeemed.session.expiresAt
  };
  const started = await responseBody<{ run: unknown }>(
    await fetcher(
      `${base}/v1/reviews/${encodeURIComponent(settings.reviewId)}/companion-runs`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${settings.token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ reviewVersionId: settings.reviewVersionId })
      }
    )
  );
  return { settings, run: started.run };
}

export function isAllowedPairingSender(origin: string | undefined, allowLocal: boolean): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'webflow-ext.com' || url.hostname.endsWith('.webflow-ext.com'))
    ) {
      return true;
    }
    return allowLocal && url.protocol === 'http:' && url.hostname === 'localhost';
  } catch {
    return false;
  }
}
