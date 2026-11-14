<script lang="ts">
	export interface ClearSecurityItem {
		label: string;
		title: string;
		detail: string;
	}

	export interface ClearSecurityLog {
		label: string;
		value: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items: ClearSecurityItem[];
		logs?: ClearSecurityLog[];
		ariaLabel?: string;
	}

	let { id, eyebrow, title, description, items, logs = [], ariaLabel }: Props = $props();
</script>

<section {id} class="clear-security-panel" aria-label={ariaLabel}>
	<div class="clear-security-panel__inner">
		<header class="clear-security-panel__header">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
		</header>

		<div class="clear-security-panel__body">
			<div class="clear-security-panel__items" aria-label="Trust controls">
				{#each items as item}
					<article>
						<span>{item.label}</span>
						<strong>{item.title}</strong>
						<p>{item.detail}</p>
					</article>
				{/each}
			</div>

			{#if logs.length}
				<aside class="clear-security-panel__logs" aria-label="Security logs">
					<div class="clear-security-panel__terminal-bar" aria-hidden="true">
						<i></i>
						<i></i>
						<i></i>
					</div>
					{#each logs as log}
						<div>
							<span>{log.label}</span>
							<strong>{log.value}</strong>
						</div>
					{/each}
				</aside>
			{/if}
		</div>
	</div>
</section>

<style>
	.clear-security-panel {
		position: relative;
		isolation: isolate;
		overflow: clip;
		padding-block: 4.5rem;
		border-bottom: 1px solid var(--color-performance-line);
		background:
			linear-gradient(90deg, color-mix(in srgb, var(--color-performance-ink) 7%, transparent) 1px, transparent 1px) 0 0 / 4rem 4rem,
			var(--color-performance-paper);
		color: var(--color-performance-ink);
	}

	.clear-security-panel__inner {
		display: grid;
		gap: 2rem;
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-security-panel__header {
		display: grid;
		gap: 0.85rem;
		max-width: 46rem;
	}

	.clear-security-panel__header span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid color-mix(in srgb, var(--color-performance-ink) 18%, transparent);
		border-radius: var(--radius-performance-sm, 4px);
		background: color-mix(in srgb, var(--color-performance-ink) 8%, transparent);
		color: var(--color-performance-fg-secondary);
		font-family: var(--font-performance-mono);
		font-size: 0.875rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: none;
	}

	.clear-security-panel h2 {
		margin: 0;
		max-width: 14ch;
		color: var(--color-performance-ink);
		font-size: 3.25rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.02;
		text-wrap: balance;
	}

	.clear-security-panel__header p {
		margin: 0;
		max-width: 40rem;
		color: var(--color-performance-fg-secondary);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-security-panel__body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.48fr);
		gap: 0.9rem;
		align-items: stretch;
	}

	.clear-security-panel__items {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.clear-security-panel__items article,
	.clear-security-panel__logs {
		border: 1px solid color-mix(in srgb, var(--color-performance-ink) 16%, transparent);
		border-radius: var(--radius-performance-sm, 4px);
		background: color-mix(in srgb, var(--color-performance-ink) 8%, transparent);
	}

	.clear-security-panel__items article {
		display: grid;
		gap: 0.58rem;
		min-height: 12rem;
		align-content: start;
		padding: 1rem;
	}

	.clear-security-panel__items article span,
	.clear-security-panel__logs span {
		color: var(--color-performance-fg-secondary);
		font-family: var(--font-performance-mono);
		font-size: 0.875rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: none;
	}

	.clear-security-panel__items article strong {
		color: var(--color-performance-ink);
		font-size: 1.18rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.16;
		text-wrap: balance;
	}

	.clear-security-panel__items article p {
		margin: 0;
		color: var(--color-performance-fg-secondary);
		font-size: 0.94rem;
		line-height: 1.48;
		text-wrap: pretty;
	}

	.clear-security-panel__logs {
		display: grid;
		align-content: start;
		overflow: hidden;
	}

	.clear-security-panel__terminal-bar {
		display: inline-flex;
		gap: 0.34rem;
		align-items: center;
		min-height: 2.55rem;
		padding-inline: 1rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-performance-ink) 16%, transparent);
		background: color-mix(in srgb, var(--color-performance-ink) 7%, transparent);
	}

	.clear-security-panel__terminal-bar i {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-performance-ink) 35%, transparent);
	}

	.clear-security-panel__terminal-bar i:first-child {
		background: var(--color-performance-growth, #007a4d);
	}

	.clear-security-panel__terminal-bar i:last-child {
		background: var(--color-performance-risk, #c62026);
	}

	.clear-security-panel__logs div:not(.clear-security-panel__terminal-bar) {
		display: grid;
		gap: 0.25rem;
		padding: 0.82rem 1rem;
		border-bottom: 1px solid color-mix(in srgb, var(--color-performance-ink) 12%, transparent);
	}

	.clear-security-panel__logs div:last-child {
		border-bottom: 0;
	}

	.clear-security-panel__logs strong {
		color: var(--color-performance-ink);
		font-family: var(--font-performance-mono);
		font-size: 0.875rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.35;
		overflow-wrap: anywhere;
	}

	@media (max-width: 980px) {
		.clear-security-panel__body {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.clear-security-panel {
			padding-block: 2.75rem;
		}

		.clear-security-panel__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-security-panel h2 {
			font-size: 2.35rem;
			line-height: 1.04;
		}

		.clear-security-panel__items {
			grid-template-columns: 1fr;
		}

		.clear-security-panel__items article {
			min-height: auto;
		}
	}
</style>
