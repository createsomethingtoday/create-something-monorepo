<script lang="ts">
	/**
	 * Content Setup - Step 4
	 *
	 * Template-specific content configuration (optional).
	 * Users can customize or use defaults.
	 */

	import { wizardState, TEMPLATES } from '$lib/stores/wizardState';

	$: template = TEMPLATES.find((t) => t.id === $wizardState.templateId);
</script>

<div class="content-setup">
	<h2 class="step-title">Set up your content</h2>
	<p class="step-description">
		Customize your {template?.name || 'site'} content, or use our defaults
	</p>

	<div class="content-options">
		<div class="option-card selected">
			<div class="option-icon">⚡</div>
			<h3 class="option-title">Use Smart Defaults</h3>
			<p class="option-description">
				Launch with professional placeholder content. You can customize everything later from your
				dashboard.
			</p>
			<span class="option-badge">Recommended</span>
		</div>

		<div class="option-card disabled">
			<div class="option-icon">✏️</div>
			<h3 class="option-title">Custom Content</h3>
			<p class="option-description">
				Set up your services, team, and portfolio now. Available after launch from your dashboard.
			</p>
			<span class="option-badge coming-soon">Coming Soon</span>
		</div>
	</div>

	<div class="note">
		<p>
			<strong>Note:</strong> All content can be easily edited from your site dashboard after launch. Start
			fast, refine later.
		</p>
	</div>
</div>

<style>
	.content-setup {
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

	.content-options {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
		max-width: 600px;
		margin: 0 auto var(--space-xl);
	}

	@media (max-width: 640px) {
		.content-options {
			grid-template-columns: 1fr;
		}
	}

	.option-card {
		position: relative;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-align: left;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.option-card.selected {
		border-color: var(--color-fg-primary);
		border-width: 2px;
	}

	.option-card.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.option-icon {
		font-size: 1.5rem;
		margin-bottom: var(--space-sm);
	}

	.option-title {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.option-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.5;
	}

	.option-badge {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		font-size: var(--text-caption);
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.option-badge.coming-soon {
		background: var(--color-bg-subtle);
		color: var(--color-fg-muted);
	}

	.note {
		background: var(--color-bg-subtle);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		max-width: 500px;
		margin: 0 auto;
	}

	.note p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.note strong {
		color: var(--color-fg-primary);
	}
</style>
