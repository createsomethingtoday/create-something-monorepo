/**
 * SMS Intent Parser
 *
 * Uses Workers AI to parse natural language booking requests.
 * Falls back to keyword matching when AI unavailable.
 */

export type BookingIntent =
	| { type: 'book'; court?: string; date?: string; time?: string; duration?: number }
	| { type: 'cancel'; reservationId?: string }
	| { type: 'check'; date?: string; time?: string }
	| { type: 'status' }
	| { type: 'help' }
	| { type: 'confirm' }
	| { type: 'deny' }
	| { type: 'unknown'; raw: string };

interface ParseResult {
	intent: BookingIntent;
	confidence: number;
	entities: Record<string, string>;
}

const SYSTEM_PROMPT = `You are a court booking assistant. Parse user messages into structured intents.

Output JSON with:
- intent: one of "book", "cancel", "check", "status", "help", "confirm", "deny", "unknown"
- confidence: 0.0-1.0
- entities: extracted values (court, date, time, duration, reservationId)

Examples:
"Book court 1 tomorrow at 6pm" -> {"intent":"book","confidence":0.95,"entities":{"court":"1","date":"tomorrow","time":"6pm"}}
"Is court 2 free Saturday morning?" -> {"intent":"check","confidence":0.9,"entities":{"court":"2","date":"Saturday","time":"morning"}}
"Cancel my reservation" -> {"intent":"cancel","confidence":0.85,"entities":{}}
"What's my booking?" -> {"intent":"status","confidence":0.9,"entities":{}}
"Yes" or "Confirm" -> {"intent":"confirm","confidence":0.95,"entities":{}}
"No" or "Nevermind" -> {"intent":"deny","confidence":0.95,"entities":{}}

Only output valid JSON, no explanation.`;

/**
 * Parse a booking intent using Workers AI
 */
export async function parseIntent(
	message: string,
	ai: Ai
): Promise<ParseResult> {
	const trimmed = message.trim().toLowerCase();

	// Quick keyword matching for common responses
	const quickMatch = matchQuickKeywords(trimmed);
	if (quickMatch) {
		return quickMatch;
	}

	try {
		const response = await ai.run('@cf/mistral/mistral-7b-instruct-v0.1', {
			messages: [
				{ role: 'user', content: `${SYSTEM_PROMPT}\n\nUser message: ${message}` }
			],
			max_tokens: 150
		}) as { response: string };

		const text = typeof response === 'object' && 'response' in response
			? (response as { response: string }).response
			: String(response);

		// Extract JSON from response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				intent: buildIntent(parsed.intent, parsed.entities || {}),
				confidence: parsed.confidence || 0.7,
				entities: parsed.entities || {}
			};
		}
	} catch (err) {
		console.error('AI parsing failed, using fallback:', err);
	}

	// Fallback to keyword matching
	return keywordFallback(trimmed);
}

/**
 * Quick keyword matching for common single-word responses
 */
function matchQuickKeywords(message: string): ParseResult | null {
	const confirmWords = ['yes', 'yep', 'yeah', 'confirm', 'ok', 'okay', 'sure', 'y'];
	const denyWords = ['no', 'nope', 'cancel', 'nevermind', 'n', 'stop'];
	const helpWords = ['help', 'h', '?', 'commands', 'menu'];
	const statusWords = ['status', 'my booking', 'my bookings', 'reservations'];

	if (confirmWords.includes(message)) {
		return { intent: { type: 'confirm' }, confidence: 0.99, entities: {} };
	}
	if (denyWords.includes(message)) {
		return { intent: { type: 'deny' }, confidence: 0.99, entities: {} };
	}
	if (helpWords.includes(message)) {
		return { intent: { type: 'help' }, confidence: 0.99, entities: {} };
	}
	if (statusWords.some(w => message.includes(w))) {
		return { intent: { type: 'status' }, confidence: 0.95, entities: {} };
	}

	return null;
}

/**
 * Keyword-based fallback parser
 */
function keywordFallback(message: string): ParseResult {
	const entities: Record<string, string> = {};

	// Extract court number
	const courtMatch = message.match(/court\s*(\d+)/i);
	if (courtMatch) entities.court = courtMatch[1];

	// Extract time
	const timeMatch = message.match(/(\d{1,2})\s*(?::|h)?(\d{2})?\s*(am|pm)?/i) ||
		message.match(/(morning|afternoon|evening|noon)/i);
	if (timeMatch) entities.time = timeMatch[0];

	// Extract date
	const dateMatch = message.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i);
	if (dateMatch) entities.date = dateMatch[0];

	// Determine intent
	if (/\b(book|reserve|schedule|get)\b/i.test(message)) {
		return {
			intent: { type: 'book', ...entities },
			confidence: 0.7,
			entities
		};
	}
	if (/\b(cancel|remove|delete)\b/i.test(message)) {
		return {
			intent: { type: 'cancel' },
			confidence: 0.7,
			entities
		};
	}
	if (/\b(check|available|free|open)\b/i.test(message)) {
		return {
			intent: { type: 'check', ...entities },
			confidence: 0.7,
			entities
		};
	}

	return {
		intent: { type: 'unknown', raw: message },
		confidence: 0.3,
		entities
	};
}

/**
 * Build typed intent from parsed data
 */
function buildIntent(type: string, entities: Record<string, string>): BookingIntent {
	switch (type) {
		case 'book':
			return {
				type: 'book',
				court: entities.court,
				date: entities.date,
				time: entities.time,
				duration: entities.duration ? parseInt(entities.duration, 10) : undefined
			};
		case 'cancel':
			return { type: 'cancel', reservationId: entities.reservationId };
		case 'check':
			return { type: 'check', date: entities.date, time: entities.time };
		case 'status':
			return { type: 'status' };
		case 'help':
			return { type: 'help' };
		case 'confirm':
			return { type: 'confirm' };
		case 'deny':
			return { type: 'deny' };
		default:
			return { type: 'unknown', raw: entities.raw || '' };
	}
}
