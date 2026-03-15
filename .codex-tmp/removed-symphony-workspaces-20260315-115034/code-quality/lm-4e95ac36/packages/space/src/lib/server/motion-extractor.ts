/**
 * Motion Extractor
 *
 * Calls the dedicated Motion Extractor Worker which uses real Puppeteer
 * with browser binding. This enables:
 * - Real page.hover() triggering actual CSS :hover states
 * - Capturing CSS transitions while they're running
 * - Taking screenshots during animation
 *
 * The Worker is deployed at: https://motion-extractor.createsomething.workers.dev
 */

import type {
	AnimationData,
	TransitionData,
	TechnicalAnalysis,
	TimingProfile,
	TriggerConfig
} from '$lib/motion-analysis/types';

// Worker URL - can be overridden via environment variable
const WORKER_URL = 'https://motion-extractor.createsomething.workers.dev';

export interface MotionExtractorOptions {
	timeout?: number;
	captureDelay?: number;
}

export interface ExtractionResult {
	success: boolean;
	technical?: TechnicalAnalysis;
	screenshot?: ArrayBuffer;
	error?: string;
}

interface WorkerResponse {
	success: boolean;
	animations: AnimationData[];
	transitions: TransitionData[];
	screenshot?: string; // base64
	timing: {
		totalDuration: number;
		longestAnimation: number;
		averageDuration: number;
	};
	propertiesAnimated: string[];
	debug: {
		elementFound: boolean;
		hoverTriggered: boolean;
		animationsBeforeHover: number;
		animationsAfterHover: number;
		captureTime: number;
	};
	error?: string;
}

/**
 * Extract animation data from a URL using the Motion Extractor Worker
 *
 * This Worker uses real Puppeteer with page.hover() to trigger actual
 * CSS :hover states and capture animations mid-flight.
 */
export class MotionExtractor {
	private workerUrl: string;

	constructor(_accountId?: string, _apiToken?: string) {
		// Account ID and API Token are no longer needed - the Worker handles auth
		this.workerUrl = WORKER_URL;
	}

	async extract(
		url: string,
		trigger: TriggerConfig,
		options: MotionExtractorOptions = {}
	): Promise<ExtractionResult> {
		const { timeout = 30000, captureDelay = 100 } = options;

		try {
			// Call the Motion Extractor Worker
			const response = await fetch(this.workerUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url,
					trigger: {
						type: trigger.type,
						selector: trigger.selector,
						scrollPosition: trigger.scrollPosition,
						delay: trigger.delay
					},
					options: {
						timeout,
						captureDelay
					}
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				return {
					success: false,
					error: `Worker error: ${response.status} - ${errorText}`
				};
			}

			const result: WorkerResponse = await response.json();

			if (!result.success) {
				return {
					success: false,
					error: result.error || 'Unknown extraction error'
				};
			}

			// Build technical analysis from Worker response
			const technical: TechnicalAnalysis = {
				animations: result.animations,
				transitions: result.transitions,
				timing: {
					totalDuration: result.timing.totalDuration,
					longestAnimation: result.timing.longestAnimation,
					shortestAnimation:
						result.transitions.length > 0
							? Math.min(...result.transitions.map((t) => t.duration))
							: 0,
					averageDuration: result.timing.averageDuration,
					parallelAnimations: result.animations.length,
					sequentialChains: 1
				},
				propertiesAnimated: result.propertiesAnimated,
				triggerType: trigger.type,
				extractedAt: new Date().toISOString(),
				debug: {
					...result.debug,
					puppeteerUsed: true,
					realHoverTriggered: result.debug.hoverTriggered
				}
			};

			// Convert base64 screenshot to ArrayBuffer
			let screenshotBuffer: ArrayBuffer | undefined;
			if (result.screenshot) {
				const binaryString = atob(result.screenshot);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				screenshotBuffer = bytes.buffer;
			}

			return {
				success: true,
				technical,
				screenshot: screenshotBuffer
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown extraction error'
			};
		}
	}
}
