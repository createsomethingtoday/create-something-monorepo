/**
 * Content Engagement Tracking
 *
 * Tracks how users engage with content: scroll depth, time on page, copy events, session lifecycle.
 * Philosophy: Understand what content resonates without being invasive.
 *
 * @packageDocumentation
 */

import type { AnalyticsClient } from './client.js';

// =============================================================================
// SESSION LIFECYCLE TRACKING
// =============================================================================

interface SessionTrackerOptions {
	/** Emit session_start event on initialization (default: true) */
	emitSessionStart?: boolean;
}

interface SessionState {
	/** Time when the session/visibility segment started */
	segmentStartTime: number;
	/** Cumulative active time in milliseconds */
	totalActiveTime: number;
	/** Whether the tab is currently visible/active */
	isActive: boolean;
	/** Session start timestamp for the session_start event */
	sessionStartedAt: string;
}

/**
 * Creates a session lifecycle tracker with accurate active time measurement.
 *
 * Tracks cumulative active time by pausing when the tab is hidden and resuming
 * when visible. Reports session_end with activeTimeSeconds on page unload.
 *
 * Philosophy: Wall clock time doesn't reflect engagement. Active time does.
 */
export function createSessionTracker(
	client: AnalyticsClient,
	options: SessionTrackerOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const emitSessionStart = options.emitSessionStart ?? true;
	const sessionStartedAt = new Date().toISOString();

	const state: SessionState = {
		segmentStartTime: Date.now(),
		totalActiveTime: 0,
		isActive: document.visibilityState === 'visible',
		sessionStartedAt,
	};

	// Emit session_start if enabled
	if (emitSessionStart) {
		client.track('navigation', 'session_start', {
			metadata: { startedAt: sessionStartedAt },
		});
	}

	/**
	 * Get current active time in seconds
	 */
	function getActiveTimeSeconds(): number {
		const currentSegmentTime = state.isActive ? Date.now() - state.segmentStartTime : 0;
		return Math.floor((state.totalActiveTime + currentSegmentTime) / 1000);
	}

	/**
	 * Handle visibility changes - pause/resume time tracking
	 */
	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') {
			// Tab is now hidden - accumulate time and pause
			if (state.isActive) {
				state.totalActiveTime += Date.now() - state.segmentStartTime;
				state.isActive = false;
			}
		} else {
			// Tab is now visible - resume tracking
			state.segmentStartTime = Date.now();
			state.isActive = true;
		}
	}

	/**
	 * Handle page unload - emit session_end with active time
	 */
	function onUnload(): void {
		const activeTimeSeconds = getActiveTimeSeconds();

		// Only report if there was meaningful activity (at least 1 second)
		if (activeTimeSeconds >= 1) {
			client.track('navigation', 'session_end', {
				value: activeTimeSeconds,
				metadata: {
					startedAt: state.sessionStartedAt,
					activeTimeSeconds,
				},
			});
		}
	}

	// Listen for visibility changes
	document.addEventListener('visibilitychange', onVisibilityChange);

	// Report session_end on page unload
	window.addEventListener('pagehide', onUnload);

	// Cleanup function
	return () => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('pagehide', onUnload);
	};
}

// =============================================================================
// SCROLL DEPTH TRACKING
// =============================================================================

interface ScrollTrackerOptions {
	thresholds?: number[];
	throttleMs?: number;
}

const DEFAULT_THRESHOLDS = [25, 50, 75, 100];

/**
 * Creates a scroll depth tracker that reports when users reach depth milestones.
 * Uses IntersectionObserver for performance.
 */
export function createScrollTracker(
	client: AnalyticsClient,
	options: ScrollTrackerOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
	const reportedDepths = new Set<number>();
	let ticking = false;

	function getScrollDepth(): number {
		const scrollHeight = document.documentElement.scrollHeight;
		const clientHeight = window.innerHeight;
		const scrollTop = window.scrollY;

		if (scrollHeight <= clientHeight) {
			return 100; // No scroll needed
		}

		const scrollableHeight = scrollHeight - clientHeight;
		const percentage = (scrollTop / scrollableHeight) * 100;
		return Math.min(100, Math.round(percentage));
	}

	function checkAndReport(): void {
		const currentDepth = getScrollDepth();

		for (const threshold of thresholds) {
			if (currentDepth >= threshold && !reportedDepths.has(threshold)) {
				reportedDepths.add(threshold);
				client.scrollDepth(threshold as 25 | 50 | 75 | 100);
			}
		}

		ticking = false;
	}

	function onScroll(): void {
		if (!ticking) {
			requestAnimationFrame(checkAndReport);
			ticking = true;
		}
	}

	// Initial check
	checkAndReport();

	// Listen for scroll
	window.addEventListener('scroll', onScroll, { passive: true });

	// Cleanup function
	return () => {
		window.removeEventListener('scroll', onScroll);
	};
}

// =============================================================================
// TIME ON PAGE TRACKING
// =============================================================================

interface TimeTrackerOptions {
	/** Intervals in seconds to report (default: [30, 60, 120, 300]) */
	intervals?: number[];
	/** Track active time only (pauses when tab hidden) */
	activeOnly?: boolean;
}

const DEFAULT_INTERVALS = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m

/**
 * Creates a time-on-page tracker that reports engagement duration.
 * Pauses when tab is hidden if activeOnly is true.
 */
export function createTimeTracker(
	client: AnalyticsClient,
	options: TimeTrackerOptions = {}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const intervals = options.intervals ?? DEFAULT_INTERVALS;
	const activeOnly = options.activeOnly ?? true;
	const reportedIntervals = new Set<number>();

	let startTime = Date.now();
	let totalActiveTime = 0;
	let isActive = true;
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function getElapsedSeconds(): number {
		if (activeOnly) {
			const currentSessionTime = isActive ? Date.now() - startTime : 0;
			return Math.floor((totalActiveTime + currentSessionTime) / 1000);
		}
		return Math.floor((Date.now() - startTime) / 1000);
	}

	function checkAndReport(): void {
		const elapsed = getElapsedSeconds();

		for (const interval of intervals) {
			if (elapsed >= interval && !reportedIntervals.has(interval)) {
				reportedIntervals.add(interval);
				client.timeOnPage(interval);
			}
		}
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') {
			if (isActive) {
				totalActiveTime += Date.now() - startTime;
				isActive = false;
			}
		} else {
			startTime = Date.now();
			isActive = true;
		}
	}

	// Check every second
	intervalId = setInterval(checkAndReport, 1000);

	// Track visibility changes
	if (activeOnly) {
		document.addEventListener('visibilitychange', onVisibilityChange);
	}

	// Report final time on unload
	function onUnload(): void {
		const finalTime = getElapsedSeconds();
		if (finalTime > 0) {
			client.timeOnPage(finalTime);
		}
	}

	window.addEventListener('pagehide', onUnload);

	// Cleanup
	return () => {
		if (intervalId) {
			clearInterval(intervalId);
		}
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('pagehide', onUnload);
	};
}

// =============================================================================
// CONTENT COPY TRACKING
// =============================================================================

/**
 * Creates a tracker for text copy events.
 */
export function createCopyTracker(client: AnalyticsClient): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	function onCopy(event: ClipboardEvent): void {
		const selection = window.getSelection();
		const text = selection?.toString() ?? '';
		client.contentCopy(text.length);
	}

	document.addEventListener('copy', onCopy);

	return () => {
		document.removeEventListener('copy', onCopy);
	};
}

// =============================================================================
// CONTENT LINK CLICK TRACKING
// =============================================================================

/**
 * Creates a tracker for internal content link clicks.
 * Useful for understanding content navigation patterns.
 */
export function createLinkTracker(
	client: AnalyticsClient,
	options?: {
		/** Selector for content area (default: 'main') */
		contentSelector?: string;
		/** Only track internal links (default: true) */
		internalOnly?: boolean;
	}
): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const contentSelector = options?.contentSelector ?? 'main';
	const internalOnly = options?.internalOnly ?? true;

	function onClick(event: Event): void {
		const target = (event as MouseEvent).target as HTMLElement;
		const link = target.closest('a');

		if (!link) return;

		const href = link.getAttribute('href');
		if (!href) return;

		// Check if internal link
		if (internalOnly) {
			try {
				const url = new URL(href, window.location.origin);
				if (url.origin !== window.location.origin) {
					// Track external link differently
					client.track('navigation', 'external_link', { target: href });
					return;
				}
			} catch {
				// Invalid URL, treat as internal
			}
		}

		client.track('content', 'content_link_click', { target: href });
	}

	const content = document.querySelector(contentSelector);
	if (content) {
		content.addEventListener('click', onClick);
	}

	return () => {
		const content = document.querySelector(contentSelector);
		if (content) {
			content.removeEventListener('click', onClick);
		}
	};
}

// =============================================================================
// COMBINED ENGAGEMENT TRACKER
// =============================================================================

export interface EngagementTrackerOptions {
	scroll?: ScrollTrackerOptions | false;
	time?: TimeTrackerOptions | false;
	copy?: boolean;
	links?: { contentSelector?: string; internalOnly?: boolean } | false;
}

/**
 * Creates a combined engagement tracker with all content metrics.
 */
export function createEngagementTracker(
	client: AnalyticsClient,
	options: EngagementTrackerOptions = {}
): () => void {
	const cleanupFns: Array<() => void> = [];

	if (options.scroll !== false) {
		cleanupFns.push(createScrollTracker(client, options.scroll || {}));
	}

	if (options.time !== false) {
		cleanupFns.push(createTimeTracker(client, options.time || {}));
	}

	if (options.copy !== false) {
		cleanupFns.push(createCopyTracker(client));
	}

	if (options.links !== false) {
		cleanupFns.push(createLinkTracker(client, options.links || {}));
	}

	return () => {
		cleanupFns.forEach((fn) => fn());
	};
}
