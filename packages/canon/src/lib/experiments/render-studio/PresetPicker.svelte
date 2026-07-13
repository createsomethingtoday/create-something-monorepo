<script lang="ts">
	/**
	 * PresetPicker - Exposes Canon render presets in a visual UI
	 *
	 * Canon advantage over Fenestra: Presets are *visible and named*—
	 * user understands what "threshold-dwelling" means, can learn the vocabulary.
	 */
	import Home from 'lucide-svelte/icons/home';
	import Square from 'lucide-svelte/icons/square';
	import TreeDeciduous from 'lucide-svelte/icons/tree-deciduous';
	import Factory from 'lucide-svelte/icons/factory';
	import Leaf from 'lucide-svelte/icons/leaf';
	import Sunrise from 'lucide-svelte/icons/sunrise';
	import Sunset from 'lucide-svelte/icons/sunset';
	import CloudSun from 'lucide-svelte/icons/cloud-sun';
	import Sun from 'lucide-svelte/icons/sun';
	import Cloud from 'lucide-svelte/icons/cloud';
	import Moon from 'lucide-svelte/icons/moon';
	import Maximize from 'lucide-svelte/icons/maximize';
	import Search from 'lucide-svelte/icons/search';
	import CornerUpRight from 'lucide-svelte/icons/corner-up-right';
	import DoorOpen from 'lucide-svelte/icons/door-open';
	import PanelTop from 'lucide-svelte/icons/panel-top';

	interface Props {
		onPresetChange?: (presets: {
			material: string;
			lighting: string;
			angle: string;
		}) => void;
	}

	let { onPresetChange }: Props = $props();

	// Icon component mapping
	const materialIcons: Record<string, typeof Home> = {
		'threshold-dwelling': Home,
		'modern-minimal': Square,
		'warm-contemporary': TreeDeciduous,
		industrial: Factory,
		scandinavian: Leaf
	};

	const lightingIcons: Record<string, typeof Sunrise> = {
		'golden-hour': Sunrise,
		'blue-hour': Sunset,
		morning: CloudSun,
		midday: Sun,
		overcast: Cloud,
		night: Moon
	};

	const angleIcons: Record<string, typeof Maximize> = {
		wide: Maximize,
		detail: Search,
		corner: CornerUpRight,
		entrance: DoorOpen,
		window: PanelTop
	};

	// Canon Material Presets (from render-pipeline/src/controlnet.ts)
	const MATERIAL_PRESETS = {
		'threshold-dwelling': {
			name: 'Threshold Dwelling',
			description: 'Concrete, steel, glass, cedar. Miesian architecture.'
		},
		'modern-minimal': {
			name: 'Modern Minimal',
			description: 'White walls, concrete floors, black steel frames.'
		},
		'warm-contemporary': {
			name: 'Warm Contemporary',
			description: 'Oak flooring, plaster walls, brass fixtures.'
		},
		industrial: {
			name: 'Industrial',
			description: 'Exposed brick, steel beams, Edison bulbs.'
		},
		scandinavian: {
			name: 'Scandinavian',
			description: 'Light oak, white walls, cozy textiles.'
		}
	};

	// Canon Lighting Presets
	const LIGHTING_PRESETS = {
		'golden-hour': {
			name: 'Golden Hour',
			description: 'Warm amber tones, long shadows.'
		},
		'blue-hour': {
			name: 'Blue Hour',
			description: 'Cool blue exterior, warm interior glow.'
		},
		morning: {
			name: 'Morning',
			description: 'Soft diffused sunlight, fresh atmosphere.'
		},
		midday: {
			name: 'Midday',
			description: 'Bright natural daylight, clear visibility.'
		},
		overcast: {
			name: 'Overcast',
			description: 'Even illumination, no harsh shadows.'
		},
		night: {
			name: 'Night',
			description: 'Warm interior lighting, night exterior.'
		}
	};

	// Canon Angle Presets
	const ANGLE_PRESETS = {
		wide: {
			name: 'Wide',
			description: 'Full room view, architectural photography.'
		},
		detail: {
			name: 'Detail',
			description: 'Close-up focused composition.'
		},
		corner: {
			name: 'Corner',
			description: 'Two walls visible, spatial depth.'
		},
		entrance: {
			name: 'Entrance',
			description: 'View from entrance, inviting perspective.'
		},
		window: {
			name: 'Window',
			description: 'Toward window, interior-exterior connection.'
		}
	};

	// Selected presets
	let selectedMaterial = $state('threshold-dwelling');
	let selectedLighting = $state('golden-hour');
	let selectedAngle = $state('wide');

	// Notify parent when presets change
	$effect(() => {
		onPresetChange?.({
			material: selectedMaterial,
			lighting: selectedLighting,
			angle: selectedAngle
		});
	});
</script>

<div class="preset-picker">
	<!-- Materials -->
	<section class="preset-section">
		<h3>Materials</h3>
		<p class="section-description">The architectural vocabulary that defines the space.</p>
		<div class="preset-grid">
			{#each Object.entries(MATERIAL_PRESETS) as [key, preset]}
				{@const IconComponent = materialIcons[key]}
				<button
					class="preset-card"
					class:selected={selectedMaterial === key}
					onclick={() => (selectedMaterial = key)}
				>
					<span class="preset-preview">
						{#if IconComponent}
							<IconComponent size={24} strokeWidth={1.5} />
						{/if}
					</span>
					<span class="preset-name">{preset.name}</span>
					<span class="preset-description">{preset.description}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Lighting -->
	<section class="preset-section">
		<h3>Lighting</h3>
		<p class="section-description">Time of day sets the emotional tone.</p>
		<div class="preset-grid lighting-grid">
			{#each Object.entries(LIGHTING_PRESETS) as [key, preset]}
				{@const IconComponent = lightingIcons[key]}
				<button
					class="preset-card compact"
					class:selected={selectedLighting === key}
					onclick={() => (selectedLighting = key)}
				>
					<span class="preset-preview">
						{#if IconComponent}
							<IconComponent size={20} strokeWidth={1.5} />
						{/if}
					</span>
					<span class="preset-name">{preset.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Angles -->
	<section class="preset-section">
		<h3>Camera Angle</h3>
		<p class="section-description">How the viewer experiences the space.</p>
		<div class="preset-grid angle-grid">
			{#each Object.entries(ANGLE_PRESETS) as [key, preset]}
				{@const IconComponent = angleIcons[key]}
				<button
					class="preset-card compact"
					class:selected={selectedAngle === key}
					onclick={() => (selectedAngle = key)}
				>
					<span class="preset-preview">
						{#if IconComponent}
							<IconComponent size={20} strokeWidth={1.5} />
						{/if}
					</span>
					<span class="preset-name">{preset.name}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Selected Summary -->
	<div class="selection-summary">
		<span class="summary-label">Selected:</span>
		<span class="summary-value">
			{MATERIAL_PRESETS[selectedMaterial as keyof typeof MATERIAL_PRESETS].name} ·
			{LIGHTING_PRESETS[selectedLighting as keyof typeof LIGHTING_PRESETS].name} ·
			{ANGLE_PRESETS[selectedAngle as keyof typeof ANGLE_PRESETS].name}
		</span>
	</div>
</div>

<style>
	.preset-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-lg);
	}

	.preset-section h3 {
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.section-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		margin: 0 0 var(--space-performance-sm) 0;
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-performance-sm);
	}

	.lighting-grid,
	.angle-grid {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	}

	.preset-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.preset-card:hover {
		border-color: var(--color-performance-border-emphasis);
		background: var(--color-performance-hover);
	}

	.preset-card.selected {
		border-color: var(--color-performance-fg-primary);
		background: var(--color-performance-active);
	}

	.preset-card.compact {
		flex-direction: row;
		align-items: center;
		padding: var(--space-performance-sm) var(--space-performance-md);
	}

	.preset-preview {
		font-size: 1.5rem;
		line-height: 1;
	}

	.preset-card.compact .preset-preview {
		font-size: 1.25rem;
	}

	.preset-name {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-primary);
	}

	.preset-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		line-height: var(--leading-performance-relaxed);
	}

	.selection-summary {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
	}

	.summary-label {
		color: var(--color-performance-fg-muted);
	}

	.summary-value {
		color: var(--color-performance-fg-primary);
		font-family: var(--font-performance-mono);
	}

	@media (max-width: 640px) {
		.preset-grid {
			grid-template-columns: 1fr;
		}

		.lighting-grid,
		.angle-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
