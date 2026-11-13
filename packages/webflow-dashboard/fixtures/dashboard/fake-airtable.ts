/**
 * LOCAL FIXTURE ONLY. Stands in for `$lib/server/airtable` when the dashboard
 * runs through fixtures/dashboard/vite.config.ts. It keeps every pure helper
 * and type of the real module and replaces only the client factory, so no
 * Airtable credential is read and no network call is made.
 */
export * from '../../src/lib/server/airtable';
import type {
	Asset,
	AssetUpdateData,
	AssetVersion,
	Creator
} from '../../src/lib/server/airtable';
import { FIXTURE_ASSETS, FIXTURE_CREATOR, FIXTURE_VERSIONS } from './data';

const assets: Asset[] = structuredClone(FIXTURE_ASSETS);

const find = (id: string) => assets.find((asset) => asset.id === id) ?? null;

const client = {
	async getAssetsByEmail(): Promise<Asset[]> {
		return structuredClone(assets);
	},
	async hasTemplateAssetByEmail(): Promise<boolean> {
		return assets.some((asset) => asset.type === 'Template');
	},
	async getAsset(id: string): Promise<Asset | null> {
		return structuredClone(find(id));
	},
	async getAssetForOwner(id: string): Promise<{ asset: Asset | null; isOwner: boolean }> {
		const asset = find(id);
		return { asset: structuredClone(asset), isOwner: asset !== null };
	},
	async verifyAssetOwnership(id: string): Promise<boolean> {
		return find(id) !== null;
	},
	async getPartnerRequiredFixes(): Promise<null> {
		return null;
	},
	async getReleasedFeedbackSnapshot(): Promise<string | null> {
		return null;
	},
	async getAssetVersions(id: string): Promise<AssetVersion[]> {
		return FIXTURE_VERSIONS.filter((version) => version.assetId === id);
	},
	async getCreatorByEmail(): Promise<Creator> {
		return FIXTURE_CREATOR;
	},
	async findUserByEmail(email: string): Promise<{ id: string; email: string }> {
		return { id: 'recFixtureUser0001', email };
	},
	async listApiKeys(): Promise<[]> {
		return [];
	},
	async checkAssetNameUniqueness(): Promise<{ unique: boolean }> {
		return { unique: true };
	},
	async updateAsset(id: string, data: AssetUpdateData): Promise<Asset | null> {
		const asset = find(id);
		if (!asset) return null;
		Object.assign(asset, data);
		return structuredClone(asset);
	},
	async archiveAsset(id: string): Promise<{ success: boolean }> {
		const index = assets.findIndex((asset) => asset.id === id);
		if (index >= 0) assets.splice(index, 1);
		return { success: true };
	},
	async getLeaderboard() {
		return { records: [], freshness: { timestamp: null, source: 'none' as const } };
	},
	async getCategoryPerformance() {
		return { records: [], freshness: { timestamp: null, source: 'none' as const } };
	}
};

export function getAirtableClient(_env?: unknown) {
	return new Proxy(client, {
		get(target, prop, receiver) {
			if (prop in target || typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
			return async () => {
				throw new Error(`Dashboard fixture: airtable.${String(prop)}() is not faked`);
			};
		}
	}) as unknown as ReturnType<typeof import('../../src/lib/server/airtable').getAirtableClient>;
}
