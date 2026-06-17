import assert from 'node:assert/strict';
import test from 'node:test';
import {
	getClerkSignInRouteState,
	normalizeClerkRedirectUrl,
	readClerkPublishableKey
} from '../src/lib/server/clerk-sign-in.ts';

test('normalizes the Ona preview redirect URL', () => {
	const baseUrl = new URL('https://createsomething.agency/sign-in');
	const redirectUrl = normalizeClerkRedirectUrl(
		'https://781f83fc.ona-agent-chat.pages.dev/agents',
		baseUrl,
		'https://ona-agent-chat.pages.dev/agents'
	);

	assert.equal(redirectUrl, 'https://781f83fc.ona-agent-chat.pages.dev/agents');
});

test('rejects redirects outside CREATE SOMETHING and Ona agent domains', () => {
	const baseUrl = new URL('https://createsomething.agency/sign-in');
	const redirectUrl = normalizeClerkRedirectUrl(
		'https://example.com/collect',
		baseUrl,
		'https://ona-agent-chat.pages.dev/agents'
	);

	assert.equal(redirectUrl, 'https://ona-agent-chat.pages.dev/agents');
});

test('canonicalizes legacy redirect query params for Clerk', () => {
	const state = getClerkSignInRouteState(
		new URL('https://createsomething.agency/sign-in?redirect=https://781f83fc.ona-agent-chat.pages.dev/agents'),
		{
			CLERK_PUBLISHABLE_KEY: 'pk_test_example'
		}
	);

	assert.equal(state.redirectUrl, 'https://781f83fc.ona-agent-chat.pages.dev/agents');
	assert.equal(
		state.canonicalUrl,
		'https://createsomething.agency/sign-in?redirect_url=https%3A%2F%2F781f83fc.ona-agent-chat.pages.dev%2Fagents'
	);
});

test('reads Clerk publishable keys from deployed Pages env names', () => {
	assert.equal(
		readClerkPublishableKey({
			NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_next_public'
		}),
		'pk_live_next_public'
	);
});
