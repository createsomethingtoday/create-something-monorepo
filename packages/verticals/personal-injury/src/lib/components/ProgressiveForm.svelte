<script lang="ts">
	/**
	 * ProgressiveForm - Heideggerian Lead Capture
	 *
	 * Philosophy: Disclosure over extraction.
	 *
	 * Stage 1: Just email (minimal friction, tests interest)
	 * Stage 2: Name appears (they've committed, humanize)
	 * Stage 3: Message appears (they want to say more)
	 *
	 * Each stage reveals itself only when the visitor demonstrates readiness.
	 * The form unfolds through their engagement, not our demands.
	 */


	interface Props {
		title?: string;
		subtitle?: string;
	}

	let {
		title = 'Inquire',
		subtitle = 'Email required. Response within 48 hours.'
	}: Props = $props();

	let stage = $state<1 | 2 | 3>(1);
	let email = $state('');
	let name = $state('');
	let message = $state('');
	let isSubmitting = $state(false);
	let submitStatus = $state<'idle' | 'success' | 'error'>('idle');
	let emailFocused = $state(false);

	// Progress to stage 2 when email is valid
	function handleEmailInput() {
		const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
		if (emailValid && stage === 1) {
			stage = 2;
		}
	}

	// Progress to stage 3 when name is entered
	function handleNameInput() {
		if (name.length > 2 && stage === 2) {
			stage = 3;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSubmitting = true;
		submitStatus = 'idle';

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, name, message })
			});

			if (response.ok) {
				submitStatus = 'success';
				email = '';
				name = '';
				message = '';
				stage = 1;
			} else {
				submitStatus = 'error';
			}
		} catch {
			submitStatus = 'error';
		} finally {
			isSubmitting = false;
		}
	}

	// Contextual subtitles based on stage
	// Voice: clarity over cleverness
	const subtitles = {
		1: subtitle,
		2: 'Name helps us personalize our response.',
		3: 'Project details. Location. Timeline. (Optional)'
	};
</script>

<section class="progressive-form-section">
	<div class="form-container">
		{#if submitStatus === 'success'}
			<div class="success-message page-enter">
				<h3>Received</h3>
				<p>Response within 48 hours.</p>
			</div>
		{:else}
			<div class="form-header">
				<h2 class="form-title">{title}</h2>
				<p class="form-subtitle">{subtitles[stage]}</p>
			</div>

			<form class="progressive-form" onsubmit={handleSubmit}>
				<!-- Stage 1: Email (always visible) -->
				<div class="form-field">
					<input
						type="email"
						placeholder="your@email.com"
						bind:value={email}
						oninput={handleEmailInput}
						onfocus={() => emailFocused = true}
						onblur={() => emailFocused = false}
						class="form-input"
						class:form-input--focused={emailFocused}
						required
					/>
				</div>

				<!-- Stage 2: Name (reveals after valid email) -->
				{#if stage >= 2}
					<div class="form-field animate-slide-down">
						<input
							type="text"
							placeholder="Your name"
							bind:value={name}
							oninput={handleNameInput}
							class="form-input"
						/>
					</div>
				{/if}

				<!-- Stage 3: Message (reveals after name) -->
				{#if stage >= 3}
					<div class="form-field animate-slide-down">
						<textarea
							placeholder="What would you like to discuss?"
							bind:value={message}
							class="form-input form-textarea"
							rows="3"
						></textarea>
					</div>
				{/if}

				{#if submitStatus === 'error'}
					<p class="error-message">Something went wrong. Please try again.</p>
				{/if}

				<!-- Submit only appears when email is valid -->
				{#if stage >= 2}
					<button
						type="submit"
						class="submit-button btn-canon animate-slide-down"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Sending...' : 'Send'}
					</button>
				{/if}
			</form>

			<!-- Progress indicator -->
			<div class="progress-indicator" aria-hidden="true">
				<span class="progress-dot" class:active={stage >= 1}></span>
				<span class="progress-dot" class:active={stage >= 2}></span>
				<span class="progress-dot" class:active={stage >= 3}></span>
			</div>
		{/if}
	</div>
</section>

<style>
	.progressive-form-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.form-container {
		max-width: var(--width-narrow);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.form-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.form-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.form-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		min-height: 1.5em; /* Prevent layout shift */
	}

	.progressive-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.form-field {
		width: 100%;
	}

	.form-input {
		width: 100%;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-border-strong);
		box-shadow: 0 0 0 3px var(--color-focus);
	}

	.form-input::placeholder {
		color: var(--color-fg-muted);
	}

	.form-textarea {
		resize: vertical;
		min-height: var(--space-2xl);
	}

	.submit-button {
		width: 100%;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		border: none;
		cursor: pointer;
		margin-top: var(--space-xs);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.progress-indicator {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		margin-top: var(--space-lg);
	}

	.progress-dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		background: var(--color-fg-subtle);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.progress-dot.active {
		background: var(--color-fg-muted);
	}

	.success-message {
		text-align: center;
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.success-message h3 {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.success-message p {
		color: var(--color-fg-secondary);
	}

	.error-message {
		color: var(--color-error);
		font-size: var(--text-body-sm);
		text-align: center;
	}

	/* Animation */
	.animate-slide-down {
		animation: slideDown 0.2s ease-out forwards;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.form-input,
		.progress-dot,
		.animate-slide-down {
			transition: none;
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
