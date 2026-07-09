<script lang="ts">
	import Icon from '../../icons/Icon.svelte';
	import type { IconName } from '../../icons/types.js';

	export interface ClearCardItem {
		eyebrow?: string;
		icon?: IconName;
		title: string;
		detail: string;
		href?: string;
		points?: string[];
	}

	interface Props {
		items: ClearCardItem[];
		ariaLabel?: string;
		columns?: 1 | 2 | 3 | 4;
		density?: 'standard' | 'compact';
	}

	let {
		items,
		ariaLabel = 'Clear communication cards',
		columns = 3,
		density = 'standard'
	}: Props = $props();
</script>

<div
	class={`clear-card-grid clear-card-grid--${columns} clear-card-grid--${density}`}
	aria-label={ariaLabel}
>
	{#each items as item}
		{#if item.href}
			<a
				class="clear-card-grid__card"
				class:clear-card-grid__card--has-icon={item.icon}
				href={item.href}
			>
				{#if item.icon || item.eyebrow}
					<div class="clear-card-grid__meta">
						{#if item.icon}
							<span class="clear-card-grid__icon" aria-hidden="true">
								<Icon name={item.icon} size="sm" strokeWidth={1.75} />
							</span>
						{/if}
						{#if item.eyebrow}
							<span class="clear-card-grid__eyebrow">{item.eyebrow}</span>
						{/if}
					</div>
				{/if}
				<strong>{item.title}</strong>
				<p>{item.detail}</p>
				{#if item.points?.length}
					<ul>
						{#each item.points as point}
							<li>{point}</li>
						{/each}
					</ul>
				{/if}
			</a>
		{:else}
			<article class="clear-card-grid__card" class:clear-card-grid__card--has-icon={item.icon}>
				{#if item.icon || item.eyebrow}
					<div class="clear-card-grid__meta">
						{#if item.icon}
							<span class="clear-card-grid__icon" aria-hidden="true">
								<Icon name={item.icon} size="sm" strokeWidth={1.75} />
							</span>
						{/if}
						{#if item.eyebrow}
							<span class="clear-card-grid__eyebrow">{item.eyebrow}</span>
						{/if}
					</div>
				{/if}
				<strong>{item.title}</strong>
				<p>{item.detail}</p>
				{#if item.points?.length}
					<ul>
						{#each item.points as point}
							<li>{point}</li>
						{/each}
					</ul>
				{/if}
			</article>
		{/if}
	{/each}
</div>

<style>
	.clear-card-grid {
		display: grid;
		gap: 0.85rem;
	}

	.clear-card-grid--2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.clear-card-grid--1 {
		grid-template-columns: 1fr;
	}

	.clear-card-grid--3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.clear-card-grid--4 {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.clear-card-grid__card {
		display: grid;
		align-content: start;
		gap: 0.62rem;
		min-height: 12rem;
		padding: 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		text-decoration: none;
		box-shadow: none;
	}

	a.clear-card-grid__card {
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	a.clear-card-grid__card:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-paper, #f3f3f0);
		opacity: 1;
	}

	.clear-card-grid__meta {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-height: 2.2rem;
	}

	.clear-card-grid__icon {
		display: inline-grid;
		width: 2.1rem;
		height: 2.1rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.clear-card-grid__eyebrow {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: uppercase;
	}

	.clear-card-grid__card strong {
		color: var(--color-performance-ink, #090909);
		font-size: 1.18rem;
		font-weight: var(--font-medium);
		line-height: 1.18;
		text-wrap: balance;
	}

	.clear-card-grid__card p,
	.clear-card-grid__card li {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.94rem;
		line-height: 1.48;
		text-wrap: pretty;
	}

	.clear-card-grid__card p {
		margin: 0;
	}

	.clear-card-grid__card ul {
		display: grid;
		gap: 0.42rem;
		margin: 0.15rem 0 0;
		padding: 0;
		list-style: none;
	}

	.clear-card-grid__card li {
		padding-top: 0.42rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.clear-card-grid--compact {
		gap: 0.65rem;
	}

	.clear-card-grid--compact .clear-card-grid__card {
		gap: 0.48rem;
		min-height: auto;
		padding: 0.92rem;
	}

	.clear-card-grid--compact .clear-card-grid__card--has-icon {
		grid-template-columns: 1.9rem minmax(0, 1fr);
		column-gap: 0.72rem;
		row-gap: 0.24rem;
	}

	.clear-card-grid--compact .clear-card-grid__meta {
		gap: 0.5rem;
		min-height: 1.9rem;
	}

	.clear-card-grid--compact .clear-card-grid__card--has-icon .clear-card-grid__meta {
		display: contents;
		min-height: 0;
	}

	.clear-card-grid--compact .clear-card-grid__icon {
		width: 1.9rem;
		height: 1.9rem;
	}

	.clear-card-grid--compact .clear-card-grid__card--has-icon .clear-card-grid__icon {
		grid-column: 1;
		grid-row: 1 / span 3;
	}

	.clear-card-grid--compact .clear-card-grid__eyebrow {
		font-size: 0.68rem;
	}

	.clear-card-grid--compact .clear-card-grid__card--has-icon .clear-card-grid__eyebrow {
		grid-column: 2;
		grid-row: 1;
		align-self: end;
		padding-top: 0.05rem;
	}

	.clear-card-grid--compact .clear-card-grid__card--has-icon strong,
	.clear-card-grid--compact .clear-card-grid__card--has-icon p,
	.clear-card-grid--compact .clear-card-grid__card--has-icon ul {
		grid-column: 2;
	}

	.clear-card-grid--compact .clear-card-grid__card strong {
		font-size: 1.05rem;
		line-height: 1.2;
	}

	.clear-card-grid--compact .clear-card-grid__card p,
	.clear-card-grid--compact .clear-card-grid__card li {
		font-size: 0.9rem;
		line-height: 1.43;
	}

	@media (max-width: 1100px) {
		.clear-card-grid--4 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.clear-card-grid--3 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-card-grid--2,
		.clear-card-grid--3,
		.clear-card-grid--4 {
			grid-template-columns: 1fr;
		}

		.clear-card-grid__card {
			min-height: auto;
			padding: 0.9rem;
		}
	}
</style>
