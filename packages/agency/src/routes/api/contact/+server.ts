import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { contactSchema, parseBody, type ContactInput } from '@create-something/canon/validation';
import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('ContactAPI');
const DEFAULT_EMAIL_FROM = 'CREATE SOMETHING Agency <noreply@workway.co>';

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

		const { name, email, message, service, company, assessment_id } = parseResult.data as ContactInput;

		// Access Cloudflare bindings via platform.env
		if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;
		const resendApiKey = env.RESEND_API_KEY?.trim();
		if (!resendApiKey) {
			logger.error('Contact email service is not configured');
			return json(
				{
					success: false,
					message: 'Contact email service is temporarily unavailable'
				},
				{ status: 503 }
			);
		}

		const emailFrom = env.EMAIL_FROM_SITES?.trim() || DEFAULT_EMAIL_FROM;
		const safeName = escapeHtml(name);
		const safeEmail = escapeHtml(email);
		const safeMessage = htmlWithLineBreaks(message);
		const safeService = service ? escapeHtml(service) : null;
		const safeCompany = company ? escapeHtml(company) : null;
		const subjectService = service ? sanitizeSubjectText(service) : null;
		const subjectName = sanitizeSubjectText(name);

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

		// Send auto-response to the person who contacted us
		const autoResponsePromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: emailFrom,
				to: email,
				subject: subjectService ? `Re: ${subjectService} Inquiry` : 'Thanks for reaching out',
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
      <p>Hi ${safeName},</p>
      <p>I've received your inquiry${safeService ? ` about ${safeService}` : ''} and will get back to you within 24 hours to scope your first outcome stack.</p>
      <div class="message-box">
        ${safeService ? `<p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Service: ${safeService}</p>` : ''}
        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Your Message:</p>
        <p style="color: rgba(255, 255, 255, 0.9);">${safeMessage}</p>
      </div>
      <p>— Micah Johnson<br>CREATE SOMETHING Agency</p>
    </div>
  </div>
</body>
</html>`
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
				from: emailFrom,
				to: 'micah@createsomething.io',
				replyTo: email,
				subject: subjectService ? `Service Inquiry: ${subjectService} from ${subjectName}` : `New Contact Form Submission from ${subjectName}`,
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
    <h2>${safeService ? `Service Inquiry: ${safeService}` : 'New Contact Form Submission'}</h2>
  </div>
  <div class="content">
    <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
    ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ''}
    ${safeService ? `<p><strong>Service:</strong> ${safeService}</p>` : ''}
    <p><strong>Message:</strong><br>${safeMessage}</p>
    <p><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
  </div>
</body>
</html>`
			})
		});

		// Wait for both emails to send
		const [autoResponse, notification] = await Promise.all([
			autoResponsePromise,
			notificationPromise
		]);

		if (!autoResponse.ok) {
			const errorData = await readResponseBody(autoResponse);
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
			const errorData = await readResponseBody(notification);
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

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		switch (character) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			case "'":
				return '&#39;';
			default:
				return character;
		}
	});
}

function htmlWithLineBreaks(value: string): string {
	return escapeHtml(value).replace(/\n/g, '<br>');
}

function sanitizeSubjectText(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').trim();
}

async function readResponseBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
