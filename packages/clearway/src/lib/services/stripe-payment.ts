/**
 * Stripe Payment Service - Client-side Stripe.js integration
 *
 * Handles in-widget payment collection using Stripe Elements.
 * This service manages the Stripe.js SDK and Payment Intent flow.
 */

import type Stripe from 'stripe';

export interface StripeConfig {
	publishableKey: string;
	testMode?: boolean;
}

export interface PaymentIntentParams {
	reservationId: string;
}

export interface PaymentIntentResponse {
	clientSecret: string;
	amount: number;
	currency: string;
	reservationId: string;
}

export interface PaymentResult {
	success: boolean;
	reservationId: string;
	paymentIntentId?: string;
	error?: string;
}

/**
 * Load Stripe.js SDK dynamically
 */
export async function loadStripe(publishableKey: string): Promise<any> {
	if (typeof window === 'undefined') {
		throw new Error('Stripe.js can only be loaded in browser');
	}

	// Check if already loaded
	if ((window as any).Stripe) {
		return (window as any).Stripe(publishableKey);
	}

	// Load Stripe.js script
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://js.stripe.com/v3/';
		script.async = true;

		script.onload = () => {
			if ((window as any).Stripe) {
				resolve((window as any).Stripe(publishableKey));
			} else {
				reject(new Error('Stripe.js failed to load'));
			}
		};

		script.onerror = () => {
			reject(new Error('Failed to load Stripe.js'));
		};

		document.head.appendChild(script);
	});
}

/**
 * Create a Payment Intent for a reservation
 */
export async function createPaymentIntent(
	params: PaymentIntentParams
): Promise<PaymentIntentResponse> {
	const response = await fetch('/api/stripe/payment-intent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(params)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to create payment intent');
	}

	return response.json();
}

/**
 * Confirm a Payment Intent with Stripe Elements
 */
export async function confirmPayment(
	stripe: any,
	elements: any,
	clientSecret: string,
	paymentData: {
		name: string;
		email: string;
	}
): Promise<PaymentResult> {
	const { error, paymentIntent } = await stripe.confirmPayment({
		elements,
		clientSecret,
		confirmParams: {
			payment_method_data: {
				billing_details: {
					name: paymentData.name,
					email: paymentData.email
				}
			}
		},
		redirect: 'if_required'
	});

	if (error) {
		return {
			success: false,
			reservationId: '',
			error: error.message
		};
	}

	if (paymentIntent && paymentIntent.status === 'succeeded') {
		return {
			success: true,
			reservationId: paymentIntent.metadata?.reservation_id || '',
			paymentIntentId: paymentIntent.id
		};
	}

	return {
		success: false,
		reservationId: '',
		error: 'Payment was not successful'
	};
}

/**
 * Create Stripe Elements instance with custom styling
 */
export function createElements(stripe: any, clientSecret: string, theme: 'light' | 'dark' = 'dark') {
	const appearance = {
		theme: theme === 'dark' ? 'night' : 'stripe',
		variables: {
			colorPrimary: theme === 'dark' ? '#ffffff' : '#000000',
			colorBackground: theme === 'dark' ? '#1a1a1a' : '#ffffff',
			colorText: theme === 'dark' ? '#ffffff' : '#000000',
			colorDanger: '#d44d4d',
			fontFamily: 'Stack Sans Notch, system-ui, sans-serif',
			spacingUnit: '4px',
			borderRadius: '8px'
		},
		rules: {
			'.Input': {
				backgroundColor: theme === 'dark' ? '#111111' : '#f5f5f5',
				border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
				boxShadow: 'none'
			},
			'.Input:focus': {
				borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
			},
			'.Label': {
				fontSize: '14px',
				fontWeight: '500'
			}
		}
	};

	return stripe.elements({ clientSecret, appearance });
}
