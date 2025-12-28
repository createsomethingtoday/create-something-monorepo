/**
 * LinkedIn Thread Parser
 *
 * Parses markdown thread files into structured posts.
 * Supports drip, longform, and immediate posting modes.
 *
 * Format expected:
 * # LinkedIn Thread: Title
 * **Campaign:** GTM Sprint 1
 * ---
 * ### Tweet 1 (Hook)
 * Content...
 * ---
 * ### Tweet 2 (Label)
 * Content...
 */

export interface ParsedPost {
	content: string;
	label: string;
	index: number;
	total: number;
	hashtags: string[];
	hasLink: boolean;
	linkForComment?: string;
}

export interface ThreadMetadata {
	title: string;
	campaign?: string;
	target?: string;
	type?: string;
	cta?: string;
	hashtags: string[];
}

export interface ParsedThread {
	metadata: ThreadMetadata;
	posts: ParsedPost[];
}

/**
 * Parse a LinkedIn thread markdown file
 */
export function parseThread(markdown: string): ParsedThread {
	const lines = markdown.split('\n');
	const metadata: ThreadMetadata = {
		title: '',
		hashtags: []
	};

	const posts: ParsedPost[] = [];
	let currentPost: { label: string; lines: string[] } | null = null;
	let inThread = false;
	let inHashtags = false;

	for (const line of lines) {
		// Parse title
		if (line.startsWith('# LinkedIn Thread:')) {
			metadata.title = line.replace('# LinkedIn Thread:', '').trim();
			continue;
		}
		if (line.startsWith('# ') && !metadata.title) {
			metadata.title = line.replace('# ', '').trim();
			continue;
		}

		// Parse metadata fields
		if (line.startsWith('**Campaign:**')) {
			metadata.campaign = line.replace('**Campaign:**', '').trim();
			continue;
		}
		if (line.startsWith('**Target:**')) {
			metadata.target = line.replace('**Target:**', '').trim();
			continue;
		}
		if (line.startsWith('**Type:**')) {
			metadata.type = line.replace('**Type:**', '').trim();
			continue;
		}
		if (line.startsWith('**CTA:**')) {
			metadata.cta = line.replace('**CTA:**', '').trim();
			continue;
		}

		// Detect thread section start
		if (line.trim() === '## Thread') {
			inThread = true;
			continue;
		}

		// Detect hashtags section
		if (line.includes('Suggested hashtags')) {
			inHashtags = true;
			continue;
		}
		if (inHashtags && line.startsWith('- #')) {
			metadata.hashtags.push(line.replace('- ', '').trim());
			continue;
		}
		if (inHashtags && line.startsWith('---')) {
			inHashtags = false;
			continue;
		}

		// Stop at sections after Thread
		if (line.startsWith('## ') && line.trim() !== '## Thread') {
			inThread = false;
			// Save any pending post
			if (currentPost) {
				posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
				currentPost = null;
			}
			continue;
		}

		// Parse individual posts (### Tweet N (Label))
		const tweetMatch = line.match(/^### (?:Tweet|Post) (\d+)(?: \(([^)]+)\))?/);
		if (tweetMatch) {
			// Save previous post
			if (currentPost) {
				posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
			}
			currentPost = {
				label: tweetMatch[2] || `Part ${tweetMatch[1]}`,
				lines: []
			};
			continue;
		}

		// Accumulate content for current post
		if (currentPost && line.trim() !== '---') {
			currentPost.lines.push(line);
		}
	}

	// Save final post
	if (currentPost) {
		posts.push(buildPost(currentPost, posts.length, 0, metadata.hashtags));
	}

	// Update total count
	const total = posts.length;
	posts.forEach((post, i) => {
		post.total = total;
	});

	return { metadata, posts };
}

function buildPost(
	raw: { label: string; lines: string[] },
	index: number,
	total: number,
	hashtags: string[]
): ParsedPost {
	const content = raw.lines
		.join('\n')
		.trim()
		// Remove markdown bold
		.replace(/\*\*([^*]+)\*\*/g, '$1');

	// Detect links
	const urlMatch = content.match(/https?:\/\/[^\s]+/);
	const hasLink = !!urlMatch;

	return {
		content,
		label: raw.label,
		index: index + 1,
		total,
		hashtags: index === 0 ? [] : hashtags, // Hashtags only on last post per best practices
		hasLink,
		linkForComment: hasLink ? urlMatch![0] : undefined
	};
}

/**
 * Format a post for LinkedIn with thread numbering
 */
export function formatPostForLinkedIn(
	post: ParsedPost,
	options: {
		includeNumbering?: boolean;
		includeHashtags?: boolean;
		extractLinkToComment?: boolean;
	} = {}
): { postContent: string; commentContent?: string } {
	const { includeNumbering = true, includeHashtags = false, extractLinkToComment = true } = options;

	let postContent = post.content;

	// Add numbering prefix for thread posts
	if (includeNumbering && post.total > 1) {
		postContent = `${post.index}/${post.total}: ${postContent}`;
	}

	// Extract link for comment if present
	let commentContent: string | undefined;
	if (extractLinkToComment && post.linkForComment) {
		// Remove URL from post content
		postContent = postContent.replace(post.linkForComment, '').trim();
		// Clean up any trailing text like "Visit:" or "Link:"
		postContent = postContent.replace(/(?:Visit|Link|See|Check out)[:\s]*$/i, '').trim();
		commentContent = post.linkForComment;
	}

	// Add hashtags to last post only
	if (includeHashtags && post.index === post.total && post.hashtags.length > 0) {
		postContent = `${postContent}\n\n${post.hashtags.slice(0, 5).join(' ')}`;
	}

	return { postContent, commentContent };
}

/**
 * Consolidate all posts into a single long-form post
 */
export function consolidateToLongForm(thread: ParsedThread): ParsedPost {
	const sections = thread.posts.map((post, i) => {
		// Use the label as a section header
		return `**${post.label}**\n\n${post.content}`;
	});

	const content = sections.join('\n\n---\n\n');

	// Collect all links for a single comment
	const allLinks = thread.posts.filter((p) => p.linkForComment).map((p) => p.linkForComment!);

	return {
		content,
		label: 'Long-form',
		index: 1,
		total: 1,
		hashtags: thread.metadata.hashtags,
		hasLink: allLinks.length > 0,
		linkForComment: allLinks.length > 0 ? allLinks.join('\n') : undefined
	};
}

/**
 * Get character count for a post (LinkedIn max is 3000)
 */
export function getCharacterCount(post: ParsedPost): {
	count: number;
	withinLimit: boolean;
	warning?: string;
} {
	const count = post.content.length;
	const withinLimit = count <= 3000;
	const warning =
		count > 2800 ? `Post is ${count} chars (limit 3000, ${3000 - count} remaining)` : undefined;

	return { count, withinLimit, warning };
}
