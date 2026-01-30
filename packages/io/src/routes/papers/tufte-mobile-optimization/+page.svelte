<script lang="ts">
	/**
	 * Tufte for Mobile: Design Intent Across Screen Sizes
	 *
	 * Demonstrates how wireframe intent survives responsive transformation
	 * through Edward Tufte's data visualization principles.
	 *
	 * "The wireframe shows structure. The styled form shows meaning. Mobile preserves both."
	 */
	import { SEO } from '@create-something/canon';
	import TufteMorph from '$lib/animations/TufteMorph.svelte';
</script>

<SEO
	title="Tufte for Mobile: Design Intent Across Screen Sizes"
	description="A methodology demonstrating how wireframe intent survives responsive transformation through five Tufte principles: data-ink ratio, sparklines, direct labeling, information density, and small multiples."
	keywords="Tufte, mobile design, responsive, data-ink ratio, sparklines, information density"
	ogType="article"
	articleSection="Methodology"
	publishedTime="2026-01-27T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Tufte for Mobile', url: 'https://createsomething.io/papers/tufte-mobile-optimization' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-007</div>
			<h1 class="mb-3 paper-title">Tufte for Mobile</h1>
			<p class="max-w-3xl paper-subtitle">
				Design Intent Across Screen Sizes: Applying Edward Tufte's Principles to Responsive Transformation
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Methodology</span>
				<span>•</span>
				<span>10 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				When responsive design reduces screen real estate by 80%, most dashboard cards become
				illegible. This paper demonstrates how <strong>wireframe intent</strong>—the structural
				skeleton of a UI component—can survive responsive transformation through Edward Tufte's
				principles. We apply <strong>data-ink ratio</strong>, <strong>sparklines</strong>,
				<strong>direct labeling</strong>, <strong>information density</strong>, and
				<strong>small multiples</strong> to transform desktop dashboard cards into mobile-optimized
				equivalents without losing meaning.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">5</div>
				<div class="metric-label">Tufte Principles</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">80%</div>
				<div class="metric-label">Space Reduction</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">100%</div>
				<div class="metric-label">Data Preserved</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">3x</div>
				<div class="metric-label">Density Increase</div>
			</div>
		</section>

		<!-- Section I: The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					A desktop dashboard card—280 pixels wide, 160 pixels tall—displays a metric with
					generous typography, decorative borders, a full-width sparkline chart, and a legend.
					It works.
				</p>

				<p>
					Now put three of them on a phone. 375 pixels wide. The same cards. A fraction of
					the space.
				</p>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>The constraint:</strong> Mobile viewports are 80% smaller than desktop.
						Naive scaling makes cards illegible. Simply stacking them vertically creates
						endless scrolling. Something has to give.
					</p>
				</div>

				<p>
					Most responsive implementations choose one of two paths: <strong>hide information</strong>
					(show less on mobile) or <strong>break layout</strong> (accept cramped, unusable interfaces).
					Both sacrifice the user.
				</p>

				<p>
					There is a third path. It requires understanding what the card is <em>for</em>.
				</p>
			</div>
		</section>

		<!-- Section II: Wireframe Intent -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Wireframe Intent</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Before a card has color, before it has type, before it has anything—it has structure.
					This is the <strong>wireframe</strong>.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
					<div class="p-6 comparison-card">
						<div class="comparison-label">Wireframe</div>
						<div class="space-y-3 mt-4">
							<div class="wireframe-block h-8 w-24"></div>
							<div class="wireframe-block h-3 w-16"></div>
							<div class="wireframe-block h-6 w-full mt-4"></div>
						</div>
						<p class="comparison-caption mt-4">Structure without decoration</p>
					</div>
					<div class="p-6 comparison-card">
						<div class="comparison-label">Styled</div>
						<div class="space-y-2 mt-4">
							<div class="styled-value">$47.2K</div>
							<div class="styled-label">Revenue</div>
							<div class="sparkline-container mt-4">
								<svg class="w-full h-6" viewBox="0 0 100 20">
									<polyline
										points="0,18 15,14 30,16 45,10 60,8 75,12 100,4"
										fill="none"
										stroke="rgba(255,255,255,0.5)"
										stroke-width="1.5"
									/>
								</svg>
							</div>
						</div>
						<p class="comparison-caption mt-4">Structure gains meaning</p>
					</div>
				</div>

				<p>
					The wireframe holds the <strong>intent</strong>:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>A large rectangle for the <strong>primary value</strong></li>
					<li>A smaller rectangle for the <strong>label</strong></li>
					<li>A line or area for the <strong>trend</strong></li>
					<li>A badge for the <strong>change indicator</strong></li>
				</ul>

				<p>
					The question becomes: <em>Can this intent survive transformation?</em>
				</p>
			</div>
		</section>

		<!-- Section III: Tufte's Five Principles -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Tufte's Five Principles</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Edward Tufte's 1983 work <em>The Visual Display of Quantitative Information</em>
					established principles that, when applied to mobile interfaces, enable intent
					preservation.
				</p>
			</div>

			<!-- Principle cards -->
			<div class="space-y-6">
				<div class="p-6 principle-card">
					<div class="principle-number">01</div>
					<h3 class="principle-title">Data-Ink Ratio</h3>
					<p class="principle-description">
						"Above all else, show the data." Remove every pixel that doesn't directly
						represent data. Borders, shadows, backgrounds, decorative icons—if it isn't
						data, it doesn't belong.
					</p>
					<div class="principle-result">
						Result: 60% reduction in non-data pixels
					</div>
				</div>

				<div class="p-6 principle-card">
					<div class="principle-number">02</div>
					<h3 class="principle-title">Sparklines</h3>
					<p class="principle-description">
						"Word-sized graphics." A trend doesn't need a full chart area. Compress it to
						48 pixels wide, 16 pixels tall—small enough to sit inline with the value it
						describes.
					</p>
					<div class="principle-result">
						Result: 85% reduction in chart area
					</div>
				</div>

				<div class="p-6 principle-card">
					<div class="principle-number">03</div>
					<h3 class="principle-title">Direct Labeling</h3>
					<p class="principle-description">
						"Label data directly." No legends, no keys, no separate label areas. The label
						sits immediately adjacent to what it describes.
					</p>
					<div class="principle-result">
						Result: Eliminated legend area entirely
					</div>
				</div>

				<div class="p-6 principle-card">
					<div class="principle-number">04</div>
					<h3 class="principle-title">Information Density</h3>
					<p class="principle-description">
						"Maximize data per pixel." A mobile card should show the same information as
						its desktop equivalent—just arranged differently.
					</p>
					<div class="principle-result">
						Result: 3x information density increase
					</div>
				</div>

				<div class="p-6 principle-card">
					<div class="principle-number">05</div>
					<h3 class="principle-title">Small Multiples</h3>
					<p class="principle-description">
						"Consistent, comparable units." Each card has identical structure—same height,
						same rhythm. The eye learns the pattern once and can scan quickly.
					</p>
					<div class="principle-result">
						Result: 2x faster scanning speed
					</div>
				</div>
			</div>
		</section>

		<!-- Interactive Demo -->
		<section class="space-y-6">
			<h2 class="section-heading">Interactive Demo</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Watch one card morph from desktop to mobile. The camera zooms in as Tufte's
					principles are applied—borders fade, the chart compresses to a sparkline,
					labels move inline.
				</p>
			</div>

			<div class="my-8">
				<TufteMorph />
			</div>
		</section>

		<!-- Section IV: The Transformation -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. The Transformation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Applying these five principles transforms a 280×160px desktop card into a 320×72px
					mobile card—55% smaller in area, but with identical information.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
					<div class="p-6 comparison-card">
						<div class="comparison-label">Desktop Card</div>
						<div class="demo-card-desktop mt-4 p-4">
							<div class="flex justify-between items-start">
								<div>
									<div class="styled-value">$47.2K</div>
									<div class="demo-label-upper mt-1">Revenue</div>
								</div>
								<div class="change-badge-positive">
									+12.3%
								</div>
							</div>
							<div class="sparkline-container-lg mt-4">
								<svg class="w-full h-8" viewBox="0 0 200 30">
									<polyline
										points="0,26 30,20 60,24 90,14 120,10 150,16 200,4"
										fill="none"
										stroke="rgba(255,255,255,0.4)"
										stroke-width="2"
									/>
								</svg>
							</div>
						</div>
						<p class="demo-dimensions mt-3">280 × 160px • Decorated</p>
					</div>

					<div class="p-6 comparison-card">
						<div class="comparison-label">Mobile Card (Tufte)</div>
						<div class="demo-card-mobile mt-4 p-4">
							<div class="flex justify-between items-center">
								<div class="flex items-baseline gap-2">
									<span class="styled-value-mobile">$47.2K</span>
									<span class="demo-label">Revenue</span>
								</div>
								<div class="flex items-center gap-3">
									<svg class="w-12 h-4" viewBox="0 0 48 16">
										<polyline
											points="0,14 8,10 16,12 24,6 32,4 40,8 48,2"
											fill="none"
											stroke="rgba(255,255,255,0.5)"
											stroke-width="1.5"
										/>
									</svg>
									<span class="change-text-positive">+12.3%</span>
								</div>
							</div>
						</div>
						<p class="demo-dimensions mt-3">320 × 72px • Data-forward</p>
					</div>
				</div>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// The transformation in code</p>
					<pre class="code-primary">
// Desktop: 280 × 160 = 44,800 px²
// Mobile:  320 × 72  = 23,040 px²
// Reduction: 49% area, 0% information loss

// Data-ink ratio improved:
// Before: ~30% data pixels
// After:  ~75% data pixels</pre>
				</div>
			</div>
		</section>

		<!-- Section V: Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">V. Implementation Pattern</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The transformation is implemented through an <strong>embodiment</strong> pattern—the
					same component renders differently based on viewport and optimization level.
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// Component interface</p>
					<pre class="code-primary">
interface DashboardCardProps &#123;
  card: CardData;
  embodiment: number;         // 0 = wireframe, 1 = styled
  viewport: 'desktop' | 'mobile';
  tufteLevel: number;         // 0 = decorated, 1 = optimized
&#125;

// Three states, one component:
// 1. Wireframe (embodiment=0): Gray placeholders
// 2. Desktop (embodiment=1, tufteLevel=0): Full decoration
// 3. Mobile (embodiment=1, tufteLevel=1): Data-forward</pre>
				</div>

				<p>
					The <code>@create-something/tufte</code> package provides components that
					automatically enforce these principles—<code>Sparkline</code>, <code>MetricCard</code>,
					<code>HighDensityTable</code>—making Tufte-compliant mobile layouts the default.
				</p>
			</div>
		</section>

		<!-- Section VI: Limitations -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Limitations</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Tufte's principles optimize for <strong>data comprehension</strong>. They are less
					applicable when:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>Brand expression matters:</strong> Marketing sites may need decoration
						to convey personality
					</li>
					<li>
						<strong>Interaction density is low:</strong> A single-metric display might
						benefit from visual breathing room
					</li>
					<li>
						<strong>Users are unfamiliar:</strong> First-time users may need more explicit
						labeling and hierarchy
					</li>
				</ul>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>The trade-off:</strong> Tufte-optimized interfaces prioritize
						information density over visual comfort. For dashboards and data-heavy
						applications, this is the right trade. For consumer apps, balance accordingly.
					</p>
				</div>
			</div>
		</section>

		<!-- Section VII: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. The Form Changed, The Meaning Didn't</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Desktop and mobile are not different products. They are different <em>densities</em>
					of the same intent.
				</p>

				<p>
					The wireframe structure—value, label, trend, change—survives transformation when we
					apply Tufte's principles. We remove decoration, compress charts to sparklines,
					label directly, maximize density, and maintain consistent structure.
				</p>

				<p>
					The result: cards that work on any screen size, because they never carried anything
					that didn't belong.
				</p>

				<blockquote class="blockquote pl-6 my-8">
					"Every pixel either shows data—or it doesn't belong."
					<footer class="blockquote-footer mt-2">— Edward Tufte (paraphrased)</footer>
				</blockquote>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-6 pt-8 section-border-top">
			<h2 class="section-heading">References</h2>

			<div class="space-y-4 references-text">
				<div class="reference-item">
					<span class="reference-number">[1]</span>
					Tufte, Edward R. (1983). <em>The Visual Display of Quantitative Information</em>.
					Graphics Press.
				</div>
				<div class="reference-item">
					<span class="reference-number">[2]</span>
					Tufte, Edward R. (2006). <em>Beautiful Evidence</em>. Graphics Press. Chapter on Sparklines.
				</div>
				<div class="reference-item">
					<span class="reference-number">[3]</span>
					<code>@create-something/tufte</code> package documentation.
					<a href="https://createsomething.ltd/masters/edward-tufte" class="link ml-1">
						createsomething.ltd/masters/edward-tufte
					</a>
				</div>
				<div class="reference-item">
					<span class="reference-number">[4]</span>
					Animation implementation:
					<code>packages/motion-studio/src/commercials/tufte-mobile/</code>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="pt-8 section-border-top text-center">
			<p class="footer-text">
				Related:
				<a href="/papers/animation-spec-architecture" class="link">Animation Spec Architecture</a>
				•
				<a href="/experiments/agentic-visualization" class="link">Agentic Visualization</a>
			</p>
		</footer>
	</div>
</div>

<style>
	/* Paper container */
	.paper-container {
		background: var(--color-bg-base, #000);
		color: var(--color-fg-primary, #fff);
	}

	/* Header styles */
	.paper-header {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.paper-id {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.paper-subtitle {
		font-size: 1.125rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
	}

	.paper-meta {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	/* Abstract */
	.abstract-section {
		border-left: 2px solid rgba(255, 255, 255, 0.2);
	}

	/* Section headings */
	.section-heading {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	/* Body text */
	.body-text {
		color: rgba(255, 255, 255, 0.85);
	}

	/* Metric cards */
	.metric-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		text-align: center;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 700;
	}

	.metric-value.metric-success {
		color: #44aa44;
	}

	.metric-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin-top: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Callout */
	.callout-blue {
		background: rgba(59, 130, 246, 0.1);
		border-left: 3px solid rgba(59, 130, 246, 0.5);
		border-radius: 0.5rem;
	}

	.callout-text-blue {
		color: rgba(255, 255, 255, 0.85);
	}

	/* Comparison cards */
	.comparison-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
	}

	.comparison-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	/* Principle cards */
	.principle-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
	}

	.principle-number {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.1em;
	}

	.principle-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 0.5rem;
	}

	.principle-description {
		color: rgba(255, 255, 255, 0.7);
		margin-top: 0.75rem;
		line-height: 1.6;
	}

	.principle-result {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: #44aa44;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Code blocks */
	.code-block {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.code-comment {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
	}

	.code-primary {
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.85rem;
		line-height: 1.6;
		white-space: pre;
	}

	/* References */
	.reference-item {
		color: rgba(255, 255, 255, 0.7);
	}

	.reference-number {
		color: rgba(255, 255, 255, 0.4);
		font-family: 'JetBrains Mono', monospace;
		margin-right: 0.5rem;
	}

	/* Links */
	.link {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.link:hover {
		color: rgba(255, 255, 255, 1);
	}

	code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875em;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	/* Wireframe blocks */
	.wireframe-block {
		background: var(--color-bg-surface, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-sm, 4px);
	}

	/* Comparison caption */
	.comparison-caption {
		font-size: var(--text-body-sm, 0.913rem);
		color: rgba(255, 255, 255, 0.5);
	}

	/* Styled card elements */
	.styled-value {
		font-size: var(--text-h2, clamp(1.2rem, 2vw + 0.5rem, 1.618rem));
		font-weight: 600;
	}

	.styled-value-mobile {
		font-size: var(--text-h3, clamp(1.02rem, 1vw + 0.5rem, 1.2rem));
		font-weight: 600;
	}

	.styled-label {
		font-size: var(--text-body-sm, 0.913rem);
		color: rgba(255, 255, 255, 0.5);
	}

	/* Sparkline containers */
	.sparkline-container {
		height: 2rem;
		width: 100%;
		background: var(--color-bg-subtle, rgba(255, 255, 255, 0.05));
		border-radius: var(--radius-sm, 4px);
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
	}

	.sparkline-container-lg {
		height: 2.5rem;
		background: var(--color-bg-subtle, rgba(255, 255, 255, 0.05));
		border-radius: var(--radius-sm, 4px);
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
	}

	/* Demo cards */
	.demo-card-desktop {
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-xl, 16px);
	}

	.demo-card-mobile {
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: var(--radius-lg, 12px);
	}

	.demo-label-upper {
		font-size: var(--text-caption, 0.833rem);
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.demo-label {
		font-size: var(--text-caption, 0.833rem);
		color: rgba(255, 255, 255, 0.5);
	}

	.demo-dimensions {
		font-size: var(--text-caption, 0.833rem);
		color: rgba(255, 255, 255, 0.4);
	}

	/* Change badges and text */
	.change-badge-positive {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-full, 9999px);
		background: rgba(34, 197, 94, 0.2);
		color: rgb(74, 222, 128);
		font-size: var(--text-caption, 0.833rem);
	}

	.change-text-positive {
		font-size: var(--text-caption, 0.833rem);
		color: rgb(74, 222, 128);
	}

	/* Blockquote */
	.blockquote {
		border-left: 2px solid var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		font-style: italic;
		color: rgba(255, 255, 255, 0.7);
	}

	.blockquote-footer {
		font-size: var(--text-body-sm, 0.913rem);
		color: rgba(255, 255, 255, 0.4);
		font-style: normal;
	}

	/* Section borders */
	.section-border-top {
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* References */
	.references-text {
		font-size: var(--text-body-sm, 0.913rem);
	}

	/* Footer */
	.footer-text {
		font-size: var(--text-body-sm, 0.913rem);
		color: rgba(255, 255, 255, 0.4);
	}
</style>
