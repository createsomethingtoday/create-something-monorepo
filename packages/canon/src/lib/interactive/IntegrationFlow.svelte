<script lang="ts">
	/**
	 * IntegrationFlow - Visual representation of workflow integrations
	 *
	 * Displays named integration steps on a solid owning surface by default.
	 * Smooth and refraction modes retain explicit decorative glass compatibility.
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
		/** Glass mode: 'solid' (owning palette), 'smooth' (blur), or 'refraction' (warping) */
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

	const connectorId = $props.id();
</script>

{#snippet content()}
	<div class="flow-content">
		<!-- Integration icons row -->
		<div class="icons-row" class:with-connectors={showConnectors} role="list" aria-label="Integration flow, in order">
			{#each integrations as integration, index}
				<div class="integration-item" role="listitem">
                    <div class="service">
                      {#if glassMode === 'solid'}
                        <div class="solid-icon" aria-hidden="true">
                          {#if integration.icon}{@render integration.icon()}{:else}{integration.label}{/if}
                        </div>
                      {:else}
					<LiquidGlassIcon size="md" variant={iconVariant}>
						{#if integration.icon}
							{@render integration.icon()}
						{:else}
							<span aria-label={integration.name || integration.label}>
								{integration.label}
							</span>
						{/if}
					</LiquidGlassIcon>
                      {/if}
 <span class="service-name">{integration.name || integration.label}</span>
                    </div>
				</div>

				{#if index < integrations.length - 1}
					{#if showConnectors}
						<!-- SVG connector with optional animation -->
						<svg class="connector" width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
							<defs>
								<linearGradient id="connector-gradient-{connectorId}-{index}" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="40" y2="12">
									<stop offset="0%" stop-color="var(--color-performance-border-default)" />
									<stop offset="50%" stop-color="var(--color-performance-fg-secondary)" />
									<stop offset="100%" stop-color="var(--color-performance-border-default)" />
								</linearGradient>
								<filter id="connector-glow-{connectorId}-{index}" filterUnits="userSpaceOnUse" x="-8" y="4" width="56" height="16">
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
								filter={glassMode === 'solid' ? undefined : `url(#connector-glow-${connectorId}-${index})`}
							/>

							<!-- Animated particle -->
							{#if animateFlow}
								<circle r="2" fill="currentColor" opacity="0.8">
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
{/snippet}
{#if glassMode === 'solid'}
 <div class="solid-flow {className}">{@render content()}</div>
{:else}
 <LiquidGlass mode={glassMode} {intensity} {tint} {showGrid} aspectRatio="auto" class={className}>{@render content()}</LiquidGlass>
{/if}

<style>
 .solid-flow{background:var(--color-performance-bg-subtle);color:var(--color-performance-fg-primary);border:1px solid var(--color-performance-border-default);border-radius:var(--radius-performance-scale-md);padding:clamp(1rem,3vw,2rem);box-sizing:border-box;min-width:0}
 .flow-content{width:100%;text-align:center;color:var(--color-performance-fg-primary)}
 .icons-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:1rem;margin-bottom:1.5rem}
 .integration-item{display:flex;align-items:center;gap:1rem;min-width:0;max-width:100%} .icons-row.with-connectors{gap:.25rem} .icons-row.with-connectors .integration-item{flex-direction:column}
 .service{display:flex;flex-direction:column;align-items:center;gap:.5rem;min-width:0;max-width:10rem}
 .solid-icon{display:grid;place-items:center;width:64px;height:64px;border:1px solid var(--color-performance-border-emphasis);border-radius:var(--radius-performance-scale-md);background:var(--color-performance-bg-surface);font-weight:600;color:var(--color-performance-fg-primary)}
 .service-name{font-size:var(--text-performance-body-sm);overflow-wrap:anywhere;color:var(--color-performance-fg-primary)}
 .arrow{align-self:flex-start;margin-top:1rem;line-height:2rem;color:var(--color-performance-fg-secondary);font-size:1.25rem}
 .description{color:var(--color-performance-fg-secondary);font-size:var(--text-performance-body-sm);margin:0;line-height:1.5;overflow-wrap:anywhere}
 .connector{flex-shrink:0;margin-top:20px;color:var(--color-performance-fg-secondary)}
 @media(prefers-reduced-motion:reduce){.connector circle{display:none}}
 @media(max-width:440px){.icons-row{flex-direction:column;align-items:center}.integration-item{flex-direction:column;gap:.75rem}.arrow{align-self:center;margin-top:0;line-height:1.5rem;transform:rotate(90deg)}.connector{margin-block:8px;transform:rotate(90deg)}}
</style>
