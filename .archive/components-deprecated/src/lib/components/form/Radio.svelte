<script lang="ts">
	/**
	 * Radio Component
	 *
	 * A fully accessible radio button with label and description support.
	 * Must be used within a RadioGroup for proper functionality.
	 *
	 * Canon: The radio disappears; only the choice remains.
	 */

	interface Props {
		/** Radio value */
		value: string;
		/** Radio label */
		label?: string;
		/** Helper description below label */
		description?: string;
		/** Whether radio is disabled */
		disabled?: boolean;
		/** Radio name attribute (usually set by RadioGroup) */
		name?: string;
		/** Whether this radio is checked (usually controlled by RadioGroup) */
		checked?: boolean;
		/** Radio id (auto-generated if not provided) */
		id?: string;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Called when radio is selected */
		onchange?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		value,
		label,
		description,
		disabled = false,
		name,
		checked = false,
		id,
		size = 'md',
		onchange
	}: Props = $props();

	// Generate unique ID if not provided
	const fieldId = id || `radio-${crypto.randomUUID().slice(0, 8)}`;
	const descriptionId = `${fieldId}-description`;
</script>

<div class="radio" class:radio-sm={size === 'sm'} class:radio-lg={size === 'lg'}>
	<div class="radio-control">
		<input
			type="radio"
			id={fieldId}
			{name}
			{value}
			{checked}
			{disabled}
			class="radio-input"
			aria-describedby={description ? descriptionId : undefined}
			{onchange}
		/>
		<span class="radio-circle" aria-hidden="true">
			<span class="radio-dot"></span>
		</span>
	</div>

	{#if label || description}
		<div class="radio-content">
			{#if label}
				<label for={fieldId} class="radio-label">
					{label}
				</label>
			{/if}
			{#if description}
				<p id={descriptionId} class="radio-description">
					{description}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.radio {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	/* Control wrapper */
	.radio-control {
		position: relative;
		flex-shrink: 0;
	}

	/* Hidden native input */
	.radio-input {
		position: absolute;
		opacity: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
		margin: 0;
	}

	.radio-input:disabled {
		cursor: not-allowed;
	}

	/* Custom radio circle */
	.radio-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: var(--color-bg-elevated);
		border: 2px solid var(--color-border-default);
		border-radius: var(--radius-full);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	/* Inner dot */
	.radio-dot {
		width: 8px;
		height: 8px;
		background: var(--color-bg-pure);
		border-radius: var(--radius-full);
		transform: scale(0);
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	/* Hover state */
	.radio-input:hover:not(:disabled) + .radio-circle {
		border-color: var(--color-border-emphasis);
	}

	/* Focus state */
	.radio-input:focus-visible + .radio-circle {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* Checked state */
	.radio-input:checked + .radio-circle {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.radio-input:checked + .radio-circle .radio-dot {
		transform: scale(1);
	}

	/* Disabled state */
	.radio-input:disabled + .radio-circle {
		opacity: 0.5;
		background: var(--color-bg-subtle);
	}

	/* Content area */
	.radio-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-top: 1px; /* Align with radio */
	}

	/* Label */
	.radio-label {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		cursor: pointer;
		user-select: none;
	}

	.radio-input:disabled ~ .radio-content .radio-label {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Description */
	.radio-description {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Size variants */
	.radio-sm .radio-circle {
		width: 16px;
		height: 16px;
	}

	.radio-sm .radio-dot {
		width: 6px;
		height: 6px;
	}

	.radio-sm .radio-label {
		font-size: var(--text-body-sm);
	}

	.radio-lg .radio-circle {
		width: 24px;
		height: 24px;
	}

	.radio-lg .radio-dot {
		width: 10px;
		height: 10px;
	}

	.radio-lg .radio-label {
		font-size: var(--text-body-lg);
	}
</style>
