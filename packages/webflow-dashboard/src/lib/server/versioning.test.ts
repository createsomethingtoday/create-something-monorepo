import { describe, expect, it } from 'vitest';
import type { AssetVersion } from './airtable';
import { compareAssetVersions, compareAssetVersionSnapshots } from './versioning';

describe('compareAssetVersionSnapshots', () => {
	it('returns only changed scalar fields', () => {
		const differences = compareAssetVersionSnapshots(
			{
				name: 'Before',
				descriptionShort: 'Short copy',
				previewUrl: 'https://before.webflow.io'
			},
			{
				name: 'After',
				descriptionShort: 'Short copy',
				previewUrl: 'https://after.webflow.io'
			}
		);

		expect(differences).toEqual([
			{
				field: 'name',
				oldValue: 'Before',
				newValue: 'After',
				changed: true
			},
			{
				field: 'previewUrl',
				oldValue: 'https://before.webflow.io',
				newValue: 'https://after.webflow.io',
				changed: true
			}
		]);
	});

	it('detects array and nullable field changes', () => {
		const differences = compareAssetVersionSnapshots(
			{
				carouselImages: ['a.webp', 'b.webp'],
				secondaryThumbnailUrl: null
			},
			{
				carouselImages: ['a.webp', 'c.webp'],
				secondaryThumbnailUrl: 'secondary.webp'
			}
		);

		expect(differences).toEqual([
			{
				field: 'carouselImages',
				oldValue: ['a.webp', 'b.webp'],
				newValue: ['a.webp', 'c.webp'],
				changed: true
			},
			{
				field: 'secondaryThumbnailUrl',
				oldValue: null,
				newValue: 'secondary.webp',
				changed: true
			}
		]);
	});

	it('returns no differences for identical snapshots', () => {
		expect(
			compareAssetVersionSnapshots(
				{
					name: 'Stable',
					carouselImages: ['a.webp'],
					appScopes: ['sites:read']
				},
				{
					name: 'Stable',
					carouselImages: ['a.webp'],
					appScopes: ['sites:read']
				}
			)
		).toEqual([]);
	});
});

describe('compareAssetVersions', () => {
	function makeVersion(overrides: Partial<AssetVersion> = {}): AssetVersion {
		return {
			id: 'recVersion',
			assetId: 'recAsset',
			versionNumber: 1,
			createdAt: '2026-04-16T00:00:00.000Z',
			createdBy: 'Micah Johnson',
			changes: 'Initial submission',
			snapshot: null,
			reviewType: 'New Asset',
			reviewStatus: '🆕Ready for Review',
			versionNotes: null,
			metaUpdateLog: null,
			canRollback: false,
			...overrides
		};
	}

	it('uses snapshots when both versions are reversible', () => {
		expect(
			compareAssetVersions(
				makeVersion({
					snapshot: { name: 'Before', previewUrl: 'https://before.webflow.io' },
					canRollback: true
				}),
				makeVersion({
					snapshot: { name: 'After', previewUrl: 'https://after.webflow.io' },
					canRollback: true
				})
			)
		).toEqual([
			{
				field: 'name',
				oldValue: 'Before',
				newValue: 'After',
				changed: true
			},
			{
				field: 'previewUrl',
				oldValue: 'https://before.webflow.io',
				newValue: 'https://after.webflow.io',
				changed: true
			}
		]);
	});

	it('falls back to legacy metadata when snapshots are missing', () => {
		expect(
			compareAssetVersions(
				makeVersion({
					changes: 'Initial submission',
					reviewType: 'New Asset',
					reviewStatus: '🆕Ready for Review'
				}),
				makeVersion({
					changes: 'Updated 2 fields',
					reviewType: 'Meta Update',
					reviewStatus: '✅Approved',
					versionNotes: '# New Features\nUpdated site copy'
				})
			)
		).toEqual([
			{
				field: 'reviewType',
				oldValue: 'New Asset',
				newValue: 'Meta Update',
				changed: true
			},
			{
				field: 'reviewStatus',
				oldValue: '🆕Ready for Review',
				newValue: '✅Approved',
				changed: true
			},
			{
				field: 'changes',
				oldValue: 'Initial submission',
				newValue: 'Updated 2 fields',
				changed: true
			},
			{
				field: 'versionNotes',
				oldValue: undefined,
				newValue: '# New Features\nUpdated site copy',
				changed: true
			}
		]);
	});
});
