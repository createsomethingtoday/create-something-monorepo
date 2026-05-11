import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { triggerKnockLoginWorkflow } from '@create-something/webflow-dashboard-core/knock';
import { checkRateLimit } from '@create-something/webflow-dashboard-core/kv';
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

    const knockEnabled = env.KNOCK_LOGIN_ENABLED === 'true' && env.KNOCK_API_KEY;
    if (knockEnabled) {
      await airtable.setVerificationToken(user.id, token, expirationTime);
      await triggerKnockLoginWorkflow({
        apiKey: env.KNOCK_API_KEY!,
        workflowKey: env.KNOCK_LOGIN_WORKFLOW_KEY ?? 'asset-dashboard-login-validation',
        recipient: { id: user.id, email: validatedEmail },
        data: {
          verificationToken: token,
          expiresAtIso: expirationTime.toISOString()
        }
      });
    } else {
      await airtable.triggerVerificationEmailAutomation(user.id, token, expirationTime);
    }

    return jsonNoStore({
      message: 'If your email is registered, a verification email has been sent'
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    return jsonNoStore({ error: 'An error occurred during the login process' }, { status: 500 });
  }
}
