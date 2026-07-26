import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import PlayerLoginForm from './PlayerLoginForm.svelte';

describe('PlayerLoginForm', () => {
	it('offers age-appropriate email-free access with recovery owned by an adult', () => {
		const body = render(PlayerLoginForm, {
			props: { onSubmit: async () => true },
		}).body;
		expect(body).toContain('Player code');
		expect(body).toContain('Secret phrase');
		expect(body).toContain('Ask your parent, guardian, or coach');
		expect(body).toContain('autocomplete="username"');
		expect(body).toContain('autocomplete="current-password"');
		expect(body).not.toContain('type="email"');
	});
});
