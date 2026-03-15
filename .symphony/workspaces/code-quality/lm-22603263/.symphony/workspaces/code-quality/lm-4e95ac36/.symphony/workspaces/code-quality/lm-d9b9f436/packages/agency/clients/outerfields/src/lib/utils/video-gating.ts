/**
 * Video gating utilities for implementing preview + subscription gate
 */

export interface VideoGateConfig {
	/** Preview duration in seconds (30-60 seconds for non-members) */
	previewDuration: number;
	/** Whether user is a member (gates should not appear for members) */
	isMember: boolean;
	/** Whether preview has ended and gate should be shown */
	gateActive: boolean;
}

/**
 * Determines if the video gate should be active
 * @param currentTime Current playback time in seconds
 * @param isMember Whether the user is an authenticated member
 * @param previewDuration Preview duration in seconds
 * @returns True if gate should be shown
 */
export function shouldShowGate(
	currentTime: number,
	isMember: boolean,
	previewDuration: number
): boolean {
	// Never show gate for members
	if (isMember) {
		return false;
	}

	// Show gate once preview duration is reached
	return currentTime >= previewDuration;
}

/**
 * Default preview duration in seconds (45 seconds - middle of 30-60 range)
 */
export const DEFAULT_PREVIEW_DURATION = 45;

/**
 * Fade duration for gate overlay animation in milliseconds
 */
export const GATE_FADE_DURATION = 500;
