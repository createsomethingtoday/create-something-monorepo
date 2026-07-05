import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canonNavigation, findActiveNavHref, findCurrentNavItem } from './navigation.js';

describe('Canon documentation navigation', () => {
	it('matches exact root navigation without activating every Canon route', () => {
		assert.equal(findActiveNavHref('/canon', canonNavigation), '/canon');
		assert.notEqual(findActiveNavHref('/canon/components', canonNavigation), '/canon');
	});

	it('uses the most specific boundary-aware navigation match', () => {
		assert.equal(
			findActiveNavHref('/canon/components/conversion', canonNavigation),
			'/canon/components/conversion'
		);
		assert.equal(
			findActiveNavHref('/canon/components/conversion/examples', canonNavigation),
			'/canon/components/conversion'
		);
		assert.equal(findActiveNavHref('/canon/components-conversion', canonNavigation), null);
	});

	it('returns the current section and item for nested registry docs pages', () => {
		const { section, item } = findCurrentNavItem('/canon/components/conversion', canonNavigation);

		assert.equal(section?.title, 'Components');
		assert.equal(item?.label, 'Conversion');
		assert.equal(item?.href, '/canon/components/conversion');
	});
});
