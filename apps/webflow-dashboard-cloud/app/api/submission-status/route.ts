import { checkRateLimit } from '@create-something/webflow-dashboard-core/kv';
import { jsonNoStore } from '../../../lib/server/responses';
import { getOptionalEnv } from '../../../lib/server/env';
import { getUserFromRequest } from '../../../lib/server/session';

interface ExternalApiResponse {
  assetsSubmitted30: number;
  hasError: boolean;
  message?: string;
  publishedTemplates?: number;
  submittedTemplates?: number;
  isWhitelisted?: boolean;
}

const EXTERNAL_API_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';
const REQUEST_TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  try {
    // The response exposes a creator's submission and publish counts, so the
    // queried email is always the session email — never a body value.
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonNoStore(
        { hasError: true, message: 'Unauthorized', assetsSubmitted30: 0 },
        { status: 401 }
      );
    }

    const email = user.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonNoStore(
        { hasError: true, message: 'Invalid email format', assetsSubmitted30: 0 },
        { status: 400 }
      );
    }

    // Bound the outbound calls this endpoint can make on one creator's behalf.
    const env = await getOptionalEnv();
    if (env?.SESSIONS) {
      const rateLimit = await checkRateLimit(
        env.SESSIONS,
        `submission-status:${email.toLowerCase()}`,
        20,
        300,
        { failOpen: true }
      );

      if (!rateLimit.allowed) {
        return jsonNoStore(
          {
            hasError: true,
            message: 'Too many submission status checks. Please try again shortly.',
            assetsSubmitted30: 0,
            retryAfter: rateLimit.retryAfter
          },
          { status: 429 }
        );
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(EXTERNAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Webflow-Dashboard-Cloud/1.0'
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return jsonNoStore(
          {
            hasError: true,
            message: `External API error: ${response.status}`,
            assetsSubmitted30: 0
          },
          { status: response.status }
        );
      }

      const data = (await response.json()) as ExternalApiResponse;
      if (typeof data.assetsSubmitted30 !== 'number') {
        return jsonNoStore(
          {
            hasError: true,
            message: 'Invalid response from external API',
            assetsSubmitted30: 0
          },
          { status: 502 }
        );
      }

      return jsonNoStore(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return jsonNoStore(
          { hasError: true, message: 'Request timeout', assetsSubmitted30: 0 },
          { status: 504 }
        );
      }

      return jsonNoStore(
        {
          hasError: true,
          message: 'Failed to connect to external API',
          assetsSubmitted30: 0
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('[Submission Status] Error:', error);
    return jsonNoStore(
      {
        hasError: true,
        message: 'Internal server error',
        assetsSubmitted30: 0
      },
      { status: 500 }
    );
  }
}
