import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendEmail } from '$lib/email/service';

interface ContactPayload {
	name: string;
	email: string;
	subject: string;
	message: string;
}

function sanitize(value: unknown, maxLength: number): string {
	if (typeof value !== 'string') return '';
	return value.trim().slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function parsePayload(body: unknown): ContactPayload | null {
	if (!body || typeof body !== 'object') return null;
	const payload = body as Record<string, unknown>;

	const name = sanitize(payload.name, 120);
	const email = sanitize(payload.email, 320).toLowerCase();
	const subject = sanitize(payload.subject, 180);
	const message = sanitize(payload.message, 6000);

	if (!name || !email || !subject || !message) return null;
	if (!isValidEmail(email)) return null;

	return { name, email, subject, message };
}

function buildInquiryId(): string {
	return `inq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function sendInternalNotification(
	apiKey: string,
	inquiry: ContactPayload,
	inquiryId: string
): Promise<void> {
	const subject = `[Outerfields] Contact inquiry: ${inquiry.subject}`;
	const html = `
		<h2>New Contact Inquiry</h2>
		<p><strong>ID:</strong> ${escapeHtml(inquiryId)}</p>
		<p><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
		<p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
		<p><strong>Subject:</strong> ${escapeHtml(inquiry.subject)}</p>
		<p><strong>Message:</strong></p>
		<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(inquiry.message)}</pre>
	`;
	const text = `New contact inquiry
ID: ${inquiryId}
Name: ${inquiry.name}
Email: ${inquiry.email}
Subject: ${inquiry.subject}

Message:
${inquiry.message}`;

	const result = await sendEmail(apiKey, 'hello@outerfields.com', subject, html, text, {
		replyTo: inquiry.email
	});

	if (!result.success) {
		throw new Error(result.error || 'Failed to send notification email');
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 503 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const payload = parsePayload(body);
	if (!payload) {
		return json(
			{
				success: false,
				error: 'Please provide a valid name, email, subject, and message.'
			},
			{ status: 400 }
		);
	}

	const inquiryId = buildInquiryId();
	const now = Date.now();

	try {
		await db
			.prepare(
				`INSERT INTO contact_inquiries (
					id, name, email, subject, message, status, source, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				inquiryId,
				payload.name,
				payload.email,
				payload.subject,
				payload.message,
				'new',
				'contact-form',
				now,
				now
			)
			.run();

		const resendApiKey = platform?.env?.RESEND_API_KEY;
		if (resendApiKey) {
			try {
				await sendInternalNotification(resendApiKey, payload, inquiryId);
			} catch (emailError) {
				console.error('Contact notification email failed:', emailError);
			}
		}

		return json({
			success: true,
			data: {
				id: inquiryId
			}
		});
	} catch (error) {
		console.error('Contact submission failed:', error);
		return json({ success: false, error: 'Failed to submit inquiry' }, { status: 500 });
	}
};
