import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	nurseInboundEmailSchema,
	parseBody,
	type NurseInboundEmailInput
} from '@create-something/canon/validation';
import type { ApiResponse, NurseMessageIntakeResult } from '$lib/types/abundance';
import { processNurseMessageIntake } from '$lib/abundance/nurse-intake';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const configuredSecret = platform?.env?.ABUNDANCE_EMAIL_WEBHOOK_SECRET;
		if (configuredSecret) {
			const providedSecret = request.headers.get('x-abundance-email-secret');
			if (providedSecret !== configuredSecret) {
				return json(
					{ success: false, error: 'Invalid inbound email webhook secret' } as ApiResponse<never>,
					{ status: 403 }
				);
			}
		}

		const parseResult = await parseBody(request, nurseInboundEmailSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const payload = parseResult.data as NurseInboundEmailInput;
		const sender = parseEmailAddress(payload.reply_to || payload.from);
		const intakeResult = await processNurseMessageIntake(db, {
			channel: 'email',
			contact: {
				name: sender.name || undefined,
				email: sender.email,
				source: payload.provider || 'email'
			},
			message: {
				message_id: payload.message_id,
				message_type: 'email',
				subject: payload.subject,
				content: getEmailContent(payload),
				received_at: payload.received_at,
				raw_payload: payload.raw_payload || payload
			},
			context: {
				intake_channel: 'email',
				source: payload.provider || 'email'
			}
		});

		return json(
			{ success: true, data: intakeResult } as ApiResponse<NurseMessageIntakeResult>,
			{ status: intakeResult.is_new_candidate ? 201 : 200 }
		);
	} catch (err) {
		console.error('Inbound email nurse intake error:', err);
		if (err instanceof Response) throw err;

		const message = err instanceof Error ? err.message : 'Unknown error';
		const status =
			message.includes('Phone and email map to different')
				? 409
				: message.includes('Phone or email is required')
					? 400
					: 500;

		return json(
			{
				success: false,
				error: `Error processing inbound email nurse intake: ${message}`
			} as ApiResponse<never>,
			{ status }
		);
	}
};

function parseEmailAddress(raw: string): { name: string; email: string } {
	const match = raw.match(/^(?:"?([^"]*)"?\s*)?<?([^>]+)>?$/);
	if (match) {
		return {
			name: match[1]?.trim() || '',
			email: match[2]?.trim() || raw.trim()
		};
	}

	return { name: '', email: raw.trim() };
}

function getEmailContent(payload: NurseInboundEmailInput): string {
	if (payload.text?.trim()) {
		return payload.text.trim();
	}

	if (payload.html?.trim()) {
		return stripHtml(payload.html);
	}

	return payload.subject?.trim() || 'Inbound email received';
}

function stripHtml(html: string): string {
	return html
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/\s+/g, ' ')
		.trim();
}
