/**
 * Utility functions for Plagiarism Detection Agent
 */

// =============================================================================
// ID Generation
// =============================================================================

export function generateId(): string {
	return Math.random().toString(36).substring(2, 15);
}

// =============================================================================
// String Utilities
// =============================================================================

export function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================================
// URL Sanitization
// =============================================================================

/**
 * Sanitize URL from Airtable field that may contain:
 * - Markdown/HTML angle brackets: <https://example.com>
 * - Multiple URLs separated by newlines
 * - Extra whitespace
 *
 * Returns the first valid URL found, or the original string if no URL pattern detected.
 */
export function sanitizeUrl(rawUrl: string): string {
	if (!rawUrl) return rawUrl;

	// Remove angle brackets and trim
	let cleaned = rawUrl
		.replace(/^</, '')  // Remove leading <
		.replace(/>$/, '')  // Remove trailing >
		.trim();

	// If multiple URLs (separated by newlines), take the first one
	const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
	if (lines.length > 0) {
		cleaned = lines[0];
	}

	// Remove any remaining angle brackets
	cleaned = cleaned.replace(/[<>]/g, '');

	return cleaned;
}

/**
 * Extract ALL URLs from Airtable field.
 * Handles markdown/HTML angle brackets and newline separation.
 *
 * Returns array of clean URLs.
 */
export function extractAllUrls(rawUrl: string): string[] {
	if (!rawUrl) return [];

	// Split by newlines and process each line
	const lines = rawUrl
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean);

	const urls: string[] = [];

	for (const line of lines) {
		// Remove angle brackets
		let cleaned = line
			.replace(/^</, '')
			.replace(/>$/, '')
			.replace(/[<>]/g, '')
			.trim();

		// Handle labels before URLs (e.g., "Hollow template: https://...")
		// Extract URL starting from http:// or https://
		const urlMatch = cleaned.match(/(https?:\/\/[^\s]+)/);
		if (urlMatch) {
			urls.push(urlMatch[1]);
		}
	}

	return urls;
}

// =============================================================================
// JSON Extraction
// =============================================================================

/**
 * Extract JSON from AI response that may contain markdown or other formatting.
 */
export function extractJSON(text: string): any {
	// Try direct parse first
	try {
		return JSON.parse(text);
	} catch (e) {
		// Extract JSON from markdown code blocks
		const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[1].trim());
		}

		// Try to find JSON object in text
		const objectMatch = text.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			return JSON.parse(objectMatch[0]);
		}

		throw new Error(`Could not extract JSON from response: ${text.substring(0, 100)}`);
	}
}

// =============================================================================
// Text Extraction
// =============================================================================

/**
 * Extract text content from HTML, removing tags.
 */
export function extractTextContent(html: string): string {
	if (!html) return '';
	
	// Remove script and style contents
	let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
	text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
	
	// Remove HTML tags
	text = text.replace(/<[^>]+>/g, ' ');
	
	// Decode HTML entities
	text = text.replace(/&nbsp;/g, ' ');
	text = text.replace(/&amp;/g, '&');
	text = text.replace(/&lt;/g, '<');
	text = text.replace(/&gt;/g, '>');
	text = text.replace(/&quot;/g, '"');
	
	// Normalize whitespace
	text = text.replace(/\s+/g, ' ').trim();
	
	return text;
}

/**
 * Extract meta tags from HTML.
 */
export function extractMetaTags(html: string): string[] {
	const terms: string[] = [];
	
	// Extract description
	const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
	if (descMatch) {
		terms.push(...tokenize(descMatch[1]));
	}
	
	// Extract keywords
	const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i);
	if (keywordsMatch) {
		terms.push(...keywordsMatch[1].split(',').map(k => k.trim().toLowerCase()));
	}
	
	// Extract title
	const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
	if (titleMatch) {
		terms.push(...tokenize(titleMatch[1]));
	}
	
	return terms;
}

/**
 * Tokenize text into words.
 */
export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/\s+/)
		.filter(word => word.length > 2);
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Identify color name from CSS color value.
 */
export function identifyColorName(color: string): string | null {
	const colorLower = color.toLowerCase();
	
	// Named colors mapping to categories
	const colorCategories: Record<string, string[]> = {
		'red': ['red', '#ff0000', '#f00', 'rgb(255,0,0)', 'crimson', 'maroon'],
		'blue': ['blue', '#0000ff', '#00f', 'rgb(0,0,255)', 'navy', 'teal', 'cyan'],
		'green': ['green', '#00ff00', '#0f0', 'rgb(0,255,0)', 'lime', 'olive'],
		'yellow': ['yellow', '#ffff00', '#ff0', 'rgb(255,255,0)', 'gold'],
		'orange': ['orange', '#ffa500', 'rgb(255,165,0)', 'coral'],
		'purple': ['purple', '#800080', 'rgb(128,0,128)', 'violet', 'indigo', 'magenta'],
		'pink': ['pink', '#ffc0cb', 'rgb(255,192,203)', 'hotpink', 'fuchsia'],
		'black': ['black', '#000000', '#000', 'rgb(0,0,0)'],
		'white': ['white', '#ffffff', '#fff', 'rgb(255,255,255)'],
		'gray': ['gray', 'grey', '#808080', 'silver', 'darkgray', 'lightgray']
	};
	
	for (const [name, values] of Object.entries(colorCategories)) {
		if (values.some(v => colorLower.includes(v))) {
			return name;
		}
	}
	
	// Detect gradients
	if (colorLower.includes('gradient')) {
		return 'gradient';
	}
	
	return null;
}

// =============================================================================
// CORS Headers
// =============================================================================

export const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400'
};

/**
 * Create a CORS-enabled JSON response.
 */
export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...CORS_HEADERS
		}
	});
}

/**
 * Create a CORS-enabled error response.
 */
export function errorResponse(message: string, status = 500): Response {
	return jsonResponse({ error: message }, status);
}
