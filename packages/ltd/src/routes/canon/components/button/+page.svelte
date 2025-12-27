<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Button</h1>
	<p class="page-description">
		Primary actions, secondary options, and ghost variations. All button states follow Canon motion
		tokens for smooth, purposeful transitions.
	</p>
</header>

<!-- Variants Section -->
<section class="section">
	<h2 class="section-title">Variants</h2>
	<p class="section-description">
		Buttons come in three variants: primary for main actions, secondary for alternatives, and ghost
		for subtle interactions.
	</p>

	<!-- Primary Button -->
	<div class="example-group">
		<h3 class="example-title">Primary</h3>
		<p class="example-description">
			Use for primary actions. High contrast with background fill.
		</p>

		<div class="preview">
			<button class="btn btn-primary">Primary Button</button>
			<button class="btn btn-primary" disabled>Disabled</button>
		</div>

		<CodeBlock
			code={`<button class="btn btn-primary">
  Primary Button
</button>

<style>
  .btn-primary {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
  }

  .btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .btn-primary:active {
    transform: translateY(0);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<!-- Secondary Button -->
	<div class="example-group">
		<h3 class="example-title">Secondary</h3>
		<p class="example-description">Use for secondary actions. Outlined with transparent fill.</p>

		<div class="preview">
			<button class="btn btn-secondary">Secondary Button</button>
			<button class="btn btn-secondary" disabled>Disabled</button>
		</div>

		<CodeBlock
			code={`<button class="btn btn-secondary">
  Secondary Button
</button>

<style>
  .btn-secondary {
    background: transparent;
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
  }

  .btn-secondary:hover {
    background: var(--color-hover);
    border-color: var(--color-border-emphasis);
  }

  .btn-secondary:active {
    background: var(--color-active);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<!-- Ghost Button -->
	<div class="example-group">
		<h3 class="example-title">Ghost</h3>
		<p class="example-description">
			Use for tertiary actions. No border, minimal visual weight.
		</p>

		<div class="preview">
			<button class="btn btn-ghost">Ghost Button</button>
			<button class="btn btn-ghost" disabled>Disabled</button>
		</div>

		<CodeBlock
			code={`<button class="btn btn-ghost">
  Ghost Button
</button>

<style>
  .btn-ghost {
    background: transparent;
    color: var(--color-fg-secondary);
    border: none;
  }

  .btn-ghost:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .btn-ghost:active {
    background: var(--color-active);
  }
</style>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Motion Section -->
<section class="section">
	<h2 class="section-title">Motion Tokens</h2>
	<p class="section-description">
		All button interactions use Canon motion tokens for consistent, purposeful animation.
	</p>

	<div class="motion-demo">
		<div class="motion-item">
			<h4>Hover Transition</h4>
			<code>transition: all var(--duration-micro) var(--ease-standard);</code>
			<p>200ms transition for background, border, and color changes.</p>
		</div>

		<div class="motion-item">
			<h4>Transform on Hover</h4>
			<code>transform: translateY(-1px);</code>
			<p>Subtle lift on primary buttons to indicate interactivity.</p>
		</div>

		<div class="motion-item">
			<h4>Active State</h4>
			<code>transform: translateY(0);</code>
			<p>Return to baseline on click for tactile feedback.</p>
		</div>
	</div>

	<CodeBlock
		title="Complete motion pattern"
		code={`.btn {
  /* Base transition applies to all state changes */
  transition: all var(--duration-micro) var(--ease-standard);
}

.btn:hover {
  /* Lift effect for primary, background change for others */
  transform: translateY(-1px);
}

.btn:active {
  /* Press down effect */
  transform: translateY(0);
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
    transform: none !important;
  }
}`}
		language="css"
	/>
</section>

<!-- Token Reference -->
<section class="section">
	<h2 class="section-title">Token Reference</h2>
	<p class="section-description">All button styles use Canon design tokens.</p>

	<div class="token-table">
		<div class="token-row">
			<code>--duration-micro</code>
			<span>200ms — Hover and focus transitions</span>
		</div>
		<div class="token-row">
			<code>--ease-standard</code>
			<span>cubic-bezier(0.4, 0.0, 0.2, 1) — Material Design easing</span>
		</div>
		<div class="token-row">
			<code>--color-hover</code>
			<span>rgba(255, 255, 255, 0.05) — Hover background overlay</span>
		</div>
		<div class="token-row">
			<code>--color-active</code>
			<span>rgba(255, 255, 255, 0.1) — Active state background</span>
		</div>
		<div class="token-row">
			<code>--color-border-default</code>
			<span>rgba(255, 255, 255, 0.1) — Default border color</span>
		</div>
		<div class="token-row">
			<code>--color-border-emphasis</code>
			<span>rgba(255, 255, 255, 0.2) — Hover border color</span>
		</div>
	</div>
</section>

<style>
	/* Page Header */
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 700px;
		margin: 0;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		line-height: var(--leading-relaxed);
	}

	/* Example Groups */
	.example-group {
		margin-bottom: var(--space-xl);
	}

	.example-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.example-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	/* Preview Area */
	.preview {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-md);
	}

	/* Button Styles */
	.btn {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.btn-secondary:active:not(:disabled) {
		background: var(--color-active);
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-fg-secondary);
		border: none;
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.btn-ghost:active:not(:disabled) {
		background: var(--color-active);
	}

	/* Motion Demo */
	.motion-demo {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.motion-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.motion-item h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.motion-item code {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		padding: var(--space-xs);
		border-radius: var(--radius-sm);
		margin: var(--space-xs) 0;
	}

	.motion-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Token Table */
	.token-table {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.token-row {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-md);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.token-row:last-child {
		border-bottom: none;
	}

	.token-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.token-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.btn {
			transition: none;
			transform: none !important;
		}
	}
</style>
