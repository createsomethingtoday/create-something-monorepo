import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	canonNavigation,
	findActiveNavHref,
	findCurrentNavItem,
	flattenNavigation
} from './navigation.js';

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

	it('groups component docs without removing registry links from navigation flattening', () => {
		const componentsSection = canonNavigation.find((section) => section.title === 'Components');
		const flattenedHrefs = new Set(flattenNavigation(canonNavigation).map((item) => item.href));

		assert.ok(componentsSection);
		assert.equal(componentsSection.items.length, 4);
		assert.deepEqual(
			componentsSection.items.map((item) => item.label),
			['Overview', 'Primitives', 'Workflow', 'Systems']
		);
		assert.equal(
			componentsSection.items.reduce((count, item) => count + (item.children?.length ?? 0), 0),
			21
		);
		assert.equal(flattenedHrefs.has('/canon/components/conversion'), true);
		assert.equal(flattenedHrefs.has('/canon/components/atlas'), true);
		assert.equal(flattenedHrefs.has('/canon/resources/registry'), true);
		assert.equal(flattenedHrefs.has(undefined), false);
	});
});
