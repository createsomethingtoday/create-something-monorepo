import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Asset } from '$lib/server/airtable';

/**
 * Submission Tracking Store
 *
 * Fetches official submission count from external API with local fallback.
 * Tracks 30-day rolling window for Webflow's 6-submission limit.
 *
 * Features:
 * - Hybrid API integration (external + local calculation)
 * - 30-day rolling window with UTC timestamp handling
 * - Next available slot calculations
 * - Submission limit warnings (6/month)
 * - Whitelist status detection
 * - CORS-aware development mode
 * - Retry mechanism for API failures
 */

/** Maximum submissions allowed per 30-day rolling window */
export const SUBMISSION_LIMIT = 6;

/** Rolling window duration in milliseconds (30 days) */
export const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Warning threshold - show warnings when this many slots or fewer remain */
export const WARNING_THRESHOLD = 2;

/** API retry configuration */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface Submission {
	id: string;
	name: string;
	submittedDate: Date;
	expiryDate: Date;
	status: string;
	/** Days until this submission expires from the rolling window */
	daysUntilExpiry: number;
}

export interface SubmissionState {
	// External API data
	remainingSubmissions: number;
	hasError: boolean;
	errorMessage: string;
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

	// Enhanced tracking
	/** Time until next submission slot becomes available (ms) */
	timeUntilNextSlot: number | null;
	/** Whether we're in development mode (CORS skipped) */
	isDevMode: boolean;
	/** Number of retries attempted */
	retryCount: number;
	/** Whether we should show a warning (near limit) */
	showWarning: boolean;
	/** Warning level: 'none' | 'caution' | 'critical' */
	warningLevel: 'none' | 'caution' | 'critical';
	/** Last successful refresh timestamp */
	lastRefresh: Date | null;
	/** Data source: 'external' | 'local' | 'cached' */
	dataSource: 'external' | 'local' | 'cached';
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
	remainingSubmissions: SUBMISSION_LIMIT,
	hasError: false,
	errorMessage: '',
	message: '',
	canSubmitNow: true,
	isAtLimit: false,
	publishedTemplates: 0,
	submittedTemplates: 0,
	isWhitelisted: false,
	assetsSubmitted30: 0,
	isLoading: true,
	submissions: [],
	nextExpiryDate: null,
	timeUntilNextSlot: null,
	isDevMode: false,
	retryCount: 0,
	showWarning: false,
	warningLevel: 'none',
	lastRefresh: null,
	dataSource: 'local'
};

/**
 * Check if we're in development mode (localhost)
 */
function isDevEnvironment(): boolean {
	if (!browser) return false;
	const hostname = window.location.hostname;
	return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Calculate warning level based on remaining submissions
 */
function calculateWarningLevel(remaining: number, isWhitelisted: boolean): 'none' | 'caution' | 'critical' {
	if (isWhitelisted) return 'none';
	if (remaining <= 0) return 'critical';
	if (remaining <= WARNING_THRESHOLD) return 'caution';
	return 'none';
}

/**
 * Calculate days until a date
 */
function daysUntil(date: Date): number {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Delay utility for retry mechanism
 */
function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

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
	timeUntilNextSlot: number | null;
	warningLevel: 'none' | 'caution' | 'critical';
	showWarning: boolean;
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
			const expiryDate = new Date(submissionDateUTC.getTime() + ROLLING_WINDOW_MS);
			submissions.push({
				id: asset.id,
				name: asset.name,
				submittedDate: submissionDateUTC,
				expiryDate,
				status: asset.status,
				daysUntilExpiry: daysUntil(expiryDate)
			});
		}
	}

	// Sort by submission date ascending so oldest expire first
	submissions.sort((a, b) => a.submittedDate.getTime() - b.submittedDate.getTime());

	const remainingSubmissions = Math.max(0, SUBMISSION_LIMIT - submissions.length);
	const publishedCount = assets.filter((a) => a.status === 'Published').length;
	const totalSubmitted = assets.filter((a) => a.status !== 'Delisted').length;
	const nextExpiryDate = submissions[0]?.expiryDate || null;
	const isAtLimit = remainingSubmissions <= 0;

	// Calculate time until next slot
	let timeUntilNextSlot: number | null = null;
	if (isAtLimit && nextExpiryDate) {
		timeUntilNextSlot = Math.max(0, nextExpiryDate.getTime() - now.getTime());
	}

	// Calculate warning level
	const warningLevel = calculateWarningLevel(remainingSubmissions, false);
	const showWarning = warningLevel !== 'none';

	return {
		submissions,
		remainingSubmissions,
		isAtLimit,
		nextExpiryDate,
		publishedCount,
		totalSubmitted,
		timeUntilNextSlot,
		warningLevel,
		showWarning
	};
}

interface FetchResult {
	remainingSubmissions: number;
	hasError: boolean;
	message: string;
	publishedTemplates: number;
	submittedTemplates: number;
	isWhitelisted: boolean;
	assetsSubmitted30: number;
	errorMessage?: string;
}

/**
 * Fetch submission status from server-side proxy API with retry mechanism
 */
async function fetchExternalStatus(
	userEmail: string,
	retryCount = 0
): Promise<FetchResult | null> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

		// Call our server-side proxy endpoint (avoids CORS)
		const response = await fetch('/api/submission-status', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email: userEmail }),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		// Handle error responses
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ hasError: true, message: 'Unknown error' })) as { hasError: boolean; message?: string };
			throw new Error(errorData.message || `API returned ${response.status}`);
		}

		const data: ExternalApiResponse = await response.json();

		return {
			remainingSubmissions: Math.max(0, SUBMISSION_LIMIT - data.assetsSubmitted30),
			hasError: data.hasError,
			message: data.message || '',
			publishedTemplates: data.publishedTemplates || 0,
			submittedTemplates: data.submittedTemplates || 0,
			isWhitelisted: data.isWhitelisted || false,
			assetsSubmitted30: data.assetsSubmitted30 || 0
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[SubmissionStore] API error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, errorMessage);

		// Retry logic
		if (retryCount < MAX_RETRIES - 1) {
			const backoffDelay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
			console.log(`[SubmissionStore] Retrying in ${backoffDelay}ms...`);
			await delay(backoffDelay);

			// Update retry count in store
			submissionState.update(state => ({ ...state, retryCount: retryCount + 1 }));

			return fetchExternalStatus(userEmail, retryCount + 1);
		}

		// All retries exhausted
		console.error('[SubmissionStore] All retries exhausted, falling back to local calculation');
		return {
			remainingSubmissions: 0,
			hasError: true,
			message: 'Unable to verify submission status with server',
			errorMessage: `Failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
			publishedTemplates: 0,
			submittedTemplates: 0,
			isWhitelisted: false,
			assetsSubmitted30: 0
		};
	}
}

/**
 * Initialize or refresh submission data
 */
async function refreshSubmissionStatus(userEmail?: string): Promise<void> {
	const currentAssets = get(assetsStore);
	const localData = calculateLocalSubmissions(currentAssets);
	const isDevMode = isDevEnvironment();

	// Start with loading state
	submissionState.update((state) => ({
		...state,
		isLoading: true,
		retryCount: 0,
		hasError: false,
		errorMessage: ''
	}));

	// If we have a user email, try external API
	if (userEmail && !isDevMode) {
		const externalData = await fetchExternalStatus(userEmail);

		if (externalData && !externalData.errorMessage) {
			// Calculate warning level based on external data
			const warningLevel = calculateWarningLevel(externalData.remainingSubmissions, externalData.isWhitelisted);

			// Merge external data with local calculations
			submissionState.set({
				remainingSubmissions: externalData.remainingSubmissions,
				hasError: externalData.hasError,
				errorMessage: '',
				message: externalData.message,
				canSubmitNow: !externalData.hasError && externalData.remainingSubmissions > 0,
				isAtLimit: externalData.remainingSubmissions <= 0,
				publishedTemplates: externalData.publishedTemplates > 0 ? externalData.publishedTemplates : localData.publishedCount,
				submittedTemplates: externalData.submittedTemplates > 0 ? externalData.submittedTemplates : localData.totalSubmitted,
				isWhitelisted: externalData.isWhitelisted,
				assetsSubmitted30: externalData.assetsSubmitted30,
				isLoading: false,
				submissions: localData.submissions,
				nextExpiryDate: localData.nextExpiryDate,
				timeUntilNextSlot: localData.timeUntilNextSlot,
				isDevMode: false,
				retryCount: 0,
				showWarning: warningLevel !== 'none',
				warningLevel,
				lastRefresh: new Date(),
				dataSource: 'external'
			});
			return;
		}

		// External API failed - use local data with error state
		if (externalData?.errorMessage) {
			submissionState.set({
				...localData,
				remainingSubmissions: localData.remainingSubmissions,
				hasError: true,
				errorMessage: externalData.errorMessage,
				message: 'Using local calculation - server unavailable',
				canSubmitNow: !localData.isAtLimit,
				isAtLimit: localData.isAtLimit,
				publishedTemplates: localData.publishedCount,
				submittedTemplates: localData.totalSubmitted,
				isWhitelisted: false,
				assetsSubmitted30: localData.submissions.length,
				isLoading: false,
				submissions: localData.submissions,
				nextExpiryDate: localData.nextExpiryDate,
				timeUntilNextSlot: localData.timeUntilNextSlot,
				isDevMode: false,
				retryCount: MAX_RETRIES,
				showWarning: localData.showWarning,
				warningLevel: localData.warningLevel,
				lastRefresh: new Date(),
				dataSource: 'local'
			});
			return;
		}
	}

	// Fallback to local calculation only (dev mode or no email)
	submissionState.set({
		remainingSubmissions: localData.remainingSubmissions,
		hasError: false,
		errorMessage: '',
		message: isDevMode ? 'Development mode - using local calculation' : '',
		canSubmitNow: !localData.isAtLimit,
		isAtLimit: localData.isAtLimit,
		publishedTemplates: localData.publishedCount,
		submittedTemplates: localData.totalSubmitted,
		isWhitelisted: false,
		assetsSubmitted30: localData.submissions.length,
		isLoading: false,
		submissions: localData.submissions,
		nextExpiryDate: localData.nextExpiryDate,
		timeUntilNextSlot: localData.timeUntilNextSlot,
		isDevMode,
		retryCount: 0,
		showWarning: localData.showWarning,
		warningLevel: localData.warningLevel,
		lastRefresh: new Date(),
		dataSource: 'local'
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
		timeUntilNextSlot: localData.timeUntilNextSlot,
		// Only update these if we don't have external data
		...(state.isLoading || state.dataSource !== 'external'
			? {
					remainingSubmissions: localData.remainingSubmissions,
					isAtLimit: localData.isAtLimit,
					canSubmitNow: !localData.isAtLimit,
					publishedTemplates: localData.publishedCount,
					submittedTemplates: localData.totalSubmitted,
					assetsSubmitted30: localData.submissions.length,
					showWarning: localData.showWarning,
					warningLevel: localData.warningLevel
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

// Enhanced derived stores
export const isWhitelisted = derived(submissionState, ($state) => $state.isWhitelisted);
export const warningLevel = derived(submissionState, ($state) => $state.warningLevel);
export const showWarning = derived(submissionState, ($state) => $state.showWarning);
export const isDevMode = derived(submissionState, ($state) => $state.isDevMode);
export const dataSource = derived(submissionState, ($state) => $state.dataSource);
export const timeUntilNextSlot = derived(submissionState, ($state) => $state.timeUntilNextSlot);
export const hasError = derived(submissionState, ($state) => $state.hasError);
export const errorMessage = derived(submissionState, ($state) => $state.errorMessage);

/**
 * Format time duration in human-readable format
 */
export function formatTimeUntil(ms: number | null): string {
	if (ms === null || ms <= 0) return 'Now';

	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

	if (days > 0) {
		return `${days}d ${hours}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

/**
 * Get a user-friendly status message based on current state
 */
export function getStatusMessage(state: SubmissionState): string {
	if (state.isWhitelisted) {
		return 'Unlimited submissions (Whitelisted)';
	}
	if (state.isAtLimit) {
		const timeStr = formatTimeUntil(state.timeUntilNextSlot);
		return `At limit - next slot in ${timeStr}`;
	}
	if (state.warningLevel === 'caution') {
		return `${state.remainingSubmissions} slots remaining - approaching limit`;
	}
	return `${state.remainingSubmissions} of ${SUBMISSION_LIMIT} slots available`;
}

// Export the store and actions
export const submissionStore = {
	subscribe: submissionState.subscribe,
	setAssets,
	refresh: refreshSubmissionStatus,
	getNextAvailableDate: (): Date | null => {
		const state = get(submissionState);
		if (state.isWhitelisted || !state.isAtLimit) {
			return new Date();
		}
		return state.nextExpiryDate;
	},
	getTimeUntilNextSubmission: (): number | null => {
		const state = get(submissionState);
		if (state.isWhitelisted || !state.isAtLimit) {
			return 0;
		}
		return state.timeUntilNextSlot;
	},
	/** Force refresh from external API */
	forceRefresh: async (userEmail: string): Promise<void> => {
		// Reset retry count and force external fetch
		submissionState.update(state => ({ ...state, retryCount: 0, dataSource: 'local' }));
		await refreshSubmissionStatus(userEmail);
	},
	/** Get formatted time until next slot */
	getFormattedTimeUntilNextSlot: (): string => {
		const state = get(submissionState);
		return formatTimeUntil(state.timeUntilNextSlot);
	},
	/** Check if user should be warned about submission limit */
	shouldShowWarning: (): boolean => {
		const state = get(submissionState);
		return state.showWarning && !state.isWhitelisted;
	}
};

export default submissionStore;
