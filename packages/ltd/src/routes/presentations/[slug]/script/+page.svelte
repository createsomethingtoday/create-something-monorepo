<script lang="ts">
	/**
	 * Script Viewer
	 *
	 * Displays the SCRIPT.md narration for a presentation.
	 * Optimized for copying to Descript or teleprompter.
	 *
	 * Voice: CREATE SOMETHING
	 * - Clarity over cleverness
	 * - Specificity over generality
	 */
	import { SEO } from '@create-something/canon';

	let { data } = $props();

	// Parse markdown into sections for better display
	function parseScript(markdown: string) {
		const lines = markdown.split('\n');
		const sections: Array<{ type: 'heading' | 'content' | 'markup'; content: string }> = [];

		for (const line of lines) {
			if (line.startsWith('## ')) {
				sections.push({ type: 'heading', content: line.replace('## ', '') });
			} else if (line.startsWith('# ')) {
				// Skip H1 title
			} else if (line.startsWith('---')) {
				// Skip horizontal rules
			} else if (line.match(/^\[.*\]$/)) {
				// Markup like [PAUSE], [BREATHE]
				sections.push({ type: 'markup', content: line });
			} else if (line.match(/^\{.*\}$/)) {
				// Stage directions like {slide transition}
				sections.push({ type: 'markup', content: line });
			} else if (line.trim()) {
				sections.push({ type: 'content', content: line });
			}
		}

		return sections;
	}

	const sections = $derived(parseScript(data.script));

	// Copy script to clipboard (plain text, stripped of markup)
	async function copyPlainText() {
		const plainText = data.script
			.replace(/\[PAUSE.*?\]/g, '...')
			.replace(/\[BEAT\]/g, '...')
			.replace(/\[BREATHE\]/g, '')
			.replace(/\[SLOW\]|\[\/SLOW\]/g, '')
			.replace(/\[QUOTE\]|\[\/QUOTE\]/g, '')
			.replace(/\{.*?\}/g, '')
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/↗|↘/g, '')
			.replace(/—/g, ' - ')
			.replace(/\n{3,}/g, '\n\n')
			.trim();

		await navigator.clipboard.writeText(plainText);
		copyStatus = 'Copied!';
		setTimeout(() => (copyStatus = ''), 2000);
	}

	// Copy raw markdown
	async function copyMarkdown() {
		await navigator.clipboard.writeText(data.script);
		copyStatus = 'Copied!';
		setTimeout(() => (copyStatus = ''), 2000);
	}

	let copyStatus = $state('');
</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
		{ name: data.meta.presentationTitle, url: `https://createsomething.ltd/presentations/${data.slug}` },
		{ name: 'Script', url: `https://createsomething.ltd/presentations/${data.slug}/script` }
	]}
/>

<div class="script-viewer">
	<header class="header">
		<div class="header-content">
			<a href="/presentations/{data.slug}" class="back-link">← Back to Presentation</a>
			<h1>{data.meta.presentationTitle}</h1>
			<p class="subtitle">{data.meta.presentationSubtitle}</p>
		</div>
		<div class="actions">
			<button class="btn" onclick={copyPlainText}>Copy Plain Text</button>
			<button class="btn btn-secondary" onclick={copyMarkdown}>Copy Markdown</button>
			{#if copyStatus}
				<span class="copy-status">{copyStatus}</span>
			{/if}
		</div>
	</header>

	<main class="script-content">
		<div class="script-raw">
			<pre>{data.script}</pre>
		</div>
	</main>

	<footer class="footer">
		<p>
			<a href="/presentations">All Presentations</a> ·
			<a href="/presentations/{data.slug}">View Slides</a>
		</p>
	</footer>
</div>

<style>
	.script-viewer {
		min-height: 100vh;
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
		padding: var(--space-lg);
	}

	.header {
		max-width: 80ch;
		margin: 0 auto var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
		padding-bottom: var(--space-lg);
	}

	.header-content {
		margin-bottom: var(--space-md);
	}

	.back-link {
		color: var(--color-fg-muted);
		text-decoration: none;
		font-size: var(--text-body-sm);
		display: inline-block;
		margin-bottom: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	h1 {
		font-size: var(--text-h1);
		font-weight: 700;
		letter-spacing: 0.02em;
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		margin: 0;
	}

	.actions {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		flex-wrap: wrap;
	}

	.btn {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.btn:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.copy-status {
		color: var(--color-success);
		font-size: var(--text-body-sm);
	}

	.script-content {
		max-width: 80ch;
		margin: 0 auto;
	}

	.script-raw {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-lg);
		overflow-x: auto;
	}

	.script-raw pre {
		margin: 0;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: var(--text-body-sm);
		line-height: 1.7;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.footer {
		max-width: 80ch;
		margin: var(--space-xl) auto 0;
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.footer a {
		color: var(--color-fg-muted);
		text-decoration: none;
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer a:hover {
		color: var(--color-fg-primary);
	}

	@media print {
		.header,
		.actions,
		.footer,
		.back-link {
			display: none;
		}

		.script-viewer {
			padding: 0;
		}

		.script-raw {
			border: none;
			padding: 0;
			background: white;
		}

		.script-raw pre {
			font-size: 12pt;
			color: black;
		}
	}
</style>
