import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Asset } from '$lib/server/airtable';

/**
 * Submission Tracking Store
 *
 * Fetches official submission count from external API with local fallback.
 * Tracks 30-day rolling window for Webflow's 6-submission limit.
 */

export interface Submission {
	id: string;
	name: string;
	submittedDate: Date;
	expiryDate: Date;
	status: string;
}

export interface SubmissionState {
	// External API data
	remainingSubmissions: number;
	hasError: boolean;
	message: string;
	canSubmitNow: boolean;
	isAtLimit: boolean;
	publishedTemplates: number;
	submittedTemplates: number;
	isWhitelisted: boolean;
	assetsSubmitted30: number;
	isLoading: boolean;

	// Local calculation data
	submissions: Submission[];
	nextExpiryDate: Date | null;
}

interface ExternalApiResponse {
	assetsSubmitted30: number;
	hasError: boolean;
	message?: string;
	publishedTemplates?: number;
	submittedTemplates?: number;
	isWhitelisted?: boolean;
}

const initialState: SubmissionState = {
	remainingSubmissions: 6,
	hasError: false,
	message: '',
	canSubmitNow: true,
	isAtLimit: false,
	publishedTemplates: 0,
	submittedTemplates: 0,
	isWhitelisted: false,
	assetsSubmitted30: 0,
	isLoading: true,
	submissions: [],
	nextExpiryDate: null
};

// Assets store for local calculation
const assetsStore = writable<Asset[]>([]);

// Main submission state store
const submissionState = writable<SubmissionState>(initialState);

/**
 * Calculate local submission data from assets for display and fallback
 */
function calculateLocalSubmissions(assets: Asset[]): {
	submissions: Submission[];
	remainingSubmissions: number;
	isAtLimit: boolean;
	nextExpiryDate: Date | null;
	publishedCount: number;
	totalSubmitted: number;
} {
	const now = new Date();
	const thirtyDaysAgo = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0)
	);

	const submissions: Submission[] = [];

	for (const asset of assets) {
		// Skip delisted assets
		if (asset.status === 'Delisted') continue;
		if (!asset.submittedDate) continue;

		const submissionDate = new Date(asset.submittedDate);
		const submissionDateUTC = new Date(
			Date.UTC(
				submissionDate.getUTCFullYear(),
				submissionDate.getUTCMonth(),
				submissionDate.getUTCDate(),
				submissionDate.getUTCHours(),
				submissionDate.getUTCMinutes(),
				submissionDate.getUTCSeconds()
			)
		);

		// Count all non-delisted submissions within 30 days
		if (submissionDateUTC >= thirtyDaysAgo) {
			submissions.push({
				id: asset.id,
				name: asset.name,
				submittedDate: submissionDateUTC,
				expiryDate: new Date(submissionDateUTC.getTime() + 30 * 24 * 60 * 60 * 1000),
				status: asset.status
			});
		}
	}

	// Sort by submission date ascending so oldest expire first
	submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

	const remainingSubmissions = Math.max(0, 6 - submissions.length);
	const publishedCount = assets.filter((a) => a.status === 'Published').length;
	const totalSubmitted = assets.filter((a) => a.status !== 'Delisted').length;

	return {
		submissions,
		remainingSubmissions,
		isAtLimit: remainingSubmissions <= 0,
		nextExpiryDate: submissions[0]?.expiryDate || null,
		publishedCount,
		totalSubmitted
	};
}

/**
 * Fetch submission status from external API
 */
async function fetchExternalStatus(userEmail: string): Promise<{
	remainingSubmissions: number;
	hasError: boolean;
	message: string;
	publishedTemplates: number;
	submittedTemplates: number;
	isWhitelisted: boolean;
	assetsSubmitted30: number;
} | null> {
	// Skip external API in development due to CORS
	if (browser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
		console.log('[SubmissionStore] Development mode: Skipping external API');
		return null;
	}

	try {
		const response = await fetch('https://check-asset-name.vercel.app/api/checkTemplateuser', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email: userEmail })
		});

		if (!response.ok) {
			throw new Error('Failed to check submission status');
		}

		const data: ExternalApiResponse = await response.json();

		return {
			remainingSubmissions: Math.max(0, 6 - data.assetsSubmitted30),
			hasError: data.hasError,
			message: data.message || '',
			publishedTemplates: data.publishedTemplates || 0,
			submittedTemplates: data.submittedTemplates || 0,
			isWhitelisted: data.isWhitelisted || false,
			assetsSubmitted30: data.assetsSubmitted30 || 0
		};
	} catch (error) {
		console.error('[SubmissionStore] External API error:', error);
		return null;
	}
}

/**
 * Initialize or refresh submission data
 */
async function refreshSubmissionStatus(userEmail?: string): Promise<void> {
	const currentAssets = get(assetsStore);
	const localData = calculateLocalSubmissions(currentAssets);

	// Start with loading state
	submissionState.update((state) => ({ ...state, isLoading: true }));

	// If we have a user email, try external API
	if (userEmail) {
		const externalData = await fetchExternalStatus(userEmail);

		if (externalData) {
			// Merge external data with local calculations
			submissionState.set({
				remainingSubmissions: externalData.remainingSubmissions,
				hasError: externalData.hasError,
				message: externalData.message,
				canSubmitNow: !externalData.hasError,
				isAtLimit: externalData.hasError,
				publishedTemplates: externalData.publishedTemplates > 0 ? externalData.publishedTemplates : localData.publishedCount,
				submittedTemplates: externalData.submittedTemplates > 0 ? externalData.submittedTemplates : localData.totalSubmitted,
				isWhitelisted: externalData.isWhitelisted,
				assetsSubmitted30: externalData.assetsSubmitted30,
				isLoading: false,
				submissions: localData.submissions,
				nextExpiryDate: localData.nextExpiryDate
			});
			return;
		}
	}

	// Fallback to local calculation only
	submissionState.set({
		remainingSubmissions: localData.remainingSubmissions,
		hasError: false,
		message: '',
		canSubmitNow: !localData.isAtLimit,
		isAtLimit: localData.isAtLimit,
		publishedTemplates: localData.publishedCount,
		submittedTemplates: localData.totalSubmitted,
		isWhitelisted: false,
		assetsSubmitted30: localData.submissions.length,
		isLoading: false,
		submissions: localData.submissions,
		nextExpiryDate: localData.nextExpiryDate
	});
}

/**
 * Update local assets for calculation
 */
function setAssets(assets: Asset[]): void {
	assetsStore.set(assets);

	// Recalculate local data immediately
	const localData = calculateLocalSubmissions(assets);

	submissionState.update((state) => ({
		...state,
		submissions: localData.submissions,
		nextExpiryDate: localData.nextExpiryDate,
		// Only update these if we don't have external data
		...(state.isLoading || !state.assetsSubmitted30
			? {
					remainingSubmissions: localData.remainingSubmissions,
					isAtLimit: localData.isAtLimit,
					canSubmitNow: !localData.isAtLimit,
					publishedTemplates: localData.publishedCount,
					submittedTemplates: localData.totalSubmitted,
					assetsSubmitted30: localData.submissions.length
				}
			: {})
	}));
}

// Derived stores for specific data access
export const submissions = derived(submissionState, ($state) => $state.submissions);
export const remainingSubmissions = derived(submissionState, ($state) => $state.remainingSubmissions);
export const isAtLimit = derived(submissionState, ($state) => $state.isAtLimit);
export const canSubmitNow = derived(submissionState, ($state) => $state.canSubmitNow);
export const nextExpiryDate = derived(submissionState, ($state) => $state.nextExpiryDate);
export const isLoading = derived(submissionState, ($state) => $state.isLoading);

// Export the store and actions
export const submissionStore = {
	subscribe: submissionState.subscribe,
	setAssets,
	refresh: refreshSubmissionStatus,
	getNextAvailableDate: (): Date | null => {
		const state = get(submissionState);
		if (!state.isAtLimit) {
			return new Date();
		}
		return state.nextExpiryDate;
	},
	getTimeUntilNextSubmission: (): number | null => {
		const state = get(submissionState);
		if (!state.isAtLimit) {
			return 0;
		}
		if (!state.nextExpiryDate) {
			return null;
		}
		return state.nextExpiryDate.getTime() - new Date().getTime();
	}
};

export default submissionStore;
