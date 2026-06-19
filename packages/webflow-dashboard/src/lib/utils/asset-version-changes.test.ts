import { describe, expect, it } from 'vitest';
import {
	isLongDescriptionAssetVersionField,
	isLongDescriptionOnlyAssetVersionChange,
	shouldCreateAssetVersionForChanges
} from './asset-version-changes';

describe('asset version changes', () => {
	it('recognizes the long-description Airtable field label variants', () => {
		expect(isLongDescriptionAssetVersionField('ℹ️Description (Long).html')).toBe(true);
		expect(isLongDescriptionAssetVersionField('ℹ️ Description (Long).html')).toBe(true);
		expect(isLongDescriptionAssetVersionField('Description (Long).html')).toBe(true);
		expect(isLongDescriptionAssetVersionField('ℹ️Description (Short)')).toBe(false);
	});

	it('identifies long-description-only structured changes', () => {
		expect(
			isLongDescriptionOnlyAssetVersionChange({
				'ℹ️Description (Long).html': { from: '<p>Old</p>', to: '<p>New</p>' }
			})
		).toBe(true);
	});

	it('does not treat mixed structured changes as long-description-only', () => {
		const changes = {
			'ℹ️Description (Long).html': { from: '<p>Old</p>', to: '<p>New</p>' },
			'ℹ️Description (Short)': { from: 'Old', to: 'New' }
		};

		expect(isLongDescriptionOnlyAssetVersionChange(changes)).toBe(false);
		expect(shouldCreateAssetVersionForChanges(changes)).toBe(true);
	});

	it('suppresses long-description-only versions but preserves other non-empty changes', () => {
		expect(
			shouldCreateAssetVersionForChanges({
				'ℹ️Description (Long).html': { from: '<p>Old</p>', to: '<p>New</p>' }
			})
		).toBe(false);
		expect(shouldCreateAssetVersionForChanges({ Name: { from: 'Old', to: 'New' } })).toBe(
			true
		);
		expect(shouldCreateAssetVersionForChanges('Rollback to version 2')).toBe(true);
	});

	it('rejects empty or invalid change payloads', () => {
		expect(shouldCreateAssetVersionForChanges({})).toBe(false);
		expect(shouldCreateAssetVersionForChanges([])).toBe(false);
		expect(shouldCreateAssetVersionForChanges(null)).toBe(false);
		expect(shouldCreateAssetVersionForChanges('')).toBe(false);
	});
});
