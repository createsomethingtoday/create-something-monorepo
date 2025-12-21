<script lang="ts">
	import { Footer, QuoteBlock } from '@create-something/components';
	import type { PageData } from './$types';
	import type { InteractionMode } from './types';
	import CubeReveal from './CubeReveal.svelte';
	import CSLettermark from './CSLettermark.svelte';
	import InteractionController from './InteractionController.svelte';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;

	let interactionMode = $state<InteractionMode>('click');
	let timelineProgress = $state(0);
	let cubeReveal: CubeReveal;
	let csLettermark: CSLettermark;

	function handleModeChange(mode: InteractionMode) {
		interactionMode = mode;
	}

	function handleTimelineChange(progress: number) {
		timelineProgress = progress;
	}

	function handleReset() {
		cubeReveal?.reset();
		csLettermark?.reset();
		timelineProgress = 0;
	}
</script>

<svelte:head>
	<title>{experiment?.title ?? 'Grid Logo Experiment'} | CREATE SOMETHING</title>
	<meta name="description" content={experiment?.description ?? 'Interactive grid-based logo exploration'} />
</svelte:head>

<article class="experiment-page">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-meta">
			<span class="category">{experiment?.category ?? 'research'}</span>
			<span class="separator">/</span>
			<span class="reading-time">{experiment?.reading_time_minutes ?? 10} min read</span>
		</div>
		<h1>{experiment?.title ?? 'Grid as Revelation: When Structure Becomes Logo'}</h1>
		<p class="subtitle">{experiment?.description ?? 'Interactive exploration of logo construction from geometric first principles.'}</p>
	</header>

	<!-- ASCII Art -->
	{#if experiment?.ascii_art}
		<pre class="ascii-art">{experiment.ascii_art}</pre>
	{/if}

	<!-- Abstract -->
	<section class="section">
		<h2>Abstract</h2>
		<p>
			What if a logo didn't <em>sit on</em> a grid—but <em>emerged from</em> one?
			This experiment explores two logo concepts through their underlying geometric structure:
			the existing isometric cube and a new "CS" lettermark.
		</p>
		<p>
			Users interact with the grid to reveal construction lines, embodying
			<strong>Aletheia</strong> (unconcealment). The logo is not added; it's discovered.
		</p>
	</section>

	<!-- Interactive Section -->
	<section class="section interactive-section">
		<h2>Interact with the Grid</h2>
		<p class="instruction">
			{#if interactionMode === 'click'}
				Click cells to reveal the underlying structure. Logo-forming cells glow brighter.
			{:else if interactionMode === 'drag'}
				Drag across the grid to paint revelation. Touch-friendly for mobile.
			{:else}
				Scrub the timeline to control the reveal. Analytical mode for studying construction.
			{/if}
		</p>

		<InteractionController
			mode={interactionMode}
			{timelineProgress}
			onModeChange={handleModeChange}
			onTimelineChange={handleTimelineChange}
			onReset={handleReset}
		/>

		<div class="logo-grid">
			<CubeReveal
				bind:this={cubeReveal}
				{interactionMode}
				{timelineProgress}
			/>
			<CSLettermark
				bind:this={csLettermark}
				{interactionMode}
				{timelineProgress}
			/>
		</div>
	</section>

	<!-- Philosophy -->
	<section class="section">
		<h2>Philosophical Alignment</h2>

		<h3>Aletheia (Unconcealment)</h3>
		<QuoteBlock
			quote="The grid was always there. The logo emerges not by addition but by the removal of hiddenness."
			attribution="Heideggerian interpretation"
		/>
		<p>
			Truth, for Heidegger, is not correspondence but <em>unconcealment</em>.
			Things emerge from hiddenness. The grid doesn't create the logo—it reveals what was always present
			in the geometry.
		</p>

		<h3>Zuhandenheit (Ready-to-Hand)</h3>
		<p>
			In click mode, the interaction should recede. You're not "using a grid tool"—you're
			discovering a form. When the interface disappears, revelation happens.
		</p>

		<h3>The Subtractive Triad</h3>
		<p>This experiment applies the three levels:</p>
		<div class="triad-table">
			<table>
				<thead>
					<tr>
						<th>Level</th>
						<th>Discipline</th>
						<th>Application</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>DRY</td>
						<td>Implementation</td>
						<td>One grid system generates both logos</td>
					</tr>
					<tr>
						<td>Rams</td>
						<td>Artifact</td>
						<td>Only cells that matter are revealed</td>
					</tr>
					<tr>
						<td>Heidegger</td>
						<td>System</td>
						<td>The whole (logo) gives meaning to parts (cells)</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- Technical Notes -->
	<section class="section">
		<h2>Implementation Notes</h2>

		<h3>Grid Geometry</h3>
		<p>
			The 12×12 grid uses standard Cartesian coordinates. The cube logo leverages isometric
			projection (30° angles) for its characteristic three-face view. The CS lettermark
			uses the same grid but with stroke-based paths rather than filled faces.
		</p>

		<h3>Interaction Modes</h3>
		<ul>
			<li><strong>Click (Zuhandenheit)</strong> — Direct manipulation; tool recedes into use</li>
			<li><strong>Drag (Gelassenheit)</strong> — Letting-be through gesture; flow state</li>
			<li><strong>Timeline (Vorhandenheit)</strong> — Analytical observation; studying the process</li>
		</ul>

		<h3>Logo Threshold</h3>
		<p>
			The logo paths fade in at 70% cell revelation. This threshold ensures enough context
			is visible before the final form appears—the construction earns the result.
		</p>
	</section>

	<!-- Inspiration -->
	<section class="section">
		<h2>Inspiration</h2>
		<p>
			This experiment draws from Berger & Föhr's <em>Morphic</em> identity, which uses a strict
			grid system to construct its "M" letterform. The construction lines are part of the identity—
			they're not hidden scaffolding to remove.
		</p>
		<p>
			For CREATE SOMETHING, the grid is philosophical: it embodies the hermeneutic principle
			that we understand parts through the whole, and the whole through its parts.
		</p>
	</section>

	<!-- Conclusion -->
	<section class="section">
		<h2>Conclusion</h2>
		<QuoteBlock
			quote="Less, but better."
			attribution="Dieter Rams"
		/>
		<p>
			The grid is not decoration. It's the epistemological foundation of the logo.
			By making construction visible and interactive, we invite users into the design process—
			transforming passive viewing into active discovery.
		</p>
		<p>
			Two logos, one grid, infinite revelations.
		</p>
	</section>

	<!-- Footer -->
	<footer class="experiment-footer">
		<div class="tags">
			{#each experiment?.tags ?? ['Logo Design', 'Grid Systems', 'Interactive', 'SVG'] as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
		<p class="principles">
			Tests: {experiment?.tests_principles?.join(', ') ?? 'heidegger-aletheia, rams-principle-10, subtractive-triad'}
		</p>
	</footer>
</article>

<Footer />

<style>
	.experiment-page {
		max-width: var(--width-content);
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
	}

	/* Header */
	.experiment-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.separator {
		color: var(--color-fg-subtle);
	}

	.experiment-header h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: var(--leading-tight);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		line-height: 1.2;
		color: var(--color-fg-muted);
		overflow-x: auto;
		margin: var(--space-xl) 0;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	.section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.section ul {
		margin: var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.section li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xs);
	}

	.section em {
		font-style: italic;
	}

	.section strong {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* Interactive Section */
	.interactive-section {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.instruction {
		text-align: center;
		margin-bottom: var(--space-lg);
		color: var(--color-fg-tertiary);
	}

	.logo-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xl);
		margin-top: var(--space-xl);
		justify-items: center;
	}

	/* Triad Table */
	.triad-table {
		margin: var(--space-md) 0;
		overflow-x: auto;
	}

	.triad-table table {
		width: 100%;
		border-collapse: collapse;
	}

	.triad-table th,
	.triad-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.triad-table th {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.triad-table td {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.triad-table td:first-child {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* Footer */
	.experiment-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.principles {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.experiment-header h1 {
			font-size: var(--text-h2);
		}

		.ascii-art {
			font-size: 0.45rem;
		}

		.logo-grid {
			grid-template-columns: 1fr;
		}

		.interactive-section {
			padding: var(--space-md);
		}
	}
</style>
