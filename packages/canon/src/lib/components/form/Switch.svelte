<script lang="ts">
	/**
	 * Switch Component
	 *
	 * A toggle switch for boolean values with accessible labeling.
	 * Uses the switch role for proper screen reader announcement.
	 *
	 * Canon: The switch disappears; only the state remains.
	 */

	interface Props {
		/** Whether the switch is on (bindable) */
		checked?: boolean;
		/** Switch label */
		label?: string;
		/** Helper description below label */
		description?: string;
		/** Whether switch is disabled */
		disabled?: boolean;
		/** Switch name attribute */
		name?: string;
		/** Switch id (auto-generated if not provided) */
		id?: string;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
		/** Label position */
		labelPosition?: 'left' | 'right';
		/** Called when switch state changes */
		onchange?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		name,
		id,
		size = 'md',
		labelPosition = 'right',
		onchange
	}: Props = $props();

	// Generate unique ID if not provided
	const fallbackFieldId = `switch-${crypto.randomUUID().slice(0, 8)}`;
	const fieldId = $derived(id || fallbackFieldId);
	const descriptionId = $derived(`${fieldId}-description`);

	function handleClick() {
		if (!disabled) {
			checked = !checked;
			onchange?.(checked);
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			handleClick();
		}
	}
</script>

<div
	class="switch"
	class:switch-sm={size === 'sm'}
	class:switch-lg={size === 'lg'}
	class:switch-label-left={labelPosition === 'left'}
>
	{#if label && labelPosition === 'left'}
		<div class="switch-content">
			<label for={fieldId} class="switch-label">
				{label}
			</label>
			{#if description}
				<p id={descriptionId} class="switch-description">
					{description}
				</p>
			{/if}
		</div>
	{/if}

	<button
		type="button"
		id={fieldId}
		{name}
		role="switch"
		aria-checked={checked}
		aria-describedby={description ? descriptionId : undefined}
		aria-label={label || 'Toggle switch'}
		{disabled}
		class="switch-track"
		class:checked
		onclick={handleClick}
		onkeydown={handleKeyDown}
	>
		<span class="switch-thumb" aria-hidden="true"></span>
	</button>

	{#if label && labelPosition === 'right'}
		<div class="switch-content">
			<label for={fieldId} class="switch-label">
				{label}
			</label>
			{#if description}
				<p id={descriptionId} class="switch-description">
					{description}
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.switch {
		display: flex;
		align-items: flex-start;
		gap: var(--space-performance-sm);
	}

	.switch-label-left {
		flex-direction: row-reverse;
		justify-content: flex-end;
	}

	/* Track */
	.switch-track {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--color-performance-bg-subtle);
		border: 2px solid var(--color-performance-border-default);
		border-radius: var(--radius-performance-scale-full);
		cursor: pointer;
		flex-shrink: 0;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
		padding: 0;
	}

	.switch-track:hover:not(:disabled) {
		border-color: var(--color-performance-border-emphasis);
	}

	.switch-track:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 2px;
	}

	.switch-track.checked {
		background: var(--color-performance-fg-primary);
		border-color: var(--color-performance-fg-primary);
	}

	.switch-track:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Thumb */
	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: var(--color-performance-fg-muted);
		border-radius: var(--radius-performance-scale-full);
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.switch-track.checked .switch-thumb {
		left: calc(100% - 18px);
		background: var(--color-performance-bg-pure);
	}

	/* Content area */
	.switch-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-top: 2px; /* Align with switch */
	}

	/* Label */
	.switch-label {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
		cursor: pointer;
		user-select: none;
	}

	.switch-track:disabled ~ .switch-content .switch-label,
	.switch-content:has(+ .switch-track:disabled) .switch-label {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Description */
	.switch-description {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: 0;
	}

	/* Size variants */
	.switch-sm .switch-track {
		width: 36px;
		height: 20px;
	}

	.switch-sm .switch-thumb {
		width: 12px;
		height: 12px;
	}

	.switch-sm .switch-track.checked .switch-thumb {
		left: calc(100% - 14px);
	}

	.switch-sm .switch-label {
		font-size: var(--text-performance-body-sm);
	}

	.switch-lg .switch-track {
		width: 52px;
		height: 28px;
	}

	.switch-lg .switch-thumb {
		width: 20px;
		height: 20px;
	}

	.switch-lg .switch-track.checked .switch-thumb {
		left: calc(100% - 22px);
	}

	.switch-lg .switch-label {
		font-size: var(--text-performance-body-lg);
	}
</style>
