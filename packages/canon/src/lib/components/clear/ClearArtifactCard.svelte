<script lang="ts">
	interface Props {
		eyebrow?: string;
		title: string;
		detail: string;
		href?: string;
	}

	let { eyebrow, title, detail, href }: Props = $props();
</script>

{#if href}
	<a class="clear-artifact-card" {href}>
		{#if eyebrow}
			<span>{eyebrow}</span>
		{/if}
		<strong>{title}</strong>
		<p>{detail}</p>
	</a>
{:else}
	<article class="clear-artifact-card">
		{#if eyebrow}
			<span>{eyebrow}</span>
		{/if}
		<strong>{title}</strong>
		<p>{detail}</p>
	</article>
{/if}

<style>
	.clear-artifact-card {
		position: relative;
		overflow: hidden;
		display: grid;
		align-content: start;
		gap: 0.55rem;
		min-height: 10.5rem;
		padding: 1rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		text-decoration: none;
	}

	.clear-artifact-card::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 0.22rem;
		background: var(--color-performance-signal-soft, #dce8f5);
	}

	a.clear-artifact-card {
		transition:
			border-color var(--duration-performance-micro) var(--ease-performance-standard),
			transform var(--duration-performance-micro) var(--ease-performance-standard);
	}

	a.clear-artifact-card:hover {
		border-color: var(--color-performance-line-strong, #9c9c96);
		background: var(--color-performance-paper, #f3f3f0);
		opacity: 1;
		transform: none;
	}

	.clear-artifact-card span {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-artifact-card strong {
		color: var(--color-performance-ink, #090909);
		font-size: 1.12rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.2;
	}

	.clear-artifact-card p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.92rem;
		line-height: 1.45;
	}

	@media (max-width: 640px) {
		.clear-artifact-card {
			min-height: auto;
			padding: 0.85rem;
		}
	}
</style>
