<script lang="ts">
	/**
	 * MaterialPalette Component
	 *
	 * Material presence in dwelling.
	 * Heidegger: Things gather the fourfold—earth, sky, mortals, divinities.
	 * Materials are how earth appears in dwelling.
	 * Rams: Honest materials, nothing decorative.
	 */

	export interface Material {
		name: string;
		category: 'structure' | 'envelope' | 'interior' | 'exterior';
		color: string;
		texture?: string;
		location: string;
		notes?: string;
	}

	interface Props {
		materials: Material[];
		projectName?: string;
		showCaption?: boolean;
	}

	let { materials, projectName = 'Material Palette', showCaption = true }: Props = $props();

	// Group materials by category
	const grouped = $derived(
		materials.reduce(
			(acc, mat) => {
				if (!acc[mat.category]) acc[mat.category] = [];
				acc[mat.category].push(mat);
				return acc;
			},
			{} as Record<string, Material[]>
		)
	);

	const categoryOrder: Material['category'][] = ['structure', 'envelope', 'interior', 'exterior'];
	const categoryLabels: Record<Material['category'], string> = {
		structure: 'Structure',
		envelope: 'Envelope',
		interior: 'Interior',
		exterior: 'Exterior'
	};
</script>

<div class="palette-container">
	<header class="palette-header">
		<h3 class="palette-title">Material Palette</h3>
	</header>

	<div class="palette-grid">
		{#each categoryOrder as category}
			{#if grouped[category]}
				<div class="category-group">
					<span class="category-label">{categoryLabels[category]}</span>
					<div class="materials">
						{#each grouped[category] as material}
							<div class="material-swatch">
								<div
									class="swatch"
									style="background: {material.color};"
									title={material.name}
								></div>
								<div class="material-info">
									<span class="material-name">{material.name}</span>
									<span class="material-location">{material.location}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>

	{#if showCaption}
		<p class="caption">{projectName}</p>
	{/if}
</div>

<style>
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		font-family: var(--font-sans, system-ui, sans-serif);
		width: 100%;
		max-width: 600px;
	}

	.palette-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.palette-title {
		font-size: 11px;
		font-weight: 500;
		color: var(--color-fg-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
	}

	.palette-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.category-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.category-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.materials {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.material-swatch {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.swatch {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
	}

	.material-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.material-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.material-location {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.caption {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin: 0;
	}

	@media (max-width: 500px) {
		.palette-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
