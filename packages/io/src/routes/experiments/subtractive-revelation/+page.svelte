<script lang="ts">
	/**
	 * Subtractive Revelation Experiment
	 *
	 * "Creation is the discipline of removing what obscures."
	 *
	 * The cube was always there. Noise conceals it.
	 * User interaction removes the noise, revealing truth.
	 * This is Aletheia—unconcealment.
	 */

	import SubtractiveLogo from './SubtractiveLogo.svelte';
	import InteractionModes from './InteractionModes.svelte';
	import type { InteractionMode } from './types';

	let mode = $state<InteractionMode>('wipe');
	let progress = $state(0);
	let logoComponent: ReturnType<typeof SubtractiveLogo>;

	function handleModeChange(newMode: InteractionMode) {
		mode = newMode;
		logoComponent?.reset();
	}

	function handleReset() {
		logoComponent?.reset();
	}

	function handleProgressChange(percent: number) {
		progress = percent;
	}

	const isFullyRevealed = $derived(progress >= 100);
</script>

<svelte:head>
	<title>Subtractive Revelation | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Creation is the discipline of removing what obscures. An experiment in subtractive design."
	/>
</svelte:head>

<article class="experiment-page">
	<header class="page-header">
		<h1 class="title">Subtractive Revelation</h1>
		<p class="subtitle">Creation is the discipline of removing what obscures.</p>
	</header>

	<section class="interactive-section">
		<div class="logo-container">
			<SubtractiveLogo
				bind:this={logoComponent}
				{mode}
				onProgressChange={handleProgressChange}
			/>
		</div>

		<InteractionModes {mode} onModeChange={handleModeChange} onReset={handleReset} />

		{#if isFullyRevealed}
			<p class="revelation-message">
				The cube was always there.<br />
				You merely removed what concealed it.
			</p>
		{/if}
	</section>

	<section class="philosophy-section">
		<h2>Aletheia</h2>
		<p>
			Heidegger called it <em>Aletheia</em>—unconcealment. Truth doesn't arrive; it emerges when
			obscurations fall away. The cube in this experiment was always present. The noise was the
			addition.
		</p>

		<h2>Why Not Grids?</h2>
		<div class="comparison-table">
			<div class="table-row header">
				<span class="cell">Approach</span>
				<span class="cell">Metaphor</span>
				<span class="cell">Philosophy</span>
			</div>
			<div class="table-row">
				<span class="cell label">Grid-based</span>
				<span class="cell">"Find my place in structure"</span>
				<span class="cell muted">Additive—you build up</span>
			</div>
			<div class="table-row highlight">
				<span class="cell label">Subtractive</span>
				<span class="cell">"Remove what conceals me"</span>
				<span class="cell">Aletheia—truth emerges</span>
			</div>
		</div>

		<p>
			Grids are <strong>rationalist</strong>—they impose structure <em>a priori</em>. The CREATE
			SOMETHING philosophy is <strong>phenomenological</strong>. We don't construct meaning; we
			uncover it through disciplined removal.
		</p>

		<h2>Three Modes</h2>
		<dl class="mode-definitions">
			<dt>Wipe</dt>
			<dd>
				<strong>Zuhandenheit</strong>—the tool recedes into use. When you wipe, you don't think
				about wiping. You think about what's being revealed.
			</dd>

			<dt>Dissolve</dt>
			<dd>
				<strong>Gelassenheit</strong>—letting-be. Each click is an act of release, not
				construction.
			</dd>

			<dt>Stillness</dt>
			<dd>
				<strong>Meditation</strong>—noise fades with stillness. The less you do, the more is
				revealed.
			</dd>
		</dl>
	</section>

	<footer class="page-footer">
		<p class="footer-text">
			Part of <a href="/experiments">CREATE SOMETHING experiments</a>
		</p>
	</footer>
</article>

<style>
	.experiment-page {
		max-width: 48rem;
		margin: 0 auto;
		padding: var(--space-lg, 2.618rem) var(--space-md, 1.618rem);
	}

	.page-header {
		text-align: center;
		margin-bottom: var(--space-xl, 4.236rem);
	}

	.title {
		font-size: var(--text-h1, clamp(2rem, 3vw + 1rem, 3.5rem));
		font-weight: 700;
		color: var(--color-fg-primary, white);
		margin: 0 0 var(--space-sm, 1rem);
	}

	.subtitle {
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-style: italic;
		margin: 0;
	}

	.interactive-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-lg, 2.618rem);
		margin-bottom: var(--space-2xl, 6.854rem);
	}

	.logo-container {
		width: 100%;
		max-width: 400px;
	}

	.revelation-message {
		text-align: center;
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		font-style: italic;
		animation: fadeIn var(--duration-standard, 300ms) var(--ease-standard, ease);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.philosophy-section {
		margin-bottom: var(--space-xl, 4.236rem);
	}

	.philosophy-section h2 {
		font-size: var(--text-h2, clamp(1.5rem, 2vw + 0.75rem, 2.25rem));
		font-weight: 600;
		color: var(--color-fg-primary, white);
		margin: var(--space-lg, 2.618rem) 0 var(--space-sm, 1rem);
	}

	.philosophy-section h2:first-child {
		margin-top: 0;
	}

	.philosophy-section p {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		line-height: 1.7;
		margin: 0 0 var(--space-sm, 1rem);
	}

	.philosophy-section em {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.philosophy-section strong {
		color: var(--color-fg-primary, white);
	}

	.comparison-table {
		margin: var(--space-md, 1.618rem) 0;
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
	}

	.table-row {
		display: grid;
		grid-template-columns: 1fr 1.5fr 1.5fr;
		gap: var(--space-sm, 1rem);
		padding: var(--space-sm, 1rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.table-row.header {
		background: var(--color-bg-surface, #111111);
		font-size: var(--text-caption, 0.75rem);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.table-row.highlight {
		background: var(--color-bg-subtle, #1a1a1a);
	}

	.cell {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.cell.label {
		font-weight: 600;
		color: var(--color-fg-primary, white);
	}

	.cell.muted {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	/* Responsive table */
	@media (max-width: 600px) {
		.table-row {
			grid-template-columns: 1fr;
			gap: var(--space-xs, 0.5rem);
		}

		.table-row.header {
			display: none;
		}

		.table-row {
			padding: var(--space-md, 1.618rem) var(--space-sm, 1rem);
		}

		.cell {
			display: block;
		}

		.cell.label {
			font-size: var(--text-body, 1rem);
			margin-bottom: var(--space-xs, 0.5rem);
		}

		.cell:not(.label) {
			padding-left: var(--space-sm, 1rem);
			border-left: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		}
	}

	.mode-definitions {
		margin: var(--space-md, 1.618rem) 0;
	}

	.mode-definitions dt {
		font-size: var(--text-body, 1rem);
		font-weight: 600;
		color: var(--color-fg-primary, white);
		margin-top: var(--space-sm, 1rem);
	}

	.mode-definitions dt:first-child {
		margin-top: 0;
	}

	.mode-definitions dd {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		margin: var(--space-xs, 0.5rem) 0 0;
		padding-left: var(--space-sm, 1rem);
		border-left: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.mode-definitions dd strong {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.page-footer {
		text-align: center;
		padding-top: var(--space-lg, 2.618rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.footer-text {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0;
	}

	.footer-text a {
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	.footer-text a:hover {
		color: var(--color-fg-primary, white);
	}
</style>
