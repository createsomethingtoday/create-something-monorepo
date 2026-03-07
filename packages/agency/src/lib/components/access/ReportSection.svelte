<script lang="ts">
	export let title = '';
	export let description = '';
	export let href: string | null = null;
	export let actionLabel: string | null = null;
	export let fullWidth = false;
</script>

<section class:full-width={fullWidth} class="report-section">
	<div class:section-head-inline={href && actionLabel} class="section-head">
		<div>
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</div>
		{#if href && actionLabel}
			<a href={href}>{actionLabel}</a>
		{/if}
	</div>

	<slot />
</section>

<style>
	.report-section {
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding-top: 1rem;
		min-width: 0;
	}

	.full-width {
		grid-column: 1 / -1;
	}

	.section-head {
		margin-bottom: 1rem;
	}

	.section-head-inline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		margin: 0 0 0.4rem;
		font-size: 1.15rem;
	}

	p {
		margin: 0;
		line-height: 1.5;
		color: var(--color-fg-muted);
	}

	a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}
	@media (max-width: 700px) {
		.section-head-inline {
			display: grid;
		}
	}
</style>
