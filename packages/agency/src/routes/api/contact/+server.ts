import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { renderContactResponse, renderContactNotification } from './email';
import { contactSchema, parseBody, type ContactInput } from '@create-something/canon/validation';
import {
	recordServerConversion,
	upsertWarmLead,
	type ServerConversionInput,
	type WarmLeadInput
} from '@create-something/canon/analytics';
import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('ContactAPI');
const validSourceProperties = new Set(['space', 'io', 'agency', 'ltd', 'lms']);
type ContactLeadStage = NonNullable<WarmLeadInput['stage']>;

function normalizeSourceProperty(value: string | undefined): ServerConversionInput['sourceProperty'] {
	return value && validSourceProperties.has(value)
		? (value as ServerConversionInput['sourceProperty'])
		: undefined;
}

function resolveLeadStage(intent: string | undefined): ContactLeadStage {
	switch (intent) {
		case 'governance-checklist':
			return 'awareness';
		case 'membership':
		case 'workflow-mapping':
			return 'decision';
		case 'workflow-teardown':
		default:
			return 'consideration';
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		// Validate request body with Zod schema
		const parseResult = await parseBody(request, contactSchema);
		if (!parseResult.success) {
			return json(
				{
					success: false,
					message: parseResult.error
				},
				{ status: 400 }
			);
		}

		const {
			name,
			email,
			message,
			service,
			company,
			assessment_id,
			source = 'contact',
			intent = 'workflow-mapping',
			lane = 'not_sure',
			campaign,
			source_property,
			session_id,
			landing_url,
			referrer
		} = parseResult.data as ContactInput;
		const leadStage = resolveLeadStage(intent);

		// Access Cloudflare bindings via platform.env
		if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;
		const resendApiKey = env.RESEND_API_KEY;
		if (!resendApiKey) {
			logger.error('RESEND_API_KEY not configured for contact form');
			return json(
				{
					success: false,
					message: 'Email service is not configured'
				},
				{ status: 500 }
			);
		}

		// Store contact submission in D1 database (optional)
		try {
			await env.DB.prepare(
				`
        INSERT INTO contact_submissions (name, email, message, service, company, assessment_id, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `
			)
				.bind(name, email, message, service || null, company || null, assessment_id || null)
				.run();

			// Mark assessment as converted if present
			if (assessment_id) {
				await env.DB.prepare(
					`UPDATE assessment_responses SET converted_to_contact = 1 WHERE session_id = ?`
				)
					.bind(assessment_id)
					.run();
			}
		} catch (dbError) {
			logger.warn('Contact submissions table not found - skipping DB insert', { error: dbError });
		}

		try {
			await recordServerConversion(
				env.DB,
				{
					property: 'agency',
					action: 'contact_submitted',
					sessionId: session_id,
					sourceProperty: normalizeSourceProperty(source_property),
					url: landing_url || 'https://createsomething.agency/contact',
					referrer,
					target: '/contact',
					metadata: {
						source,
						intent,
						lane,
						campaign,
						leadStage,
						service,
						companyProvided: Boolean(company),
						assessmentConverted: Boolean(assessment_id)
					}
				},
				{
					userAgent: request.headers.get('user-agent') || undefined,
					ipCountry: request.headers.get('cf-ipcountry') || undefined
				}
			);

			await upsertWarmLead(env.DB, {
				name,
				email,
				company,
				source: 'website',
				sourceDetail: `contact:${source}:${intent}:${lane}`,
				campaign,
				stage: leadStage,
				serviceInterest: service || lane,
				notes: message,
				touchedAt: new Date().toISOString()
			});
		} catch (conversionError) {
			logger.warn('Contact conversion tracking failed', { error: conversionError });
		}

		// Send auto-response to the person who contacted us
		const autoResponsePromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING Agency <noreply@workway.co>',
				to: email,
				subject: service ? `Re: ${service} Inquiry` : 'Thanks for reaching out',
				html: renderContactResponse({ name, message, service, intent, lane })
			})
		});

		// Send notification to site owner
		const notificationPromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'CREATE SOMETHING Agency <noreply@workway.co>',
				to: 'micah@createsomething.io',
				replyTo: email,
				subject: service ? `Service Inquiry: ${service} from ${name}` : `New Contact Form Submission from ${name}`,
				html: renderContactNotification({ name, email, message, service, company, intent, lane, leadStage, campaign, submittedAt: new Date().toUTCString() })
			})
		});

		// Wait for both emails to send
		const [autoResponse, notification] = await Promise.all([
			autoResponsePromise,
			notificationPromise
		]);

		if (!autoResponse.ok) {
			const errorData = await autoResponse.json();
			logger.error('Failed to send auto-response email', { email, error: errorData });
			return json(
				{
					success: false,
					message: 'Failed to send confirmation email'
				},
				{ status: 500 }
			);
		}

		if (!notification.ok) {
			const errorData = await notification.json();
			logger.error('Failed to send notification email', { email, error: errorData });
		}

		logger.info('Contact form submitted successfully', { email, name, service });

		return json({
			success: true,
			message: 'Message sent successfully! You should receive a confirmation email shortly.'
		});
	} catch (err) {
		logger.error('Contact form error', { error: err });
		return json(
			{
				success: false,
				message: `Error processing contact form: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
