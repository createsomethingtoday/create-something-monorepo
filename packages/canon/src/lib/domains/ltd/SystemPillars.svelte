<script lang="ts">
	interface Pillar {
		eyebrow?: string;
		title: string;
		body: string;
	}

	interface Props {
		items: Pillar[];
	}

	let { items }: Props = $props();
</script>

<div class="pillars" role="list">
	{#each items as item}
		<article class="pillar" role="listitem">
			{#if item.eyebrow}
				<div class="eyebrow">{item.eyebrow}</div>
			{/if}
			<h3>{item.title}</h3>
			<p>{item.body}</p>
		</article>
	{/each}
</div>

<style>
	.pillars {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-performance-md);
		width: 100%;
	}

	.pillar {
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-md);
		border: 1px solid var(--color-border-subtle);
		background: var(--color-performance-bg-surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.eyebrow {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		letter-spacing: var(--tracking-performance-widest);
		text-transform: uppercase;
	}

	h3 {
		font-size: var(--text-performance-h4);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: 0;
	}

	p {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
		margin: 0;
	}
</style>
