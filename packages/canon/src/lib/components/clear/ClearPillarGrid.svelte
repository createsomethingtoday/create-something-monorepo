<script lang="ts">
	export interface ClearPillarLink {
		label: string;
		href: string;
	}

	export interface ClearPillarItem {
		eyebrow?: string;
		title: string;
		detail: string;
		proof?: string;
		href?: string;
		links?: ClearPillarLink[];
	}

	interface Props {
		items: ClearPillarItem[];
		ariaLabel?: string;
		columns?: 2 | 3 | 4;
	}

	let { items, ariaLabel = 'Platform pillars', columns = 4 }: Props = $props();
</script>

<div class={`clear-pillar-grid clear-pillar-grid--${columns}`} aria-label={ariaLabel}>
	{#each items as item, index}
		{@const number = String(index + 1).padStart(2, '0')}
		{#if item.href && !item.links?.length}
			<a class="clear-pillar" href={item.href}>
				<span class="clear-pillar__number">{item.eyebrow ?? number}</span>
				<strong>{item.title}</strong>
				<p>{item.detail}</p>
				{#if item.proof}
					<small>{item.proof}</small>
				{/if}
			</a>
		{:else}
			<article class="clear-pillar">
				<span class="clear-pillar__number">{item.eyebrow ?? number}</span>
				{#if item.href}
					<a class="clear-pillar__title-link" href={item.href}>{item.title}</a>
				{:else}
					<strong>{item.title}</strong>
				{/if}
				<p>{item.detail}</p>
				{#if item.proof}
					<small>{item.proof}</small>
				{/if}
				{#if item.links?.length}
					<div class="clear-pillar__links" aria-label={`${item.title} links`}>
						{#each item.links as link}
							<a href={link.href}>{link.label}</a>
						{/each}
					</div>
				{/if}
			</article>
		{/if}
	{/each}
</div>

<style>
	.clear-pillar-grid {
		display: grid;
		gap: 0.85rem;
	}

	.clear-pillar-grid--2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.clear-pillar-grid--3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.clear-pillar-grid--4 {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.clear-pillar {
		position: relative;
		display: grid;
		align-content: start;
		gap: 0.7rem;
		min-height: 16rem;
		padding: 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		text-decoration: none;
		box-shadow: none;
	}

	a.clear-pillar {
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	a.clear-pillar:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-paper, #f3f3f0);
		opacity: 1;
	}

	.clear-pillar__number {
		display: inline-flex;
		width: fit-content;
		min-height: 1.78rem;
		align-items: center;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: uppercase;
	}

	.clear-pillar strong,
	.clear-pillar__title-link {
		display: block;
		color: var(--color-performance-ink, #090909);
		font-size: 1.18rem;
		font-weight: var(--font-medium);
		line-height: 1.16;
		text-decoration: none;
		text-wrap: balance;
	}

	.clear-pillar__title-link:hover {
		opacity: 0.72;
	}

	.clear-pillar p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.94rem;
		line-height: 1.48;
		text-wrap: pretty;
	}

	.clear-pillar small {
		display: block;
		margin-top: auto;
		padding-top: 0.72rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-medium);
		line-height: 1.35;
	}

	.clear-pillar__links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.42rem;
		padding-top: 0.15rem;
	}

	.clear-pillar__links a {
		display: inline-flex;
		min-height: 1.8rem;
		align-items: center;
		padding: 0.3rem 0.48rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		font-size: 0.8rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
		text-decoration: none;
	}

	.clear-pillar__links a:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-paper, #f3f3f0);
		opacity: 1;
	}

	@media (max-width: 1100px) {
		.clear-pillar-grid--4 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.clear-pillar-grid--3 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-pillar-grid--2,
		.clear-pillar-grid--3,
		.clear-pillar-grid--4 {
			grid-template-columns: 1fr;
		}

		.clear-pillar {
			min-height: auto;
			padding: 0.9rem;
		}
	}
</style>
