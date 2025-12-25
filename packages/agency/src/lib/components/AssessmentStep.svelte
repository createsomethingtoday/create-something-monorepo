<script lang="ts">

	interface CheckboxOption {
		id: string;
		label: string;
		description: string;
	}

	interface Props {
		question: string;
		subtext: string;
		type: 'checkbox' | 'text';
		options?: CheckboxOption[];
		placeholder?: string;
		maxLength?: number;
		value: string[] | string;
		onchange: (value: string[] | string) => void;
		onsubmit: () => void;
	}

	let {
		question,
		subtext,
		type,
		options = [],
		placeholder = '',
		maxLength = 280,
		value,
		onchange,
		onsubmit
	}: Props = $props();

	// Auto-advance state
	let advanceTimer: ReturnType<typeof setTimeout> | null = null;
	let timerProgress = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let hasUserInteracted = $state(false); // Track if user made a NEW selection
	const AUTO_ADVANCE_MS = 800;
	const PROGRESS_INTERVAL = 16; // ~60fps

	// Derived validation
	let isValid = $derived(
		type === 'checkbox'
			? (value as string[]).length > 0
			: (value as string).trim().length > 0
	);

	// Auto-advance effect for checkbox selections - only after user interaction
	$effect(() => {
		if (type === 'checkbox' && (value as string[]).length > 0 && hasUserInteracted) {
			startAutoAdvance();
		} else {
			cancelAutoAdvance();
		}

		return () => cancelAutoAdvance();
	});

	function startAutoAdvance() {
		cancelAutoAdvance();
		timerProgress = 0;

		// Progress animation
		timerInterval = setInterval(() => {
			timerProgress = Math.min(timerProgress + (PROGRESS_INTERVAL / AUTO_ADVANCE_MS) * 100, 100);
		}, PROGRESS_INTERVAL);

		// Actual advance
		advanceTimer = setTimeout(() => {
			cancelAutoAdvance();
			onsubmit();
		}, AUTO_ADVANCE_MS);
	}

	function cancelAutoAdvance() {
		if (advanceTimer) {
			clearTimeout(advanceTimer);
			advanceTimer = null;
		}
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		timerProgress = 0;
	}

	function handleCheckboxChange(optionId: string) {
		hasUserInteracted = true;
		const currentValue = value as string[];

		if (currentValue.includes(optionId)) {
			// Already selected - advance immediately
			cancelAutoAdvance();
			onsubmit();
		} else {
			// New selection - replace previous (single-select)
			onchange([optionId]);
		}
	}

	function handleTextChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		onchange(target.value);
	}

	function handleKeydown(event: KeyboardEvent) {
		// Escape cancels auto-advance
		if (event.key === 'Escape') {
			cancelAutoAdvance();
			return;
		}
		// Enter advances (for text input or as fallback)
		if (event.key === 'Enter' && !event.shiftKey && isValid) {
			event.preventDefault();
			cancelAutoAdvance();
			onsubmit();
		}
	}

</script>

<svelte:window on:keydown={handleKeydown} />

<div class="step-container" role="group" aria-labelledby="step-question">
	<div class="step-header">
		<h2 id="step-question" class="step-question">{question}</h2>
		<p class="step-subtext">{subtext}</p>
	</div>

	<div class="step-input">
		{#if type === 'checkbox'}
			<div class="selection-list">
				{#each options as option}
					<label
						class="selection-option"
						class:selected={(value as string[]).includes(option.id)}
					>
						<input
							type="checkbox"
							checked={(value as string[]).includes(option.id)}
							onchange={() => handleCheckboxChange(option.id)}
						/>
						<span class="selection-content">
							<span class="selection-label">{option.label}</span>
							<span class="selection-description">{option.description}</span>
						</span>
						{#if (value as string[]).includes(option.id) && timerProgress > 0}
							<span class="progress-ring">
								<svg viewBox="0 0 24 24">
									<circle
										cx="12"
										cy="12"
										r="10"
										fill="none"
										stroke="var(--color-fg-subtle)"
										stroke-width="2"
									/>
									<circle
										cx="12"
										cy="12"
										r="10"
										fill="none"
										stroke="var(--color-fg-tertiary)"
										stroke-width="2"
										stroke-dasharray={2 * Math.PI * 10}
										stroke-dashoffset={2 * Math.PI * 10 * (1 - timerProgress / 100)}
										transform="rotate(-90 12 12)"
									/>
								</svg>
							</span>
						{/if}
					</label>
				{/each}
			</div>
		{:else}
			<div class="text-input-wrapper">
				<textarea
					class="text-input"
					{placeholder}
					maxlength={maxLength}
					value={value as string}
					oninput={handleTextChange}
					rows="3"
				></textarea>
				<span class="char-count" class:near-limit={(value as string).length > maxLength * 0.8}>
					{(value as string).length}/{maxLength}
				</span>
			</div>
		{/if}
	</div>

	<div class="step-actions">
		<button class="continue-button" class:has-selection={isValid} onclick={() => { cancelAutoAdvance(); onsubmit(); }}>
			Continue
		</button>
	</div>
</div>

<style>
	.step-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		width: 100%;
		max-width: 100%;
	}

	.step-header {
		text-align: center;
	}

	.step-question {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-sm);
	}

	.step-subtext {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.step-input {
		width: 100%;
	}

	/* Selection List - Horizontal Cards */
	.selection-list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.selection-list {
			grid-template-columns: 1fr;
		}
	}

	.selection-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-sm);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--duration-standard) var(--ease-standard);
		position: relative;
		min-height: 140px;
		justify-content: center;
	}

	.selection-option:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.selection-option.selected {
		border-color: var(--color-fg-tertiary);
		background: var(--color-active);
	}

	.selection-option input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.selection-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.selection-label {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.selection-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Progress Ring for Auto-advance */
	.progress-ring {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 20px;
		height: 20px;
	}

	.progress-ring svg {
		width: 100%;
		height: 100%;
	}

	.progress-ring circle {
		transition: stroke-dashoffset 16ms linear;
	}

	/* Text Input */
	.text-input-wrapper {
		position: relative;
	}

	.text-input {
		width: 100%;
		padding: var(--space-md);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		font-family: inherit;
		line-height: 1.6;
		resize: none;
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.text-input::placeholder {
		color: var(--color-fg-muted);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-fg-tertiary);
	}

	.char-count {
		position: absolute;
		bottom: var(--space-sm);
		right: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.char-count.near-limit {
		color: var(--color-warning);
	}

	/* Actions */
	.step-actions {
		display: flex;
		justify-content: center;
		margin-top: var(--space-sm);
	}

	.continue-button {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border: none;
		border-radius: var(--radius-full);
		cursor: pointer;
		opacity: 0.4;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.continue-button.has-selection {
		opacity: 1;
	}

	.continue-button:hover {
		opacity: 0.9;
	}
</style>
