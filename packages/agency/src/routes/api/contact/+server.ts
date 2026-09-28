import { json } from '@sveltejs/kit';
import { Effect } from 'effect';
import { contactIntake, createD1ContactRepository, createResendContactMailer, CONTACT_UNKNOWN_MESSAGE } from '$lib/server/contact-intake';
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
		const requestId = request.headers.get('Idempotency-Key') || crypto.randomUUID();
		if (!/^[a-zA-Z0-9_-]{16,128}$/.test(requestId)) {
			return json({ success: false, message: 'Invalid request ID' }, { status: 400 });
		}

		const env = platform?.env;
		if (!env?.DB || !env.RESEND_API_KEY) {
			return json({ success: false, message: CONTACT_UNKNOWN_MESSAGE, requestId }, { status: 503 });
		}
		const secondary = async () => {
			if (assessment_id) {
				await env.DB.prepare('UPDATE assessment_responses SET converted_to_contact = 1 WHERE session_id = ?').bind(assessment_id).run();
			}
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
		};

		// Send auto-response to the person who contacted us
		const confirmation = {
				from: 'CREATE SOMETHING Agency <noreply@workway.co>',
				to: email,
				subject: service ? `Re: ${service} Inquiry` : 'Thanks for reaching out',
				html: renderContactResponse({ name, message, service, intent, lane })
		};

		// Send notification to site owner
		const notification = {
				from: 'CREATE SOMETHING Agency <noreply@workway.co>',
				to: 'micah@createsomething.io',
				replyTo: email,
				subject: service ? `Service Inquiry: ${service} from ${name}` : `New Contact Form Submission from ${name}`,
				html: renderContactNotification({ name, email, message, service, company, intent, lane, leadStage, campaign, submittedAt: new Date().toUTCString() })
		};

		const result = await Effect.runPromise(contactIntake(
			{ ...parseResult.data, source, intent, lane }, requestId,
			createD1ContactRepository(env.DB),
			createResendContactMailer(env.RESEND_API_KEY, { confirmation, notification }), secondary
		), { signal: request.signal });
		logger.info('Contact intake outcome', { requestId, receipt: result.receipt, secondary: result.secondary });
		const { status, secondary: _secondary, ...body } = result;
		return json(body, { status });
	} catch {
		// Do not expose provider responses, tokens, message content, or database errors.
		logger.error('Contact intake interrupted');
		return json({ success: false, message: CONTACT_UNKNOWN_MESSAGE }, { status: 503 });
	}
};
