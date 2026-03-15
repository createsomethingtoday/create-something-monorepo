/**
 * Spritz Component Types
 */

export type SpritzPlaybackState = 'playing' | 'paused' | 'stopped';

export interface SpritzMessage {
	/** The text content to display */
	text: string;
	/** Optional label/title for this message */
	label?: string;
}

export interface SpritzProps {
	/** Single text string or array of messages */
	content: string | SpritzMessage[];

	/** Words per minute (default: 300) */
	wpm?: number;

	/** Auto-play on mount (default: false) */
	autoplay?: boolean;

	/** Loop back to start when complete (default: false) */
	loop?: boolean;

	/** Show playback controls (default: true) */
	showControls?: boolean;

	/** Show progress indicator (default: true) */
	showProgress?: boolean;

	/** Show WPM adjustment controls (default: true) */
	showWpmControl?: boolean;

	/** Minimum WPM for slider (default: 100) */
	minWpm?: number;

	/** Maximum WPM for slider (default: 800) */
	maxWpm?: number;

	/** WPM step for increment/decrement (default: 50) */
	wpmStep?: number;

	/** Custom CSS class for the container */
	class?: string;
}
