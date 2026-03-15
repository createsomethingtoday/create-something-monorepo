<script lang="ts">
	// Developer Embed Section
	// 4 lines of code to embed CLEARWAY anywhere
</script>

<section class="developer">
	<div class="container">
		<h2 class="section-title">Embed Anywhere</h2>
		<p class="section-subtitle">
			Add court booking to any website in 4 lines of code.
		</p>

		<div class="code-block">
			<div class="code-header">
				<span class="code-lang">HTML</span>
				<button class="code-copy" type="button">Copy</button>
			</div>
			<pre><code>&lt;script src="https://clearway.createsomething.space/embed.js"&gt;&lt;/script&gt;
&lt;script&gt;
  Clearway.init(&#123; facility: 'your-facility-id' &#125;);
&lt;/script&gt;</code></pre>
		</div>

		<div class="developer-cta">
			<a href="/docs" class="btn-outline">Read the Docs</a>
			<a href="/developers" class="btn-outline">Developer Program</a>
		</div>
	</div>
</section>

<style>
	.developer {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
	}

	.code-block {
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		overflow: hidden;
		margin-bottom: var(--space-xl);
	}

	.code-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.code-lang {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.code-copy {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.code-copy:hover {
		background: var(--color-hover);
	}

	pre {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
	}

	.developer-cta {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-outline {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-lg);
		font-size: var(--text-body);
		font-weight: 500;
		text-decoration: none;
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-outline:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}
</style>
