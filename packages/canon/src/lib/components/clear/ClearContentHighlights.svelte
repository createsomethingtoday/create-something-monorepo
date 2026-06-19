<script lang="ts">
	export interface ClearContentHighlight {
		eyebrow?: string;
		title: string;
		detail: string;
		meta?: string;
		href?: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items: ClearContentHighlight[];
		ariaLabel?: string;
	}

	let { id, eyebrow, title, description, items, ariaLabel }: Props = $props();
</script>

<section {id} class="clear-content-highlights" aria-label={ariaLabel}>
	<div class="clear-content-highlights__inner">
		<header class="clear-content-highlights__header">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</header>

		<div class="clear-content-highlights__items" aria-label="Content highlights">
			{#each items as item}
				{#if item.href}
					<a class="clear-content-highlights__item" href={item.href}>
						{#if item.eyebrow || item.meta}
							<div class="clear-content-highlights__meta">
								{#if item.eyebrow}
									<span>{item.eyebrow}</span>
								{/if}
								{#if item.meta}
									<small>{item.meta}</small>
								{/if}
							</div>
						{/if}
						<strong>{item.title}</strong>
						<p>{item.detail}</p>
					</a>
				{:else}
					<article class="clear-content-highlights__item">
						{#if item.eyebrow || item.meta}
							<div class="clear-content-highlights__meta">
								{#if item.eyebrow}
									<span>{item.eyebrow}</span>
								{/if}
								{#if item.meta}
									<small>{item.meta}</small>
								{/if}
							</div>
						{/if}
						<strong>{item.title}</strong>
						<p>{item.detail}</p>
					</article>
				{/if}
			{/each}
		</div>
	</div>
</section>

<style>
	.clear-content-highlights {
		padding-block: 4.5rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-content-highlights__inner {
		display: grid;
		gap: 2rem;
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-content-highlights__header {
		display: grid;
		gap: 0.85rem;
		max-width: 48rem;
	}

	.clear-content-highlights__header span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-content-highlights h2 {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 3.1rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.02;
		text-wrap: balance;
	}

	.clear-content-highlights__header p {
		margin: 0;
		max-width: 42rem;
		color: var(--color-clear-grey, #636363);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-content-highlights__items {
		display: grid;
		grid-template-columns: 1.15fr repeat(2, minmax(0, 0.92fr));
		gap: 0.85rem;
	}

	.clear-content-highlights__item {
		display: grid;
		gap: 0.72rem;
		align-content: end;
		min-height: 18rem;
		padding: 1rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background:
			linear-gradient(180deg, rgba(10, 14, 25, 0) 0%, rgba(10, 14, 25, 0.035) 100%),
			var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
		text-decoration: none;
	}

	.clear-content-highlights__item:first-child {
		min-height: 22rem;
	}

	a.clear-content-highlights__item:hover {
		border-color: var(--color-clear-border-strong, #cecece);
		background: var(--color-clear-panel, #ffffff);
		opacity: 1;
	}

	.clear-content-highlights__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.42rem;
		align-items: center;
	}

	.clear-content-highlights__meta span,
	.clear-content-highlights__meta small {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.65rem;
		align-items: center;
		padding: 0.28rem 0.45rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: var(--font-medium);
		line-height: 1.12;
		text-transform: uppercase;
	}

	.clear-content-highlights__item strong {
		max-width: 18ch;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.36rem;
		font-weight: var(--font-medium);
		line-height: 1.12;
		text-wrap: balance;
	}

	.clear-content-highlights__item p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-size: 0.94rem;
		line-height: 1.48;
		text-wrap: pretty;
	}

	@media (max-width: 980px) {
		.clear-content-highlights__items {
			grid-template-columns: 1fr;
		}

		.clear-content-highlights__item,
		.clear-content-highlights__item:first-child {
			min-height: auto;
		}
	}

	@media (max-width: 640px) {
		.clear-content-highlights {
			padding-block: 2.75rem;
		}

		.clear-content-highlights__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
		}

		.clear-content-highlights h2 {
			font-size: 2.35rem;
			line-height: 1.04;
		}
	}
</style>
