export interface TranscriptPart {
	text: string;
	highlighted: boolean;
}

export function highlightTranscript(text: string, rawQuery: string): TranscriptPart[] {
	const query = rawQuery.trim();
	if (!query) return [{ text, highlighted: false }];

	const parts: TranscriptPart[] = [];
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();
	let cursor = 0;

	while (cursor < text.length) {
		const matchIndex = lowerText.indexOf(lowerQuery, cursor);
		if (matchIndex === -1) {
			parts.push({ text: text.slice(cursor), highlighted: false });
			break;
		}
		if (matchIndex > cursor) {
			parts.push({ text: text.slice(cursor, matchIndex), highlighted: false });
		}
		parts.push({
			text: text.slice(matchIndex, matchIndex + query.length),
			highlighted: true
		});
		cursor = matchIndex + query.length;
	}

	return parts;
}

export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
