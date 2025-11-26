/**
 * Motion Extractor
 *
 * Server-side animation extraction using Cloudflare Browser Rendering.
 * Extracts technical animation data via Web Animations API and CDP.
 *
 * NOTE: This module uses @cloudflare/playwright which only works in
 * Cloudflare Workers runtime. The import is deferred to runtime.
 */

// Type definitions for Playwright (runtime-only)
type PlaywrightModule = typeof import('@cloudflare/playwright');
type Browser = Awaited<ReturnType<PlaywrightModule['launch']>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

// Lazy loader for Playwright - only imports at runtime in Workers
let playwrightModule: PlaywrightModule | null = null;

async function getPlaywright(): Promise<PlaywrightModule> {
	if (!playwrightModule) {
		// Dynamic import only executed at runtime in Cloudflare Workers
		playwrightModule = await import('@cloudflare/playwright');
	}
	return playwrightModule;
}
import type {
	AnimationData,
	KeyframeData,
	TransitionData,
	TechnicalAnalysis,
	TimingProfile,
	TriggerConfig,
	TriggerType
} from '$lib/motion-analysis/types';

export interface MotionExtractorOptions {
	timeout?: number;
	waitForAnimations?: boolean;
}

export interface ExtractionResult {
	success: boolean;
	technical?: TechnicalAnalysis;
	screenshot?: ArrayBuffer;
	error?: string;
}

/**
 * Extract animation data from a URL
 *
 * Uses Cloudflare Browser Rendering + Playwright to:
 * 1. Navigate to URL
 * 2. Execute trigger (click, hover, scroll)
 * 3. Extract all running animations via Web Animations API
 * 4. Capture screenshot for phenomenological analysis
 */
export class MotionExtractor {
	constructor(private browserBinding: Fetcher) {}

	async extract(
		url: string,
		trigger: TriggerConfig,
		options: MotionExtractorOptions = {}
	): Promise<ExtractionResult> {
		const { timeout = 30000, waitForAnimations = true } = options;

		let browser: Browser | null = null;

		try {
			const { launch } = await getPlaywright();
			browser = await launch(this.browserBinding);
			const page = await browser.newPage();

			// Navigate to URL
			await page.goto(url, {
				waitUntil: 'networkidle',
				timeout
			});

			// Execute trigger
			await this.executeTrigger(page, trigger);

			// Wait for animations to start
			if (waitForAnimations) {
				await page.waitForTimeout(100);
			}

			// Extract animation data
			const animations = await this.extractAnimations(page);
			const transitions = await this.extractTransitions(page);
			const propertiesAnimated = this.collectAnimatedProperties(animations, transitions);

			// Capture screenshot
			const screenshot = await page.screenshot({ type: 'png' });

			// Calculate timing profile
			const timing = this.calculateTimingProfile(animations, transitions);

			const technical: TechnicalAnalysis = {
				animations,
				transitions,
				timing,
				propertiesAnimated,
				triggerType: trigger.type,
				extractedAt: new Date().toISOString()
			};

			return {
				success: true,
				technical,
				screenshot: screenshot.buffer as ArrayBuffer
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown extraction error'
			};
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}

	/**
	 * Execute trigger action on page
	 */
	private async executeTrigger(page: Page, trigger: TriggerConfig): Promise<void> {
		const { type, selector, scrollPosition, delay } = trigger;

		if (delay) {
			await page.waitForTimeout(delay);
		}

		switch (type) {
			case 'load':
				// Already loaded
				break;

			case 'click':
				if (selector) {
					await page.click(selector);
				}
				break;

			case 'hover':
				if (selector) {
					await page.hover(selector);
				}
				break;

			case 'scroll':
				await page.evaluate((pos) => {
					window.scrollTo({ top: pos ?? window.innerHeight, behavior: 'smooth' });
				}, scrollPosition);
				// Wait for scroll to complete
				await page.waitForTimeout(500);
				break;

			case 'focus':
				if (selector) {
					await page.focus(selector);
				}
				break;
		}
	}

	/**
	 * Extract all animations via Web Animations API
	 */
	private async extractAnimations(page: Page): Promise<AnimationData[]> {
		return page.evaluate(() => {
			const animations = document.getAnimations();

			return animations.map((animation) => {
				const effect = animation.effect as KeyframeEffect | null;
				const timing = effect?.getTiming() ?? {};
				const keyframes = effect?.getKeyframes?.() ?? [];

				// Get target element selector for debugging
				let targetSelector: string | undefined;
				if (effect?.target) {
					const target = effect.target as Element;
					if (target.id) {
						targetSelector = `#${target.id}`;
					} else if (target.className && typeof target.className === 'string') {
						targetSelector = `.${target.className.split(' ')[0]}`;
					} else {
						targetSelector = target.tagName?.toLowerCase();
					}
				}

				return {
					name: (animation as CSSAnimation).animationName || 'unnamed',
					duration: Number(timing.duration) || 0,
					easing: String(timing.easing) || 'linear',
					delay: Number(timing.delay) || 0,
					iterations: Number(timing.iterations) || 1,
					fillMode: String(timing.fill) || 'none',
					keyframes: keyframes.map((kf) => ({
						offset: kf.offset ?? 0,
						properties: Object.fromEntries(
							Object.entries(kf).filter(
								([key]) => !['offset', 'easing', 'composite'].includes(key)
							)
						) as Record<string, string>
					})),
					targetSelector
				};
			});
		});
	}

	/**
	 * Extract CSS transitions from computed styles
	 */
	private async extractTransitions(page: Page): Promise<TransitionData[]> {
		return page.evaluate(() => {
			const transitions: Array<{
				property: string;
				duration: number;
				easing: string;
				delay: number;
			}> = [];

			// Sample elements with transitions
			const elements = document.querySelectorAll('*');
			const seen = new Set<string>();

			elements.forEach((el) => {
				const style = getComputedStyle(el);
				const props = style.transitionProperty;
				const durations = style.transitionDuration;
				const easings = style.transitionTimingFunction;
				const delays = style.transitionDelay;

				if (props && props !== 'none' && props !== 'all') {
					const propList = props.split(',').map((p) => p.trim());
					const durationList = durations.split(',').map((d) => parseFloat(d) * 1000);
					const easingList = easings.split(',').map((e) => e.trim());
					const delayList = delays.split(',').map((d) => parseFloat(d) * 1000);

					propList.forEach((prop, i) => {
						const key = `${prop}-${durationList[i % durationList.length]}`;
						if (!seen.has(key)) {
							seen.add(key);
							transitions.push({
								property: prop,
								duration: durationList[i % durationList.length] || 0,
								easing: easingList[i % easingList.length] || 'ease',
								delay: delayList[i % delayList.length] || 0
							});
						}
					});
				}
			});

			return transitions;
		});
	}

	/**
	 * Collect all unique animated properties
	 */
	private collectAnimatedProperties(
		animations: AnimationData[],
		transitions: TransitionData[]
	): string[] {
		const properties = new Set<string>();

		// From animations
		for (const anim of animations) {
			for (const kf of anim.keyframes) {
				for (const prop of Object.keys(kf.properties)) {
					properties.add(prop);
				}
			}
		}

		// From transitions
		for (const trans of transitions) {
			properties.add(trans.property);
		}

		return Array.from(properties).sort();
	}

	/**
	 * Calculate timing profile from animation data
	 */
	private calculateTimingProfile(
		animations: AnimationData[],
		transitions: TransitionData[]
	): TimingProfile {
		const durations = [
			...animations.map((a) => a.duration + a.delay),
			...transitions.map((t) => t.duration + t.delay)
		].filter((d) => d > 0);

		if (durations.length === 0) {
			return {
				totalDuration: 0,
				longestAnimation: 0,
				shortestAnimation: 0,
				averageDuration: 0,
				parallelAnimations: 0,
				sequentialChains: 0
			};
		}

		const maxDuration = Math.max(...durations);
		const minDuration = Math.min(...durations);
		const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

		// Estimate parallel vs sequential
		// Animations starting at roughly the same time are parallel
		const startTimes = animations.map((a) => a.delay);
		const uniqueStartTimes = new Set(startTimes.map((t) => Math.round(t / 50) * 50)).size;

		return {
			totalDuration: maxDuration,
			longestAnimation: maxDuration,
			shortestAnimation: minDuration,
			averageDuration: Math.round(avgDuration),
			parallelAnimations: animations.length - uniqueStartTimes + 1,
			sequentialChains: uniqueStartTimes
		};
	}
}
