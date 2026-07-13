<script lang="ts">
	/**
	 * IntegrationFlow - Visual representation of workflow integrations
	 *
	 * Displays a row of integration icons on liquid glass with a description.
	 * Uses double-blur nested glass technique for high-quality rendering.
	 *
	 * Philosophy: Shows "the parts, assembled" - how services connect
	 * through the automation layer. The cockpit of the automation vehicle.
	 *
	 * @example
	 * <IntegrationFlow
	 *   integrations={[
	 *     { label: 'Zo', name: 'Zoom' },
	 *     { label: 'No', name: 'Notion' },
	 *     { label: 'Sl', name: 'Slack' }
	 *   ]}
	 *   description="Meeting ends → Notes created → Team notified"
	 *   iconVariant="deep"
	 *   showConnectors
	 *   animateFlow
	 * />
	 */
	import LiquidGlass from './LiquidGlass.svelte';
	import LiquidGlassIcon from './LiquidGlassIcon.svelte';

	type GlassMode = 'solid' | 'smooth' | 'refraction';
	type Intensity = 'subtle' | 'medium' | 'strong';
	type Tint = 'none' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
	type IconVariant = 'standard' | 'deep';

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
		/** Glass mode: 'solid' (clean dark bg), 'smooth' (blur), or 'refraction' (warping) */
		glassMode?: GlassMode;
		/** Glass refraction intensity - only applies when glassMode='refraction' */
		intensity?: Intensity;
		/** Semantic color tint */
		tint?: Tint;
		/** Show animated grid pattern in background */
		showGrid?: boolean;
		/** Icon style variant - 'deep' uses Aurora-style glass */
		iconVariant?: IconVariant;
		/** Show animated connector lines between icons */
		showConnectors?: boolean;
		/** Animate particles along the connector paths */
		animateFlow?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		integrations,
		description,
		glassMode = 'solid',
		intensity = 'medium',
		tint = 'none',
		showGrid = true,
		iconVariant = 'standard',
		showConnectors = false,
		animateFlow = false,
		class: className = ''
	}: Props = $props();

	// Generate unique ID for SVG definitions
	const connectorId = Math.random().toString(36).substring(2, 9);
</script>

<LiquidGlass mode={glassMode} {intensity} {tint} {showGrid} aspectRatio="video" class={className}>
	<div class="flow-content">
		<!-- Integration icons row -->
		<div class="icons-row" class:with-connectors={showConnectors} role="list" aria-label="Integration flow">
			{#each integrations as integration, index}
				<div class="integration-item">
					<LiquidGlassIcon size="md" variant={iconVariant}>
						{#if integration.icon}
							{@render integration.icon()}
						{:else}
							<span aria-label={integration.name || integration.label}>
								{integration.label}
							</span>
						{/if}
					</LiquidGlassIcon>
				</div>

				{#if index < integrations.length - 1}
					{#if showConnectors}
						<!-- SVG connector with optional animation -->
						<svg class="connector" width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
							<defs>
								<linearGradient id="connector-gradient-{connectorId}-{index}" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stop-color="rgba(255, 255, 255, 0.1)" />
									<stop offset="50%" stop-color="rgba(255, 255, 255, 0.5)" />
									<stop offset="100%" stop-color="rgba(255, 255, 255, 0.1)" />
								</linearGradient>
								<filter id="connector-glow-{connectorId}-{index}" x="-50%" y="-50%" width="200%" height="200%">
									<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
									<feMerge>
										<feMergeNode in="blur" />
										<feMergeNode in="SourceGraphic" />
									</feMerge>
								</filter>
							</defs>

							<!-- Main connector line -->
							<path
								d="M 0 12 L 40 12"
								fill="none"
								stroke="url(#connector-gradient-{connectorId}-{index})"
								stroke-width="1.5"
								stroke-linecap="round"
								filter="url(#connector-glow-{connectorId}-{index})"
							/>

							<!-- Animated particle -->
							{#if animateFlow}
								<circle r="2" fill="white" opacity="0.8">
									<animateMotion
										dur="{1.5 + index * 0.2}s"
										repeatCount="indefinite"
										path="M 0 12 L 40 12"
									/>
									<animate
										attributeName="opacity"
										values="0;0.8;0.8;0"
										dur="{1.5 + index * 0.2}s"
										repeatCount="indefinite"
									/>
								</circle>
							{/if}
						</svg>
					{:else}
						<!-- Simple arrow fallback -->
						<span class="arrow" aria-hidden="true">→</span>
					{/if}
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

	.icons-row.with-connectors {
		gap: 0.25rem;
	}

	.integration-item {
		display: flex;
		align-items: center;
	}

	.connector {
		flex-shrink: 0;
		overflow: visible;
	}

	.arrow {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.875rem;
	}

	.description {
		color: rgba(255, 255, 255, 0.5);
		font-size: var(--text-performance-body-sm, 0.875rem);
		margin: 0;
		line-height: 1.5;
	}

	/* Reduced motion - disable animation */
	@media (prefers-reduced-motion: reduce) {
		.connector circle {
			animation: none;
		}

		.connector circle animateMotion,
		.connector circle animate {
			display: none;
		}
	}
</style>
