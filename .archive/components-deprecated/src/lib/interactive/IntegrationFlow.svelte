<script lang="ts">
	/**
	 * IntegrationFlow - Visual representation of workflow integrations
	 *
	 * Displays a row of integration icons on liquid glass with a description.
	 * Used to visualize the flow of data between services in a workflow.
	 *
	 * Philosophy: Shows "the parts, assembled" - how Cloudflare products
	 * (Workers, D1, Durable Objects) combine into complete outcomes.
	 *
	 * @example
	 * <IntegrationFlow
	 *   integrations={[
	 *     { label: 'Zo', name: 'Zoom' },
	 *     { label: 'No', name: 'Notion' },
	 *     { label: 'Sl', name: 'Slack' }
	 *   ]}
	 *   description="Meeting ends → Notes created → Team notified"
	 * />
	 */
	import LiquidGlass from './LiquidGlass.svelte';
	import LiquidGlassIcon from './LiquidGlassIcon.svelte';

	type Intensity = 'subtle' | 'medium' | 'strong';
	type Tint = 'none' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';

	interface Integration {
		/** Short label displayed in icon (2-3 chars) */
		label: string;
		/** Full service name (for accessibility) */
		name?: string;
		/** Optional icon component or element */
		icon?: import('svelte').Snippet;
	}

	interface Props {
		/** Array of integrations to display */
		integrations: Integration[];
		/** Description text below the icons */
		description: string;
		/** Glass refraction intensity */
		intensity?: Intensity;
		/** Semantic color tint */
		tint?: Tint;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		integrations,
		description,
		intensity = 'medium',
		tint = 'none',
		class: className = ''
	}: Props = $props();
</script>

<LiquidGlass {intensity} {tint} aspectRatio="video" class={className}>
	<div class="flow-content">
		<!-- Integration icons row -->
		<div class="icons-row" role="list" aria-label="Integration flow">
			{#each integrations as integration, index}
				<LiquidGlassIcon size="md">
					{#if integration.icon}
						{@render integration.icon()}
					{:else}
						<span aria-label={integration.name || integration.label}>
							{integration.label}
						</span>
					{/if}
				</LiquidGlassIcon>
				{#if index < integrations.length - 1}
					<span class="arrow" aria-hidden="true">→</span>
				{/if}
			{/each}
		</div>

		<!-- Description -->
		<p class="description">
			{description}
		</p>
	</div>
</LiquidGlass>

<style>
	.flow-content {
		text-align: center;
		width: 100%;
	}

	.icons-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.arrow {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.875rem;
	}

	.description {
		color: rgba(255, 255, 255, 0.4);
		font-size: var(--text-body-sm, 0.875rem);
		margin: 0;
		line-height: 1.5;
	}
</style>
