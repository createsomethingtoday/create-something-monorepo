<script lang="ts">
	/**
	 * PresetPicker - Exposes Canon render presets in a visual UI
	 *
	 * Canon advantage over Fenestra: Presets are *visible and named*—
	 * user understands what "threshold-dwelling" means, can learn the vocabulary.
	 */

	interface Props {
		onPresetChange?: (presets: {
			material: string;
			lighting: string;
			angle: string;
		}) => void;
	}

	let { onPresetChange }: Props = $props();

	// Canon Material Presets (from render-pipeline/src/controlnet.ts)
	const MATERIAL_PRESETS = {
		'threshold-dwelling': {
			name: 'Threshold Dwelling',
			description: 'Concrete, steel, glass, cedar. Miesian architecture.',
			preview: '🏠'
		},
		'modern-minimal': {
			name: 'Modern Minimal',
			description: 'White walls, concrete floors, black steel frames.',
			preview: '⬜'
		},
		'warm-contemporary': {
			name: 'Warm Contemporary',
			description: 'Oak flooring, plaster walls, brass fixtures.',
			preview: '🪵'
		},
		industrial: {
			name: 'Industrial',
			description: 'Exposed brick, steel beams, Edison bulbs.',
			preview: '🏭'
		},
		scandinavian: {
			name: 'Scandinavian',
			description: 'Light oak, white walls, cozy textiles.',
			preview: '🌿'
		}
	};

	// Canon Lighting Presets
	const LIGHTING_PRESETS = {
		'golden-hour': {
			name: 'Golden Hour',
			description: 'Warm amber tones, long shadows.',
			preview: '🌅'
		},
		'blue-hour': {
			name: 'Blue Hour',
			description: 'Cool blue exterior, warm interior glow.',
			preview: '🌆'
		},
		morning: {
			name: 'Morning',
			description: 'Soft diffused sunlight, fresh atmosphere.',
			preview: '🌤️'
		},
		midday: {
			name: 'Midday',
			description: 'Bright natural daylight, clear visibility.',
			preview: '☀️'
		},
		overcast: {
			name: 'Overcast',
			description: 'Even illumination, no harsh shadows.',
			preview: '☁️'
		},
		night: {
			name: 'Night',
			description: 'Warm interior lighting, night exterior.',
			preview: '🌙'
		}
	};

	// Canon Angle Presets
	const ANGLE_PRESETS = {
		wide: {
			name: 'Wide',
			description: 'Full room view, architectural photography.',
			preview: '📐'
		},
		detail: {
			name: 'Detail',
			description: 'Close-up focused composition.',
			preview: '🔍'
		},
		corner: {
			name: 'Corner',
			description: 'Two walls visible, spatial depth.',
			preview: '📏'
		},
		entrance: {
			name: 'Entrance',
			description: 'View from entrance, inviting perspective.',
			preview: '🚪'
		},
		window: {
			name: 'Window',
			description: 'Toward window, interior-exterior connection.',
			preview: '🪟'
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
				<button
					class="preset-card"
					class:selected={selectedMaterial === key}
					onclick={() => (selectedMaterial = key)}
				>
					<span class="preset-preview">{preset.preview}</span>
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
				<button
					class="preset-card compact"
					class:selected={selectedLighting === key}
					onclick={() => (selectedLighting = key)}
				>
					<span class="preset-preview">{preset.preview}</span>
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
				<button
					class="preset-card compact"
					class:selected={selectedAngle === key}
					onclick={() => (selectedAngle = key)}
				>
					<span class="preset-preview">{preset.preview}</span>
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
		gap: var(--space-lg);
	}

	.preset-section h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm) 0;
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-sm);
	}

	.lighting-grid,
	.angle-grid {
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	}

	.preset-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-xs);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.preset-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.preset-card.selected {
		border-color: var(--color-fg-primary);
		background: var(--color-active);
	}

	.preset-card.compact {
		flex-direction: row;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
	}

	.preset-preview {
		font-size: 1.5rem;
		line-height: 1;
	}

	.preset-card.compact .preset-preview {
		font-size: 1.25rem;
	}

	.preset-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.preset-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: var(--leading-relaxed);
	}

	.selection-summary {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
	}

	.summary-label {
		color: var(--color-fg-muted);
	}

	.summary-value {
		color: var(--color-fg-primary);
		font-family: var(--font-mono);
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
