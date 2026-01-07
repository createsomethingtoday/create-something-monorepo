/**
 * Submission Tracking Types
 *
 * TypeScript types for the 30-day rolling window submission tracking system.
 * Used by both server-side API routes and client-side Svelte stores.
 */

// ==================== TEMPLATE STATUS ====================

/**
 * Template statuses that affect submission counting
 *
 * - Submitted: Initial state, counts against 30-day limit
 * - In Review: Being reviewed, counts against limit
 * - Published: Live on marketplace, counts against limit
 * - Rejected: Not published, counts against limit until expiry
 * - Delisted: Removed from marketplace, does NOT count against limit
 */
export type TemplateStatus =
	| 'Submitted'
	| 'In Review'
	| 'Published'
	| 'Rejected'
	| 'Delisted';

// ==================== CORE SUBMISSION TYPES ====================

/**
 * Individual submission within the 30-day window
 */
export interface Submission {
	/** Unique identifier (Airtable record ID) */
	id: string;
	/** Template name */
	name: string;
	/** When template was submitted (UTC) */
	submittedDate: Date;
	/** When this submission exits the 30-day window (UTC) */
	expiryDate: Date;
	/** Current template status */
	status: TemplateStatus;
}

/**
 * Complete submission state for the Svelte store
 *
 * Combines data from external API with local calculations
 * to provide a complete picture of submission limits.
 */
export interface SubmissionState {
	// === External API data (source of truth) ===

	/** Number of remaining submission slots (0-6) */
	remainingSubmissions: number;
	/** Whether user is blocked from submitting */
	hasError: boolean;
	/** Human-readable status message */
	message: string;
	/** Quick check for submit button enabled state */
	canSubmitNow: boolean;
	/** True if remainingSubmissions === 0 */
	isAtLimit: boolean;
	/** Total published templates (lifetime) */
	publishedTemplates: number;
	/** Total submitted templates (lifetime) */
	submittedTemplates: number;
	/** Whether user bypasses limits (established creators) */
	isWhitelisted: boolean;
	/** Submissions in current 30-day window */
	assetsSubmitted30: number;
	/** Loading state for UI */
	isLoading: boolean;

	// === Local calculation data (for UI display) ===

	/** List of submissions with expiry dates */
	submissions: Submission[];
	/** When next slot becomes available (null if not at limit) */
	nextExpiryDate: Date | null;
}

// ==================== API TYPES ====================

/**
 * Response from external API (check-asset-name.vercel.app)
 *
 * This is the authoritative source for submission counts.
 */
export interface ExternalApiResponse {
	/** Submissions in last 30 days */
	assetsSubmitted30: number;
	/** Whether user is at limit or has other blocking error */
	hasError: boolean;
	/** Human-readable status message */
	message?: string;
	/** Total published templates */
	publishedTemplates?: number;
	/** Total submitted templates */
	submittedTemplates?: number;
	/** Whether user bypasses limits */
	isWhitelisted?: boolean;
}

/**
 * Request body for submission status API
 */
export interface SubmissionStatusRequest {
	/** User email to check */
	email: string;
}

/**
 * Response from SvelteKit proxy route
 *
 * Wraps external API response or error.
 */
export interface SubmissionStatusResponse {
	/** Whether the request succeeded */
	success: boolean;
	/** Submission data (if success) */
	data?: ExternalApiResponse;
	/** Error message (if failed) */
	error?: string;
}

// ==================== ASSET TYPES ====================

/**
 * Asset data from Airtable (subset of fields needed for calculation)
 *
 * This is the minimal data needed to calculate submission limits locally.
 */
export interface Asset {
	/** Airtable record ID */
	id: string;
	/** Template name */
	name: string;
	/** Current status */
	status: TemplateStatus | 'Delisted';
	/** ISO date string of submission (optional for old records) */
	submittedDate?: string;
	/** ISO date string of publication (optional) */
	publishedDate?: string;
}

// ==================== CALCULATION TYPES ====================

/**
 * Result of local submission calculation
 *
 * Used when external API is unavailable or in development.
 */
export interface LocalSubmissionCalculation {
	/** List of submissions within 30-day window */
	submissions: Submission[];
	/** Remaining submission slots */
	remainingSubmissions: number;
	/** Whether at limit */
	isAtLimit: boolean;
	/** When next slot becomes available */
	nextExpiryDate: Date | null;
	/** Count of published templates */
	publishedCount: number;
	/** Count of all non-delisted templates */
	totalSubmitted: number;
}

// ==================== UI HELPER TYPES ====================

/**
 * Time breakdown for countdown display
 */
export interface TimeUntilSubmission {
	/** Days until next slot */
	days: number;
	/** Hours (remainder after days) */
	hours: number;
	/** Minutes (remainder after hours) */
	minutes: number;
	/** Total milliseconds */
	totalMs: number;
}

/**
 * Formatted submission for UI display
 */
export interface SubmissionDisplay {
	/** Template name */
	name: string;
	/** Current status */
	status: TemplateStatus;
	/** Formatted submission date (e.g., "Jan 15, 2024") */
	submittedDateFormatted: string;
	/** Formatted expiry date */
	expiryDateFormatted: string;
	/** Days until expiry */
	daysUntilExpiry: number;
	/** Whether expiring soon (< 3 days) */
	isExpiringSoon: boolean;
}

// ==================== STORE ACTION TYPES ====================

/**
 * Actions available on the submission store
 */
export interface SubmissionStoreActions {
	/**
	 * Set assets for local calculation
	 * @param assets - Array of assets from Airtable
	 */
	setAssets(assets: Asset[]): void;

	/**
	 * Refresh submission status from external API
	 * @param userEmail - User email for API lookup
	 */
	refresh(userEmail?: string): Promise<void>;

	/**
	 * Get next available submission date
	 * @returns Date when next slot available, or null if unknown
	 */
	getNextAvailableDate(): Date | null;

	/**
	 * Get milliseconds until next submission slot
	 * @returns Milliseconds, 0 if not at limit, null if unknown
	 */
	getTimeUntilNextSubmission(): number | null;

	/**
	 * Format time until next submission for display
	 * @returns Formatted time breakdown, or null if not applicable
	 */
	formatTimeUntil(): TimeUntilSubmission | null;
}

// ==================== CONSTANTS ====================

/**
 * Maximum submissions allowed in 30-day window
 */
export const MAX_SUBMISSIONS_PER_WINDOW = 6;

/**
 * Rolling window duration in milliseconds
 */
export const ROLLING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Rolling window duration in days
 */
export const ROLLING_WINDOW_DAYS = 30;

/**
 * Number of published templates to qualify as "established creator"
 * (can have unlimited concurrent reviews)
 */
export const ESTABLISHED_CREATOR_THRESHOLD = 5;
