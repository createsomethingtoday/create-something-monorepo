import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { recordServerConversion, upsertWarmLead } from '@create-something/canon/analytics';
import type { Property } from '@create-something/canon/analytics';
import {
	generateWelcomeEmailHtml,
	generateWelcomeEmailText
} from '@create-something/canon/newsletter';
import { markNewsletterConfirmed } from '$lib/server/newsletter-lifecycle';

const validProperties: Property[] = ['space', 'io', 'agency', 'ltd', 'lms'];

function propertyFromSource(source: unknown): Property {
	if (typeof source !== 'string') return 'io';

	const normalized = source.toLowerCase();
	if (normalized === 'learn') return 'lms';
	const exact = validProperties.find((property) => property === normalized);
	if (exact) return exact;

	return validProperties.find((property) => normalized.startsWith(property)) ?? 'io';
}

export const load: PageServerLoad = async ({ url, platform, request }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw error(400, 'Missing confirmation token');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const db = platform.env.DB;

	try {
		// Find subscriber by confirmation token
		const subscriber = await db
			.prepare(
				`SELECT id, email, confirmed_at, unsubscribed_at, source FROM newsletter_subscribers
				 WHERE confirmation_token = ?
				   AND unsubscribed_at IS NULL
				   AND active = 1
				   AND status = 'active'`
			)
			.bind(token)
			.first();

		if (!subscriber) {
			return {
				success: false,
				message: 'Invalid or expired confirmation link',
				email: null
			};
		}

		// Check if already confirmed
		if (subscriber.confirmed_at) {
			return {
				success: true,
				message: 'Your subscription is already confirmed!',
				email: null,
				alreadyConfirmed: true
			};
		}

		// Confirm the subscription and record direct consent evidence.
		const confirmed = await markNewsletterConfirmed(db, subscriber.id as number);
		if (!confirmed) {
			return {
				success: false,
				message: 'This confirmation link is no longer valid.',
				email: null
			};
		}

		// Send welcome email now that subscription is confirmed
		const email = subscriber.email as string;
		const source = subscriber.source as string | null;
		const property = propertyFromSource(source);

		// Get unsubscribe token from the subscriber record
		const subscriberData = await db
			.prepare(`SELECT unsubscribe_token FROM newsletter_subscribers WHERE id = ?`)
			.bind(subscriber.id)
			.first();

		const unsubscribeToken = subscriberData?.unsubscribe_token as string;

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
						to: email,
						subject: 'Welcome to CREATE SOMETHING',
						html: generateWelcomeEmailHtml(unsubscribeToken, property),
						text: generateWelcomeEmailText(unsubscribeToken, property)
					})
				});

				if (welcomeResponse.ok) {
					const welcomeData = (await welcomeResponse.json()) as { id?: string };
					if (welcomeData.id) {
						await db
							.prepare(
								`UPDATE newsletter_subscribers
								 SET welcome_email_id = ?, updated_at = datetime('now')
								 WHERE id = ?`
							)
							.bind(welcomeData.id, subscriber.id)
							.run();
					}
				}
			} catch (emailError) {
				console.error('Failed to send welcome email:', emailError);
			}
		}

		try {
			await recordServerConversion(
				db,
				{
					property,
					action: 'newsletter_confirmed',
					url: url.toString(),
					target: '/confirm',
					metadata: {
						source: source || property,
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
				email,
				source: 'website',
				sourceDetail: `newsletter:${source || property}`,
				stage: 'awareness',
				serviceInterest: 'newsletter',
				notes: `Confirmed newsletter subscription from ${source || property}.`,
				touchedAt: new Date().toISOString()
			});
		} catch (conversionError) {
			console.warn('Newsletter confirmation conversion tracking failed:', conversionError);
		}

		return {
			success: true,
			message: 'Your subscription has been confirmed!',
			email: null,
			alreadyConfirmed: false
		};
	} catch (err) {
		console.error('Confirmation error:', err);
		throw error(500, 'Failed to process confirmation');
	}
};
