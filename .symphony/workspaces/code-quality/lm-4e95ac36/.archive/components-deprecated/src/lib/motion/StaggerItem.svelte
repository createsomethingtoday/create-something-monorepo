<script lang="ts">
	/**
	 * StaggerItem - Child wrapper for StaggerContainer
	 *
	 * Wrap each child in a StaggerContainer with this component.
	 *
	 * @example
	 * <StaggerContainer>
	 *   <StaggerItem><Card>First</Card></StaggerItem>
	 *   <StaggerItem><Card>Second</Card></StaggerItem>
	 * </StaggerContainer>
	 */

	interface Props {
		/** Additional classes */
		class?: string;
		/** Children */
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="stagger-item {className}">
	{@render children?.()}
</div>

<style>
	.stagger-item {
		/* Styles controlled by parent StaggerContainer */
	}
</style>
