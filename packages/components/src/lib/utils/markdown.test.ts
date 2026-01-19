/**
 * Markdown Formatting Utilities Tests
 *
 * Tests for page export and Claude.ai integration utilities.
 */

import { describe, it, expect } from 'vitest';
import { formatPageMarkdown, truncateForUrl, generateClaudeUrl } from './markdown';

describe('formatPageMarkdown', () => {
	it('formats page with title only', () => {
		const result = formatPageMarkdown('Test Title', 'Test content');

		expect(result).toBe('# Test Title\n\nTest content');
	});

	it('includes author in metadata', () => {
		const result = formatPageMarkdown('Title', 'Content', { author: 'John Doe' });

		expect(result).toContain('**Author**: John Doe');
	});

	it('includes date in metadata', () => {
		const result = formatPageMarkdown('Title', 'Content', { date: '2024-01-15' });

		expect(result).toContain('**Date**: 2024-01-15');
	});

	it('includes category in metadata', () => {
		const result = formatPageMarkdown('Title', 'Content', { category: 'Technology' });

		expect(result).toContain('**Category**: Technology');
	});

	it('includes keywords as comma-separated list', () => {
		const result = formatPageMarkdown('Title', 'Content', {
			keywords: ['javascript', 'testing', 'web']
		});

		expect(result).toContain('**Keywords**: javascript, testing, web');
	});

	it('includes source URL', () => {
		const result = formatPageMarkdown('Title', 'Content', {
			sourceUrl: 'https://example.com/article'
		});

		expect(result).toContain('**Source**: https://example.com/article');
	});

	it('includes custom metadata fields', () => {
		const result = formatPageMarkdown('Title', 'Content', {
			customField: 'Custom Value',
			anotherField: 123
		});

		expect(result).toContain('**customField**: Custom Value');
		expect(result).toContain('**anotherField**: 123');
	});

	it('omits undefined and null custom fields', () => {
		const result = formatPageMarkdown('Title', 'Content', {
			defined: 'value',
			undefinedField: undefined,
			nullField: null
		});

		expect(result).toContain('**defined**: value');
		expect(result).not.toContain('undefinedField');
		expect(result).not.toContain('nullField');
	});

	it('skips empty keywords array', () => {
		const result = formatPageMarkdown('Title', 'Content', { keywords: [] });

		expect(result).not.toContain('**Keywords**');
	});

	it('formats all metadata correctly', () => {
		const result = formatPageMarkdown('Full Example', 'Main content here', {
			author: 'Jane Smith',
			date: '2024-02-20',
			category: 'Tutorial'
		});

		expect(result).toBe(
			'# Full Example\n\n' +
				'**Author**: Jane Smith  \n' +
				'**Date**: 2024-02-20  \n' +
				'**Category**: Tutorial\n\n' +
				'Main content here'
		);
	});

	it('preserves content formatting', () => {
		const content = `## Section 1

Some paragraph text.

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\``;

		const result = formatPageMarkdown('Code Example', content);

		expect(result).toContain('## Section 1');
		expect(result).toContain('- List item 1');
		expect(result).toContain('```javascript');
	});
});

describe('truncateForUrl', () => {
	it('returns content unchanged when under limit', () => {
		const content = 'Short content';
		const result = truncateForUrl(content);

		expect(result).toBe('Short content');
	});

	it('returns content unchanged when exactly at limit', () => {
		const content = 'a'.repeat(8000);
		const result = truncateForUrl(content, 8000);

		expect(result).toBe(content);
	});

	it('truncates content over limit', () => {
		const content = 'a'.repeat(100);
		const result = truncateForUrl(content, 50);

		expect(result.length).toBeLessThanOrEqual(50);
	});

	it('adds truncation indicator', () => {
		const content = 'a'.repeat(100);
		const result = truncateForUrl(content, 50);

		expect(result).toContain('[Content truncated due to URL length limits]');
	});

	it('uses default max length of 8000', () => {
		const longContent = 'a'.repeat(10000);
		const result = truncateForUrl(longContent);

		// Should truncate at 8000 - 50 = 7950, plus indicator
		expect(result.length).toBeLessThanOrEqual(8000);
		expect(result).toContain('[Content truncated');
	});

	it('preserves content before truncation point', () => {
		const content = 'START' + 'a'.repeat(100) + 'END';
		const result = truncateForUrl(content, 60);

		expect(result).toContain('START');
		expect(result).not.toContain('END');
	});
});

describe('generateClaudeUrl', () => {
	it('generates URL with content only', () => {
		const result = generateClaudeUrl('Test content');

		expect(result).toContain('https://claude.ai/new');
		expect(result).toContain('q=');
		expect(result).toContain(encodeURIComponent('Test content'));
	});

	it('includes prompt before content with separator', () => {
		const result = generateClaudeUrl('Content here', 'Analyze this:');
		const decoded = decodeURIComponent(result.split('q=')[1]);

		expect(decoded).toContain('Analyze this:');
		expect(decoded).toContain('---');
		expect(decoded).toContain('Content here');
	});

	it('puts prompt before separator', () => {
		const result = generateClaudeUrl('Content', 'Prompt');
		const decoded = decodeURIComponent(result.split('q=')[1]);

		const promptIndex = decoded.indexOf('Prompt');
		const separatorIndex = decoded.indexOf('---');
		const contentIndex = decoded.indexOf('Content');

		expect(promptIndex).toBeLessThan(separatorIndex);
		expect(separatorIndex).toBeLessThan(contentIndex);
	});

	it('URL-encodes special characters', () => {
		const result = generateClaudeUrl('Content with spaces & symbols!');

		expect(result).toContain(encodeURIComponent('Content with spaces & symbols!'));
		expect(result).not.toContain(' '); // Spaces should be encoded
	});

	it('truncates long content to fit URL limits', () => {
		const longContent = 'a'.repeat(10000);
		const result = generateClaudeUrl(longContent);

		// URL should still be valid (truncated)
		expect(result).toContain('https://claude.ai/new?q=');
		expect(decodeURIComponent(result.split('q=')[1])).toContain('[Content truncated');
	});

	it('handles empty content', () => {
		const result = generateClaudeUrl('');

		expect(result).toBe('https://claude.ai/new?q=');
	});

	it('handles content with newlines', () => {
		const content = 'Line 1\nLine 2\nLine 3';
		const result = generateClaudeUrl(content);

		const decoded = decodeURIComponent(result.split('q=')[1]);
		expect(decoded).toBe(content);
	});

	it('combines prompt and content correctly', () => {
		const result = generateClaudeUrl('# Article Title\n\nArticle content...', 'Summarize this article:');

		const decoded = decodeURIComponent(result.split('q=')[1]);
		expect(decoded).toBe('Summarize this article:\n\n---\n\n# Article Title\n\nArticle content...');
	});
});
