import {
  checkRateLimit,
  validateEmail
} from '@create-something/webflow-dashboard-core';
import { NextRequest } from 'next/server';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { getEnvOrThrow } from '../../../../lib/server/env';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getClientIp } from '../../../../lib/server/session';

export async function POST(request: NextRequest) {
  try {
    const env = await getEnvOrThrow();
    if (!env.SESSIONS) {
      return jsonNoStore({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(env.SESSIONS, `auth:login:${clientIp}`, 5, 900, {
      failOpen: false
    });

    if (!rateLimit.allowed) {
      return jsonNoStore(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    if (!body.email) {
      return jsonNoStore({ error: 'Email is required' }, { status: 400 });
    }

    let validatedEmail: string;
    try {
      validatedEmail = validateEmail(body.email);
    } catch {
      return jsonNoStore({ error: 'Invalid email format' }, { status: 400 });
    }

    const airtable = await getServerAirtable();
    const user = await airtable.findUserByEmail(validatedEmail);

    if (!user) {
      return jsonNoStore({
        message: 'If your email is registered, a verification email has been sent'
      });
    }

    const token = crypto.randomUUID();
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
    await airtable.triggerVerificationEmailAutomation(user.id, token, expirationTime);

    return jsonNoStore({
      message: 'If your email is registered, a verification email has been sent'
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    return jsonNoStore({ error: 'An error occurred during the login process' }, { status: 500 });
  }
}
