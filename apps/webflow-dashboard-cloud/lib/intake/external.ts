import { validateEmail } from '@create-something/webflow-dashboard-core';

const EMAIL_CHECK_URL = 'https://check-asset-name.vercel.app/api/checkTemplateemail';
const CREATOR_ELIGIBILITY_URL = 'https://webflow-api.createsomething.io/template/user';
const REQUEST_TIMEOUT_MS = 10_000;

export interface RemoteEmailAvailability {
  emailExists: boolean;
  message: string;
}

export interface RemoteCreatorEligibility {
  userExists: boolean;
  hasError: boolean;
  message?: string;
}

async function postJson<T>(
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = (await response.json().catch(() => ({}))) as T;

    if (!response.ok) {
      throw new Error(
        typeof data === 'object' && data && 'message' in data && typeof data.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkRemoteCreatorEmailAvailability(
  email: string
): Promise<RemoteEmailAvailability> {
  const validated = validateEmail(email);
  return postJson<RemoteEmailAvailability>(EMAIL_CHECK_URL, { email: validated });
}

export async function checkRemoteCreatorEligibility(
  email: string
): Promise<RemoteCreatorEligibility> {
  const validated = validateEmail(email);

  return postJson<RemoteCreatorEligibility>(
    CREATOR_ELIGIBILITY_URL,
    { email: validated },
    {
      Origin: 'https://webflow.com',
      Referer: 'https://webflow.com/templates/submit-a-template?section=submit-today'
    }
  );
}
