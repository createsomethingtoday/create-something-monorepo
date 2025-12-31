<script lang="ts">
	/**
	 * OTPInput Component
	 *
	 * PIN/verification code entry with individual input boxes.
	 * Auto-advances on input, supports paste, and backspace navigation.
	 *
	 * Canon principle: Verification should feel seamless.
	 *
	 * @example
	 * <OTPInput
	 *   bind:value={code}
	 *   length={6}
	 *   oncomplete={(code) => verifyCode(code)}
	 * />
	 */

	interface Props {
		/** The OTP value (bindable) */
		value?: string;
		/** Number of digits */
		length?: number;
		/** Input type (number or text) */
		type?: 'number' | 'text';
		/** Placeholder character */
		placeholder?: string;
		/** Disabled state */
		disabled?: boolean;
		/** Error state */
		error?: boolean;
		/** Auto-focus first input on mount */
		autofocus?: boolean;
		/** Called when value changes */
		onchange?: (value: string) => void;
		/** Called when all digits are entered */
		oncomplete?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		length = 6,
		type = 'number',
		placeholder = '○',
		disabled = false,
		error = false,
		autofocus = false,
		onchange,
		oncomplete
	}: Props = $props();

	let inputs: HTMLInputElement[] = $state([]);
	let digits = $state<string[]>(Array(length).fill(''));

	// Sync internal digits with external value
	$effect(() => {
		const chars = value.split('').slice(0, length);
		digits = [...chars, ...Array(length - chars.length).fill('')];
	});

	// Update external value when digits change
	function updateValue() {
		const newValue = digits.join('');
		if (newValue !== value) {
			value = newValue;
			onchange?.(newValue);

			if (newValue.length === length) {
				oncomplete?.(newValue);
			}
		}
	}

	// Handle input at specific index
	function handleInput(index: number, event: Event) {
		const input = event.target as HTMLInputElement;
		let inputValue = input.value;

		// For number type, filter non-digits
		if (type === 'number') {
			inputValue = inputValue.replace(/\D/g, '');
		}

		// Handle paste of multiple characters
		if (inputValue.length > 1) {
			const chars = inputValue.split('').slice(0, length - index);
			chars.forEach((char, i) => {
				if (index + i < length) {
					digits[index + i] = char;
				}
			});
			updateValue();

			// Focus appropriate input after paste
			const nextIndex = Math.min(index + chars.length, length - 1);
			inputs[nextIndex]?.focus();
			return;
		}

		// Single character input
		digits[index] = inputValue.slice(-1);
		updateValue();

		// Auto-advance to next input
		if (inputValue && index < length - 1) {
			inputs[index + 1]?.focus();
		}
	}

	// Handle keydown for navigation
	function handleKeydown(index: number, event: KeyboardEvent) {
		const input = event.target as HTMLInputElement;

		switch (event.key) {
			case 'Backspace':
				if (!digits[index] && index > 0) {
					// If current is empty, go back and clear previous
					event.preventDefault();
					digits[index - 1] = '';
					updateValue();
					inputs[index - 1]?.focus();
				} else if (digits[index]) {
					// Clear current
					digits[index] = '';
					updateValue();
				}
				break;

			case 'Delete':
				digits[index] = '';
				updateValue();
				break;

			case 'ArrowLeft':
				event.preventDefault();
				if (index > 0) {
					inputs[index - 1]?.focus();
				}
				break;

			case 'ArrowRight':
				event.preventDefault();
				if (index < length - 1) {
					inputs[index + 1]?.focus();
				}
				break;

			case 'Home':
				event.preventDefault();
				inputs[0]?.focus();
				break;

			case 'End':
				event.preventDefault();
				inputs[length - 1]?.focus();
				break;

			// Allow paste
			case 'v':
				if (event.ctrlKey || event.metaKey) {
					// Let paste happen naturally, handleInput will process
				}
				break;

			default:
				// For number type, prevent non-digit input
				if (type === 'number' && event.key.length === 1 && !/\d/.test(event.key)) {
					event.preventDefault();
				}
		}
	}

	// Handle paste event
	function handlePaste(index: number, event: ClipboardEvent) {
		event.preventDefault();
		const pastedData = event.clipboardData?.getData('text') || '';

		let cleanData = pastedData;
		if (type === 'number') {
			cleanData = pastedData.replace(/\D/g, '');
		}

		const chars = cleanData.split('').slice(0, length - index);
		chars.forEach((char, i) => {
			if (index + i < length) {
				digits[index + i] = char;
			}
		});
		updateValue();

		// Focus appropriate input after paste
		const nextIndex = Math.min(index + chars.length, length - 1);
		inputs[nextIndex]?.focus();
	}

	// Handle focus - select content
	function handleFocus(event: FocusEvent) {
		const input = event.target as HTMLInputElement;
		input.select();
	}

	// Auto-focus on mount
	$effect(() => {
		if (autofocus && inputs[0]) {
			inputs[0].focus();
		}
	});
</script>

<div
	class="otp-input"
	class:error
	class:disabled
	role="group"
	aria-label="One-time password input"
>
	{#each Array(length) as _, index}
		<input
			bind:this={inputs[index]}
			type={type === 'number' ? 'tel' : 'text'}
			inputmode={type === 'number' ? 'numeric' : 'text'}
			pattern={type === 'number' ? '[0-9]*' : undefined}
			maxlength="1"
			value={digits[index]}
			{placeholder}
			{disabled}
			class="otp-digit"
			class:filled={digits[index]}
			oninput={(e) => handleInput(index, e)}
			onkeydown={(e) => handleKeydown(index, e)}
			onpaste={(e) => handlePaste(index, e)}
			onfocus={handleFocus}
			aria-label="Digit {index + 1} of {length}"
			autocomplete="one-time-code"
		/>
	{/each}
</div>

<style>
	.otp-input {
		display: flex;
		gap: var(--space-xs, 0.5rem);
		justify-content: center;
	}

	.otp-input.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.otp-digit {
		width: 48px;
		height: 56px;
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: var(--radius-md, 8px);
		font-size: var(--text-h3, clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem));
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		text-align: center;
		caret-color: var(--color-fg-primary, #fff);
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.otp-digit::placeholder {
		color: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		font-weight: 400;
	}

	.otp-digit:hover:not(:disabled) {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.otp-digit:focus {
		outline: none;
		border-color: var(--color-border-strong, rgba(255, 255, 255, 0.3));
		box-shadow: 0 0 0 3px var(--color-focus, rgba(255, 255, 255, 0.5));
	}

	.otp-digit.filled {
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		background: var(--color-bg-subtle, #1a1a1a);
	}

	/* Error state */
	.otp-input.error .otp-digit {
		border-color: var(--color-error, #d44d4d);
	}

	.otp-input.error .otp-digit:focus {
		box-shadow: 0 0 0 3px var(--color-error-muted, rgba(212, 77, 77, 0.2));
	}

	/* Responsive */
	@media (max-width: 480px) {
		.otp-digit {
			width: 40px;
			height: 48px;
			font-size: var(--text-body-lg, 1.125rem);
		}

		.otp-input {
			gap: 6px;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.otp-digit {
			transition: none;
		}
	}
</style>
