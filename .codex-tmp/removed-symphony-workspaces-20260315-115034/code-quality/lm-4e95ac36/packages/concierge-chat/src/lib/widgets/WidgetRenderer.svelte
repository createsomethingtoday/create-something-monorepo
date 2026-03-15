<script lang="ts">
	import { widgetRegistry } from './registry';
	import type { ConciergeWidget } from './types';

	export let widgets: ConciergeWidget[] = [];
	export let placement: 'inline' | 'rail' | 'any' = 'any';

	$: visibleWidgets =
		placement === 'any'
			? widgets
			: widgets.filter((widget) => widget.placement === placement);
</script>

{#if visibleWidgets.length === 0}
	<div class="empty glass">No active widgets for this surface.</div>
{:else}
	<div class="renderer">
		{#each visibleWidgets as widget (widget.id)}
			{@const component = widgetRegistry[widget.type]}
			<section class="widget-card glass">
				<header class="widget-header">
					<h3>{widget.title}</h3>
					<span class="status-pill">{widget.type.replace('_', ' ')}</span>
				</header>
				<svelte:component this={component} widget={widget} />
			</section>
		{/each}
	</div>
{/if}

<style>
	.renderer {
		display: grid;
		gap: 1rem;
	}

	.widget-card,
	.empty {
		padding: 1.1rem;
	}

	.widget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.95rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
	}
</style>
