import {
  getAirtableClient,
  validateToken
} from '@create-something/webflow-dashboard-core/airtable';
import { checkRateLimit, setSession } from '@create-something/webflow-dashboard-core/kv';
import { NextRequest, NextResponse } from 'next/server';
import { getEnvOrThrow } from '../../../../lib/server/env';
import { jsonNoStore, withNoStore } from '../../../../lib/server/responses';
import {
  getClientIp,
  newSessionToken,
  setSessionCookie
} from '../../../../lib/server/session';

export async function POST(request: NextRequest) {
  try {
    const env = await getEnvOrThrow();
    if (!env.SESSIONS) {
      return jsonNoStore({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(env.SESSIONS, `auth:verify:${clientIp}`, 5, 900, {
      failOpen: false
    });

    if (!rateLimit.allowed) {
      return jsonNoStore(
        {
          error: 'Too many verification attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { token?: string };
    if (!body.token) {
      return jsonNoStore({ error: 'Token is required' }, { status: 400 });
    }

    let validatedToken: string;
    try {
      validatedToken = validateToken(body.token);
    } catch {
      return jsonNoStore({ error: 'Invalid token format' }, { status: 400 });
    }

    const airtable = getAirtableClient(env);
    const result = await airtable.verifyToken(validatedToken);

    if (!result) {
      return jsonNoStore({ error: 'Token not found or expired' }, { status: 404 });
    }

    if (result.expired) {
      return jsonNoStore({ error: 'Token has expired. Please request a new one.' }, { status: 401 });
    }

    const sessionToken = newSessionToken();
    await setSession(env.SESSIONS, sessionToken, result.email);

    const response = withNoStore(NextResponse.json({ message: 'Authentication successful' }));
    setSessionCookie(response, sessionToken);

    const user = await airtable.findUserByEmail(result.email);
    if (user) {
      await airtable.clearVerificationToken(user.id);
    }

    return response;
  } catch (error) {
    console.error('[Auth Verify] Error:', error);
    return jsonNoStore({ error: 'An error occurred during verification' }, { status: 500 });
  }
}
