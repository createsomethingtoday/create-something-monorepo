import { jsonNoStore } from '../../../lib/server/responses';

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
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    if (!body.email || typeof body.email !== 'string') {
      return jsonNoStore(
        { hasError: true, message: 'Email is required', assetsSubmitted30: 0 },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return jsonNoStore(
        { hasError: true, message: 'Invalid email format', assetsSubmitted30: 0 },
        { status: 400 }
      );
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
        body: JSON.stringify({ email: body.email }),
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
