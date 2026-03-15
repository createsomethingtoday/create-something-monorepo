<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadStripe,
		createElements,
		createPaymentIntent,
		confirmPayment,
		type PaymentResult
	} from '../lib/services/stripe-payment';

	interface Props {
		reservationId: string;
		courtName: string;
		facilityName: string;
		startTime: string;
		endTime: string;
		priceCents: number;
		memberName: string;
		memberEmail: string;
		theme?: 'light' | 'dark';
		stripePublishableKey: string;
		onSuccess?: (result: PaymentResult) => void;
		onError?: (error: Error) => void;
		onCancel?: () => void;
	}

	let {
		reservationId,
		courtName,
		facilityName,
		startTime,
		endTime,
		priceCents,
		memberName,
		memberEmail,
		theme = 'dark',
		stripePublishableKey,
		onSuccess,
		onError,
		onCancel
	}: Props = $props();

	// State
	let loading = $state(true);
	let processing = $state(false);
	let error = $state<string | null>(null);
	let stripe: any = $state(null);
	let elements: any = $state(null);
	let paymentElement: any = $state(null);
	let clientSecret = $state<string | null>(null);

	// Format time for display
	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		const hours = date.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const hour12 = hours % 12 || 12;
		return `${hour12} ${ampm}`;
	}

	// Initialize Stripe
	async function initializeStripe() {
		loading = true;
		error = null;

		try {
			// Load Stripe.js
			stripe = await loadStripe(stripePublishableKey);

			// Create Payment Intent
			const paymentIntent = await createPaymentIntent({ reservationId });
			clientSecret = paymentIntent.clientSecret;

			// Create Elements instance
			elements = createElements(stripe, clientSecret, theme);

			// Create and mount Payment Element
			paymentElement = elements.create('payment', {
				layout: {
					type: 'accordion',
					defaultCollapsed: false,
					radios: false,
					spacedAccordionItems: true
				}
			});

			// Wait a tick for DOM to be ready
			await new Promise((resolve) => setTimeout(resolve, 100));

			const container = document.getElementById('payment-element');
			if (container) {
				paymentElement.mount('#payment-element');
			} else {
				throw new Error('Payment element container not found');
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Failed to initialize payment';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			loading = false;
		}
	}

	// Handle payment submission
	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!stripe || !elements || !clientSecret) {
			error = 'Payment system not initialized';
			return;
		}

		processing = true;
		error = null;

		try {
			const result = await confirmPayment(stripe, elements, clientSecret, {
				name: memberName,
				email: memberEmail
			});

			if (result.success) {
				onSuccess?.(result);
			} else {
				error = result.error || 'Payment failed';
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Payment failed';
			error = errorMsg;
			onError?.(err instanceof Error ? err : new Error(errorMsg));
		} finally {
			processing = false;
		}
	}

	onMount(() => {
		initializeStripe();
	});
</script>

<div class="checkout-form" data-theme={theme}>
	<!-- Booking Summary -->
	<div class="summary">
		<h3>Confirm & Pay</h3>
		<div class="details">
			<div class="detail-row">
				<strong>{courtName}</strong>
				<span class="facility">{facilityName}</span>
			</div>
			<div class="detail-row">
				<span class="time">{formatTime(startTime)} - {formatTime(endTime)}</span>
			</div>
			<div class="detail-row total">
				<span>Total</span>
				<strong class="amount">${(priceCents / 100).toFixed(2)}</strong>
			</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading payment form...</p>
		</div>
	{/if}

	<!-- Payment Form -->
	{#if !loading}
		<form class="payment-form" onsubmit={handleSubmit}>
			<!-- Stripe Payment Element -->
			<div id="payment-element" class="payment-element"></div>

			<!-- Error Message -->
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="cancel-btn" onclick={onCancel} disabled={processing}>
					Cancel
				</button>
				<button type="submit" class="pay-btn" disabled={processing || loading}>
					{#if processing}
						Processing...
					{:else}
						Pay ${(priceCents / 100).toFixed(2)}
					{/if}
				</button>
			</div>

			<!-- Secure Note -->
			<p class="secure-note">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
				Secured by Stripe
			</p>
		</form>
	{/if}
</div>

<style>
	.checkout-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg, 1.5rem);
		padding: var(--space-lg, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface, #111111);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		font-family: var(--font-sans, 'Stack Sans Notch', system-ui, sans-serif);
	}

	.checkout-form[data-theme='dark'] {
		background: var(--color-bg-surface, #111111);
		color: var(--color-fg-primary, #ffffff);
	}

	.checkout-form[data-theme='light'] {
		background: var(--color-bg-surface, #ffffff);
		color: var(--color-fg-primary, #000000);
		border-color: rgba(0, 0, 0, 0.1);
	}

	/* Summary */
	.summary {
		padding-bottom: var(--space-md, 1rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.summary h3 {
		margin: 0 0 var(--space-md, 1rem);
		font-size: var(--text-h4, 1.125rem);
		font-weight: 600;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-row.total {
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-sm, 0.75rem);
		padding-top: var(--space-sm, 0.75rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.facility {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.time {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
	}

	.amount {
		font-size: var(--text-h4, 1.125rem);
		font-weight: 600;
	}

	/* Loading State */
	.loading-state {
		text-align: center;
		padding: var(--space-xl, 3rem) var(--space-md, 1rem);
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
	}

	.spinner {
		width: 32px;
		height: 32px;
		margin: 0 auto var(--space-sm, 1rem);
		border: 2px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-top-color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Payment Form */
	.payment-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
	}

	.payment-element {
		/* Stripe Elements will inject content here */
		min-height: 40px;
	}

	/* Error Message */
	.error-message {
		padding: var(--space-sm, 0.75rem) var(--space-md, 1rem);
		border-radius: var(--radius-md, 8px);
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		border: 1px solid var(--color-error-border, rgba(212, 77, 77, 0.3));
		color: var(--color-error, #d44d4d);
		font-size: var(--text-body-sm, 0.875rem);
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: var(--space-sm, 0.75rem);
	}

	.cancel-btn,
	.pay-btn {
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md, 8px);
		font-weight: 500;
		font-size: var(--text-body, 1rem);
		cursor: pointer;
		transition: all 200ms ease;
		border: none;
		font-family: inherit;
	}

	.cancel-btn {
		flex: 1;
		background: transparent;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.8));
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.cancel-btn:hover:not(:disabled) {
		background: var(--color-hover, rgba(255, 255, 255, 0.05));
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.pay-btn {
		flex: 2;
		background: var(--color-fg-primary, #ffffff);
		color: var(--color-bg-pure, #000000);
		font-weight: 600;
	}

	.pay-btn:hover:not(:disabled) {
		opacity: 0.9;
		transform: scale(1.01);
	}

	.cancel-btn:disabled,
	.pay-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	/* Secure Note */
	.secure-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--color-fg-tertiary, rgba(255, 255, 255, 0.6));
		font-size: var(--text-caption, 0.75rem);
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.checkout-form {
			padding: var(--space-md, 1rem);
		}

		.actions {
			flex-direction: column;
		}

		.cancel-btn,
		.pay-btn {
			flex: 1;
			width: 100%;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
		.pay-btn:hover {
			transform: none;
		}
	}
</style>
