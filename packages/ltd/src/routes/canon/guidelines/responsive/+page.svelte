<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	const breakpointsExample = `/* Canon Breakpoints */
:root {
  --breakpoint-sm: 640px;   /* Small devices */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Desktops */
  --breakpoint-xl: 1280px;  /* Large screens */
  --breakpoint-2xl: 1536px; /* Extra large */
}

/* Mobile-first media queries */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }`;

	const mobileFirstExample = `/* Start with mobile styles */
.card {
  padding: var(--space-sm);
  flex-direction: column;
}

/* Then add larger screen styles */
@media (min-width: 768px) {
  .card {
    padding: var(--space-md);
    flex-direction: row;
  }
}

@media (min-width: 1024px) {
  .card {
    padding: var(--space-lg);
  }
}`;

	const gridExample = `/* Responsive grid pattern */
.grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Or use auto-fit for fluid grids */
.fluid-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(
    auto-fit,
    minmax(280px, 1fr)
  );
}`;

	const typographyExample = `/* Fluid typography using clamp() */
h1 {
  font-size: var(--text-display);
  /* Expands to: clamp(2.5rem, 4vw + 1.5rem, 5rem) */
}

h2 {
  font-size: var(--text-h1);
  /* Expands to: clamp(2rem, 3vw + 1rem, 3.5rem) */
}

/* Line lengths for readability */
.prose {
  max-width: 65ch;
}`;

	const containerExample = `/* Container with responsive padding */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-sm);
}

@media (min-width: 640px) {
  .container {
    padding: 0 var(--space-md);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--space-lg);
  }
}`;

	const breakpoints = [
		{ name: 'Default', width: '< 640px', use: 'Mobile phones', columns: '1' },
		{ name: 'sm', width: '640px+', use: 'Large phones, small tablets', columns: '1-2' },
		{ name: 'md', width: '768px+', use: 'Tablets', columns: '2' },
		{ name: 'lg', width: '1024px+', use: 'Laptops, desktops', columns: '2-3' },
		{ name: 'xl', width: '1280px+', use: 'Large desktops', columns: '3-4' },
		{ name: '2xl', width: '1536px+', use: 'Extra large screens', columns: '4+' }
	];
</script>

<svelte:head>
	<title>Responsive Design — Canon Design System</title>
	<meta name="description" content="Mobile-first responsive design patterns, breakpoints, and fluid typography for the Canon design system." />
</svelte:head>

<header class="page-header">
	<p class="eyebrow">Guidelines</p>
	<h1>Responsive Design</h1>
	<p class="lead">
		Design for the smallest screen first, then enhance. Canon's responsive
		approach ensures content works everywhere, from phones to large displays.
	</p>
</header>

<section class="section">
	<h2>Philosophy</h2>
	<p>
		Mobile-first is not just a technique—it's a mindset. By starting with constraints,
		we identify what truly matters. What survives the smallest screen is essential;
		everything else is enhancement.
	</p>
	<blockquote class="philosophy-quote">
		"The absence of limitations is the enemy of art."
		<cite>— Orson Welles</cite>
	</blockquote>
</section>

<section class="section">
	<h2>Breakpoints</h2>
	<p class="section-description">
		Canon uses five breakpoints aligned with common device widths. Always use
		<code>min-width</code> queries for mobile-first progressive enhancement.
	</p>

	<div class="breakpoint-table-wrapper">
		<table class="breakpoint-table">
			<thead>
				<tr>
					<th>Breakpoint</th>
					<th>Width</th>
					<th>Typical Use</th>
					<th>Columns</th>
				</tr>
			</thead>
			<tbody>
				{#each breakpoints as bp}
					<tr>
						<td><code>{bp.name}</code></td>
						<td>{bp.width}</td>
						<td>{bp.use}</td>
						<td>{bp.columns}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<CodeBlock code={breakpointsExample} language="css" title="breakpoints.css" />
</section>

<section class="section">
	<h2>Mobile-First Pattern</h2>
	<p class="section-description">
		Start with styles for the smallest screen, then add complexity
		as viewport size increases.
	</p>

	<CodeBlock code={mobileFirstExample} language="css" title="mobile-first.css" />

	<div class="pattern-demo">
		<div class="demo-card">
			<div class="demo-icon"></div>
			<div class="demo-content">
				<div class="demo-title"></div>
				<div class="demo-text"></div>
			</div>
		</div>
		<p class="demo-label">Resize browser to see layout change</p>
	</div>
</section>

<section class="section">
	<h2>Grid Patterns</h2>
	<p class="section-description">
		CSS Grid enables powerful responsive layouts with minimal code.
	</p>

	<CodeBlock code={gridExample} language="css" title="grids.css" />

	<div class="grid-demo">
		<div class="grid-item"></div>
		<div class="grid-item"></div>
		<div class="grid-item"></div>
		<div class="grid-item"></div>
		<div class="grid-item"></div>
		<div class="grid-item"></div>
	</div>
	<p class="demo-label">Fluid grid with auto-fit</p>
</section>

<section class="section">
	<h2>Fluid Typography</h2>
	<p class="section-description">
		Canon's typography tokens use <code>clamp()</code> for smooth scaling
		between breakpoints—no media queries needed.
	</p>

	<CodeBlock code={typographyExample} language="css" title="typography.css" />

	<div class="typography-demo">
		<h2 class="fluid-heading">Heading scales smoothly</h2>
		<p class="fluid-body">
			Body text maintains optimal line length regardless of viewport width.
			The 65-character limit ensures comfortable reading on any device.
		</p>
	</div>
</section>

<section class="section">
	<h2>Containers</h2>
	<p class="section-description">
		Containers center content and apply responsive horizontal padding.
	</p>

	<CodeBlock code={containerExample} language="css" title="container.css" />

	<div class="container-demo">
		<div class="container-box">
			<span>max-width: 1200px</span>
		</div>
	</div>
</section>

<section class="section">
	<h2>Best Practices</h2>

	<div class="practices-grid">
		<div class="practice-card do">
			<h3>Do</h3>
			<ul>
				<li>Start with mobile layout, enhance upward</li>
				<li>Use relative units (rem, em, %) for sizing</li>
				<li>Test on real devices, not just resized browser</li>
				<li>Use fluid typography with clamp()</li>
				<li>Set touch targets to at least 44x44px</li>
				<li>Consider thumb zones for mobile interaction</li>
			</ul>
		</div>

		<div class="practice-card dont">
			<h3>Don't</h3>
			<ul>
				<li>Use max-width queries (desktop-first)</li>
				<li>Hide content on mobile that exists on desktop</li>
				<li>Rely on hover states for critical interactions</li>
				<li>Use fixed pixel widths for containers</li>
				<li>Assume landscape orientation</li>
				<li>Ignore high-density displays</li>
			</ul>
		</div>
	</div>
</section>

<section class="section">
	<h2>Touch Considerations</h2>
	<p class="section-description">
		Mobile interfaces require special attention to touch interaction.
	</p>

	<div class="touch-grid">
		<div class="touch-card">
			<h3>Target Size</h3>
			<p>
				Minimum 44x44px for tap targets. Smaller targets cause
				frustration and errors on touch devices.
			</p>
			<div class="target-demo">
				<div class="target small">Too small</div>
				<div class="target good">44px minimum</div>
			</div>
		</div>

		<div class="touch-card">
			<h3>Spacing</h3>
			<p>
				Add adequate spacing between interactive elements to
				prevent accidental taps.
			</p>
			<div class="spacing-demo">
				<button class="spacing-btn">Action 1</button>
				<button class="spacing-btn">Action 2</button>
			</div>
		</div>

		<div class="touch-card">
			<h3>Thumb Zone</h3>
			<p>
				Place primary actions within easy thumb reach. The bottom
				of the screen is most accessible for one-handed use.
			</p>
			<div class="thumb-demo">
				<div class="phone-outline">
					<div class="thumb-zone easy">Easy</div>
					<div class="thumb-zone ok">Stretch</div>
					<div class="thumb-zone hard">Hard</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="section">
	<h2>Testing Checklist</h2>
	<p class="section-description">
		Verify responsive behavior across devices and contexts.
	</p>

	<ul class="checklist">
		<li>Content readable at 320px width (iPhone SE)</li>
		<li>No horizontal scrolling at any breakpoint</li>
		<li>Touch targets at least 44x44px</li>
		<li>Forms usable on mobile (appropriate keyboards)</li>
		<li>Images scale without breaking layout</li>
		<li>Text remains readable (16px minimum)</li>
		<li>Contrast maintained in all lighting conditions</li>
		<li>Landscape orientation works correctly</li>
		<li>High-density displays show crisp graphics</li>
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

	.section-description code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		background: var(--color-bg-surface);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
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

	/* Breakpoint table */
	.breakpoint-table-wrapper {
		overflow-x: auto;
		margin-bottom: var(--space-lg);
	}

	.breakpoint-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.breakpoint-table th,
	.breakpoint-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.breakpoint-table th {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	.breakpoint-table td {
		color: var(--color-fg-secondary);
	}

	.breakpoint-table code {
		font-family: var(--font-mono);
		color: var(--color-fg-primary);
	}

	/* Pattern demo */
	.pattern-demo {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.demo-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	@media (min-width: 768px) {
		.demo-card {
			flex-direction: row;
			padding: var(--space-md);
		}
	}

	.demo-icon {
		width: 48px;
		height: 48px;
		background: var(--color-border-emphasis);
		border-radius: var(--radius-md);
		flex-shrink: 0;
	}

	.demo-content {
		flex: 1;
	}

	.demo-title {
		height: 16px;
		width: 60%;
		background: var(--color-border-emphasis);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
	}

	.demo-text {
		height: 12px;
		width: 90%;
		background: var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.demo-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin-top: var(--space-sm);
	}

	/* Grid demo */
	.grid-demo {
		display: grid;
		gap: var(--space-sm);
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		margin-top: var(--space-lg);
	}

	.grid-item {
		height: 80px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Typography demo */
	.typography-demo {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.fluid-heading {
		font-size: var(--text-h1);
		margin-bottom: var(--space-sm);
	}

	.fluid-body {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		max-width: 65ch;
		margin: 0;
	}

	/* Container demo */
	.container-demo {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.container-box {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		padding: var(--space-md);
		background: var(--color-bg-pure);
		border: 2px dashed var(--color-border-emphasis);
		border-radius: var(--radius-md);
		text-align: center;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
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

	/* Touch grid */
	.touch-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 768px) {
		.touch-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.touch-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.touch-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-xs);
	}

	.touch-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm) 0;
	}

	/* Target demo */
	.target-demo {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.target {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.target.small {
		width: 24px;
		height: 24px;
		font-size: 8px;
		border-color: var(--color-error);
	}

	.target.good {
		width: 44px;
		height: 44px;
		border-color: var(--color-success);
	}

	/* Spacing demo */
	.spacing-demo {
		display: flex;
		gap: var(--space-sm);
	}

	.spacing-btn {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	/* Thumb demo */
	.thumb-demo {
		display: flex;
		justify-content: center;
	}

	.phone-outline {
		width: 80px;
		height: 140px;
		border: 2px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.thumb-zone {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-caption);
	}

	.thumb-zone.easy {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.thumb-zone.ok {
		background: var(--color-warning-muted);
		color: var(--color-warning);
	}

	.thumb-zone.hard {
		background: var(--color-error-muted);
		color: var(--color-error);
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
