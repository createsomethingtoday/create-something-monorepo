const genericConnectionMessage =
	'The voice demo could not connect. Check microphone access and try again.';

export function toSafeVoiceError(error: unknown): string {
	const name = error instanceof DOMException ? error.name : '';
	const rawMessage = error instanceof Error ? error.message : '';
	const normalized = `${name} ${rawMessage}`.toLowerCase();

	if (/\b429\b|quota|billing limit|rate limit/.test(normalized)) {
		return 'The voice service has no available OpenAI project quota. Update the project billing or limits, then try again.';
	}

	if (/notallowederror|permission denied|microphone access denied/.test(normalized)) {
		return 'Microphone access is off. Allow microphone access for this page, then start the call again.';
	}

	if (/notfounderror|requested device not found|no microphone/.test(normalized)) {
		return 'No microphone was found. Connect a microphone, then start the call again.';
	}

	return genericConnectionMessage;
}
