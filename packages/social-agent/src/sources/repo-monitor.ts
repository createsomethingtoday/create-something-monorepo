/**
 * Repo Activity Monitor
 *
 * Watches git commits and PRDs for postable insights.
 * Triggers ideas when significant changes are detected.
 */

import type { SourceMonitor, IdeaCandidate } from '../types';

// =============================================================================
// Patterns that indicate postable content
// =============================================================================

const POSTABLE_PATTERNS = [
	// Feature completions
	{ pattern: /implement|add|build|create|ship/i, priority: 60, label: 'feature' },
	// Performance improvements
	{ pattern: /optimize|improve|reduce|faster|speed/i, priority: 70, label: 'performance' },
	// Bug fixes with learning
	{ pattern: /fix|resolve|debug|issue|bug/i, priority: 40, label: 'fix' },
	// Refactoring stories
	{ pattern: /refactor|clean|simplify|remove|delete/i, priority: 80, label: 'refactor' },
	// Migrations
	{ pattern: /migrate|upgrade|convert/i, priority: 65, label: 'migration' },
	// Documentation
	{ pattern: /document|readme|guide/i, priority: 30, label: 'docs' }
];

// Packages that are particularly interesting to post about
const FEATURED_PACKAGES = [
	'social-agent',
	'harness',
	'workway',
	'clearway',
	'agency',
	'io'
];

export class RepoActivityMonitor implements SourceMonitor {
	name = 'repo';
	private lastCheckedCommit: string | null = null;

	/**
	 * Poll for new postable commits
	 *
	 * In production, this would:
	 * 1. Run `git log --oneline` since last check
	 * 2. Parse commit messages for patterns
	 * 3. Generate idea candidates
	 *
	 * For now, returns empty (requires git access at runtime)
	 */
	async poll(): Promise<IdeaCandidate[]> {
		// In a Cloudflare Worker context, we can't run git commands
		// This monitor would be triggered by:
		// 1. GitHub webhook on push
		// 2. Manual git log analysis in a different process
		// 3. GitHub API calls

		// Return empty for now - webhook integration handles this
		return [];
	}

	/**
	 * Analyze a commit message for postable content
	 * Called from webhook handler
	 */
	analyzeCommit(
		sha: string,
		message: string,
		files: string[]
	): IdeaCandidate | null {
		// Check if commit matches postable patterns
		let bestMatch: { pattern: RegExp; priority: number; label: string } | null = null;
		let bestPriority = 0;

		for (const { pattern, priority, label } of POSTABLE_PATTERNS) {
			if (pattern.test(message) && priority > bestPriority) {
				bestMatch = { pattern, priority, label };
				bestPriority = priority;
			}
		}

		if (!bestMatch || bestPriority < 40) {
			return null; // Not interesting enough
		}

		// Boost priority for featured packages
		const affectedPackages = files
			.map((f) => f.match(/packages\/([^/]+)/)?.[1])
			.filter(Boolean) as string[];

		const isFeatured = affectedPackages.some((p) => FEATURED_PACKAGES.includes(p));
		const finalPriority = isFeatured ? Math.min(100, bestPriority + 20) : bestPriority;

		// Generate raw content from commit
		const rawContent = this.generateRawContent(message, affectedPackages, bestMatch.label);

		return {
			source: 'repo',
			sourceId: `commit:${sha}`,
			rawContent,
			suggestedPlatforms: ['linkedin'], // Repo changes are usually LinkedIn material
			priority: finalPriority,
			metadata: {
				sha,
				message,
				files,
				type: bestMatch.label,
				packages: affectedPackages
			}
		};
	}

	/**
	 * Generate raw content from commit details
	 */
	private generateRawContent(
		message: string,
		packages: string[],
		type: string
	): string {
		const packageList = packages.length > 0 ? packages.join(', ') : 'monorepo';

		return `
Type: ${type}
Packages: ${packageList}
Commit: ${message}

Context: This commit represents work on the CREATE SOMETHING monorepo.
Generate a social post that:
- Explains what was done and why it matters
- Shares a lesson learned or insight
- Connects to broader principles (Subtractive Triad, AI-native development)
`.trim();
	}

	/**
	 * Set checkpoint for incremental polling
	 */
	setLastCheckedCommit(sha: string): void {
		this.lastCheckedCommit = sha;
	}
}
