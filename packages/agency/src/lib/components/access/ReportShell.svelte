<script lang="ts">
	export let eyebrow = '';
	export let title = '';
	export let lede = '';
	export let sideLabel = '';
	export let sideValue = '';
	export let sideMeta = '';
</script>

<div class="report-shell">
	<header class="masthead">
		<div class="masthead-copy">
			{#if eyebrow}
				<p class="eyebrow">{eyebrow}</p>
			{/if}
			<h1>{title}</h1>
			{#if lede}
				<p class="lede">{lede}</p>
			{/if}
		</div>

		<aside class="identity-note">
			{#if sideLabel}
				<div class="identity-label">{sideLabel}</div>
			{/if}
			{#if sideValue}
				<div class="identity-value">{sideValue}</div>
			{/if}
			{#if sideMeta}
				<div class="identity-meta">{sideMeta}</div>
			{/if}
			<slot name="aside" />
		</aside>
	</header>

	<section class="summary-strip">
		<slot name="summary" />
	</section>

	<div class="report-grid">
		<slot />
	</div>
</div>

<style>
	.report-shell {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2.5rem 2rem 4rem;
	}

	.masthead {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 3rem;
		align-items: start;
		margin-bottom: 2.5rem;
	}

	.eyebrow,
	.identity-label {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: clamp(2.8rem, 6vw, 4.25rem);
		line-height: 0.95;
	}

	.lede,
	.identity-meta {
		color: var(--color-fg-muted);
	}

	.lede {
		max-width: 42rem;
		line-height: 1.6;
		font-size: 1rem;
		margin: 0;
	}

	.identity-note {
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.identity-value {
		font-size: 1.25rem;
		font-weight: 600;
		word-break: break-word;
	}

	.summary-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.5rem;
		padding: 1rem 0 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 2rem;
	}

	.report-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 3rem;
		row-gap: 2rem;
	}

	@media (max-width: 900px) {
		.report-shell {
			padding-inline: 1rem;
		}

		.masthead,
		.summary-strip,
		.report-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
