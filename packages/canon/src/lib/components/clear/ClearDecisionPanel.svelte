<script lang="ts">
	import { onMount } from 'svelte';

	export type ClearDecisionTone = 'allow' | 'review' | 'block' | 'neutral';

	export interface ClearDecisionAction {
		label: string;
		href: string;
	}

	export interface ClearDecisionItem {
		label: string;
		summary: string;
		title: string;
		detail: string;
		tone?: ClearDecisionTone;
		evidence?: string[];
		receipts?: string[];
		actions?: ClearDecisionAction[];
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items: ClearDecisionItem[];
		ariaLabel?: string;
		autoRotate?: boolean;
		rotateMs?: number;
	}

	let {
		id,
		eyebrow,
		title,
		description,
		items,
		ariaLabel = 'Decision states',
		autoRotate = true,
		rotateMs = 5200
	}: Props = $props();

	let activeIndex = $state(0);
	let userSelected = $state(false);

	const activeItem = $derived(items[activeIndex] ?? items[0]);
	const panelId = $derived(`${id ?? 'clear-decision-panel'}-active`);

	function selectItem(index: number) {
		userSelected = true;
		activeIndex = index;
	}

	onMount(() => {
		if (!autoRotate || items.length <= 1) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const interval = window.setInterval(() => {
			if (userSelected) return;
			activeIndex = (activeIndex + 1) % items.length;
		}, rotateMs);

		return () => window.clearInterval(interval);
	});
</script>

<section {id} class="clear-decision-panel" aria-label={ariaLabel}>
	<div class="clear-decision-panel__inner">
		<header class="clear-decision-panel__header">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</header>

		<div class="clear-decision-panel__console">
			<div class="clear-decision-panel__bar">
				<div>
					<span>Current state</span>
					<strong>{activeItem?.label}</strong>
				</div>
				{#if activeItem}
					<span class={`clear-decision-panel__status clear-decision-panel__status--${activeItem.tone ?? 'neutral'}`} aria-live="polite">
						{activeItem.summary}
					</span>
				{/if}
			</div>

			<div class="clear-decision-panel__body">
				<div class="clear-decision-panel__tabs" role="tablist" aria-label={ariaLabel}>
					{#each items as item, index}
						<button
							type="button"
							role="tab"
							class="clear-decision-panel__tab"
							class:clear-decision-panel__tab--selected={index === activeIndex}
							aria-selected={index === activeIndex}
							aria-controls={panelId}
							onclick={() => selectItem(index)}
						>
							<span>{item.label}</span>
							<strong>{item.summary}</strong>
						</button>
					{/each}
				</div>

				{#if activeItem}
					<div id={panelId} class={`clear-decision-panel__active clear-decision-panel__active--${activeItem.tone ?? 'neutral'}`} role="tabpanel">
						<div class="clear-decision-panel__active-copy">
							<span>Decision object</span>
							<h3>{activeItem.title}</h3>
							<p>{activeItem.detail}</p>
						</div>

						<div class="clear-decision-panel__evidence">
							{#if activeItem.evidence?.length}
								<div>
									<span>Evidence</span>
									<ul>
										{#each activeItem.evidence as item}
											<li>{item}</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if activeItem.receipts?.length}
								<div>
									<span>Receipts</span>
									<div class="clear-decision-panel__receipts">
										{#each activeItem.receipts as receipt}
											<strong>{receipt}</strong>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						{#if activeItem.actions?.length}
							<div class="clear-decision-panel__actions" aria-label="Next actions">
								{#each activeItem.actions as action}
									<a href={action.href}>{action.label}</a>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.clear-decision-panel {
		padding-block: 4.5rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 3.75rem 3.75rem,
			var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-decision-panel__inner {
		display: grid;
		grid-template-columns: minmax(23rem, 0.52fr) minmax(0, 1fr);
		gap: clamp(2.75rem, 5.5vw, 5rem);
		align-items: start;
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-decision-panel__header {
		display: grid;
		gap: 0.9rem;
		max-width: 34rem;
	}

	.clear-decision-panel__header span,
	.clear-decision-panel__bar span,
	.clear-decision-panel__active-copy span,
	.clear-decision-panel__evidence span {
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.clear-decision-panel__header > span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-decision-panel h2 {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 2.85rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.08;
		text-wrap: balance;
	}

	.clear-decision-panel__header p,
	.clear-decision-panel__active-copy p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-size: 1.02rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-decision-panel__console {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--color-clear-border-strong, #cecece);
		border-radius: var(--radius-clear-md, 8px);
		background: var(--color-clear-panel, #ffffff);
		box-shadow: var(--shadow-clear-restraint, 0 4px 20px rgba(0, 0, 0, 0.06));
	}

	.clear-decision-panel__bar {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		background: var(--color-clear-porcelain-soft, #f2f2f2);
	}

	.clear-decision-panel__bar > div {
		display: grid;
		gap: 0.22rem;
		min-width: 0;
	}

	.clear-decision-panel__bar strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
	}

	.clear-decision-panel__status {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2rem;
		max-width: 16rem;
		padding: 0.42rem 0.68rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		line-height: 1.15;
		text-align: center;
		text-transform: uppercase;
	}

	.clear-decision-panel__status--allow {
		background: var(--color-clear-moss, #1e3c2c);
		border-color: var(--color-clear-moss, #1e3c2c);
	}

	.clear-decision-panel__status--review {
		background: var(--color-clear-onyx, #0a0e19);
		border-color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-decision-panel__status--block {
		background: var(--color-clear-stop, #c41e3a);
		border-color: var(--color-clear-stop, #c41e3a);
	}

	.clear-decision-panel__status--neutral {
		background: var(--color-clear-grey, #636363);
		border-color: var(--color-clear-grey, #636363);
	}

	.clear-decision-panel__body {
		display: grid;
		grid-template-columns: minmax(14rem, 0.38fr) minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem;
	}

	.clear-decision-panel__tabs {
		display: grid;
		align-content: start;
		gap: 0.5rem;
	}

	.clear-decision-panel__tab {
		position: relative;
		overflow: hidden;
		display: grid;
		gap: 0.24rem;
		min-height: 4.2rem;
		padding: 0.78rem 0.82rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		text-align: left;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background var(--duration-micro) var(--ease-standard);
	}

	.clear-decision-panel__tab:hover,
	.clear-decision-panel__tab:focus-visible {
		border-color: var(--color-clear-border-strong, #cecece);
	}

	.clear-decision-panel__tab:focus-visible {
		outline: 2px solid var(--color-clear-ocean, #0048ff);
		outline-offset: 2px;
	}

	.clear-decision-panel__tab--selected {
		border-color: var(--color-clear-ocean, #0048ff);
		background: color-mix(in srgb, var(--color-clear-pill-active, #cad7fa) 42%, white);
	}

	.clear-decision-panel__tab--selected::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.2rem;
		background: var(--color-clear-ocean, #0048ff);
	}

	.clear-decision-panel__tab span {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.92rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
	}

	.clear-decision-panel__tab strong {
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: var(--font-medium);
		line-height: 1.35;
		text-transform: uppercase;
	}

	.clear-decision-panel__active {
		--decision-accent: var(--color-clear-pastel-blue, #afc1fd);
		display: grid;
		gap: 1rem;
		align-content: start;
		min-width: 0;
		min-height: 24rem;
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--decision-accent) 70%, var(--color-clear-border, #e1e1e1));
		border-radius: var(--radius-clear-md, 8px);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.04) 1px, transparent 1px) 0 0 / 2.75rem 2.75rem,
			color-mix(in srgb, var(--decision-accent) 24%, white);
	}

	.clear-decision-panel__active--allow {
		--decision-accent: var(--color-clear-pistachio, #dbefdb);
	}

	.clear-decision-panel__active--review {
		--decision-accent: var(--color-clear-pastel-blue, #afc1fd);
	}

	.clear-decision-panel__active--block {
		--decision-accent: var(--color-clear-candy-purple, #efd4ff);
	}

	.clear-decision-panel__active--neutral {
		--decision-accent: var(--color-clear-border, #e1e1e1);
	}

	.clear-decision-panel__active-copy {
		display: grid;
		gap: 0.65rem;
		max-width: 42rem;
	}

	.clear-decision-panel__active h3 {
		margin: 0;
		max-width: 17ch;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 2.35rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.02;
		text-wrap: balance;
	}

	.clear-decision-panel__evidence {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.clear-decision-panel__evidence > div {
		display: grid;
		gap: 0.56rem;
		padding: 0.75rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: rgba(255, 255, 255, 0.72);
	}

	.clear-decision-panel__evidence ul {
		display: grid;
		gap: 0.48rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.clear-decision-panel__evidence li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.44rem;
		align-items: start;
		color: var(--color-clear-grey, #636363);
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.clear-decision-panel__evidence li::before {
		content: '';
		width: 0.42rem;
		height: 0.42rem;
		margin-top: 0.44em;
		border-radius: 999px;
		background: var(--color-clear-moss, #397554);
	}

	.clear-decision-panel__receipts,
	.clear-decision-panel__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.clear-decision-panel__receipts strong {
		display: inline-flex;
		align-items: center;
		gap: 0.36rem;
		max-width: 100%;
		min-height: 1.8rem;
		padding: 0.3rem 0.45rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.clear-decision-panel__receipts strong::before {
		content: '';
		width: 0.56rem;
		height: 0.68rem;
		border: 1px solid var(--color-clear-grey-quiet, #818181);
		border-radius: 2px;
		background: linear-gradient(135deg, transparent 0 66%, rgba(10, 14, 25, 0.08) 66% 100%);
	}

	.clear-decision-panel__actions {
		padding-top: 0.25rem;
	}

	.clear-decision-panel__actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.2rem;
		padding: 0.48rem 0.68rem;
		border: 1px solid var(--color-clear-onyx, #0a0e19);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.86rem;
		font-weight: var(--font-medium);
		line-height: 1.1;
		text-decoration: none;
		transition:
			background var(--duration-micro) var(--ease-standard),
			color var(--duration-micro) var(--ease-standard);
	}

	.clear-decision-panel__actions a:hover {
		background: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
		opacity: 1;
	}

	.clear-decision-panel__actions a:focus-visible {
		outline: 2px solid var(--color-clear-ocean, #0048ff);
		outline-offset: 2px;
	}

	@media (max-width: 1180px) {
		.clear-decision-panel__inner,
		.clear-decision-panel__body {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.clear-decision-panel {
			padding-block: 2.75rem;
		}

		.clear-decision-panel__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
		}

		.clear-decision-panel h2 {
			font-size: 2.25rem;
			line-height: 1.08;
		}

		.clear-decision-panel__bar {
			align-items: flex-start;
			flex-direction: column;
		}

		.clear-decision-panel__status {
			max-width: 100%;
		}

		.clear-decision-panel__active {
			min-height: 0;
		}

		.clear-decision-panel__active h3 {
			font-size: 1.75rem;
		}

		.clear-decision-panel__evidence {
			grid-template-columns: 1fr;
		}
	}
</style>
