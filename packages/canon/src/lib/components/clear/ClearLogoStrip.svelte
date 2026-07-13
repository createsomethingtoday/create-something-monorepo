<script lang="ts">
	export interface ClearLogoStripItem {
		label: string;
		detail?: string;
		href?: string;
	}

	interface Props {
		eyebrow?: string;
		items: ClearLogoStripItem[];
		ariaLabel?: string;
	}

	let { eyebrow, items, ariaLabel = 'Platform signals' }: Props = $props();
</script>

<section class="clear-logo-strip" aria-label={ariaLabel}>
	<div class="clear-logo-strip__inner">
		{#if eyebrow}
			<span class="clear-logo-strip__eyebrow">{eyebrow}</span>
		{/if}

		<div class="clear-logo-strip__items">
			{#each items as item}
				{#if item.href}
					<a class="clear-logo-strip__item" href={item.href}>
						<strong>{item.label}</strong>
						{#if item.detail}
							<span>{item.detail}</span>
						{/if}
					</a>
				{:else}
					<div class="clear-logo-strip__item">
						<strong>{item.label}</strong>
						{#if item.detail}
							<span>{item.detail}</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>
</section>

<style>
	.clear-logo-strip {
		padding: 0;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
	}

	.clear-logo-strip__inner {
		display: grid;
		grid-template-columns: minmax(9rem, 0.22fr) minmax(0, 1fr);
		gap: 1rem;
		align-items: center;
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		padding-block: 1rem;
	}

	.clear-logo-strip__eyebrow {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: uppercase;
	}

	.clear-logo-strip__items {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.clear-logo-strip__item {
		display: grid;
		gap: 0.16rem;
		min-height: 3.3rem;
		align-content: center;
		padding: 0.62rem 0.72rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		text-decoration: none;
	}

	a.clear-logo-strip__item:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-panel, #ffffff);
		opacity: 1;
	}

	.clear-logo-strip__item strong {
		font-size: 0.94rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.16;
	}

	.clear-logo-strip__item span {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.78rem;
		line-height: 1.25;
	}

	@media (max-width: 900px) {
		.clear-logo-strip__inner {
			grid-template-columns: 1fr;
		}

		.clear-logo-strip__items {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-logo-strip__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-logo-strip__items {
			grid-template-columns: 1fr;
		}
	}
</style>
