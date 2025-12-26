<script lang="ts">
	/**
	 * Business Info - Step 3
	 *
	 * Collect core business information for the site.
	 */

	import { wizardState } from '$lib/stores/wizardState';

	let name = $wizardState.config.name || '';
	let tagline = $wizardState.config.tagline || '';
	let email = $wizardState.config.email || '';
	let phone = $wizardState.config.phone || '';

	function updateConfig() {
		wizardState.updateConfig({ name, tagline, email, phone });
	}
</script>

<div class="business-info">
	<h2 class="step-title">Tell us about your business</h2>
	<p class="step-description">This information will appear on your site</p>

	<form class="form" onsubmit={(e) => e.preventDefault()}>
		<div class="form-group">
			<label class="form-label" for="name">
				Business Name <span class="required">*</span>
			</label>
			<input
				type="text"
				id="name"
				class="form-input"
				bind:value={name}
				oninput={updateConfig}
				placeholder="Your Company Name"
				required
			/>
		</div>

		<div class="form-group">
			<label class="form-label" for="tagline">Tagline</label>
			<input
				type="text"
				id="tagline"
				class="form-input"
				bind:value={tagline}
				oninput={updateConfig}
				placeholder="A brief description of what you do"
			/>
		</div>

		<div class="form-row">
			<div class="form-group">
				<label class="form-label" for="email">Contact Email</label>
				<input
					type="email"
					id="email"
					class="form-input"
					bind:value={email}
					oninput={updateConfig}
					placeholder="hello@company.com"
				/>
			</div>

			<div class="form-group">
				<label class="form-label" for="phone">Phone</label>
				<input
					type="tel"
					id="phone"
					class="form-input"
					bind:value={phone}
					oninput={updateConfig}
					placeholder="(555) 123-4567"
				/>
			</div>
		</div>
	</form>
</div>

<style>
	.business-info {
		max-width: 500px;
		margin: 0 auto;
	}

	.step-title {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
		text-align: center;
	}

	.step-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	@media (max-width: 480px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.form-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.required {
		color: var(--color-error);
	}

	.form-input {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-input::placeholder {
		color: var(--color-fg-muted);
	}
</style>
