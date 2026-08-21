import { describe, expect, it } from 'vitest';

import { getIoFooterHandoff } from '../src/lib/config/footerHandoff';

describe('IO footer handoff', () => {
	it('continues research detail routes with the digest instead of a second commercial handoff', () => {
		for (const pathname of [
			'/papers/endpoint-construction-product',
			'/experiments/delegation-practice'
		]) {
			expect(getIoFooterHandoff(pathname)).toEqual({
				kind: 'research',
				showNewsletter: true,
				showCommercialCta: false
			});
		}
	});

	it('uses the commercial handoff on non-research-detail pages without stacking the digest', () => {
		for (const pathname of ['/', '/about', '/methodology', '/papers', '/experiments']) {
			expect(getIoFooterHandoff(pathname)).toEqual({
				kind: 'commercial',
				showNewsletter: false,
				showCommercialCta: true
			});
		}
	});
});
