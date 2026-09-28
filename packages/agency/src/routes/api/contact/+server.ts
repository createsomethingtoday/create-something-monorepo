import { json } from '@sveltejs/kit';
import { Effect } from 'effect';
import { contactIntake, createD1ContactRepository, createResendContactMailer, CONTACT_UNKNOWN_MESSAGE } from '$lib/server/contact-intake';
import type { RequestHandler } from './$types';
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

function escapeHtml(value: string | null | undefined): string {
	return (value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
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
				html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .content { line-height: 1.8; }
    .message-box { background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>Thanks for reaching out</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>I've received your inquiry${service ? ` about ${escapeHtml(service)}` : ''} and will get back to you within 24 hours to scope your first outcome stack.</p>
      <div class="message-box">
        ${service ? `<p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Service: ${escapeHtml(service)}</p>` : ''}
        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Next step: ${escapeHtml(intent)} / ${escapeHtml(lane)}</p>
        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Your Message:</p>
        <p style="color: rgba(255, 255, 255, 0.9);">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      </div>
      <p>— Micah Johnson<br>CREATE SOMETHING Agency</p>
    </div>
  </div>
</body>
</html>`
		};

		// Send notification to site owner
		const notification = {
				from: 'CREATE SOMETHING Agency <noreply@workway.co>',
				to: 'micah@createsomething.io',
				replyTo: email,
				subject: service ? `Service Inquiry: ${service} from ${name}` : `New Contact Form Submission from ${name}`,
				html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${service ? `Service Inquiry: ${escapeHtml(service)}` : 'New Contact Form Submission'}</h2>
  </div>
  <div class="content">
    <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
    ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
    ${service ? `<p><strong>Service:</strong> ${escapeHtml(service)}</p>` : ''}
    <p><strong>Intent:</strong> ${escapeHtml(intent)}</p>
    <p><strong>Lane:</strong> ${escapeHtml(lane)}</p>
    <p><strong>Lead stage:</strong> ${leadStage}</p>
    ${campaign ? `<p><strong>Campaign:</strong> ${escapeHtml(campaign)}</p>` : ''}
    <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    <p><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
  </div>
</body>
</html>`
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
