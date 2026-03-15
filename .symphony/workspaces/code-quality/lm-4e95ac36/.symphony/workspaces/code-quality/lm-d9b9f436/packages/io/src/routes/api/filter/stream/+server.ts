/**
 * Filter Agent SSE Streaming Endpoint
 *
 * Streams agent reasoning steps as Server-Sent Events.
 * Events: step, complete, error
 */

import type { RequestEvent } from '@sveltejs/kit';
import { executeFilterAgent, parseProductFromDB, type Product, type AgentStep } from '$lib/agents/filter-agent';

export const GET = async ({ url, platform }: RequestEvent) => {
	const query = url.searchParams.get('q');

	if (!query) {
		return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!platform?.env?.DB || !platform?.env?.AI) {
		return new Response(JSON.stringify({ error: 'Platform not available' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Load all products from D1
	let products: Product[] = [];
	try {
		const result = await platform.env.DB.prepare('SELECT * FROM fnji_products').all();
		products = (result.results || []).map((row: Record<string, unknown>) => parseProductFromDB(row));
	} catch (dbError) {
		console.error('Database error:', dbError);
		return new Response(JSON.stringify({ error: 'Failed to load products' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (products.length === 0) {
		return new Response(JSON.stringify({ error: 'No products found. Run migration and seed first.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Create SSE stream
	const stream = new TransformStream();
	const writer = stream.writable.getWriter();
	const encoder = new TextEncoder();

	const sendEvent = async (event: string, data: unknown) => {
		const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
		await writer.write(encoder.encode(message));
	};

	// Execute agent in background
	(async () => {
		try {
			const result = await executeFilterAgent(
				platform.env.AI,
				query,
				products,
				async (step: AgentStep) => {
					await sendEvent('step', {
						type: step.type,
						content: step.content,
						toolName: step.toolName,
						toolParams: step.toolParams,
						timestamp: step.timestamp.toISOString()
					});
				}
			);

			await sendEvent('complete', {
				success: result.success,
				products: result.products,
				filterState: result.filterState,
				explanation: result.explanation,
				tokensUsed: result.tokensUsed
			});
		} catch (error) {
			await sendEvent('error', {
				message: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			await writer.close();
		}
	})();

	return new Response(stream.readable, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*'
		}
	});
};
