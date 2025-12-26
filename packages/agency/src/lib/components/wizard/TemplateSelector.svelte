<script lang="ts">
	/**
	 * Template Selector - Step 1
	 *
	 * Display available templates with live previews.
	 */

	import { wizardState, selectedTemplate, TEMPLATES } from '$lib/stores/wizardState';
</script>

<div class="template-selector">
	<h2 class="step-title">Choose your template</h2>
	<p class="step-description">Select a design that fits your business</p>

	<div class="template-grid">
		{#each TEMPLATES as template}
			<button
				class="template-card"
				class:selected={$selectedTemplate === template.id}
				onclick={() => wizardState.selectTemplate(template.id)}
			>
				<div class="template-preview">
					<div class="preview-placeholder">
						<span class="preview-icon">🎨</span>
					</div>
				</div>
				<div class="template-info">
					<h3 class="template-name">{template.name}</h3>
					<p class="template-description">{template.description}</p>
					<span class="template-category">{template.category}</span>
				</div>
				{#if $selectedTemplate === template.id}
					<div class="selected-badge">✓</div>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.template-selector {
		text-align: center;
	}

	.step-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.step-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.template-grid {
			grid-template-columns: 1fr;
		}
	}

	.template-card {
		position: relative;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 0;
		cursor: pointer;
		text-align: left;
		overflow: hidden;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.template-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.template-card.selected {
		border-color: var(--color-fg-primary);
		border-width: 2px;
	}

	.template-preview {
		aspect-ratio: 16/9;
		background: var(--color-bg-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.preview-icon {
		font-size: 2rem;
		opacity: 0.5;
	}

	.template-info {
		padding: var(--space-md);
	}

	.template-name {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.template-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.template-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-subtle);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
	}

	.selected-badge {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 24px;
		height: 24px;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-caption);
	}
</style>
