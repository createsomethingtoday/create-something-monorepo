import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { contactSchema, parseBody, type ContactInput } from '@create-something/canon/validation';
import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('ContactAPI');

function escapeHtml(value: string): string {
	return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildContactSummary(input: ContactInput): string {
	const lines = [
		`Primary workflow: ${input.primary_workflow || 'Not provided'}`,
		`Current stack: ${input.current_stack || 'Not provided'}`,
		`Risk level: ${input.risk_level || 'Not provided'}`,
		`Requested next step: ${input.desired_next_step || 'Not provided'}`,
		`Recommended next step: ${input.recommended_next_step || 'Pending review'}`,
		`Timeline: ${input.timeline || 'Not provided'}`
	];

	if (input.message.trim()) {
		lines.push('', 'Additional context:', input.message.trim());
	}

	return lines.join('\n');
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
				role,
				assessment_id,
				primary_workflow,
				current_stack,
				workflow_lane,
				risk_level,
				desired_next_step,
				recommended_next_step,
				timeline
			} = parseResult.data as ContactInput;
			const compiledMessage = buildContactSummary(parseResult.data as ContactInput);
			const normalizedService = desired_next_step || workflow_lane || service || null;

			// Access Cloudflare bindings via platform.env
			if (!platform?.env) {
			throw error(500, 'Platform environment not available');
		}

		const env = platform.env;

			// Store contact submission in D1 database (optional)
			try {
				try {
					await env.DB.prepare(
						`
	        INSERT INTO contact_submissions (
	          name, email, message, service, company, role, assessment_id,
	          primary_workflow, current_stack, workflow_lane, risk_level,
	          desired_next_step, recommended_next_step, timeline, submitted_at
	        )
	        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
	      `
					)
						.bind(
							name,
							email,
							compiledMessage,
							normalizedService,
							company || null,
							role || null,
							assessment_id || null,
							primary_workflow || null,
							current_stack || null,
							workflow_lane || null,
							risk_level || null,
							desired_next_step || null,
							recommended_next_step || null,
							timeline || null
						)
						.run();
				} catch (insertError) {
					logger.warn('Structured contact insert failed, falling back to legacy schema', { error: insertError });
					await env.DB.prepare(
						`
	        INSERT INTO contact_submissions (name, email, message, service, company, assessment_id, submitted_at)
	        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
	      `
					)
						.bind(
							name,
							email,
							compiledMessage,
							normalizedService,
							company || null,
							assessment_id || null
						)
						.run();
				}

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
				Authorization: `Bearer ${env.RESEND_API_KEY || 're_JbMtKyRz_3n55bLDPciMmZfgaez38WzM7'}`,
				'Content-Type': 'application/json'
			},
				body: JSON.stringify({
					from: 'CREATE SOMETHING .agency <hello@createsomething.agency>',
					to: email,
					subject: normalizedService ? `Re: ${normalizedService} inquiry` : 'Thanks for reaching out',
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
	      <p>Hi ${name},</p>
	      <p>I’ve received your workflow details${normalizedService ? ` for ${normalizedService}` : ''} and will follow up with the next step for this workflow.</p>
	      <div class="message-box">
	        ${normalizedService ? `<p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Requested next step: ${escapeHtml(normalizedService)}</p>` : ''}
	        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Workflow summary:</p>
	        <p style="color: rgba(255, 255, 255, 0.9);">${escapeHtml(compiledMessage).replace(/\n/g, '<br>')}</p>
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
				Authorization: `Bearer ${env.RESEND_API_KEY || 're_JbMtKyRz_3n55bLDPciMmZfgaez38WzM7'}`,
				'Content-Type': 'application/json'
			},
				body: JSON.stringify({
					from: 'CREATE SOMETHING .agency <hello@createsomething.agency>',
					to: 'micah@createsomething.agency',
					replyTo: email,
					subject: normalizedService
						? `Workflow inquiry: ${normalizedService} from ${name}`
						: `New workflow inquiry from ${name}`,
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
	    <h2>${normalizedService ? `Workflow inquiry: ${escapeHtml(normalizedService)}` : 'New workflow inquiry'}</h2>
	  </div>
	  <div class="content">
	    <p><strong>From:</strong> ${name} (${email})</p>
	    ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
	    ${role ? `<p><strong>Role:</strong> ${escapeHtml(role)}</p>` : ''}
	    ${risk_level ? `<p><strong>Risk level:</strong> ${escapeHtml(risk_level)}</p>` : ''}
	    ${desired_next_step ? `<p><strong>Requested next step:</strong> ${escapeHtml(desired_next_step)}</p>` : ''}
	    ${recommended_next_step ? `<p><strong>Recommended next step:</strong> ${escapeHtml(recommended_next_step)}</p>` : ''}
	    ${timeline ? `<p><strong>Timeline:</strong> ${escapeHtml(timeline)}</p>` : ''}
	    <p><strong>Workflow summary:</strong><br>${escapeHtml(compiledMessage).replace(/\n/g, '<br>')}</p>
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

			logger.info('Contact form submitted successfully', {
				email,
				name,
				service: normalizedService,
				riskLevel: risk_level,
				recommendedNextStep: recommended_next_step
			});

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
