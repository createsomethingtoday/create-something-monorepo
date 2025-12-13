/**
 * Contact API - Handle contact form submissions
 * POST /api/contact
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ContactSubmission {
	firstName: string;
	lastName: string;
	email: string;
	company?: string;
	phone?: string;
	categoryId: string;
	productId?: string;
	applicationId?: string;
	metals?: string[];
	message?: string;
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
		if (!data.firstName?.trim()) {
			throw error(400, 'First name is required');
		}
		if (!data.lastName?.trim()) {
			throw error(400, 'Last name is required');
		}
		if (!data.email?.trim()) {
			throw error(400, 'Email is required');
		}
		if (!isValidEmail(data.email)) {
			throw error(400, 'Invalid email format');
		}
		if (!data.categoryId) {
			throw error(400, 'Category is required');
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

		// Get client info for logging
		let ipAddress: string | null = null;
		try {
			ipAddress = getClientAddress();
		} catch {
			// Ignore if we can't get IP
		}
		const userAgent = request.headers.get('user-agent');

		// Insert into database
		const result = await db
			.prepare(
				`INSERT INTO contact_submissions
				(first_name, last_name, email, company, phone, category_id, product_id, application_id, metals, message, ip_address, user_agent)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				data.firstName.trim(),
				data.lastName.trim(),
				data.email.trim().toLowerCase(),
				data.company?.trim() || null,
				data.phone?.trim() || null,
				data.categoryId,
				data.productId || null,
				data.applicationId || null,
				data.metals ? JSON.stringify(data.metals) : null,
				data.message?.trim() || null,
				ipAddress,
				userAgent
			)
			.run();

		if (!result.success) {
			console.error('Failed to insert contact submission:', result);
			throw error(500, 'Failed to save submission');
		}

		// TODO: Send notification email to sales team
		// This would integrate with Resend or similar

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
