import type { PageServerLoad } from './$types';
import { recordServerConversion, upsertWarmLead } from '@create-something/canon/analytics';
import type { Property } from '@create-something/canon/analytics';
import { generateWelcomeEmailHtml } from '@create-something/canon/newsletter';

type ConfirmationReason =
  | 'missing-token'
  | 'invalid-token'
  | 'unsubscribed'
  | 'already-confirmed'
  | 'confirmed'
  | 'service-unavailable'
  | 'confirmation-failed';

interface SubscriberRecord {
  id: string;
  email: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  source: string | null;
}

const validProperties: Property[] = ['space', 'io', 'agency', 'ltd', 'lms'];

function propertyFromSource(source: unknown): Property {
  if (typeof source !== 'string') return 'io';

  const normalized = source.toLowerCase();
  if (normalized === 'learn') return 'lms';
  const exact = validProperties.find((property) => property === normalized);
  if (exact) return exact;

  return validProperties.find((property) => normalized.startsWith(property)) ?? 'io';
}

function confirmationFailure(reason: ConfirmationReason, message: string) {
  return {
    success: false as const,
    message,
    email: null,
    alreadyConfirmed: false,
    reason
  };
}

export const load: PageServerLoad = async ({ url, platform, request }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    return confirmationFailure(
      'missing-token',
      'This confirmation link is missing its token. Request a new email to continue.'
    );
  }

  if (!platform?.env?.DB) {
    return confirmationFailure(
      'service-unavailable',
      'Confirmation is temporarily unavailable. Please try again from the subscription page.'
    );
  }

  const db = platform.env.DB;

  try {
    const subscriber = await db
      .prepare(
        `SELECT id, email, confirmed_at, unsubscribed_at, source FROM newsletter_subscribers
				 WHERE confirmation_token = ?`
      )
      .bind(token)
      .first<SubscriberRecord>();

    if (!subscriber) {
      return confirmationFailure(
        'invalid-token',
        'This confirmation link is invalid, expired, or has already been used.'
      );
    }

    if (subscriber.unsubscribed_at) {
      return confirmationFailure(
        'unsubscribed',
        'This address was unsubscribed after the link was sent. Request a new email to start again.'
      );
    }

    if (subscriber.confirmed_at) {
      return {
        success: true,
        message: 'This address is already confirmed.',
        email: subscriber.email,
        alreadyConfirmed: true,
        reason: 'already-confirmed' satisfies ConfirmationReason
      };
    }

    await db
      .prepare(
        `UPDATE newsletter_subscribers
				 SET confirmed_at = datetime('now'),
				     confirmation_token = NULL
				 WHERE id = ?`
      )
      .bind(subscriber.id)
      .run();

    const subscriberData = await db
      .prepare(`SELECT unsubscribe_token FROM newsletter_subscribers WHERE id = ?`)
      .bind(subscriber.id)
      .first<{ unsubscribe_token: string | null }>();

    const unsubscribeToken = subscriberData?.unsubscribe_token;

    if (platform.env.RESEND_API_KEY && unsubscribeToken) {
      try {
        const welcomeResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${platform.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'CREATE SOMETHING <hello@createsomething.io>',
            to: subscriber.email,
            subject: 'Welcome to CREATE SOMETHING',
            html: generateWelcomeEmailHtml(unsubscribeToken, 'io')
          })
        });

        if (!welcomeResponse.ok) {
          console.warn('Welcome email provider rejected the request', {
            status: welcomeResponse.status
          });
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    const property = propertyFromSource(subscriber.source);

    try {
      await recordServerConversion(
        db,
        {
          property,
          action: 'newsletter_confirmed',
          url: url.toString(),
          target: '/confirm',
          metadata: {
            source: subscriber.source || property,
            surface: 'newsletter_confirmation'
          }
        },
        {
          userAgent: request.headers.get('user-agent') || undefined,
          ipCountry: request.headers.get('cf-ipcountry') || undefined
        }
      );

      await upsertWarmLead(db, {
        name: 'Newsletter subscriber',
        email: subscriber.email,
        source: 'website',
        sourceDetail: `newsletter:${subscriber.source || property}`,
        stage: 'awareness',
        serviceInterest: 'newsletter',
        notes: `Confirmed newsletter subscription from ${subscriber.source || property}.`,
        touchedAt: new Date().toISOString()
      });
    } catch (conversionError) {
      console.warn('Newsletter confirmation conversion tracking failed:', conversionError);
    }

    return {
      success: true,
      message: 'Your address is confirmed. The next research note can now reach you.',
      email: subscriber.email,
      alreadyConfirmed: false,
      reason: 'confirmed' satisfies ConfirmationReason
    };
  } catch (confirmationError) {
    console.error('Confirmation error:', confirmationError);
    return confirmationFailure(
      'confirmation-failed',
      'We could not confirm this address. Request a new confirmation email and try again.'
    );
  }
};
