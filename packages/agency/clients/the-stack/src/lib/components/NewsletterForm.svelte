<script lang="ts">
	/**
	 * Newsletter Form Component
	 *
	 * Email signup form with:
	 * - Default variant (dark border)
	 * - Green variant (for black backgrounds)
	 */

	import { enhance } from '$app/forms';

	interface Props {
		variant?: 'default' | 'green';
	}

	let { variant = 'default' }: Props = $props();

	let isSubmitting = $state(false);
	let isSuccess = $state(false);
	let isError = $state(false);
</script>

<div class="email-form_wrap">
	{#if isSuccess}
		<div class="form-success">
			<div>Thank you! Your submission has been received!</div>
		</div>
	{:else if isError}
		<div class="form-error">
			<div>Oops! Something went wrong while submitting the form.</div>
		</div>
	{:else}
		<form
			method="POST"
			action="?/newsletter"
			class="email_form"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isSuccess = true;
					} else {
						isError = true;
					}
				};
			}}
		>
			<div class="form-field-wrapper">
				<input
					class="form-input"
					class:is-green={variant === 'green'}
					type="email"
					name="email"
					placeholder="Enter your email"
					required
					maxlength="256"
				/>
			</div>
			<button type="submit" class="button" disabled={isSubmitting}>
				{isSubmitting ? 'Please wait...' : 'Subscribe'}
			</button>
		</form>
	{/if}
</div>

<style>
	.email-form_wrap {
		flex: 1;
		max-width: 31.875rem;
	}

	.email_form {
		display: flex;
		justify-content: flex-start;
		align-items: flex-end;
		gap: 1rem;
	}

	.form-field-wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;
		width: 100%;
		gap: 0.5rem;
	}

	.button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	@media (max-width: 479px) {
		.email_form {
			flex-direction: column;
			align-items: stretch;
		}

		.button {
			width: 100%;
		}
	}
</style>
