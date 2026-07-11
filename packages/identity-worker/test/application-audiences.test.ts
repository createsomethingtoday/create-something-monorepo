import assert from 'node:assert/strict';
import test from 'node:test';
import { IDENTITY_TOKEN_AUDIENCES } from '../src/services/tokens';

test('identity tokens address the first-party ona-agents application', () => {
	assert.ok(IDENTITY_TOKEN_AUDIENCES.includes('ona-agents'));
});
