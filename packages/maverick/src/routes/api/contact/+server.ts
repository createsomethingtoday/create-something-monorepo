/**
 * Contact API - Handle contact form submissions
 * POST /api/contact
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession, escapeHtml } from '$lib/server/auth';

interface ContactSubmission {
	name: string;
	email: string;
	company?: string;
	phone?: string;
	category?: string;
	products?: string[];
	applications?: string[];
	comment?: string;
}

// Validate email format
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	try {
		const data: ContactSubmission = await request.json();

		// Validate required fields
		if (!data.name?.trim()) {
			throw error(400, 'Name is required');
		}
		if (!data.email?.trim()) {
			throw error(400, 'Email is required');
		}
		if (!isValidEmail(data.email)) {
			throw error(400, 'Invalid email format');
		}

		const db = platform?.env?.DB;
		if (!db) {
			// In dev without D1, just log and return success
			console.log('Contact submission (no DB):', data);
			return json({
				success: true,
				message: 'Thank you for your inquiry. We will be in touch soon.'
			});
		}

		// Parse name into first/last (simple split on first space)
		const nameParts = data.name.trim().split(' ');
		const firstName = nameParts[0];
		const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use firstName if no last name

		// Get client info for logging
		let ipAddress: string | null = null;
		try {
			ipAddress = getClientAddress();
		} catch {
			// Ignore if we can't get IP
		}
		const userAgent = request.headers.get('user-agent');

		// Insert into database (matching schema: first_name, last_name, category_id, message, etc.)
		const result = await db
			.prepare(
				`INSERT INTO contact_submissions
				(first_name, last_name, email, company, phone, category_id, product_id, application_id, metals, message, ip_address, user_agent)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				firstName,
				lastName,
				data.email.trim().toLowerCase(),
				data.company?.trim() || null,
				data.phone?.trim() || null,
				data.category || 'general', // Use 'general' as default category_id
				data.products?.[0] || null, // First selected product as product_id
				data.applications?.[0] || null, // First selected application as application_id
				data.products ? JSON.stringify(data.products) : null, // Store all as JSON in metals field
				data.comment?.trim() || null,
				ipAddress,
				userAgent
			)
			.run();

		if (!result.success) {
			console.error('Failed to insert contact submission:', result);
			throw error(500, 'Failed to save submission');
		}

		// Send emails via Resend
		const resendKey = platform?.env?.RESEND_API_KEY;
		if (!resendKey) {
			console.warn('RESEND_API_KEY not configured - skipping email notifications');
			return json({
				success: true,
				message: 'Thank you for your inquiry. We will be in touch soon.'
			});
		}

		// Format the submission details for email (all user input escaped)
		const safeName = escapeHtml(data.name);
		const safeEmail = escapeHtml(data.email);
		const safeCompany = data.company ? escapeHtml(data.company) : 'Not provided';
		const safePhone = data.phone ? escapeHtml(data.phone) : 'Not provided';
		const safeCategory = data.category ? escapeHtml(data.category) : '';
		const safeProducts = data.products?.length ? data.products.map(escapeHtml).join(', ') : '';
		const safeApplications = data.applications?.length ? data.applications.map(escapeHtml).join(', ') : '';
		const safeComment = data.comment ? escapeHtml(data.comment).replace(/\n/g, '<br>') : '';

		const submissionDetails = `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p><strong>Name:</strong> ${safeName}</p>
  <p><strong>Email:</strong> ${safeEmail}</p>
  <p><strong>Company:</strong> ${safeCompany}</p>
  <p><strong>Phone:</strong> ${safePhone}</p>
  ${safeCategory ? `<p><strong>Category:</strong> ${safeCategory}</p>` : ''}
  ${safeProducts ? `<p><strong>Products:</strong> ${safeProducts}</p>` : ''}
  ${safeApplications ? `<p><strong>Applications:</strong> ${safeApplications}</p>` : ''}
  ${safeComment ? `<p><strong>Message:</strong><br>${safeComment}</p>` : ''}
  <p style="color: #666; font-size: 14px; margin-top: 20px;"><strong>Submitted:</strong> ${new Date().toUTCString()}</p>
</div>
		`.trim();

		// Send auto-response to customer
		const autoResponsePromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Maverick X <noreply@createsomething.io>',
				to: data.email,
				subject: 'Thank you for contacting Maverick X',
				html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 20px; font-weight: 600; letter-spacing: 0.05em; margin-bottom: 32px; }
    .content { line-height: 1.8; }
    .message-box { background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">MAVERICK X</div>
    <div class="content">
      <h1 style="font-size: 24px; margin: 0 0 24px 0;">Thanks for reaching out</h1>
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>We've received your inquiry${safeCategory ? ` about ${safeCategory}` : ''} and will get back to you within 24 hours to discuss your needs.</p>
      ${safeComment ? `
      <div class="message-box">
        <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin-bottom: 10px;">Your Message:</p>
        <p style="color: rgba(255, 255, 255, 0.9);">${safeComment}</p>
      </div>
      ` : ''}
      <p>If you have any immediate questions, feel free to reply to this email.</p>
      <p>— Maverick X Team</p>
    </div>
  </div>
</body>
</html>`
			})
		});

		// Send notification to sales team
		const notificationRecipients = [
			'calvin@maverickmetals.com',
			'matthew.fontenot@maverickx.com'
		];

		const notificationPromise = fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Maverick X Contact Form <noreply@createsomething.io>',
				to: notificationRecipients,
				replyTo: data.email,
				subject: `Maverick X Inquiry: ${safeCategory || 'General'} from ${safeName}`,
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
    <h2>New Maverick X Contact Form Submission</h2>
  </div>
  ${submissionDetails}
</body>
</html>`
			})
		});

		// Wait for both emails to send
		try {
			const [autoResponse, notification] = await Promise.all([
				autoResponsePromise,
				notificationPromise
			]);

			if (!autoResponse.ok) {
				const errorData = await autoResponse.json();
				console.error('Failed to send auto-response email:', errorData);
				// Don't fail the submission if auto-response fails
			}

			if (!notification.ok) {
				const errorData = await notification.json();
				console.error('Failed to send notification email:', errorData);
				// Don't fail the submission if notification fails
			}

			console.log('📧 Contact submission processed:', {
				name: data.name,
				email: data.email,
				category: data.category
			});
		} catch (emailError) {
			// Log but don't fail the submission if email fails
			console.error('Email sending error:', emailError);
		}

		return json({
			success: true,
			message: 'Thank you for your inquiry. We will be in touch soon.'
		});
	} catch (e) {
		if ((e as { status?: number }).status) {
			throw e; // Re-throw SvelteKit errors
		}
		console.error('Contact submission error:', e);
		throw error(500, 'Failed to process submission');
	}
};

// GET endpoint to list submissions (admin only)
export const GET: RequestHandler = async ({ platform, url, cookies }) => {
	// Require authentication
	const sessionId = cookies.get('maverick_session');
	if (!sessionId) {
		throw error(401, 'Authentication required');
	}

	const sessions = platform?.env?.SESSIONS;
	if (!sessions) {
		throw error(500, 'Sessions not available');
	}

	const session = await validateSession(sessionId, sessions);
	if (!session) {
		throw error(401, 'Invalid or expired session');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const status = url.searchParams.get('status') || 'new';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

	try {
		const { results } = await db
			.prepare(
				`SELECT * FROM contact_submissions
				WHERE status = ?
				ORDER BY created_at DESC
				LIMIT ?`
			)
			.bind(status, limit)
			.all();

		return json({ submissions: results });
	} catch (e) {
		console.error('Failed to fetch submissions:', e);
		throw error(500, 'Failed to fetch submissions');
	}
};
