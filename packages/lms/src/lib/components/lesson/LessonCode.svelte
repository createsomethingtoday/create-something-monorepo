<script lang="ts">
	/**
	 * LessonCode - Syntax-highlighted code block
	 * 
	 * Displays code with syntax highlighting and copy button.
	 */
	import { Check, Copy, FileCode } from 'lucide-svelte';

	let {
		title = '',
		code,
		language = 'bash',
		filename = '',
		class: className = ''
	}: {
		title?: string;
		code: string;
		language?: string;
		filename?: string;
		class?: string;
	} = $props();

	let copied = $state(false);

	async function copyCode() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<section class="lesson-code {className}">
	{#if title}
		<h4 class="code-title">{title}</h4>
	{/if}
	
	<div class="code-container">
		<div class="code-header">
			<div class="code-meta">
				<FileCode size={14} />
				{#if filename}
					<span class="filename">{filename}</span>
				{:else}
					<span class="language">{language}</span>
				{/if}
			</div>
			<button 
				class="copy-btn"
				onclick={copyCode}
				aria-label="Copy code"
			>
				{#if copied}
					<Check size={14} />
					<span>Copied</span>
				{:else}
					<Copy size={14} />
					<span>Copy</span>
				{/if}
			</button>
		</div>
		
		<pre class="code-block"><code class="language-{language}">{code}</code></pre>
	</div>
</section>

<style>
	.lesson-code {
		max-width: 700px;
		margin: var(--space-xl) auto;
	}

	.code-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-sm);
	}

	.code-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.code-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.code-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
		font-size: var(--text-caption);
	}

	.filename {
		color: var(--color-fg-secondary);
	}

	.language {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.copy-btn:hover {
		color: var(--color-fg-primary);
		border-color: var(--color-border-default);
	}

	.code-block {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
	}

	.code-block code {
		color: var(--color-fg-primary);
	}
</style>
