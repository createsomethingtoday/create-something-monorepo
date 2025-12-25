/**
 * Product Download API
 *
 * Verifies Stripe checkout session and serves product download directly from R2.
 * More secure than public URLs - files are served through authenticated endpoint.
 */

import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { createStripeClient } from '$lib/services/stripe';
import { getOfferingBySlug } from '$lib/data/services';

// Product file paths in R2 bucket
const PRODUCT_FILES: Record<string, { path: string; filename: string; contentType: string }> = {
	'automation-patterns': {
		path: 'products/automation-patterns-pack-v1.zip',
		filename: 'automation-patterns-pack-v1.zip',
		contentType: 'application/zip'
	}
	// Add more products as needed
};

export const GET: RequestHandler = async ({ params, url, platform }) => {
	const { productId } = params;
	const sessionId = url.searchParams.get('session_id');
	const token = url.searchParams.get('token');

	// Validate product exists
	const product = getOfferingBySlug(productId);
	if (!product) {
		throw error(404, 'Product not found');
	}

	// Check if product has a download
	const fileInfo = PRODUCT_FILES[productId];
	if (!fileInfo) {
		throw error(404, 'No download available for this product');
	}

	// Verify authorization via Stripe session
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

			// Session verified - serve the file
			return await serveFile(platform, fileInfo);
		} catch (err) {
			// Check if it's already an HTTP error
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			console.error('Session verification error:', err);
			throw error(403, 'Invalid or expired session');
		}
	}

	// Check for download token in KV (for email links)
	if (token) {
		const cache = platform?.env?.CACHE;
		if (cache) {
			const tokenData = await cache.get(`download:${token}`);
			if (tokenData) {
				const data = JSON.parse(tokenData);
				if (data.productId === productId && data.expiresAt > Date.now()) {
					return await serveFile(platform, fileInfo);
				}
			}
		}
		throw error(403, 'Invalid or expired download link');
	}

	throw error(403, 'Valid session or download token required');
};

async function serveFile(
	platform: App.Platform | undefined,
	fileInfo: { path: string; filename: string; contentType: string }
): Promise<Response> {
	const bucket = platform?.env?.STORAGE;
	if (!bucket) {
		throw error(500, 'Storage unavailable');
	}

	const object = await bucket.get(fileInfo.path);
	if (!object) {
		throw error(404, 'File not found');
	}

	const headers = new Headers();
	headers.set('Content-Type', fileInfo.contentType);
	headers.set('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
	headers.set('Content-Length', object.size.toString());
	// Cache for 1 hour on client
	headers.set('Cache-Control', 'private, max-age=3600');

	return new Response(object.body, { headers });
}
