<script lang="ts">
	/**
	 * PageActions Component
	 *
	 * Provides actions for exporting page content as markdown.
	 * Actions: Copy to clipboard, Preview markdown, Send to Claude.ai
	 *
	 * Canon: Tools recede into use. The export happens; the infrastructure disappears.
	 */

	import { copyToClipboard } from '../utils/clipboard.js';
	import { formatPageMarkdown, generateClaudeUrl } from '../utils/markdown.js';
	import type { PageMetadata } from '../utils/markdown.js';

	interface Props {
		/** Page title */
		title: string;
		/** Markdown content */
		content: string;
		/** Optional metadata for markdown export */
		metadata?: PageMetadata;
		/** Optional prompt/context for Claude.ai */
		claudePrompt?: string;
		/** Callback when preview is requested */
		onpreview?: (markdown: string) => void;
	}

	let { title, content, metadata, claudePrompt, onpreview }: Props = $props();

	let open = $state(false);
	let copyFeedback = $state(false);
	let wrapperRef: HTMLDivElement;

	const formattedMarkdown = $derived(formatPageMarkdown(title, content, metadata));

	async function handleCopy() {
		const success = await copyToClipboard(formattedMarkdown);
		if (success) {
			copyFeedback = true;
			setTimeout(() => {
				copyFeedback = false;
			}, 2000);
		}
		close();
	}

	function handlePreview() {
		onpreview?.(formattedMarkdown);
		close();
	}

	function handleClaude() {
		const url = generateClaudeUrl(formattedMarkdown, claudePrompt);
		window.open(url, '_blank', 'noopener,noreferrer');
		close();
	}

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (open && wrapperRef && !wrapperRef.contains(event.target as Node)) {
			close();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('click', handleClickOutside, true);
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	});
</script>

<div class="page-actions" bind:this={wrapperRef}>
	<button
		type="button"
		class="trigger"
		class:active={open}
		aria-label="Page actions"
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={toggle}
	>
		<!-- More icon (three dots) -->
		<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
			<circle cx="12" cy="5" r="1" fill="currentColor" />
			<circle cx="12" cy="12" r="1" fill="currentColor" />
			<circle cx="12" cy="19" r="1" fill="currentColor" />
		</svg>
	</button>

	{#if open}
		<div class="menu" role="menu">
			<button type="button" class="menu-item" role="menuitem" onclick={handleCopy}>
				<svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
				<span>{copyFeedback ? 'Copied!' : 'Copy as Markdown'}</span>
			</button>

			<button type="button" class="menu-item" role="menuitem" onclick={handlePreview}>
				<svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				<span>Preview Markdown</span>
			</button>

			<div class="divider" role="separator"></div>

			<button type="button" class="menu-item" role="menuitem" onclick={handleClaude}>
				<svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
				<span>Chat in Claude.ai</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.page-actions {
		position: relative;
		display: inline-flex;
	}

	.trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.trigger:hover,
	.trigger.active {
		background: var(--color-performance-hover);
		color: var(--color-performance-fg-primary);
		border-color: var(--color-performance-border-emphasis);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.icon {
		width: 16px;
		height: 16px;
	}

	.menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: var(--z-performance-dropdown, 20);
		min-width: 200px;
		padding: var(--space-performance-xs);
		border-radius: var(--radius-performance-scale-lg);
		box-shadow: var(--shadow-performance-scale-lg);
		animation: menuIn var(--duration-performance-micro) var(--ease-performance-standard);
	}

	@keyframes menuIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: none;
		border: none;
		border-radius: var(--radius-performance-scale-md);
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-body-sm);
		text-align: left;
		cursor: pointer;
		transition: background var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.menu-item:hover {
		background: var(--color-performance-hover);
	}

	.menu-item:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: -2px;
	}

	.menu-icon {
		width: 16px;
		height: 16px;
		color: var(--color-performance-fg-muted);
		flex-shrink: 0;
	}

	.divider {
		height: 1px;
		margin: var(--space-performance-xs) 0;
		background: var(--color-performance-border-default);
	}

	@media (prefers-reduced-motion: reduce) {
		.menu {
			animation: none;
		}
	}
</style>
