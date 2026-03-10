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
		gap: var(--space-md);
		width: 100%;
	}

	.pillar {
		padding: var(--space-lg);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-subtle);
		background: var(--color-bg-surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.eyebrow {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
	}

	h3 {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}
</style>
