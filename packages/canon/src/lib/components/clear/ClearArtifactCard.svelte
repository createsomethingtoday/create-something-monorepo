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
		display: grid;
		align-content: start;
		gap: 0.55rem;
		min-height: 10.5rem;
		padding: 1rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		text-decoration: none;
	}

	a.clear-artifact-card {
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
	}

	a.clear-artifact-card:hover {
		border-color: var(--color-clear-border-strong, #cecece);
		opacity: 1;
		transform: none;
	}

	.clear-artifact-card span {
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-artifact-card strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.12rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
	}

	.clear-artifact-card p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
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
