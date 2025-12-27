<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	const customThemeExample = `/* Custom theme extending Canon tokens */
:root {
  /* Override core tokens */
  --color-bg-pure: #0f0f23;
  --color-bg-elevated: #1a1a35;
  --color-bg-surface: #252547;
  --color-bg-subtle: #2f2f5a;

  /* Add brand accent */
  --color-accent: #7c3aed;
  --color-accent-muted: rgba(124, 58, 237, 0.2);
  --color-accent-border: rgba(124, 58, 237, 0.3);
}`;

	const darkLightExample = `/* Light theme overrides */
[data-theme="light"] {
  --color-bg-pure: #ffffff;
  --color-bg-elevated: #f5f5f5;
  --color-bg-surface: #ebebeb;
  --color-bg-subtle: #e0e0e0;

  --color-fg-primary: #000000;
  --color-fg-secondary: rgba(0, 0, 0, 0.8);
  --color-fg-tertiary: rgba(0, 0, 0, 0.6);
  --color-fg-muted: rgba(0, 0, 0, 0.46);
  --color-fg-subtle: rgba(0, 0, 0, 0.2);

  --color-border-default: rgba(0, 0, 0, 0.1);
  --color-border-emphasis: rgba(0, 0, 0, 0.2);
  --color-border-strong: rgba(0, 0, 0, 0.3);
}`;

	const systemPreferenceExample = `/* Respect system preference */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-bg-pure: #ffffff;
    --color-fg-primary: #000000;
    /* ... other light tokens */
  }
}

/* JavaScript toggle */
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme =
    current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark');
}`;

	const spacingScaleExample = `/* Custom spacing scale (default uses golden ratio) */
:root {
  /* Linear scale alternative */
  --space-xs: 0.25rem;  /* 4px */
  --space-sm: 0.5rem;   /* 8px */
  --space-md: 1rem;     /* 16px */
  --space-lg: 1.5rem;   /* 24px */
  --space-xl: 2rem;     /* 32px */
  --space-2xl: 3rem;    /* 48px */
}

/* Or use a different ratio */
:root {
  /* 1.5 ratio scale */
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1.125rem;
  --space-lg: 1.688rem;
  --space-xl: 2.531rem;
  --space-2xl: 3.797rem;
}`;

	const typographyScaleExample = `/* Custom typography scale */
:root {
  /* Tighter scale for dense UIs */
  --text-display: clamp(2rem, 3vw + 1rem, 3rem);
  --text-h1: clamp(1.5rem, 2vw + 0.75rem, 2rem);
  --text-h2: clamp(1.25rem, 1.5vw + 0.5rem, 1.5rem);
  --text-h3: clamp(1.125rem, 1vw + 0.5rem, 1.25rem);

  /* Different font family */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}`;

	const themeTokens = [
		{ category: 'Backgrounds', tokens: ['--color-bg-pure', '--color-bg-elevated', '--color-bg-surface', '--color-bg-subtle'] },
		{ category: 'Foregrounds', tokens: ['--color-fg-primary', '--color-fg-secondary', '--color-fg-tertiary', '--color-fg-muted'] },
		{ category: 'Borders', tokens: ['--color-border-default', '--color-border-emphasis', '--color-border-strong'] },
		{ category: 'Interactive', tokens: ['--color-hover', '--color-active', '--color-focus'] },
		{ category: 'Semantic', tokens: ['--color-success', '--color-error', '--color-warning', '--color-info'] }
	];
</script>

<svelte:head>
	<title>Theming — Canon Design System</title>
	<meta name="description" content="Create custom themes by extending Canon's design tokens. Dark mode, light mode, and brand customization patterns." />
</svelte:head>

<header class="page-header">
	<p class="eyebrow">Guidelines</p>
	<h1>Theming</h1>
	<p class="lead">
		Canon's token architecture enables systematic theming. Override tokens
		at the root level to create consistent custom themes.
	</p>
</header>

<section class="section">
	<h2>Philosophy</h2>
	<p>
		Themes should extend, not replace. Canon provides a complete token system
		that establishes relationships between colors, spacing, and typography.
		Custom themes override specific tokens while maintaining these relationships.
	</p>
	<blockquote class="philosophy-quote">
		"A system is not the sum of its parts but the product of their interactions."
		<cite>— Russell Ackoff</cite>
	</blockquote>
</section>

<section class="section">
	<h2>Token Categories</h2>
	<p class="section-description">
		These tokens form the theming surface. Override them to create custom themes.
	</p>

	<div class="token-categories">
		{#each themeTokens as category}
			<div class="category-card">
				<h3>{category.category}</h3>
				<ul class="token-list">
					{#each category.tokens as token}
						<li><code>{token}</code></li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

<section class="section">
	<h2>Custom Theme</h2>
	<p class="section-description">
		Create a custom theme by overriding Canon's color tokens at the root level.
	</p>

	<CodeBlock code={customThemeExample} language="css" title="custom-theme.css" />

	<div class="theme-demo custom">
		<div class="demo-surface">
			<h3>Custom Theme Preview</h3>
			<p>This demonstrates overriding core tokens with brand colors.</p>
			<button class="demo-button accent">Brand Action</button>
		</div>
	</div>
</section>

<section class="section">
	<h2>Dark & Light Modes</h2>
	<p class="section-description">
		Canon defaults to dark mode. Add light mode with a theme attribute.
	</p>

	<CodeBlock code={darkLightExample} language="css" title="light-theme.css" />

	<div class="theme-comparison">
		<div class="theme-demo dark">
			<div class="demo-surface">
				<span class="theme-label">Dark (default)</span>
				<p>Primary content</p>
				<p class="secondary">Secondary content</p>
			</div>
		</div>
		<div class="theme-demo light">
			<div class="demo-surface">
				<span class="theme-label">Light</span>
				<p>Primary content</p>
				<p class="secondary">Secondary content</p>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<h2>System Preference</h2>
	<p class="section-description">
		Respect user system preferences while allowing manual override.
	</p>

	<CodeBlock code={systemPreferenceExample} language="css" title="system-preference.css" />

	<div class="note">
		<strong>Implementation order:</strong>
		<ol>
			<li>Check localStorage for saved preference</li>
			<li>Fall back to system preference</li>
			<li>Default to dark mode if no preference</li>
		</ol>
	</div>
</section>

<section class="section">
	<h2>Spacing Scale</h2>
	<p class="section-description">
		Canon uses the golden ratio (1.618) for spacing. Override for different rhythms.
	</p>

	<CodeBlock code={spacingScaleExample} language="css" title="spacing-scale.css" />

	<div class="scale-comparison">
		<div class="scale-demo golden">
			<span class="scale-label">Golden Ratio (default)</span>
			<div class="scale-bars">
				<div class="bar xs"></div>
				<div class="bar sm"></div>
				<div class="bar md"></div>
				<div class="bar lg"></div>
			</div>
		</div>
		<div class="scale-demo linear">
			<span class="scale-label">Linear 8px</span>
			<div class="scale-bars">
				<div class="bar xs"></div>
				<div class="bar sm"></div>
				<div class="bar md"></div>
				<div class="bar lg"></div>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<h2>Typography Scale</h2>
	<p class="section-description">
		Adjust the type scale for different content densities or brand requirements.
	</p>

	<CodeBlock code={typographyScaleExample} language="css" title="typography-scale.css" />

	<div class="typography-demo">
		<div class="type-sample default">
			<span class="type-label">Default Scale</span>
			<h2 class="sample-heading">Heading</h2>
			<p class="sample-body">Body text sample</p>
		</div>
		<div class="type-sample compact">
			<span class="type-label">Compact Scale</span>
			<h2 class="sample-heading">Heading</h2>
			<p class="sample-body">Body text sample</p>
		</div>
	</div>
</section>

<section class="section">
	<h2>Best Practices</h2>

	<div class="practices-grid">
		<div class="practice-card do">
			<h3>Do</h3>
			<ul>
				<li>Override tokens at :root or [data-theme]</li>
				<li>Maintain WCAG contrast ratios</li>
				<li>Test both dark and light themes</li>
				<li>Use semantic token names</li>
				<li>Persist user preference</li>
				<li>Provide theme toggle UI</li>
			</ul>
		</div>

		<div class="practice-card dont">
			<h3>Don't</h3>
			<ul>
				<li>Override tokens inline on components</li>
				<li>Create new token naming schemes</li>
				<li>Mix hardcoded values with tokens</li>
				<li>Forget focus states in new themes</li>
				<li>Ignore system preference</li>
				<li>Change semantics (success should stay green)</li>
			</ul>
		</div>
	</div>
</section>

<section class="section">
	<h2>Theme Checklist</h2>
	<p class="section-description">
		Verify your custom theme maintains Canon's quality standards.
	</p>

	<ul class="checklist">
		<li>Primary text has 4.5:1 contrast ratio (WCAG AA)</li>
		<li>Focus indicators are visible in all states</li>
		<li>Semantic colors maintain their meaning</li>
		<li>Interactive states are distinguishable</li>
		<li>Theme persists across page loads</li>
		<li>System preference is respected on first visit</li>
		<li>Theme toggle is keyboard accessible</li>
		<li>Reduced motion preferences still work</li>
	</ul>
</section>

<style>
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 65ch;
	}

	.section {
		margin-bottom: var(--space-2xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		max-width: 65ch;
	}

	.philosophy-quote {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-secondary);
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
	}

	.philosophy-quote cite {
		display: block;
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Token categories */
	.token-categories {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.token-categories {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.token-categories {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.category-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.category-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-sm);
	}

	.token-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.token-list li {
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.token-list li:last-child {
		border-bottom: none;
	}

	.token-list code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	/* Theme demos */
	.theme-demo {
		margin-top: var(--space-lg);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.theme-demo.custom .demo-surface {
		--color-bg-surface: #252547;
		--color-accent: #7c3aed;
		background: #252547;
	}

	.theme-demo.dark .demo-surface {
		background: var(--color-bg-surface);
	}

	.theme-demo.light .demo-surface {
		--color-fg-primary: #000000;
		--color-fg-secondary: rgba(0, 0, 0, 0.6);
		--color-border-default: rgba(0, 0, 0, 0.1);
		background: #f5f5f5;
	}

	.demo-surface {
		padding: var(--space-lg);
	}

	.demo-surface h3 {
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.demo-surface p {
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.demo-surface .secondary {
		color: var(--color-fg-tertiary);
	}

	.demo-button {
		margin-top: var(--space-md);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		cursor: pointer;
	}

	.demo-button.accent {
		background: var(--color-accent, #7c3aed);
		border: none;
		color: white;
	}

	.theme-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		display: block;
	}

	/* Theme comparison */
	.theme-comparison {
		display: grid;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	@media (min-width: 640px) {
		.theme-comparison {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Scale comparison */
	.scale-comparison {
		display: grid;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	@media (min-width: 640px) {
		.scale-comparison {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.scale-demo {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.scale-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		display: block;
	}

	.scale-bars {
		display: flex;
		gap: var(--space-xs);
		align-items: flex-end;
	}

	.bar {
		background: var(--color-border-emphasis);
		border-radius: var(--radius-sm);
	}

	.scale-demo.golden .bar.xs { width: 8px; height: 8px; }
	.scale-demo.golden .bar.sm { width: 16px; height: 16px; }
	.scale-demo.golden .bar.md { width: 26px; height: 26px; }
	.scale-demo.golden .bar.lg { width: 42px; height: 42px; }

	.scale-demo.linear .bar.xs { width: 4px; height: 4px; }
	.scale-demo.linear .bar.sm { width: 8px; height: 8px; }
	.scale-demo.linear .bar.md { width: 16px; height: 16px; }
	.scale-demo.linear .bar.lg { width: 24px; height: 24px; }

	/* Typography demo */
	.typography-demo {
		display: grid;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	@media (min-width: 640px) {
		.typography-demo {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.type-sample {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.type-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		display: block;
	}

	.type-sample .sample-heading {
		margin-bottom: var(--space-xs);
	}

	.type-sample.default .sample-heading {
		font-size: var(--text-h2);
	}

	.type-sample.compact .sample-heading {
		font-size: 1.25rem;
	}

	.type-sample .sample-body {
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.type-sample.compact .sample-body {
		font-size: 0.875rem;
	}

	/* Note */
	.note {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.note ol {
		margin: var(--space-sm) 0 0 0;
		padding-left: var(--space-md);
	}

	.note li {
		margin-bottom: var(--space-xs);
	}

	/* Practices grid */
	.practices-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.practices-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.practice-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.practice-card.do {
		border-left: 3px solid var(--color-success);
	}

	.practice-card.dont {
		border-left: 3px solid var(--color-error);
	}

	.practice-card.do h3 {
		color: var(--color-success);
	}

	.practice-card.dont h3 {
		color: var(--color-error);
	}

	.practice-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-sm);
	}

	.practice-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.practice-card li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.practice-card li:last-child {
		border-bottom: none;
	}

	/* Checklist */
	.checklist {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.checklist li {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.checklist li:last-child {
		border-bottom: none;
	}

	.checklist li::before {
		content: '';
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}
</style>
