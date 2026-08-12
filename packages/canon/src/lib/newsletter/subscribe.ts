/**
 * Newsletter Subscribe Logic
 *
 * Shared server-side logic for processing newsletter subscriptions.
 * Used by property-specific API endpoints.
 *
 * @packageDocumentation
 */

import type {
  NewsletterRequest,
  NewsletterResult,
  TurnstileResponse,
  PropertyDomain
} from './types.js';
import { recordServerConversion } from '../analytics/conversions.js';
import type { Property } from '../analytics/types.js';
import {
  escapePerformanceEmailAttribute,
  performanceEmailTokens as emailTokens,
  renderPerformanceEmail
} from '../performance/email.js';

/**
 * Environment bindings required for newsletter operations
 */
interface NewsletterEnv {
  DB: D1Database;
  CACHE?: KVNamespace;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>;
}

interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  success: boolean;
  results?: T[];
}

interface ExistingSubscriber {
  email: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  status: string | null;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const RATE_LIMIT_MAX = 3; // Max signups per IP per hour
const VALID_PROPERTIES: Property[] = ['space', 'io', 'agency', 'ltd', 'lms'];

function normalizeProperty(value: unknown): Property | null {
  return typeof value === 'string' && VALID_PROPERTIES.includes(value as Property)
    ? (value as Property)
    : null;
}

// =============================================================================
// SHARED REQUEST HANDLER
// =============================================================================

/**
 * Create newsletter subscription handler for SvelteKit routes.
 *
 * Usage in +server.ts:
 * ```ts
 * import { createNewsletterHandler } from '@create-something/canon/newsletter';
 * export const POST = createNewsletterHandler({ property: 'ltd' });
 * ```
 */
export function createNewsletterHandler(options: { property: PropertyDomain }) {
  return async ({
    request,
    platform,
    getClientAddress
  }: {
    request: Request;
    platform?: { env?: NewsletterEnv };
    getClientAddress: () => string;
  }) => {
    const { json } = await import('@sveltejs/kit');

    const body = (await request.json()) as NewsletterRequest;

    console.log(`[NewsletterAPI:${options.property}] Signup requested`);

    const { result, status } = await processSubscription(
      body,
      platform?.env,
      getClientAddress(),
      options.property
    );

    if (result.success) {
      console.log(`[NewsletterAPI:${options.property}] Signup successful`);
    } else {
      console.warn(`[NewsletterAPI:${options.property}] Signup failed`, {
        message: result.message
      });
    }

    return json(result, { status });
  };
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Generate the confirmation email HTML template (double opt-in)
 * Uses inline styles for email client compatibility (Gmail strips <style> tags)
 */
export function generateConfirmationEmailHtml(confirmUrl: string): string {
  return renderPerformanceEmail({
    preheader: 'Confirm your CREATE SOMETHING note.',
    status: 'SUBSCRIPTION / CONFIRM',
    title: 'Confirm the note.',
    media: PLAYBOOK_EMAIL_MEDIA,
    contentHtml: `
      <p style="margin:0 0 ${emailTokens.layout.spaceMd};font-size:17px;line-height:1.6;color:${emailTokens.color.inkSoft};">You asked for occasional notes from CREATE SOMETHING.</p>
      <p style="margin:0 0 ${emailTokens.layout.spaceLg};font-size:16px;line-height:1.65;color:${emailTokens.color.muted};">Confirm once. We will send only when there is a useful playbook, field report, or operating pattern to share.</p>
      <a href="${escapePerformanceEmailAttribute(confirmUrl)}" style="display:inline-block;padding:14px 20px;border:1px solid ${emailTokens.color.ink};border-radius:${emailTokens.layout.radius};background-color:${emailTokens.color.ink};color:${emailTokens.color.panel};font-family:${emailTokens.font.mono};font-size:13px;line-height:1.2;text-decoration:none;">Confirm the note</a>
      <p style="margin:${emailTokens.layout.spaceLg} 0 0;padding-top:${emailTokens.layout.spaceMd};border-top:1px solid ${emailTokens.color.line};font-size:13px;line-height:1.55;color:${emailTokens.color.muted};">If you did not ask for this, ignore the message. Nothing else will be sent.</p>`,
    footerHtml: 'CONTROLLED SUBSCRIPTION&nbsp;&nbsp;/&nbsp;&nbsp;NO FIXED CADENCE'
  });
}

export function generateConfirmationEmailText(confirmUrl: string): string {
  return `Confirm the note.

You asked for occasional notes from CREATE SOMETHING.

Confirm once. We will send only when there is a useful playbook, field report, or operating pattern to share.

Confirm the note: ${confirmUrl}

If you did not ask for this, ignore the message. Nothing else will be sent.`;
}

/**
 * Generate the welcome email HTML template
 * Uses inline styles for email client compatibility (Gmail strips <style> tags)
 */
export function generateWelcomeEmailHtml(
  unsubscribeToken: string,
  property: PropertyDomain
): string {
  const sourceLabel = property === 'io' ? 'research' : `.${property}`;
  const unsubscribeUrl = `https://createsomething.io/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  return renderPerformanceEmail({
    preheader: 'Your CREATE SOMETHING subscription is confirmed.',
    status: 'SUBSCRIPTION / READY',
    title: 'You are on the list.',
    media: PLAYBOOK_EMAIL_MEDIA,
    contentHtml: `
      <p style="margin:0 0 ${emailTokens.layout.spaceMd};font-size:17px;line-height:1.6;color:${emailTokens.color.inkSoft};">Your request from ${sourceLabel} is confirmed.</p>
      <p style="margin:0 0 ${emailTokens.layout.spaceLg};font-size:16px;line-height:1.65;color:${emailTokens.color.muted};">We will share useful field evidence, operating patterns, and Playbook updates. No roundup for the sake of a roundup.</p>
      <a href="https://createsomething.agency/field-reports" style="display:inline-block;padding:14px 20px;border:1px solid ${emailTokens.color.ink};border-radius:${emailTokens.layout.radius};background-color:${emailTokens.color.ink};color:${emailTokens.color.panel};font-family:${emailTokens.font.mono};font-size:13px;line-height:1.2;text-decoration:none;">See the field reports</a>
      <p style="margin:${emailTokens.layout.spaceLg} 0 0;padding-top:${emailTokens.layout.spaceMd};border-top:1px solid ${emailTokens.color.line};font-size:13px;line-height:1.55;color:${emailTokens.color.muted};"><a href="${escapePerformanceEmailAttribute(unsubscribeUrl)}" style="color:${emailTokens.color.muted};text-underline-offset:3px;">Unsubscribe whenever the notes stop being useful.</a></p>`,
    footerHtml:
      'SOURCE&nbsp;&nbsp;/&nbsp;&nbsp;' + escapePerformanceEmailAttribute(sourceLabel.toUpperCase())
  });
}

export function generateWelcomeEmailText(
  unsubscribeToken: string,
  property: PropertyDomain
): string {
  const sourceLabel = property === 'io' ? 'research' : `.${property}`;
  const unsubscribeUrl = `https://createsomething.io/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  return `You are on the list.

Your request from ${sourceLabel} is confirmed.

We will share useful field evidence, operating patterns, and Playbook updates. No roundup for the sake of a roundup.

See the field reports: https://createsomething.agency/field-reports

Unsubscribe: ${unsubscribeUrl}`;
}

const PLAYBOOK_EMAIL_MEDIA = {
  src: 'https://createsomething.agency/images/performance-lab/playbook-home-agent-macro.webp',
  alt: 'Macro-real Playbook court with an ivory AI-agent marker inside a control ring and an amber workflow route.',
  width: 1536,
  height: 1024
} as const;

/**
 * Process a newsletter subscription request.
 *
 * @example
 * ```typescript
 * // In +server.ts
 * import { processSubscription } from '@create-something/canon/newsletter';
 *
 * export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
 *   const body = await request.json();
 *   return processSubscription(body, platform?.env, getClientAddress(), 'io');
 * };
 * ```
 */
export async function processSubscription(
  body: NewsletterRequest,
  env: NewsletterEnv | undefined,
  clientIP: string,
  property: PropertyDomain
): Promise<{ result: NewsletterResult; status: number }> {
  const { email: rawEmail, website, turnstileToken, source } = body;
  const email = rawEmail?.trim().toLowerCase() ?? '';
  // Default source to property, allow override
  const subscriberSource = source || property;

  // Honeypot check - if filled, silently reject (bots fill hidden fields)
  if (website) {
    return {
      result: { success: true, message: 'Successfully subscribed!' },
      status: 200
    };
  }

  // Validate email
  if (!email) {
    return {
      result: { success: false, message: 'Email is required' },
      status: 400
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      result: { success: false, message: 'Invalid email format' },
      status: 400
    };
  }

  if (!env) {
    return {
      result: { success: false, message: 'Platform environment not available' },
      status: 500
    };
  }

  // Verify Turnstile token if secret key is configured
  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return {
        result: { success: false, message: 'Please complete the verification' },
        status: 400
      };
    }

    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: clientIP
        })
      }
    );

    const turnstileResult = (await turnstileResponse.json()) as TurnstileResponse;

    if (!turnstileResult.success) {
      console.warn('Turnstile verification failed:', turnstileResult['error-codes']);
      return {
        result: { success: false, message: 'Verification failed. Please try again.' },
        status: 400
      };
    }
  }

  // Rate limiting via KV
  if (env.CACHE) {
    const rateLimitKey = `newsletter_rate:${clientIP}`;

    try {
      const currentCount = await env.CACHE.get(rateLimitKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;

      if (count >= RATE_LIMIT_MAX) {
        return {
          result: { success: false, message: 'Too many signup attempts. Please try again later.' },
          status: 429
        };
      }

      await env.CACHE.put(rateLimitKey, String(count + 1), {
        expirationTtl: RATE_LIMIT_WINDOW
      });
    } catch (kvError) {
      console.warn('Rate limiting unavailable:', kvError);
    }
  }

  // Generate tokens for unsubscribe and confirmation
  const timestamp = Date.now();
  const consentRequestedAt = new Date(timestamp).toISOString();
  const unsubscribeToken = btoa(`${email}:${timestamp}`);
  const confirmationToken = btoa(`confirm:${email}:${timestamp}:${crypto.randomUUID()}`);

  // Check if subscriber already exists
  let existingSubscriber: ExistingSubscriber | null = null;
  try {
    existingSubscriber = await env.DB.prepare(
      `SELECT email, confirmed_at, unsubscribed_at, status FROM newsletter_subscribers WHERE email = ?`
    )
      .bind(email)
      .first<ExistingSubscriber>();
  } catch (dbError) {
    console.warn('Could not check existing subscriber:', dbError);
  }

  // If email was previously bounced or complained, reject re-subscription
  if (existingSubscriber?.status === 'bounced' || existingSubscriber?.status === 'complained') {
    return {
      result: { success: false, message: 'This email address cannot receive our newsletters.' },
      status: 400
    };
  }

  // If already confirmed, no need to re-subscribe
  if (existingSubscriber?.confirmed_at && !existingSubscriber?.unsubscribed_at) {
    return {
      result: { success: true, message: 'You are already subscribed!' },
      status: 200
    };
  }

  // Store subscriber in D1 database with confirmed_at = NULL (requires confirmation)
  try {
    if (existingSubscriber) {
      // Update existing subscriber (may have unsubscribed before)
      await env.DB.prepare(
        `UPDATE newsletter_subscribers
				 SET confirmation_token = ?,
				     unsubscribe_token = ?,
				     unsubscribed_at = NULL,
				     confirmed_at = NULL,
				     consent_requested_at = ?,
				     consent_confirmed_at = NULL,
				     consent_method = 'double_opt_in',
				     consent_evidence = 'pending_confirmation',
				     confirmation_email_id = NULL,
				     welcome_email_id = NULL,
				     active = 1,
				     status = 'active',
				     subscribed_at = datetime('now'),
				     source = ?
				 WHERE email = ?`
      )
        .bind(confirmationToken, unsubscribeToken, consentRequestedAt, subscriberSource, email)
        .run();
    } else {
      // Insert new subscriber
      await env.DB.prepare(
        `INSERT INTO newsletter_subscribers (
           email, subscribed_at, unsubscribe_token, confirmation_token,
           confirmed_at, source, consent_requested_at, consent_method,
           consent_evidence, active, status
         ) VALUES (?, datetime('now'), ?, ?, NULL, ?, ?, 'double_opt_in', 'pending_confirmation', 1, 'active')`
      )
        .bind(email, unsubscribeToken, confirmationToken, subscriberSource, consentRequestedAt)
        .run();
    }
  } catch (dbError) {
    console.error('Newsletter subscribers database error:', dbError);
    return {
      result: { success: false, message: 'Failed to process subscription' },
      status: 500
    };
  }

  // Send confirmation email via Resend (double opt-in)
  const confirmUrl = `https://createsomething.io/confirm?token=${encodeURIComponent(confirmationToken)}`;
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'CREATE SOMETHING <hello@createsomething.io>',
      to: email,
      subject: 'Confirm your subscription to CREATE SOMETHING',
      html: generateConfirmationEmailHtml(confirmUrl),
      text: generateConfirmationEmailText(confirmUrl)
    })
  });

  const resendData = (await resendResponse.json()) as { id?: string; message?: string };

  if (!resendResponse.ok) {
    console.error('Resend API error:', resendData);
    return {
      result: { success: false, message: 'Failed to send confirmation email' },
      status: 500
    };
  }

  if (resendData.id) {
    try {
      await env.DB.prepare(
        `UPDATE newsletter_subscribers
         SET confirmation_email_id = ?, updated_at = datetime('now')
         WHERE email = ?`
      )
        .bind(resendData.id, email)
        .run();
    } catch (receiptError) {
      console.warn('Newsletter confirmation receipt update failed:', receiptError);
    }
  }

  try {
    await recordServerConversion(
      env.DB,
      {
        property,
        action: 'newsletter_requested',
        sessionId: body.sessionId,
        sourceProperty: normalizeProperty(body.sourceProperty),
        url: body.landingUrl || `https://createsomething.${property}/`,
        referrer: body.referrer,
        metadata: {
          source: subscriberSource,
          intent: body.intent,
          lane: body.lane,
          emailId: resendData.id
        }
      },
      {}
    );
  } catch (conversionError) {
    console.warn('Newsletter conversion tracking failed:', conversionError);
  }

  return {
    result: {
      success: true,
      message: 'Please check your email to confirm your subscription.',
      emailId: resendData.id
    },
    status: 200
  };
}
