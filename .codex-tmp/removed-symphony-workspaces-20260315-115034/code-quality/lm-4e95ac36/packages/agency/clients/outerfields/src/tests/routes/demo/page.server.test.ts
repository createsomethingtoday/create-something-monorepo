import { describe, expect, it } from 'vitest';
import { load } from '../../../routes/demo/+page.server';

describe('demo load', () => {
	it('redirects legacy demo route to library', async () => {
		await expect(load({} as never)).rejects.toMatchObject({
			status: 308,
			location: '/library'
		});
	});
});
