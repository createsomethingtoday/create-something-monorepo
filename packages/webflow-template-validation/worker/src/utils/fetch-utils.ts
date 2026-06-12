/**
 * Fetch Utilities - HTML and asset fetching with error handling
 */

import { FetchResult, AssetFetchResult, ParsedHTML } from '../types';

const FETCH_TIMEOUT = 10000; // 10 seconds
const MAX_HTML_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ASSET_SIZE = 50 * 1024 * 1024; // 50MB

export async function fetchHTML(url: string): Promise<FetchResult> {
	const startTime = Date.now();

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'WebflowWayValidator/1.0'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type');
		if (!contentType || !contentType.includes('text/html')) {
			throw new Error(`Invalid content type: ${contentType}`);
		}

		// Check content length
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > MAX_HTML_SIZE) {
			throw new Error(`HTML too large: ${contentLength} bytes`);
		}

		const html = await response.text();
		const loadTime = Date.now() - startTime;

		// Build headers object
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			html,
			status: response.status,
			headers,
			size: html.length,
			loadTime
		};

	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timeout after ${FETCH_TIMEOUT}ms`);
		}
		throw error;
	}
}

export async function fetchAsset(url: string): Promise<AssetFetchResult> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		// First, do a HEAD request to check size
		const headResponse = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			headers: {
				'User-Agent': 'WebflowWayValidator/1.0'
			}
		});

		const contentLength = headResponse.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > MAX_ASSET_SIZE) {
			clearTimeout(timeoutId);
			throw new Error(`Asset too large: ${contentLength} bytes`);
		}

		// Now fetch the actual asset
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'WebflowWayValidator/1.0'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const buffer = await response.arrayBuffer();
		const mimeType = response.headers.get('content-type') || 'application/octet-stream';

		// Build headers object
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			buffer,
			size: buffer.byteLength,
			mimeType,
			headers
		};

	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Asset request timeout after ${FETCH_TIMEOUT}ms`);
		}
		throw error;
	}
}

/**
 * Lightweight HEAD-only request to get asset metadata without downloading content.
 * Uses only 1 subrequest instead of 2, helping stay under Cloudflare's ~50 limit.
 */
export interface AssetMetadata {
	size: number;
	mimeType: string;
	headers: Record<string, string>;
}

export async function fetchAssetMetadata(url: string): Promise<AssetMetadata> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		const response = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
			headers: {
				'User-Agent': 'WebflowWayValidator/1.0'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentLength = response.headers.get('content-length');
		const mimeType = response.headers.get('content-type') || 'application/octet-stream';

		// Build headers object
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		return {
			size: contentLength ? parseInt(contentLength) : 0,
			mimeType,
			headers
		};

	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Asset metadata request timeout after ${FETCH_TIMEOUT}ms`);
		}
		throw error;
	}
}

export function parseHTML(html: string): ParsedHTML {
	try {
		// Check if DOMParser is available (browser environment)
		if (typeof DOMParser !== 'undefined') {
			const parser = new DOMParser();
			const document = parser.parseFromString(html, 'text/html');

			// Extract different element types
			const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
			const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
			const forms = Array.from(document.querySelectorAll('form')) as HTMLFormElement[];
			const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLHeadingElement[];
			const scripts = Array.from(document.querySelectorAll('script')) as HTMLScriptElement[];
			const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

				return {
					rawHtml: html,
					document,
					images,
					links,
					forms,
				headings,
				scripts,
				stylesheets
			};
		} else {
			// Fallback to worker-compatible parsing
			return parseHTMLWorker(html);
		}

	} catch (error) {
		throw new Error(`Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// Cloudflare Worker compatible HTML parsing
export function parseHTMLWorker(html: string): ParsedHTML {
	// Since Cloudflare Workers don't have native DOM parsing,
	// we'll use a simpler regex-based approach for basic element extraction

	// This is a simplified implementation - in production, you might want to use
	// a library like 'node-html-parser' or similar

	const images = extractElements(html, /<img[^>]+>/gi);
	const links = extractElements(html, /<a[^>]+href[^>]*>/gi);
	const forms = extractElements(html, /<form[^>]*>[\s\S]*?<\/form>/gi);
	const headings = extractElements(html, /<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi);
	const scripts = extractElements(html, /<script[^>]*>[\s\S]*?<\/script>/gi);
	const stylesheets = extractElements(html, /<link[^>]*rel=["']stylesheet["'][^>]*>/gi);
	const buttons = extractElements(html, /<button[^>]*>[\s\S]*?<\/button>/gi);
	const inputs = extractElements(html, /<input[^>]*>/gi);
	const textareas = extractElements(html, /<textarea[^>]*>[\s\S]*?<\/textarea>/gi);
	const selects = extractElements(html, /<select[^>]*>[\s\S]*?<\/select>/gi);
	const tabIndexed = extractElements(html, /<[^>]+\btabindex=["'][^"']+["'][^>]*>/gi);

	// Create mock document object
	const mockDocument = {
			querySelectorAll: (selector: string) => {
				switch (selector) {
					case 'img': return images.map(createMockElement);
					case 'a[href]': return links.map(createMockElement);
					case 'form': return forms.map(createMockElement);
					case 'h1, h2, h3, h4, h5, h6': return headings.map(createMockElement);
					case 'script': return scripts.map(createMockElement);
					case 'link[rel="stylesheet"]': return stylesheets.map(createMockElement);
					case 'button': return buttons.map(createMockElement);
					case 'input': return inputs.map(createMockElement);
					case 'textarea': return textareas.map(createMockElement);
					case 'select': return selects.map(createMockElement);
					case '[tabindex]': return tabIndexed.map(createMockElement);
					default: return [];
				}
			},
		querySelector: (selector: string) => {
			if (selector === 'title') {
				const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
				if (titleMatch) {
					return {
						textContent: titleMatch[1].trim(),
						getAttribute: () => null,
						hasAttribute: () => false,
						tagName: 'TITLE'
					};
				}
				return null;
			}

			// Handle meta tag selectors
			if (selector.startsWith('meta[')) {
				if (selector === 'meta[name="description"]') {
					const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[property="og:title"]') {
					const metaMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[property="og:description"]') {
					const metaMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[property="og:image"]') {
					const metaMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[property="og:url"]') {
					const metaMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[name="twitter:title"]') {
					const metaMatch = html.match(/<meta[^>]+name=["']twitter:title["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[name="twitter:description"]') {
					const metaMatch = html.match(/<meta[^>]+name=["']twitter:description["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[name="twitter:image"]') {
					const metaMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				} else if (selector === 'meta[name="robots"]') {
					const metaMatch = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
					if (metaMatch) {
						const attributes = extractAttributes(metaMatch[0]);
						return {
							getAttribute: (name: string) => attributes[name] || null,
							hasAttribute: (name: string) => name in attributes,
							tagName: 'META'
						};
					}
				}
				return null;
			}

			// Handle link tag selectors
			if (selector === 'link[rel="canonical"]') {
				const linkMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
				if (linkMatch) {
					const attributes = extractAttributes(linkMatch[0]);
					return {
						getAttribute: (name: string) => attributes[name] || null,
						hasAttribute: (name: string) => name in attributes,
						tagName: 'LINK'
					};
				}
				return null;
			}

			const results = mockDocument.querySelectorAll(selector);
			return results.length > 0 ? results[0] : null;
		},
		body: {
			textContent: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
			innerHTML: html
		}
	} as unknown as Document;

		return {
			rawHtml: html,
			document: mockDocument,
			images: images.map(createMockElement) as HTMLImageElement[],
			links: links.map(createMockElement) as HTMLAnchorElement[],
		forms: forms.map(createMockElement) as HTMLFormElement[],
		headings: headings.map(createMockElement) as HTMLHeadingElement[],
		scripts: scripts.map(createMockElement) as HTMLScriptElement[],
		stylesheets: stylesheets.map(createMockElement) as HTMLLinkElement[]
	};
}

function extractElements(html: string, regex: RegExp): string[] {
	const matches = html.match(regex);
	return matches || [];
}

// Webflow Ecommerce components (cart modal, default checkout blocks) render
// headings with fixed tags (e.g. <h4 class="w-commerce-commercecartheading">
// inside the display:none cart dialog on every page with a cart element).
// Creators cannot retag them, and Webflow's own Audit Panel excludes them, so
// they must not participate in heading-hierarchy analysis. The auto-generated
// w-commerce- class prefix identifies them in both DOM and regex parsing paths.
export function isPlatformManagedHeading(heading: HTMLHeadingElement): boolean {
	const className =
		typeof heading.getAttribute === 'function'
			? heading.getAttribute('class') || ''
			: (heading as { className?: string }).className || '';
	return /(?:^|\s)w-commerce-/.test(className);
}

function createMockElement(htmlString: string): any {
	// Create a basic mock element with getAttribute method
	const attributes = extractAttributes(htmlString);
	const tagName = htmlString.match(/<(\w+)/)?.[1]?.toUpperCase() || 'UNKNOWN';

	const mockElement: any = {
		getAttribute: (name: string) => name in attributes ? attributes[name] : null,
		hasAttribute: (name: string) => name in attributes,
		textContent: htmlString.replace(/<[^>]*>/g, '').trim(),
		tagName: tagName,
		src: attributes.src,
		href: attributes.href,
		alt: attributes.alt
	};

	// Add querySelector method for form elements
	if (tagName === 'FORM') {
		mockElement.querySelector = (selector: string) => {
			const labelForMatch = selector.match(/^label\[for="([^"]+)"\]$/);
			if (labelForMatch) {
				const labelRegex = new RegExp(`<label[^>]+for=["']${escapeRegExp(labelForMatch[1])}["'][^>]*>[\\s\\S]*?<\\/label>`, 'i');
				const labelMatch = htmlString.match(labelRegex);
				return labelMatch ? createMockElement(labelMatch[0]) : null;
			}

			// Simple querySelector implementation for forms
			const inputRegex = new RegExp(`<input[^>]*>`, 'gi');
			const textareaRegex = new RegExp(`<textarea[^>]*>[\\s\\S]*?</textarea>`, 'gi');
			const selectRegex = new RegExp(`<select[^>]*>[\\s\\S]*?</select>`, 'gi');

			const inputs = htmlString.match(inputRegex) || [];
			const textareas = htmlString.match(textareaRegex) || [];
			const selects = htmlString.match(selectRegex) || [];

			const allInputs = [...inputs, ...textareas, ...selects];
			return allInputs.length > 0 ? createMockElement(allInputs[0]) : null;
		};

		mockElement.querySelectorAll = (selector: string) => {
			if (selector === 'input, textarea, select') {
				const inputRegex = new RegExp(`<input[^>]*>`, 'gi');
					const textareaRegex = new RegExp(`<textarea[^>]*>[\\s\\S]*?</textarea>`, 'gi');
					const selectRegex = new RegExp(`<select[^>]*>[\\s\\S]*?</select>`, 'gi');

				const inputs = htmlString.match(inputRegex) || [];
				const textareas = htmlString.match(textareaRegex) || [];
				const selects = htmlString.match(selectRegex) || [];

				const allInputs = [...inputs, ...textareas, ...selects];
				return allInputs.map(createMockElement);
			}
			return [];
		};
	}

	return mockElement;
}

function extractAttributes(htmlString: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	const attrRegex = /([A-Za-z_:][-A-Za-z0-9_:.]*)=["']([^"']*)["']/g;
	let match;

	while ((match = attrRegex.exec(htmlString)) !== null) {
		attributes[match[1]] = match[2];
	}

	return attributes;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
