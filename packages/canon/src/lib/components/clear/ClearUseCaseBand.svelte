<script lang="ts">
	export interface ClearUseCaseItem {
		eyebrow?: string;
		title: string;
		detail?: string;
		href?: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items: ClearUseCaseItem[];
		ariaLabel?: string;
	}

	let { id, eyebrow, title, description, items, ariaLabel }: Props = $props();
</script>

<section {id} class="clear-use-case-band" aria-label={ariaLabel}>
	<div class="clear-use-case-band__inner">
		<header class="clear-use-case-band__header">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</header>

		<div class="clear-use-case-band__items" aria-label="Use cases">
			{#each items as item, index}
				{@const number = String(index + 1).padStart(2, '0')}
				{#if item.href}
					<a class="clear-use-case-band__item" href={item.href}>
						<span>{item.eyebrow ?? number}</span>
						<strong>{item.title}</strong>
						{#if item.detail}
							<p>{item.detail}</p>
						{/if}
					</a>
				{:else}
					<article class="clear-use-case-band__item">
						<span>{item.eyebrow ?? number}</span>
						<strong>{item.title}</strong>
						{#if item.detail}
							<p>{item.detail}</p>
						{/if}
					</article>
				{/if}
			{/each}
		</div>
	</div>
</section>

<style>
	.clear-use-case-band {
		padding-block: 4.5rem;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
	}

	.clear-use-case-band__inner {
		display: grid;
		grid-template-columns: minmax(16rem, 0.44fr) minmax(0, 1fr);
		gap: clamp(2rem, 5vw, 4rem);
		align-items: start;
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-use-case-band__header {
		display: grid;
		gap: 0.85rem;
		position: sticky;
		top: 5.5rem;
	}

	.clear-use-case-band__header span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.76rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-use-case-band h2 {
		margin: 0;
		color: var(--color-performance-ink, #090909);
		font-size: 3.1rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.02;
		text-wrap: balance;
	}

	.clear-use-case-band__header p {
		margin: 0;
		max-width: 34rem;
		color: var(--color-performance-muted, #5e6268);
		font-size: 1.04rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-use-case-band__items {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.72rem;
	}

	.clear-use-case-band__item {
		display: grid;
		grid-template-columns: 3.2rem minmax(0, 1fr);
		column-gap: 0.9rem;
		row-gap: 0.24rem;
		min-height: 7.25rem;
		padding: 0.9rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		text-decoration: none;
	}

	a.clear-use-case-band__item:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-panel, #ffffff);
		opacity: 1;
	}

	.clear-use-case-band__item span {
		display: inline-grid;
		grid-row: 1 / span 2;
		width: 3.2rem;
		height: 2.15rem;
		place-items: center;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-medium);
		line-height: 1;
		text-transform: uppercase;
	}

	.clear-use-case-band__item strong {
		color: var(--color-performance-ink, #090909);
		font-size: 1.04rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.18;
		text-wrap: balance;
	}

	.clear-use-case-band__item p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.9rem;
		line-height: 1.42;
		text-wrap: pretty;
	}

	@media (max-width: 980px) {
		.clear-use-case-band__inner {
			grid-template-columns: 1fr;
		}

		.clear-use-case-band__header {
			position: static;
		}
	}

	@media (max-width: 640px) {
		.clear-use-case-band {
			padding-block: 2.75rem;
		}

		.clear-use-case-band__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-use-case-band h2 {
			font-size: 2.35rem;
			line-height: 1.04;
		}

		.clear-use-case-band__items {
			grid-template-columns: 1fr;
		}

		.clear-use-case-band__item {
			min-height: auto;
		}
	}
</style>
