/**
 * Abundance Network: WhatsApp Webhook Handler
 *
 * GET /api/abundance/whatsapp - Webhook verification (Meta requirement)
 * POST /api/abundance/whatsapp - Receive incoming messages
 *
 * This webhook receives messages from WhatsApp via Meta Cloud API.
 * It identifies users by phone number and routes to appropriate handlers.
 *
 * Note: Conversation logic (GPT) happens externally. This API provides
 * the database layer and user identification.
 */

import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Seeker, Talent, Intake, ApiResponse } from '$lib/types/abundance';
import { generateId } from '$lib/abundance/matching';

// Types for WhatsApp webhook payloads
interface WhatsAppWebhookEntry {
	id: string;
	changes: Array<{
		value: {
			messaging_product: string;
			metadata: {
				display_phone_number: string;
				phone_number_id: string;
			};
			contacts?: Array<{
				profile: { name: string };
				wa_id: string;
			}>;
			messages?: Array<{
				from: string;
				id: string;
				timestamp: string;
				type: string;
				text?: { body: string };
				button?: { text: string; payload: string };
				interactive?: {
					type: string;
					button_reply?: { id: string; title: string };
					list_reply?: { id: string; title: string };
				};
			}>;
			statuses?: Array<{
				id: string;
				status: string;
				timestamp: string;
				recipient_id: string;
			}>;
		};
		field: string;
	}>;
}

interface WhatsAppWebhookPayload {
	object: string;
	entry: WhatsAppWebhookEntry[];
}

interface ProcessedMessage {
	phone: string;
	name: string;
	message_id: string;
	timestamp: string;
	type: string;
	content: string;
	user_type?: 'seeker' | 'talent' | 'unknown';
	user_id?: string;
	is_new_user: boolean;
}

/**
 * GET: Webhook verification (required by Meta)
 * Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const mode = url.searchParams.get('hub.mode');
	const token = url.searchParams.get('hub.verify_token');
	const challenge = url.searchParams.get('hub.challenge');

	// Get verify token from environment (must be set in Cloudflare dashboard)
	const verifyToken = platform?.env?.WHATSAPP_VERIFY_TOKEN || 'abundance-network-verify';

	if (mode === 'subscribe' && token === verifyToken) {
		console.log('WhatsApp webhook verified');
		// Return the challenge as plain text (not JSON)
		return text(challenge || '', { status: 200 });
	}

	console.warn('WhatsApp webhook verification failed', { mode, token });
	return json({ error: 'Verification failed' }, { status: 403 });
};

/**
 * POST: Receive incoming messages
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			console.error('Database not available');
			// Still return 200 to acknowledge receipt (Meta requires this)
			return json({ success: false, error: 'Database not available' }, { status: 200 });
		}

		const payload = (await request.json()) as WhatsAppWebhookPayload;

		// Validate it's from WhatsApp
		if (payload.object !== 'whatsapp_business_account') {
			return json({ success: false, error: 'Invalid payload' }, { status: 200 });
		}

		const processedMessages: ProcessedMessage[] = [];

		// Process each entry
		for (const entry of payload.entry) {
			for (const change of entry.changes) {
				if (change.field !== 'messages') continue;

				const value = change.value;

				// Skip if no messages (might be status updates)
				if (!value.messages || value.messages.length === 0) {
					// Handle status updates if needed
					if (value.statuses) {
						for (const status of value.statuses) {
							console.log('Message status update:', status.status, status.id);
						}
					}
					continue;
				}

				// Get contact info
				const contact = value.contacts?.[0];
				const contactName = contact?.profile?.name || 'Unknown';

				// Process each message
				for (const message of value.messages) {
					const phone = message.from;

					// Extract message content based on type
					let content = '';
					switch (message.type) {
						case 'text':
							content = message.text?.body || '';
							break;
						case 'button':
							content = message.button?.payload || message.button?.text || '';
							break;
						case 'interactive':
							content = message.interactive?.button_reply?.id ||
								message.interactive?.list_reply?.id ||
								message.interactive?.button_reply?.title ||
								message.interactive?.list_reply?.title || '';
							break;
						default:
							content = `[${message.type} message]`;
					}

					// Look up user in database
					const { userId, userType, isNew } = await lookupOrCreateUser(
						platform.env.DB,
						phone,
						contactName
					);

					const processedMessage: ProcessedMessage = {
						phone,
						name: contactName,
						message_id: message.id,
						timestamp: message.timestamp,
						type: message.type,
						content,
						user_type: userType,
						user_id: userId,
						is_new_user: isNew
					};

					processedMessages.push(processedMessage);

					// Store intake for conversation tracking
					const intakeUserType: 'seeker' | 'talent' = userType === 'talent' ? 'talent' : 'seeker';
					await storeIntake(platform.env.DB, {
						user_id: userId,
						user_type: intakeUserType,
						intake_type: isNew ? 'onboarding' : 'checkin',
						data: {
							message_id: message.id,
							timestamp: message.timestamp,
							type: message.type,
							content,
							source: 'whatsapp'
						}
					});
				}
			}
		}

		// Return processed messages for external systems (GPT) to handle
		return json({
			success: true,
			data: processedMessages
		});
	} catch (err) {
		console.error('WhatsApp webhook error:', err);
		// Return 200 anyway to acknowledge receipt
		return json({
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		}, { status: 200 });
	}
};

/**
 * Look up user by phone or create placeholder
 */
async function lookupOrCreateUser(
	db: D1Database,
	phone: string,
	name: string
): Promise<{ userId: string; userType: 'seeker' | 'talent' | 'unknown'; isNew: boolean }> {
	// Check seekers first
	const seeker = await db.prepare(
		'SELECT id FROM seekers WHERE phone = ?'
	).bind(phone).first<{ id: string }>();

	if (seeker) {
		return { userId: seeker.id, userType: 'seeker', isNew: false };
	}

	// Check talent
	const talent = await db.prepare(
		'SELECT id FROM talent WHERE phone = ?'
	).bind(phone).first<{ id: string }>();

	if (talent) {
		return { userId: talent.id, userType: 'talent', isNew: false };
	}

	// New user - create as seeker in onboarding status
	// (Can be converted to talent later through conversation)
	const id = generateId();
	await db.prepare(`
		INSERT INTO seekers (id, phone, name, status)
		VALUES (?, ?, ?, 'onboarding')
	`).bind(id, phone, name).run();

	return { userId: id, userType: 'seeker', isNew: true };
}

/**
 * Store intake record for conversation tracking
 */
async function storeIntake(
	db: D1Database,
	input: {
		user_id: string;
		user_type: 'seeker' | 'talent';
		intake_type: 'onboarding' | 'new_job' | 'checkin' | 'feedback';
		data: Record<string, unknown>;
	}
): Promise<void> {
	const id = generateId();

	// Get previous intake for spiral linkage
	const previous = await db.prepare(`
		SELECT id FROM intakes
		WHERE user_id = ? AND user_type = ?
		ORDER BY created_at DESC
		LIMIT 1
	`).bind(input.user_id, input.user_type).first<{ id: string }>();

	await db.prepare(`
		INSERT INTO intakes (id, user_id, user_type, intake_type, data, previous_intake_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`).bind(
		id,
		input.user_id,
		input.user_type,
		input.intake_type,
		JSON.stringify(input.data),
		previous?.id || null
	).run();
}
