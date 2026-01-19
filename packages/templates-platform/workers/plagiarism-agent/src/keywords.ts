/**
 * TF-IDF Keyword Extraction for Templates
 * 
 * Extracts distinctive keywords from templates using TF-IDF scoring.
 * Used for template categorization and similarity analysis.
 */

import type { Env, KeywordResult } from './types';
import { STOPWORDS, IDF_BASELINE } from './constants';
import { fetchTemplateContent } from './minhash-helpers';
import { extractCustomClasses, extractCSSPatterns } from './minhash';

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract keywords from a template URL using TF-IDF scoring.
 */
export async function extractKeywords(templateUrl: string, env: Env): Promise<KeywordResult> {
	// Fetch template content
	const content = await fetchTemplateContent(templateUrl);

	if (!content.html && !content.css) {
		throw new Error(`Failed to fetch content from ${templateUrl}`);
	}

	// Extract terms from different sources
	const terms: Map<string, { count: number; sources: Set<string> }> = new Map();

	// 1. Extract from HTML text content
	const textContent = extractTextContent(content.html);
	tokenize(textContent).forEach(term => {
		const existing = terms.get(term) || { count: 0, sources: new Set() };
		existing.count++;
		existing.sources.add('text');
		terms.set(term, existing);
	});

	// 2. Extract from CSS class names (custom only)
	const customClasses = extractCustomClasses(content.css);
	customClasses.forEach(cls => {
		const cleanCls = cls.replace(/^\./, '').toLowerCase();
		const parts = cleanCls.split(/[-_]/);
		parts.forEach(part => {
			if (part.length > 2 && !STOPWORDS.has(part) && !/^\d+$/.test(part)) {
				const existing = terms.get(part) || { count: 0, sources: new Set() };
				existing.count++;
				existing.sources.add('class');
				terms.set(part, existing);
			}
		});
	});

	// 3. Extract from CSS patterns
	const cssPatterns = extractCSSPatterns(content.css);

	// Color analysis
	cssPatterns.colors.forEach(color => {
		const colorName = identifyColorName(color);
		if (colorName) {
			const existing = terms.get(colorName) || { count: 0, sources: new Set() };
			existing.count++;
			existing.sources.add('color');
			terms.set(colorName, existing);
		}
	});

	// Animation/style indicators
	if (cssPatterns.gradients.length > 2) {
		const existing = terms.get('gradient') || { count: 0, sources: new Set() };
		existing.count += 3;
		existing.sources.add('style');
		terms.set('gradient', existing);
	}

	if (cssPatterns.animations.length > 0) {
		const existing = terms.get('animated') || { count: 0, sources: new Set() };
		existing.count += cssPatterns.animations.length;
		existing.sources.add('style');
		terms.set('animated', existing);
	}

	// 4. Extract from meta tags
	const metaKeywords = extractMetaTags(content.html);
	metaKeywords.forEach(term => {
		const existing = terms.get(term) || { count: 0, sources: new Set() };
		existing.count += 2; // Boost meta tags
		existing.sources.add('meta');
		terms.set(term, existing);
	});

	// Calculate TF-IDF scores
	const totalTerms = Array.from(terms.values()).reduce((sum, t) => sum + t.count, 0);
	const scoredTerms: Array<{ term: string; score: number; sources: string[] }> = [];

	terms.forEach((data, term) => {
		if (STOPWORDS.has(term) || term.length < 3) return;

		const tf = data.count / totalTerms;
		const idf = IDF_BASELINE[term] || 1.5;
		const sourceBoost = Math.min(data.sources.size * 0.3, 1.0);
		const score = tf * idf * (1 + sourceBoost);

		if (score > 0.001) {
			scoredTerms.push({
				term,
				score,
				sources: Array.from(data.sources)
			});
		}
	});

	// Sort by score and take top keywords
	scoredTerms.sort((a, b) => b.score - a.score);
	const topKeywords = scoredTerms.slice(0, 20);

	// Categorize keywords
	const categories = categorizeKeywords(topKeywords);

	// Generate summary
	const summary = generateKeywordSummary(categories);

	return {
		url: templateUrl,
		keywords: topKeywords.map(k => ({
			term: k.term,
			score: Math.round(k.score * 1000) / 1000,
			category: getKeywordCategory(k.term)
		})),
		categories,
		summary
	};
}

// =============================================================================
// Text Extraction
// =============================================================================

function extractTextContent(html: string): string {
	// Remove script and style tags
	let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
	text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

	// Extract text from headings (higher weight)
	const headings = (text.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [])
		.map(h => h.replace(/<[^>]+>/g, ''))
		.join(' ');

	// Remove all HTML tags
	text = text.replace(/<[^>]+>/g, ' ');

	// Clean up whitespace
	text = text.replace(/\s+/g, ' ').trim();

	// Headings are more important
	return headings + ' ' + headings + ' ' + text;
}

function extractMetaTags(html: string): string[] {
	const keywords: string[] = [];

	// Meta description
	const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
	if (descMatch) {
		keywords.push(...tokenize(descMatch[1]));
	}

	// Meta keywords
	const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
	if (kwMatch) {
		keywords.push(...kwMatch[1].split(',').map(k => k.trim().toLowerCase()));
	}

	// Title
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	if (titleMatch) {
		keywords.push(...tokenize(titleMatch[1]));
	}

	// OG tags
	const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
	if (ogMatch) {
		keywords.push(...tokenize(ogMatch[1]));
	}

	return keywords.filter(k => k.length > 2 && !STOPWORDS.has(k));
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length > 2 && !STOPWORDS.has(t));
}

// =============================================================================
// Color Detection
// =============================================================================

function identifyColorName(colorValue: string): string | null {
	const color = colorValue.toLowerCase();

	const colorPatterns: Record<string, RegExp> = {
		'dark': /^#[0-3]/i,
		'purple': /purple|#[89a][0-5][8-f]|rgb\(1[2-6]\d,\s*[0-8]\d,\s*[12]\d{2}\)/i,
		'blue': /blue|#[0-4][0-8][a-f]|rgb\([0-8]\d,\s*[0-9]\d,\s*[12]\d{2}\)/i,
		'green': /green|#[0-4][a-f][0-4]|rgb\([0-8]\d,\s*[12]\d{2},\s*[0-8]\d\)/i,
		'red': /red|#[c-f][0-4][0-4]|rgb\([12]\d{2},\s*[0-8]\d,\s*[0-8]\d\)/i,
		'orange': /orange|#[ef][89a][0-4]/i,
		'yellow': /yellow|#[ef][ef][0-4]/i,
		'pink': /pink|#[ef][0-8][89a-f]/i,
		'teal': /teal|#[0-4][a-f][a-f]/i,
	};

	for (const [name, pattern] of Object.entries(colorPatterns)) {
		if (pattern.test(color)) {
			return name;
		}
	}

	return null;
}

// =============================================================================
// Categorization
// =============================================================================

function getKeywordCategory(term: string): 'industry' | 'style' | 'feature' | 'color' | 'technical' {
	const industries = ['fintech', 'crypto', 'nft', 'healthcare', 'medical', 'legal', 'law',
		'fitness', 'restaurant', 'food', 'travel', 'hotel', 'real-estate', 'property',
		'architecture', 'interior', 'fashion', 'clothing', 'ecommerce', 'education',
		'course', 'learning', 'podcast', 'music', 'gaming', 'saas', 'startup', 'agency',
		'payments', 'payment', 'banking', 'finance', 'insurance', 'consulting', 'marketing',
		'photography', 'video', 'film', 'design', 'creative', 'portfolio', 'freelance',
		'nonprofit', 'charity', 'church', 'event', 'wedding', 'beauty', 'salon', 'spa'];

	const styles = ['minimal', 'modern', 'dark', 'light', 'gradient', 'glassmorphism',
		'neumorphism', 'brutalist', 'retro', 'neon', 'cyberpunk', 'vintage', 'futuristic',
		'parallax', 'animated', 'interactive', '3d', 'isometric', 'bold', 'soft'];

	const colors = ['monochrome', 'pastel', 'vibrant', 'muted', 'warm', 'cool', 'earth',
		'purple', 'blue', 'green', 'red', 'orange', 'yellow', 'pink', 'teal', 'dark'];

	const features = ['hero', 'cta', 'card', 'pricing', 'testimonial', 'team', 'portfolio',
		'gallery', 'dashboard', 'form', 'slider', 'carousel', 'accordion', 'tabs', 'modal'];

	if (industries.includes(term)) return 'industry';
	if (styles.includes(term)) return 'style';
	if (colors.includes(term)) return 'color';
	if (features.includes(term)) return 'feature';
	return 'technical';
}

function categorizeKeywords(keywords: Array<{ term: string; score: number; sources: string[] }>): {
	industry: string[];
	style: string[];
	features: string[];
	colors: string[];
} {
	const result = { industry: [] as string[], style: [] as string[], features: [] as string[], colors: [] as string[] };

	keywords.forEach(k => {
		const cat = getKeywordCategory(k.term);
		if (cat === 'industry') result.industry.push(k.term);
		else if (cat === 'style') result.style.push(k.term);
		else if (cat === 'feature') result.features.push(k.term);
		else if (cat === 'color') result.colors.push(k.term);
	});

	return result;
}

function generateKeywordSummary(categories: { industry: string[]; style: string[]; features: string[]; colors: string[] }): string {
	const parts: string[] = [];

	if (categories.industry.length > 0) {
		parts.push(`${categories.industry[0]} template`);
	}

	if (categories.style.length > 0) {
		parts.push(`${categories.style.slice(0, 2).join(', ')} design`);
	}

	if (categories.colors.length > 0) {
		parts.push(`${categories.colors[0]} color scheme`);
	}

	if (categories.features.length > 0) {
		parts.push(`featuring ${categories.features.slice(0, 3).join(', ')}`);
	}

	return parts.length > 0 ? parts.join(' with ') : 'General purpose template';
}
