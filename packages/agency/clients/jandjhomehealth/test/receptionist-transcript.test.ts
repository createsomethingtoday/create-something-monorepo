import assert from 'node:assert/strict';
import test from 'node:test';

import { toTranscriptEntries } from '../src/lib/receptionist/transcript';

test('realtime history becomes a readable caller and receptionist transcript', () => {
	const history = [
		{
			itemId: 'caller-1',
			type: 'message',
			role: 'user',
			status: 'completed',
			content: [{ type: 'input_audio', audio: null, transcript: 'I am looking for home care.' }]
		},
		{
			itemId: 'assistant-1',
			type: 'message',
			role: 'assistant',
			status: 'completed',
			content: [
				{
					type: 'output_audio',
					audio: null,
					transcript: 'I can explain our general services and help with a simulated callback.'
				}
			]
		},
		{
			itemId: 'tool-1',
			type: 'function_call',
			status: 'completed',
			arguments: '{}',
			name: 'prepare_callback_request',
			output: '{}'
		}
	];

	assert.deepEqual(toTranscriptEntries(history), [
		{
			id: 'caller-1',
			speaker: 'Caller',
			text: 'I am looking for home care.',
			status: 'completed'
		},
		{
			id: 'assistant-1',
			speaker: 'Jamie',
			text: 'I can explain our general services and help with a simulated callback.',
			status: 'completed'
		}
	]);
});

test('empty and system messages stay out of the caller-facing transcript', () => {
	const history = [
		{
			itemId: 'system-1',
			type: 'message',
			role: 'system',
			content: [{ type: 'input_text', text: 'internal instructions' }]
		},
		{
			itemId: 'caller-2',
			type: 'message',
			role: 'user',
			status: 'in_progress',
			content: [{ type: 'input_audio', audio: null, transcript: '   ' }]
		}
	];

	assert.deepEqual(toTranscriptEntries(history), []);
});
