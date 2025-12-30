/**
 * SMS Conversation State Manager
 *
 * Manages multi-turn booking conversations using KV storage.
 * Implements a simple state machine for booking flow.
 */

import type { BookingIntent } from './intent-parser';

export type ConversationState =
	| 'idle'
	| 'awaiting_court'
	| 'awaiting_date'
	| 'awaiting_time'
	| 'awaiting_confirmation'
	| 'complete';

export interface ConversationContext {
	phoneNumber: string;
	facilityId: string;
	state: ConversationState;
	court?: string;
	date?: string;
	time?: string;
	duration?: number;
	memberId?: string;
	lastActivity: number;
	tentativeReservationId?: string;
}

interface ConversationResult {
	response: string;
	newContext: ConversationContext;
	action?: 'book' | 'cancel' | 'none';
}

const CONVERSATION_TTL = 30 * 60; // 30 minutes
const DEFAULT_DURATION = 60; // 60 minutes

/**
 * Get or create conversation context from KV
 */
export async function getConversation(
	kv: KVNamespace,
	phoneNumber: string,
	facilityId: string
): Promise<ConversationContext> {
	const key = `sms:${facilityId}:${phoneNumber}`;
	const stored = await kv.get<ConversationContext>(key, 'json');

	if (stored && Date.now() - stored.lastActivity < CONVERSATION_TTL * 1000) {
		return stored;
	}

	return {
		phoneNumber,
		facilityId,
		state: 'idle',
		lastActivity: Date.now()
	};
}

/**
 * Save conversation context to KV
 */
export async function saveConversation(
	kv: KVNamespace,
	context: ConversationContext
): Promise<void> {
	const key = `sms:${context.facilityId}:${context.phoneNumber}`;
	await kv.put(key, JSON.stringify(context), { expirationTtl: CONVERSATION_TTL });
}

/**
 * Clear conversation context
 */
export async function clearConversation(
	kv: KVNamespace,
	phoneNumber: string,
	facilityId: string
): Promise<void> {
	const key = `sms:${facilityId}:${phoneNumber}`;
	await kv.delete(key);
}

/**
 * Process intent and advance conversation state
 */
export function processIntent(
	context: ConversationContext,
	intent: BookingIntent
): ConversationResult {
	switch (intent.type) {
		case 'help':
			return {
				response: helpMessage(),
				newContext: { ...context, state: 'idle', lastActivity: Date.now() }
			};

		case 'status':
			return {
				response: "I'll check your upcoming reservations. One moment...",
				newContext: { ...context, lastActivity: Date.now() },
				action: 'none'
			};

		case 'book':
			return handleBookIntent(context, intent);

		case 'check':
			return handleCheckIntent(context, intent);

		case 'cancel':
			return handleCancelIntent(context, intent);

		case 'confirm':
			return handleConfirmation(context, true);

		case 'deny':
			return handleConfirmation(context, false);

		case 'unknown':
		default:
			return handleUnknown(context, intent);
	}
}

/**
 * Handle booking intent - may need to collect missing info
 */
function handleBookIntent(
	context: ConversationContext,
	intent: BookingIntent & { type: 'book' }
): ConversationResult {
	const newContext: ConversationContext = {
		...context,
		court: intent.court || context.court,
		date: intent.date || context.date,
		time: intent.time || context.time,
		duration: intent.duration || context.duration || DEFAULT_DURATION,
		lastActivity: Date.now()
	};

	// Check what's missing
	if (!newContext.court) {
		return {
			response: "Which court would you like? We have courts 1-4 available.",
			newContext: { ...newContext, state: 'awaiting_court' }
		};
	}

	if (!newContext.date) {
		return {
			response: `Court ${newContext.court}. What day? (e.g., "today", "tomorrow", "Saturday")`,
			newContext: { ...newContext, state: 'awaiting_date' }
		};
	}

	if (!newContext.time) {
		return {
			response: `Court ${newContext.court} on ${newContext.date}. What time? (e.g., "6pm", "2:30pm")`,
			newContext: { ...newContext, state: 'awaiting_time' }
		};
	}

	// All info collected - ask for confirmation
	return {
		response: formatConfirmationPrompt(newContext),
		newContext: { ...newContext, state: 'awaiting_confirmation' }
	};
}

/**
 * Handle availability check
 */
function handleCheckIntent(
	context: ConversationContext,
	intent: BookingIntent & { type: 'check' }
): ConversationResult {
	const date = intent.date || 'today';
	const time = intent.time || '';

	return {
		response: `Checking availability for ${date}${time ? ` at ${time}` : ''}...`,
		newContext: { ...context, date, time, lastActivity: Date.now() },
		action: 'none'
	};
}

/**
 * Handle cancel intent
 */
function handleCancelIntent(
	context: ConversationContext,
	intent: BookingIntent & { type: 'cancel' }
): ConversationResult {
	if (intent.reservationId) {
		return {
			response: `Cancelling reservation ${intent.reservationId}. Reply YES to confirm or NO to keep it.`,
			newContext: {
				...context,
				tentativeReservationId: intent.reservationId,
				state: 'awaiting_confirmation',
				lastActivity: Date.now()
			},
			action: 'none'
		};
	}

	return {
		response: "I'll look up your reservations to cancel. One moment...",
		newContext: { ...context, lastActivity: Date.now() },
		action: 'cancel'
	};
}

/**
 * Handle confirmation or denial
 */
function handleConfirmation(
	context: ConversationContext,
	confirmed: boolean
): ConversationResult {
	if (context.state !== 'awaiting_confirmation') {
		return {
			response: confirmed
				? "There's nothing pending to confirm. Say BOOK to start a reservation."
				: "Okay, no problem. Say HELP for available commands.",
			newContext: { ...context, state: 'idle', lastActivity: Date.now() }
		};
	}

	if (confirmed) {
		// User confirmed - proceed with booking
		return {
			response: `Booking court ${context.court} on ${context.date} at ${context.time}...`,
			newContext: { ...context, state: 'complete', lastActivity: Date.now() },
			action: 'book'
		};
	}

	// User cancelled
	return {
		response: "No problem, booking cancelled. Say BOOK to try again or HELP for options.",
		newContext: {
			...context,
			state: 'idle',
			court: undefined,
			date: undefined,
			time: undefined,
			lastActivity: Date.now()
		}
	};
}

/**
 * Handle unknown/unclear messages based on state
 */
function handleUnknown(
	context: ConversationContext,
	intent: BookingIntent & { type: 'unknown' }
): ConversationResult {
	// Try to interpret based on current state
	switch (context.state) {
		case 'awaiting_court': {
			const courtMatch = intent.raw.match(/\d+/);
			if (courtMatch) {
				return handleBookIntent(context, {
					type: 'book',
					court: courtMatch[0]
				});
			}
			return {
				response: "Please specify a court number (1-4).",
				newContext: { ...context, lastActivity: Date.now() }
			};
		}

		case 'awaiting_date':
			// Assume the message is the date
			return handleBookIntent(context, {
				type: 'book',
				date: intent.raw
			});

		case 'awaiting_time':
			// Assume the message is the time
			return handleBookIntent(context, {
				type: 'book',
				time: intent.raw
			});

		case 'awaiting_confirmation':
			return {
				response: "Please reply YES to confirm or NO to cancel.",
				newContext: { ...context, lastActivity: Date.now() }
			};

		default:
			return {
				response: `I didn't understand "${intent.raw}". ${helpMessage()}`,
				newContext: { ...context, state: 'idle', lastActivity: Date.now() }
			};
	}
}

/**
 * Format confirmation prompt
 */
function formatConfirmationPrompt(context: ConversationContext): string {
	return `Book Court ${context.court} on ${context.date} at ${context.time} for ${context.duration} min?\n\nReply YES to confirm or NO to cancel.`;
}

/**
 * Help message
 */
function helpMessage(): string {
	return `Court Booking Commands:
- BOOK court X at TIME - Book a court
- CHECK tomorrow - See availability
- STATUS - View your reservations
- CANCEL - Cancel a reservation
- HELP - Show this message

Example: "Book court 2 tomorrow at 6pm"`;
}
