/**
 * Product Download API
 *
 * Verifies Stripe checkout session and serves product download.
 */

import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createStripeClient } from '$lib/services/stripe';
import { getOfferingBySlug } from '$lib/data/services';

// Product download URLs - stored in R2 or external hosting
const PRODUCT_DOWNLOADS: Record<string, string> = {
	'automation-patterns':
		'https://pub-createsomething.r2.dev/products/automation-patterns-pack-v1.zip'
	// Add more products as needed
};

export const GET: RequestHandler = async ({ params, url, platform }) => {
	const { productId } = params;
	const sessionId = url.searchParams.get('session_id');

	// Validate product exists
	const product = getOfferingBySlug(productId);
	if (!product) {
		throw error(404, 'Product not found');
	}

	// Check if product has a download
	const downloadUrl = PRODUCT_DOWNLOADS[productId];
	if (!downloadUrl) {
		throw error(404, 'No download available for this product');
	}

	// Verify Stripe session if provided
	if (sessionId) {
		const stripeSecretKey = platform?.env?.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			throw error(500, 'Payment verification unavailable');
		}

		const stripe = createStripeClient(stripeSecretKey);

		try {
			const session = await stripe.checkout.sessions.retrieve(sessionId);

			// Verify session is paid
			if (session.payment_status !== 'paid') {
				throw error(403, 'Payment not completed');
			}

			// Verify session is for this product
			if (session.metadata?.product_id !== productId) {
				throw error(403, 'Session does not match product');
			}

			// Session verified - redirect to download
			throw redirect(302, downloadUrl);
		} catch (err) {
			// If it's already a redirect, rethrow
			if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
				throw err;
			}
			console.error('Session verification error:', err);
			throw error(403, 'Invalid or expired session');
		}
	}

	// No session - check for download token in KV (for email links)
	const token = url.searchParams.get('token');
	if (token) {
		const cache = platform?.env?.CACHE;
		if (cache) {
			const tokenData = await cache.get(`download:${token}`);
			if (tokenData) {
				const data = JSON.parse(tokenData);
				if (data.productId === productId && data.expiresAt > Date.now()) {
					throw redirect(302, downloadUrl);
				}
			}
		}
		throw error(403, 'Invalid or expired download link');
	}

	throw error(403, 'Valid session or download token required');
};
