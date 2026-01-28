<script lang="ts">
	/**
	 * Checkbox Component
	 *
	 * A fully accessible checkbox with label and description support.
	 * Uses a custom-styled checkbox that maintains native accessibility.
	 *
	 * Canon: The checkbox disappears; only the choice remains.
	 */

	interface Props {
		/** Whether the checkbox is checked (bindable) */
		checked?: boolean;
		/** Checkbox label */
		label?: string;
		/** Helper description below label */
		description?: string;
		/** Whether checkbox is disabled */
		disabled?: boolean;
		/** Whether checkbox is in indeterminate state */
		indeterminate?: boolean;
		/** Checkbox name attribute */
		name?: string;
		/** Checkbox value attribute */
		value?: string;
		/** Checkbox id (auto-generated if not provided) */
		id?: string;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Called when checkbox state changes */
		onchange?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		indeterminate = false,
		name,
		value,
		id,
		size = 'md',
		onchange
	}: Props = $props();

	// Generate unique ID if not provided
	const fieldId = id || `checkbox-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${fieldId}-description`;
</script>

<div class="checkbox" class:checkbox-sm={size === 'sm'} class:checkbox-lg={size === 'lg'}>
	<div class="checkbox-control">
		<input
			type="checkbox"
			id={fieldId}
			{name}
			{value}
			bind:checked
			{disabled}
			bind:indeterminate
			class="checkbox-input"
			aria-describedby={description ? descriptionId : undefined}
			{onchange}
		/>
		<span class="checkbox-box" aria-hidden="true">
			{#if checked}
				<svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			{:else if indeterminate}
				<svg class="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			{/if}
		</span>
	</div>

	{#if label || description}
		<div class="checkbox-content">
			{#if label}
				<label for={fieldId} class="checkbox-label">
					{label}
				</label>
			{/if}
			{#if description}
				<p id={descriptionId} class="checkbox-description">
					{description}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.checkbox {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	/* Control wrapper */
	.checkbox-control {
		position: relative;
		flex-shrink: 0;
	}

	/* Hidden native input */
	.checkbox-input {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
		margin: 0;
	}

	.checkbox-input:disabled {
		cursor: not-allowed;
	}

	/* Custom checkbox box */
	.checkbox-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: var(--color-bg-elevated);
		border: 2px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	/* Hover state */
	.checkbox-input:hover:not(:disabled) + .checkbox-box {
		border-color: var(--color-border-emphasis);
	}

	/* Focus state */
	.checkbox-input:focus-visible + .checkbox-box {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Checked state */
	.checkbox-input:checked + .checkbox-box {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	/* Indeterminate state */
	.checkbox-input:indeterminate + .checkbox-box {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	/* Disabled state */
	.checkbox-input:disabled + .checkbox-box {
		opacity: 0.5;
		background: var(--color-bg-subtle);
	}

	/* Checkmark icon */
	.checkbox-icon {
		width: 14px;
		height: 14px;
		color: var(--color-bg-pure);
	}

	/* Content area */
	.checkbox-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-top: 1px; /* Align with checkbox */
	}

	/* Label */
	.checkbox-label {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		cursor: pointer;
		user-select: none;
	}

	.checkbox-input:disabled ~ .checkbox-content .checkbox-label {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Description */
	.checkbox-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Size variants */
	.checkbox-sm .checkbox-box {
		width: 16px;
		height: 16px;
	}

	.checkbox-sm .checkbox-icon {
		width: 10px;
		height: 10px;
	}

	.checkbox-sm .checkbox-label {
		font-size: var(--text-body-sm);
	}

	.checkbox-lg .checkbox-box {
		width: 24px;
		height: 24px;
	}

	.checkbox-lg .checkbox-icon {
		width: 16px;
		height: 16px;
	}

	.checkbox-lg .checkbox-label {
		font-size: var(--text-body-lg);
	}
</style>
