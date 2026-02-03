/**
 * Contact API - Handle contact form submissions
 * POST /api/contact
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

		// Send notification email to sales team
		try {
			const emailBody = `
New Contact Form Submission from Maverick X Website

Name: ${data.name}
Email: ${data.email}
Company: ${data.company || 'Not provided'}
Phone: ${data.phone || 'Not provided'}

Category: ${data.category || 'Not specified'}
Products: ${data.products?.join(', ') || 'None selected'}
Applications: ${data.applications?.join(', ') || 'None selected'}

Message:
${data.comment || 'No message provided'}

---
IP Address: ${ipAddress || 'Unknown'}
User Agent: ${userAgent || 'Unknown'}
Submitted: ${new Date().toISOString()}
			`.trim();

			// Send email to sales team
			// Using mailto for now - can be upgraded to Resend/SendGrid later
			console.log('📧 New Contact Submission:', {
				from: data.email,
				name: data.name,
				category: data.category
			});

			// TODO: Integrate with email service (Resend, SendGrid, or Cloudflare Email)
			// For now, log the submission so it's captured in Cloudflare logs
			console.log(emailBody);
		} catch (emailError) {
			// Log but don't fail the submission if email fails
			console.error('Failed to send notification email:', emailError);
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

// GET endpoint to list submissions (admin only - add auth later)
export const GET: RequestHandler = async ({ platform, url }) => {
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
