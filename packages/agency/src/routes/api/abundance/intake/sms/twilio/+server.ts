import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	formDataToRecord,
	parseTwilioInboundMessage,
	twimlEmpty,
	verifyTwilioSignature
} from '$lib/abundance/providers/twilio';
import { processNurseMessageIntake } from '$lib/abundance/nurse-intake';

export const POST: RequestHandler = async ({ request, platform, url }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			throw error(500, 'Database not available');
		}

		const formData = await request.formData();
		const params = formDataToRecord(formData);
		const message = parseTwilioInboundMessage(formData);

		if (!message.from || !message.body.trim()) {
			return json(
				{ success: false, error: 'Twilio payload must include From and Body' },
				{ status: 400 }
			);
		}

		const authToken = platform?.env?.TWILIO_AUTH_TOKEN;
		if (authToken) {
			const signature = request.headers.get('x-twilio-signature') || '';
			if (!signature) {
				return json({ success: false, error: 'Missing x-twilio-signature header' }, { status: 400 });
			}

			const webhookUrl = platform?.env?.TWILIO_ABUNDANCE_WEBHOOK_URL || `${url.origin}${url.pathname}`;
			const valid = verifyTwilioSignature(authToken, signature, webhookUrl, params);
			if (!valid) {
				return json({ success: false, error: 'Invalid Twilio signature' }, { status: 403 });
			}
		}

		await processNurseMessageIntake(db, {
			channel: 'sms',
			contact: {
				phone: message.from,
				source: 'twilio'
			},
			message: {
				message_id: message.messageSid,
				message_type: message.numMedia > 0 ? 'media' : 'text',
				content: message.body,
				raw_payload: params
			},
			context: {
				intake_channel: 'sms',
				source: 'twilio',
				notes: message.to ? `Received on ${message.to}` : undefined
			}
		});

		return new Response(twimlEmpty(), {
			status: 200,
			headers: {
				'Content-Type': 'text/xml; charset=utf-8'
			}
		});
	} catch (err) {
		console.error('Twilio nurse intake error:', err);
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
				error: `Error processing Twilio nurse intake: ${message}`
			},
			{ status }
		);
	}
};
