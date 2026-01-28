<script lang="ts">
	/**
	 * Form Validation Pattern
	 *
	 * Demonstrates validation states, error display, and
	 * progressive disclosure of validation feedback.
	 *
	 * Canon Principle: Validation should guide correction,
	 * not punish mistakes. Show errors at the right moment.
	 */

	import type { Snippet } from 'svelte';

	interface FieldError {
		field: string;
		message: string;
	}

	interface Props {
		/** Field errors to display */
		errors?: FieldError[];
		/** When to show validation: blur, change, or submit */
		validateOn?: 'blur' | 'change' | 'submit';
		/** Show error summary at top */
		showSummary?: boolean;
		/** Form content */
		children: Snippet;
	}

	let {
		errors = [],
		validateOn = 'blur',
		showSummary = true,
		children
	}: Props = $props();

	const hasErrors = $derived(errors.length > 0);
</script>

<!--
	Usage:
	```svelte
	<script>
		let errors = $state([]);

		function validate(data) {
			const newErrors = [];
			if (!data.email) {
				newErrors.push({ field: 'email', message: 'Email is required' });
			}
			if (!data.email.includes('@')) {
				newErrors.push({ field: 'email', message: 'Enter a valid email' });
			}
			errors = newErrors;
			return newErrors.length === 0;
		}
	</script>

	<FormValidation {errors} validateOn="blur">
		<TextField
			label="Email"
			name="email"
			error={errors.find(e => e.field === 'email')?.message}
		/>
		<TextField
			label="Password"
			name="password"
			type="password"
			error={errors.find(e => e.field === 'password')?.message}
		/>
	</FormValidation>
	```
-->

<div
	class="form-validation"
	class:form-validation--has-errors={hasErrors}
	data-validate-on={validateOn}
>
	{#if showSummary && hasErrors}
		<div class="validation-summary" role="alert" aria-live="polite">
			<div class="summary-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<div class="summary-content">
				<p class="summary-title">Please fix the following errors:</p>
				<ul class="summary-list">
					{#each errors as error}
						<li>
							<a href="#{error.field}" class="summary-link">{error.message}</a>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<div class="validation-content">
		{@render children()}
	</div>
</div>

<style>
	.form-validation {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.validation-summary {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
	}

	.summary-icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		color: var(--color-error);
	}

	.summary-icon svg {
		width: 100%;
		height: 100%;
	}

	.summary-content {
		flex: 1;
	}

	.summary-title {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-error);
		margin: 0 0 var(--space-xs) 0;
	}

	.summary-list {
		margin: 0;
		padding-left: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.summary-list li {
		margin-bottom: 2px;
	}

	.summary-link {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.summary-link:hover {
		color: var(--color-fg-primary);
	}

	.summary-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.validation-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
</style>
