<script lang="ts">
	import CopyButton from './CopyButton.svelte';

	interface Props {
		/** The code to display */
		code: string;
		/** Language for syntax highlighting */
		language?: 'css' | 'typescript' | 'svelte' | 'html' | 'json' | 'bash';
		/** Whether to show line numbers */
		showLineNumbers?: boolean;
		/** Optional title/filename */
		title?: string;
		/** Whether to show copy button */
		showCopy?: boolean;
	}

	let {
		code,
		language = 'css',
		showLineNumbers = false,
		title,
		showCopy = true
	}: Props = $props();

	// Simple syntax highlighting using regex
	// For production, consider using Shiki or Prism
	function highlightCode(code: string, lang: string): string {
		let highlighted = escapeHtml(code);

		if (lang === 'css') {
			// CSS properties
			highlighted = highlighted.replace(
				/(--[\w-]+)/g,
				'<span class="token property">$1</span>'
			);
			// CSS values
			highlighted = highlighted.replace(
				/:\s*([^;{]+)/g,
				': <span class="token value">$1</span>'
			);
			// Comments
			highlighted = highlighted.replace(
				/(\/\*[\s\S]*?\*\/)/g,
				'<span class="token comment">$1</span>'
			);
		} else if (lang === 'typescript' || lang === 'javascript') {
			// Keywords
			highlighted = highlighted.replace(
				/\b(const|let|var|function|return|if|else|for|while|import|export|from|type|interface|class|extends|implements)\b/g,
				'<span class="token keyword">$1</span>'
			);
			// Strings
			highlighted = highlighted.replace(
				/('.*?'|".*?")/g,
				'<span class="token string">$1</span>'
			);
			// Comments
			highlighted = highlighted.replace(
				/(\/\/.*$)/gm,
				'<span class="token comment">$1</span>'
			);
		} else if (lang === 'svelte' || lang === 'html') {
			// Tags
			highlighted = highlighted.replace(
				/(&lt;\/?[\w-]+)/g,
				'<span class="token tag">$1</span>'
			);
			// Attributes
			highlighted = highlighted.replace(
				/\s([\w-]+)=/g,
				' <span class="token attr-name">$1</span>='
			);
			// Strings
			highlighted = highlighted.replace(
				/(".*?")/g,
				'<span class="token string">$1</span>'
			);
		} else if (lang === 'bash') {
			// Commands
			highlighted = highlighted.replace(
				/^(\w+)/gm,
				'<span class="token command">$1</span>'
			);
			// Flags
			highlighted = highlighted.replace(
				/(\s--?[\w-]+)/g,
				'<span class="token flag">$1</span>'
			);
		}

		return highlighted;
	}

	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	const lines = $derived(code.trim().split('\n'));
	const highlightedCode = $derived(highlightCode(code.trim(), language));
</script>

<div class="code-block">
	{#if title || showCopy}
		<div class="code-header">
			{#if title}
				<span class="code-title">{title}</span>
			{/if}
			<div class="code-actions">
				{#if showCopy}
					<CopyButton text={code} label="Copy code" size="sm" />
				{/if}
			</div>
		</div>
	{/if}

	<div class="code-content">
		{#if showLineNumbers}
			<div class="line-numbers" aria-hidden="true">
				{#each lines as _, i}
					<span class="line-number">{i + 1}</span>
				{/each}
			</div>
		{/if}
		<pre class="code-pre"><code class="code language-{language}">{@html highlightedCode}</code></pre>
	</div>
</div>

<style>
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.code-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.code-title {
		font-size: var(--text-caption);
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
	}

	.code-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.code-content {
		display: flex;
		overflow-x: auto;
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: var(--space-sm);
		padding-right: 0;
		background: var(--color-bg-subtle);
		border-right: 1px solid var(--color-border-default);
		user-select: none;
	}

	.line-number {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		color: var(--color-fg-muted);
		text-align: right;
		min-width: 2ch;
	}

	.code-pre {
		margin: 0;
		padding: var(--space-sm);
		overflow-x: auto;
		flex: 1;
	}

	.code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		color: var(--color-fg-primary);
		white-space: pre;
	}

	/* Syntax highlighting tokens - using Canon data colors */
	:global(.code-block .token.property) {
		color: var(--color-data-1);
	}

	:global(.code-block .token.value) {
		color: var(--color-data-3);
	}

	:global(.code-block .token.comment) {
		color: var(--color-fg-muted);
		font-style: italic;
	}

	:global(.code-block .token.keyword) {
		color: var(--color-data-3);
	}

	:global(.code-block .token.string) {
		color: var(--color-data-2);
	}

	:global(.code-block .token.tag) {
		color: var(--color-data-5);
	}

	:global(.code-block .token.attr-name) {
		color: var(--color-data-1);
	}

	:global(.code-block .token.command) {
		color: var(--color-data-2);
	}

	:global(.code-block .token.flag) {
		color: var(--color-data-4);
	}
</style>
