/**
 * Community Monitor Types
 */

export interface DiscoveredSignal {
	platform: string;
	signal_type: 'mention' | 'reply' | 'question' | 'opportunity' | 'praise';
	content: string;
	source_url?: string;
	source_id?: string;
	author_id?: string;
	author_name?: string;
	author_handle?: string;
	author_followers?: number;
	relevance_score?: number;
	urgency?: 'low' | 'medium' | 'high' | 'critical';
	context?: string;
	metadata?: Record<string, unknown>;
}

export interface MonitorConfig {
	// Keywords to watch for
	keywords: string[];
	// Specific accounts to monitor (e.g., competitors, partners)
	watchAccounts?: string[];
	// Minimum follower count for prioritization
	minFollowers?: number;
	// How far back to search (ISO duration or date)
	since?: string;
	// Max results to return per run
	maxResults?: number;
}

export interface MonitorResult {
	monitor: string;
	started_at: string;
	completed_at: string;
	signals_found: number;
	signals: DiscoveredSignal[];
	errors?: string[];
	cursor?: string; // For pagination state
}

// Default keywords for CREATE SOMETHING
export const DEFAULT_KEYWORDS = [
	// Brand
	'create something',
	'createsomething',
	'@createsomething',
	
	// Products/Tools
	'ground cli',
	'plagiarism agent',
	'vertical template',
	
	// Methodology
	'subtractive triad',
	'design canon',
	'zuhandenheit design',
	
	// Competitors/adjacent (for opportunity detection)
	'webflow template',
	'webflow agency',
	'framer template',
	'design system agency'
];

// Signal type classification helpers
export function classifySignalType(content: string): DiscoveredSignal['signal_type'] {
	const lower = content.toLowerCase();
	
	if (lower.includes('?') || lower.includes('how do') || lower.includes('how to') || lower.includes('anyone know')) {
		return 'question';
	}
	
	if (lower.includes('looking for') || lower.includes('need help') || lower.includes('hiring') || lower.includes('recommend')) {
		return 'opportunity';
	}
	
	if (lower.includes('great') || lower.includes('love') || lower.includes('amazing') || lower.includes('awesome') || lower.includes('thanks')) {
		return 'praise';
	}
	
	if (lower.includes('@') || lower.includes('reply') || lower.includes('thread')) {
		return 'reply';
	}
	
	return 'mention';
}

// Relevance scoring helper
export function scoreRelevance(signal: DiscoveredSignal, config: MonitorConfig): number {
	let score = 0.5; // Base score
	
	// Boost for direct brand mentions
	const content = signal.content.toLowerCase();
	if (content.includes('create something') || content.includes('createsomething')) {
		score += 0.3;
	}
	
	// Boost for questions (high engagement opportunity)
	if (signal.signal_type === 'question') {
		score += 0.15;
	}
	
	// Boost for opportunities
	if (signal.signal_type === 'opportunity') {
		score += 0.2;
	}
	
	// Boost for high-follower accounts
	if (signal.author_followers) {
		if (signal.author_followers > 10000) score += 0.15;
		else if (signal.author_followers > 5000) score += 0.1;
		else if (signal.author_followers > 1000) score += 0.05;
	}
	
	// Cap at 1.0
	return Math.min(1, score);
}

// Urgency classification helper
export function classifyUrgency(signal: DiscoveredSignal): DiscoveredSignal['urgency'] {
	// Critical: Direct support request or major opportunity
	if (signal.signal_type === 'opportunity' && (signal.author_followers || 0) > 5000) {
		return 'critical';
	}
	
	// High: Questions from notable accounts, direct mentions
	if (signal.signal_type === 'question' && (signal.author_followers || 0) > 1000) {
		return 'high';
	}
	
	if (signal.content.toLowerCase().includes('urgent') || signal.content.toLowerCase().includes('asap')) {
		return 'high';
	}
	
	// Medium: General questions and opportunities
	if (signal.signal_type === 'question' || signal.signal_type === 'opportunity') {
		return 'medium';
	}
	
	// Low: Everything else
	return 'low';
}
