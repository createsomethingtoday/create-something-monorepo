import assert from 'node:assert/strict';
import test from 'node:test';

import { toSafeVoiceError } from '../src/lib/receptionist/errors';

test('quota failures become a bounded operator-facing message without provider details', () => {
	const raw = new Error(
		'Realtime call request failed with status 429: You exceeded your current quota. Secret sk-test-sensitive. Request req_123.'
	);
	const message = toSafeVoiceError(raw);

	assert.equal(
		message,
		'The voice service has no available OpenAI project quota. Update the project billing or limits, then try again.'
	);
	assert.doesNotMatch(message, /sk-test|req_123|platform\.openai/i);
});

test('microphone denials give one useful recovery action', () => {
	const microphoneError = new DOMException('Permission denied', 'NotAllowedError');
	assert.equal(
		toSafeVoiceError(microphoneError),
		'Microphone access is off. Allow microphone access for this page, then start the call again.'
	);
});

test('unknown failures stay generic and do not echo arbitrary content', () => {
	const message = toSafeVoiceError(new Error('private upstream response body'));
	assert.equal(
		message,
		'The voice demo could not connect. Check microphone access and try again.'
	);
	assert.doesNotMatch(message, /private upstream/i);
});
