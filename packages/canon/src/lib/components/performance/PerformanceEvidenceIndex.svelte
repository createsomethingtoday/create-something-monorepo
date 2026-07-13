<script lang="ts">
	export type PerformanceEvidenceState = 'draft' | 'review' | 'verified' | 'archived';

	export interface PerformanceEvidenceItem {
		id: string;
		kind: string;
		title: string;
		detail: string;
		state: PerformanceEvidenceState;
		date: string;
		href?: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items: PerformanceEvidenceItem[];
		emptyMessage?: string;
		ariaLabel?: string;
	}

	let {
		id,
		eyebrow = 'Public proof surface',
		title,
		description,
		items,
		emptyMessage = 'No public evidence has been attached yet.',
		ariaLabel = title
	}: Props = $props();
</script>

<section {id} class="performance-evidence-index" aria-label={ariaLabel}>
	<header class="performance-evidence-index__header">
		<div><span>{eyebrow}</span><small>{String(items.length).padStart(2, '0')} records</small></div>
		<div><h2>{title}</h2>{#if description}<p>{description}</p>{/if}</div>
	</header>

	{#if items.length > 0}
		<ol class="performance-evidence-index__items">
			{#each items as item, index}
				<li class="performance-evidence-index__item" data-state={item.state}>
					{#if item.href}
						<a href={item.href}>
							<span class="performance-evidence-index__number">{String(index + 1).padStart(2, '0')}</span>
							<span class="performance-evidence-index__identity"><small>{item.kind}</small><strong>{item.title}</strong><span>{item.detail}</span></span>
							<span class="performance-evidence-index__receipt"><small>{item.state}</small><strong>{item.id}</strong><span>{item.date}</span></span>
						</a>
					{:else}
						<div>
							<span class="performance-evidence-index__number">{String(index + 1).padStart(2, '0')}</span>
							<span class="performance-evidence-index__identity"><small>{item.kind}</small><strong>{item.title}</strong><span>{item.detail}</span></span>
							<span class="performance-evidence-index__receipt"><small>{item.state}</small><strong>{item.id}</strong><span>{item.date}</span></span>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<div class="performance-evidence-index__empty" data-empty="true">
			<span>00 / Awaiting proof</span>
			<p>{emptyMessage}</p>
		</div>
	{/if}
</section>

<style>
	.performance-evidence-index {
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin: clamp(3rem, 7vw, 7rem) auto;
		border: 1px solid var(--color-performance-line-strong, #a9aaa5);
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.performance-evidence-index__header {
		display: grid;
		grid-template-columns: minmax(13rem, 0.5fr) minmax(0, 1.5fr);
		border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5);
	}

	.performance-evidence-index__header > div { display: grid; align-content: space-between; gap: 1.5rem; min-height: 10rem; padding: 1.25rem; }
	.performance-evidence-index__header > div:first-child { border-right: 1px solid var(--color-performance-line-strong, #a9aaa5); background: var(--color-performance-ink, #090909); color: #fff; }
	.performance-evidence-index__header span,
	.performance-evidence-index__header small,
	.performance-evidence-index__number,
	.performance-evidence-index__identity small,
	.performance-evidence-index__receipt { font-family: var(--font-performance-mono); font-size: 0.72rem; text-transform: uppercase; }
	.performance-evidence-index__header small { color: rgba(255, 255, 255, 0.58); }
	.performance-evidence-index h2 { margin: 0; font-family: var(--font-performance-display, var(--font-performance-display, var(--font-performance-sans))); font-size: clamp(2.1rem, 4vw, 3.8rem); font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500)); font-kerning: normal; font-feature-settings: "kern" 1, "liga" 1; letter-spacing: var(--tracking-performance-display, -0.03em); line-height: var(--leading-performance-display, 0.94); }
	.performance-evidence-index__header p { max-width: 40rem; margin: 0; color: var(--color-performance-muted, #5e6268); line-height: 1.45; }
	.performance-evidence-index__items { margin: 0; padding: 0; list-style: none; }
	.performance-evidence-index__item + .performance-evidence-index__item { border-top: 1px solid var(--color-performance-line, #d7d7d2); }
	.performance-evidence-index__item > a,
	.performance-evidence-index__item > div { display: grid; grid-template-columns: 3rem minmax(0, 1fr) minmax(13rem, 0.45fr); gap: 1rem; align-items: start; padding: 1.25rem; color: inherit; text-decoration: none; }
	.performance-evidence-index__item > a:hover { background: var(--color-performance-paper, #f3f3f0); }
	.performance-evidence-index__item > a:focus-visible { outline: 3px solid var(--color-performance-signal, #0057b8); outline-offset: -3px; }
	.performance-evidence-index__number { color: var(--color-performance-muted, #5e6268); }
	.performance-evidence-index__identity,
	.performance-evidence-index__receipt { display: grid; gap: 0.35rem; }
	.performance-evidence-index__identity strong { font-size: 1.2rem; font-weight: var(--font-performance-medium, 500); }
	.performance-evidence-index__identity > span { color: var(--color-performance-muted, #5e6268); line-height: 1.4; }
	.performance-evidence-index__receipt { justify-items: start; }
	.performance-evidence-index__receipt small { padding: 0.25rem 0.4rem; border: 1px solid currentColor; }
	.performance-evidence-index__item[data-state='verified'] .performance-evidence-index__receipt small { color: var(--color-performance-growth, #007a4d); }
	.performance-evidence-index__item[data-state='review'] .performance-evidence-index__receipt small { color: var(--color-performance-pressure, #e54800); }
	.performance-evidence-index__empty { display: grid; gap: 1rem; min-height: 13rem; place-content: center; padding: 2rem; text-align: center; }
	.performance-evidence-index__empty span { font-family: var(--font-performance-mono); font-size: 0.72rem; text-transform: uppercase; }
	.performance-evidence-index__empty p { margin: 0; color: var(--color-performance-muted, #5e6268); }

	@media (max-width: 42rem) {
		.performance-evidence-index { width: 100%; border-inline: 0; }
		.performance-evidence-index__header { grid-template-columns: 1fr; }
		.performance-evidence-index__header > div { min-height: 0; }
		.performance-evidence-index__header > div:first-child { border-right: 0; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); }
		.performance-evidence-index__item > a,
		.performance-evidence-index__item > div { grid-template-columns: 2rem 1fr; }
		.performance-evidence-index__receipt { grid-column: 2; margin-top: 0.75rem; }
	}
</style>
