/**
 * Motion Extractor Worker
 *
 * SEIN: The being of animation revealed through Puppeteer.
 * Real page.hover() triggers actual CSS :hover states.
 *
 * "Weniger, aber besser" - Less, but better.
 */

import puppeteer from '@cloudflare/puppeteer';

interface Env {
	BROWSER: Fetcher;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// CORS
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type'
				}
			});
		}

		if (request.method !== 'POST') {
			return json({ error: 'Method not allowed' }, 405);
		}

		try {
			const { url, trigger, options = {} } = await request.json();

			if (!url) {
				return json({ success: false, error: 'Missing URL' }, 400);
			}

			const browser = await puppeteer.launch(env.BROWSER);
			const page = await browser.newPage();
			await page.setViewport({ width: 1280, height: 800 });
			await page.goto(url, { waitUntil: 'networkidle0', timeout: options.timeout || 30000 });

			const debug = {
				elementFound: false,
				hoverTriggered: false,
				animationsBeforeHover: 0,
				animationsAfterHover: 0,
				captureTime: 0
			};

			// Count animations before
			debug.animationsBeforeHover = await page.evaluate(() => document.getAnimations().length);

			// Trigger interaction
			if (trigger?.selector) {
				try {
					await page.waitForSelector(trigger.selector, { timeout: 5000 });
					debug.elementFound = true;

					if (trigger.type === 'hover') {
						await page.hover(trigger.selector);
						debug.hoverTriggered = true;
					} else if (trigger.type === 'click') {
						await page.click(trigger.selector);
					}
				} catch {
					debug.elementFound = false;
				}
			}

			// Wait for animations to start
			await new Promise((r) => setTimeout(r, options.captureDelay || 150));

			// Capture
			const captureStart = Date.now();

			const animations = await page.evaluate(() => {
				return document.getAnimations().map((anim) => {
					const effect = anim.effect as KeyframeEffect;
					const timing = effect?.getTiming?.() || {};
					return {
						name: (anim as any).animationName || anim.id || 'transition',
						duration: Number(timing.duration) || 0,
						easing: String(timing.easing || 'linear'),
						delay: Number(timing.delay) || 0,
						iterations: Number(timing.iterations) || 1,
						fillMode: String(timing.fill || 'none'),
						playState: anim.playState,
						currentTime: anim.currentTime || 0,
						targetSelector: effect?.target
							? (effect.target as Element).className || (effect.target as Element).tagName
							: '',
						keyframes: (effect?.getKeyframes?.() || []).map((kf) => ({
							offset: kf.offset || 0,
							properties: Object.fromEntries(
								Object.entries(kf).filter(
									([k]) => !['offset', 'easing', 'composite'].includes(k)
								)
							)
						}))
					};
				});
			});

			const transitions = await page.evaluate(() => {
				const result: Array<{
					property: string;
					duration: number;
					easing: string;
					delay: number;
				}> = [];
				const seen = new Set<string>();

				document.querySelectorAll('*').forEach((el) => {
					const style = getComputedStyle(el);
					if (style.transitionProperty && style.transitionProperty !== 'none') {
						const props = style.transitionProperty.split(',').map((p) => p.trim());
						const durations = style.transitionDuration.split(',').map((d) => parseFloat(d) * 1000);
						const easings = style.transitionTimingFunction.split(',').map((e) => e.trim());
						const delays = style.transitionDelay.split(',').map((d) => parseFloat(d) * 1000);

						props.forEach((prop, i) => {
							const duration = durations[i % durations.length] || 0;
							if (duration > 0 && !seen.has(`${prop}-${duration}`)) {
								seen.add(`${prop}-${duration}`);
								result.push({
									property: prop,
									duration,
									easing: easings[i % easings.length] || 'ease',
									delay: delays[i % delays.length] || 0
								});
							}
						});
					}
				});
				return result;
			});

			debug.captureTime = Date.now() - captureStart;
			debug.animationsAfterHover = animations.length;

			// Screenshot
			const screenshotBuffer = await page.screenshot({ type: 'png' });
			const screenshot = Buffer.from(screenshotBuffer).toString('base64');

			await browser.close();

			// Timing
			const durations = [
				...animations.map((a) => a.duration + a.delay),
				...transitions.map((t) => t.duration + t.delay)
			].filter((d) => d > 0);

			const timing = {
				totalDuration: durations.length ? Math.max(...durations) : 0,
				longestAnimation: durations.length ? Math.max(...durations) : 0,
				averageDuration: durations.length
					? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
					: 0
			};

			// Properties
			const propertiesAnimated = [
				...new Set([
					...animations.flatMap((a) => a.keyframes.flatMap((kf) => Object.keys(kf.properties))),
					...transitions.map((t) => t.property)
				])
			].sort();

			return json({
				success: true,
				animations,
				transitions,
				screenshot,
				timing,
				propertiesAnimated,
				debug
			});
		} catch (error) {
			return json(
				{
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					animations: [],
					transitions: [],
					timing: { totalDuration: 0, longestAnimation: 0, averageDuration: 0 },
					propertiesAnimated: [],
					debug: {
						elementFound: false,
						hoverTriggered: false,
						animationsBeforeHover: 0,
						animationsAfterHover: 0,
						captureTime: 0
					}
				},
				500
			);
		}
	}
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
