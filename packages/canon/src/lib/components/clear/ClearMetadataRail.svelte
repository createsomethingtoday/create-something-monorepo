<script lang="ts">
	export interface ClearMetadataItem {
		label: string;
		value?: string;
		href?: string;
	}

	export interface ClearMetadataGroup {
		title: string;
		items: ClearMetadataItem[];
	}

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		groups: ClearMetadataGroup[];
		tags?: string[];
		ariaLabel?: string;
	}

	let {
		eyebrow,
		title,
		description,
		groups,
		tags = [],
		ariaLabel = 'Operational metadata'
	}: Props = $props();
</script>

<aside class="clear-metadata-rail" aria-label={ariaLabel}>
	<header class="clear-metadata-rail__header">
		{#if eyebrow}
			<span>{eyebrow}</span>
		{/if}
		<strong>{title}</strong>
		{#if description}
			<p>{description}</p>
		{/if}
	</header>

	{#each groups as group}
		<section class="clear-metadata-rail__group" aria-label={group.title}>
			<h3>{group.title}</h3>
			<div class="clear-metadata-rail__rows">
				{#each group.items as item}
					{#if item.href}
						<a class="clear-metadata-rail__row" href={item.href}>
							<span>{item.label}</span>
							{#if item.value}
								<strong>{item.value}</strong>
							{/if}
						</a>
					{:else}
						<div class="clear-metadata-rail__row">
							<span>{item.label}</span>
							{#if item.value}
								<strong>{item.value}</strong>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</section>
	{/each}

	{#if tags.length}
		<div class="clear-metadata-rail__tags" aria-label="Metadata tags">
			{#each tags as tag}
				<span>{tag}</span>
			{/each}
		</div>
	{/if}
</aside>

<style>
	.clear-metadata-rail {
		display: grid;
		gap: 0;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		overflow: hidden;
	}

	.clear-metadata-rail__header {
		display: grid;
		gap: 0.45rem;
		padding: 1rem;
		background: var(--color-clear-porcelain, #f9f9f9);
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-metadata-rail__header span,
	.clear-metadata-rail__group h3 {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-metadata-rail__header strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.3rem;
		font-weight: var(--font-medium);
		line-height: 1.16;
		text-wrap: balance;
	}

	.clear-metadata-rail__header p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.clear-metadata-rail__group {
		display: grid;
		gap: 0.7rem;
		padding: 0.95rem 1rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-metadata-rail__rows {
		display: grid;
		gap: 0.45rem;
	}

	.clear-metadata-rail__row {
		display: grid;
		grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
		gap: 0.65rem;
		align-items: start;
		padding: 0.55rem 0;
		border-top: 1px solid color-mix(in srgb, var(--color-clear-border, #e1e1e1) 68%, transparent);
		color: var(--color-clear-onyx, #0a0e19);
		text-decoration: none;
	}

	.clear-metadata-rail__row:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.clear-metadata-rail__row:last-child {
		padding-bottom: 0;
	}

	a.clear-metadata-rail__row:hover {
		opacity: 1;
	}

	.clear-metadata-rail__row span {
		color: var(--color-clear-grey, #636363);
		font-size: 0.82rem;
		line-height: 1.3;
	}

	.clear-metadata-rail__row strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.88rem;
		font-weight: var(--font-medium);
		line-height: 1.3;
		overflow-wrap: anywhere;
	}

	.clear-metadata-rail__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.42rem;
		padding: 1rem;
	}

	.clear-metadata-rail__tags span {
		display: inline-flex;
		min-height: 1.7rem;
		align-items: center;
		padding: 0.28rem 0.45rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-medium);
		line-height: 1.15;
	}

	@media (max-width: 640px) {
		.clear-metadata-rail__row {
			grid-template-columns: 1fr;
			gap: 0.18rem;
		}
	}
</style>
