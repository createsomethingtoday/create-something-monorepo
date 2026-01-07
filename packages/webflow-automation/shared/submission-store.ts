/**
 * Submission Tracking Svelte Store
 *
 * Reference implementation for Svelte 5 / SvelteKit.
 * Copy to your SvelteKit app's src/lib/stores/submission.ts
 *
 * Features:
 * - Hybrid API integration (external + local fallback)
 * - 30-day rolling window calculation
 * - UTC date handling
 * - Template list with expiry dates
 * - Next available slot calculations
 * - CORS handling for development
 */

import { writable, derived, get } from 'svelte/store';
import type {
	Asset,
	ExternalApiResponse,
	LocalSubmissionCalculation,
	Submission,
	SubmissionState,
	SubmissionStoreActions,
	TimeUntilSubmission,
	SubmissionDisplay
} from './submission-types';
import {
	MAX_SUBMISSIONS_PER_WINDOW,
	ROLLING_WINDOW_MS,
	ROLLING_WINDOW_DAYS
} from './submission-types';

// ==================== INITIAL STATE ====================

const initialState: SubmissionState = {
	remainingSubmissions: MAX_SUBMISSIONS_PER_WINDOW,
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

// ==================== INTERNAL STORES ====================

/**
 * Assets store for local calculation
 */
const assetsStore = writable<Asset[]>([]);

/**
 * Main submission state store
 */
const submissionState = writable<SubmissionState>(initialState);

// ==================== DATE UTILITIES ====================

/**
 * Convert date to UTC, normalizing timezone
 */
function toUTCDate(date: Date): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds()
		)
	);
}

/**
 * Get date 30 days ago (midnight UTC)
 */
function getThirtyDaysAgo(): Date {
	const now = new Date();
	return new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - ROLLING_WINDOW_DAYS,
			0,
			0,
			0,
			0
		)
	);
}

/**
 * Calculate expiry date (30 days after submission)
 */
function calculateExpiryDate(submissionDate: Date): Date {
	return new Date(submissionDate.getTime() + ROLLING_WINDOW_MS);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

/**
 * Calculate days until a future date
 */
function daysUntil(date: Date): number {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

// ==================== LOCAL CALCULATION ====================

/**
 * Calculate 30-day rolling window locally from assets
 *
 * Used as fallback when external API unavailable, and always
 * used for generating submission list with expiry dates.
 */
function calculateLocalSubmissions(assets: Asset[]): LocalSubmissionCalculation {
	const thirtyDaysAgo = getThirtyDaysAgo();
	const submissions: Submission[] = [];

	for (const asset of assets) {
		// Skip delisted assets (they don't count against limit)
		if (asset.status === 'Delisted') continue;
		if (!asset.submittedDate) continue;

		const submissionDate = new Date(asset.submittedDate);
		const submissionDateUTC = toUTCDate(submissionDate);

		// Only count submissions within 30-day window
		if (submissionDateUTC >= thirtyDaysAgo) {
			submissions.push({
				id: asset.id,
				name: asset.name,
				submittedDate: submissionDateUTC,
				expiryDate: calculateExpiryDate(submissionDateUTC),
				status: asset.status as Submission['status']
			});
		}
	}

	// Sort by submission date (oldest first = first to expire at index 0)
	submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

	const remainingSubmissions = Math.max(0, MAX_SUBMISSIONS_PER_WINDOW - submissions.length);
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

// ==================== EXTERNAL API ====================

/**
 * Check if running in development (CORS issues)
 */
function isDevelopmentEnvironment(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
	);
}

/**
 * Fetch submission status from server proxy route
 *
 * Returns null if:
 * - Running in development (CORS issues with direct calls)
 * - API call fails
 * - Response is invalid
 */
async function fetchExternalStatus(userEmail: string): Promise<ExternalApiResponse | null> {
	// Skip in development (use local calculation)
	if (isDevelopmentEnvironment()) {
		console.log('[SubmissionStore] Dev mode: Using local calculation');
		return null;
	}

	try {
		const response = await fetch('/api/submissions/status', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: userEmail })
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.error || 'API returned error');
		}

		return result.data as ExternalApiResponse;
	} catch (error) {
		console.error('[SubmissionStore] External API failed:', error);
		return null;
	}
}

// ==================== STORE ACTIONS ====================

/**
 * Update local assets and recalculate state
 */
function setAssets(assets: Asset[]): void {
	assetsStore.set(assets);
	const localData = calculateLocalSubmissions(assets);

	submissionState.update((state) => ({
		...state,
		submissions: localData.submissions,
		nextExpiryDate: localData.nextExpiryDate,
		// Only update counts if we don't have external data
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

/**
 * Refresh submission status from external API
 */
async function refreshSubmissionStatus(userEmail?: string): Promise<void> {
	const currentAssets = get(assetsStore);
	const localData = calculateLocalSubmissions(currentAssets);

	// Set loading state
	submissionState.update((s) => ({ ...s, isLoading: true }));

	// Try external API if we have user email
	if (userEmail) {
		const externalData = await fetchExternalStatus(userEmail);

		if (externalData) {
			// Merge external (authoritative) with local (for expiry details)
			submissionState.set({
				remainingSubmissions: Math.max(0, MAX_SUBMISSIONS_PER_WINDOW - externalData.assetsSubmitted30),
				hasError: externalData.hasError,
				message: externalData.message || '',
				canSubmitNow: !externalData.hasError,
				isAtLimit: externalData.hasError,
				publishedTemplates:
					externalData.publishedTemplates !== undefined && externalData.publishedTemplates > 0
						? externalData.publishedTemplates
						: localData.publishedCount,
				submittedTemplates:
					externalData.submittedTemplates !== undefined && externalData.submittedTemplates > 0
						? externalData.submittedTemplates
						: localData.totalSubmitted,
				isWhitelisted: externalData.isWhitelisted || false,
				assetsSubmitted30: externalData.assetsSubmitted30,
				isLoading: false,
				submissions: localData.submissions,
				nextExpiryDate: localData.nextExpiryDate
			});
			return;
		}
	}

	// Fallback to local calculation
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
 * Get next available submission date
 */
function getNextAvailableDate(): Date | null {
	const state = get(submissionState);
	if (!state.isAtLimit) {
		return new Date(); // Can submit now
	}
	return state.nextExpiryDate;
}

/**
 * Get milliseconds until next submission slot
 */
function getTimeUntilNextSubmission(): number | null {
	const state = get(submissionState);
	if (!state.isAtLimit) {
		return 0; // Can submit now
	}
	if (!state.nextExpiryDate) {
		return null; // Unknown
	}
	return state.nextExpiryDate.getTime() - Date.now();
}

/**
 * Format time until next submission for display
 */
function formatTimeUntil(): TimeUntilSubmission | null {
	const ms = getTimeUntilNextSubmission();
	if (ms === null || ms <= 0) return null;

	const totalMinutes = Math.floor(ms / 60000);
	const totalHours = Math.floor(totalMinutes / 60);

	return {
		days: Math.floor(totalHours / 24),
		hours: totalHours % 24,
		minutes: totalMinutes % 60,
		totalMs: ms
	};
}

// ==================== DERIVED STORES ====================

/**
 * List of submissions in 30-day window
 */
export const submissions = derived(submissionState, ($state) => $state.submissions);

/**
 * Number of remaining submission slots
 */
export const remainingSubmissions = derived(
	submissionState,
	($state) => $state.remainingSubmissions
);

/**
 * Whether at submission limit
 */
export const isAtLimit = derived(submissionState, ($state) => $state.isAtLimit);

/**
 * Whether user can submit now (not at limit, no errors)
 */
export const canSubmitNow = derived(submissionState, ($state) => $state.canSubmitNow);

/**
 * When next slot becomes available
 */
export const nextExpiryDate = derived(submissionState, ($state) => $state.nextExpiryDate);

/**
 * Loading state
 */
export const isLoading = derived(submissionState, ($state) => $state.isLoading);

/**
 * Formatted submissions for UI display
 */
export const submissionsDisplay = derived(submissions, ($submissions): SubmissionDisplay[] => {
	return $submissions.map((sub) => {
		const days = daysUntil(sub.expiryDate);
		return {
			name: sub.name,
			status: sub.status,
			submittedDateFormatted: formatDate(sub.submittedDate),
			expiryDateFormatted: formatDate(sub.expiryDate),
			daysUntilExpiry: days,
			isExpiringSoon: days <= 3
		};
	});
});

// ==================== EXPORTED STORE ====================

/**
 * Main submission store with actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { submissionStore, remainingSubmissions, isAtLimit } from '$lib/stores/submission';
 *
 *   // On mount, set assets from page data
 *   submissionStore.setAssets(data.assets);
 *
 *   // Refresh with user email
 *   await submissionStore.refresh(userEmail);
 *
 *   // Check state
 *   $: canSubmit = $remainingSubmissions > 0;
 * </script>
 *
 * <p>Remaining: {$remainingSubmissions}</p>
 * {#if $isAtLimit}
 *   <p>Next slot available: {submissionStore.getNextAvailableDate()?.toLocaleDateString()}</p>
 * {/if}
 * ```
 */
export const submissionStore: SubmissionStoreActions & { subscribe: typeof submissionState.subscribe } = {
	subscribe: submissionState.subscribe,
	setAssets,
	refresh: refreshSubmissionStatus,
	getNextAvailableDate,
	getTimeUntilNextSubmission,
	formatTimeUntil
};

export default submissionStore;
