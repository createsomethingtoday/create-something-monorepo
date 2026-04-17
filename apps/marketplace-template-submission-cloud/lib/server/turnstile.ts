import { getEnvValue } from '@create-something/webflow-dashboard-core/runtime';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  ['error-codes']?: string[];
};

export type TurnstileVerificationResult = {
  enabled: boolean;
  valid: boolean;
  error?: string;
  errorCodes?: string[];
};

function getClientIp(request: Request): string | undefined {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) {
    return undefined;
  }

  const [firstIp] = forwardedFor.split(',');
  return firstIp?.trim() || undefined;
}

export async function verifyTurnstileToken(
  request: Request,
  token: string | undefined,
  action: string
): Promise<TurnstileVerificationResult> {
  const [secret, siteKey, expectedHostname] = await Promise.all([
    getEnvValue('TURNSTILE_SECRET_KEY'),
    getEnvValue('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
    getEnvValue('TURNSTILE_EXPECTED_HOSTNAME')
  ]);

  if (!secret || !siteKey) {
    return {
      enabled: false,
      valid: true
    };
  }

  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return {
      enabled: true,
      valid: false,
      error: 'Complete the bot check before submitting.'
    };
  }

  const formData = new URLSearchParams({
    secret,
    response: trimmedToken
  });

  const clientIp = getClientIp(request);
  if (clientIp) {
    formData.set('remoteip', clientIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
  });

  if (!response.ok) {
    return {
      enabled: true,
      valid: false,
      error: 'Bot verification is temporarily unavailable. Try again.'
    };
  }

  const data = (await response.json().catch(() => ({}))) as TurnstileResponse;
  if (!data.success) {
    return {
      enabled: true,
      valid: false,
      error: 'Bot verification failed or expired. Try again.',
      errorCodes: data['error-codes'] || []
    };
  }

  if (data.action && data.action !== action) {
    return {
      enabled: true,
      valid: false,
      error: 'Bot verification did not match this submission. Try again.'
    };
  }

  if (expectedHostname && data.hostname && data.hostname !== expectedHostname) {
    return {
      enabled: true,
      valid: false,
      error: 'Bot verification hostname mismatch. Try again.'
    };
  }

  return {
    enabled: true,
    valid: true
  };
}
