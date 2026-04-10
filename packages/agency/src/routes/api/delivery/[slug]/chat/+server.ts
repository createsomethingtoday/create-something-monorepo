import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { extractAnswer } from '$lib/server/delivery-os-chat';
import { getDeliverySharePage } from '$lib/server/delivery-os-store';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
	question: z.string().trim().min(3).max(2000)
});

function buildPromptInput(question: string, context: unknown) {
	return [
		{
			role: 'system',
			content: [
				{
					type: 'input_text',
					text: [
						'You are answering a client question on a public delivery page.',
						'Answer only from the provided client-visible delivery context.',
						'Do not mention internal-only notes, operator-only artifacts, secrets, admin surfaces, repositories, or implementation details that are not included in the provided context.',
						'If the answer is not present in the shared context, say that clearly and suggest using the engagement hub or booking a review call.',
						'Use short markdown with paragraphs and bullet lists when helpful.',
						'Do not use tables.',
						'Keep the answer concise, specific, and client-safe.'
					].join('\n')
				}
			]
		},
		{
			role: 'user',
			content: [
				{
					type: 'input_text',
					text: `Question: ${question}\n\nShared delivery context:\n${JSON.stringify(context, null, 2)}`
				}
			]
		}
	];
}

function sseChunk(event: string, payload: unknown) {
	return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export const POST: RequestHandler = async ({ params, platform, request }) => {
	if (!platform?.env.OPENAI_API_KEY) {
		return json(
			{
				error: 'Delivery chat is not configured right now.'
			},
			{ status: 503 }
		);
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{
				error: 'Ask a delivery question in plain language.'
			},
			{ status: 400 }
		);
	}

	const page = await getDeliverySharePage(params.slug);
	if (!page) {
		return json(
			{
				error: 'That delivery page is not available.'
			},
			{ status: 404 }
		);
	}

	try {
		const acceptsStream = request.headers.get('accept')?.includes('text/event-stream') ?? false;
		const context = {
			client: page.client,
			engagement: page.engagement,
			components: page.components.map((component) => ({
				kind: component.kind,
				name: component.name,
				status: component.status,
				summary: component.summary,
				liveUrl: component.liveUrl
			})),
			artifacts: page.artifacts.map((artifact) => ({
				type: artifact.type,
				title: artifact.title,
				status: artifact.status,
				summary: artifact.summary,
				sourceUrl: artifact.sourceUrl
			})),
			milestones: page.milestones.map((milestone) => ({
				title: milestone.title,
				status: milestone.status,
				summary: milestone.summary,
				targetDate: milestone.targetDate,
				completedAt: milestone.completedAt
			})),
			integrations: page.integrations.map((integration) => ({
				provider: integration.provider,
				status: integration.status,
				purpose: integration.purpose,
				direction: integration.direction,
				notes: integration.notes
			})),
			clientAccessItems: page.clientAccessItems.map((item) => ({
				system: item.system,
				status: item.status,
				accessType: item.accessType,
				notes: item.notes
			})),
			clientRisks: page.clientRisks.map((risk) => ({
				severity: risk.severity,
				summary: risk.summary
			})),
			commercial: page.commercial
		};

		const response = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${platform.env.OPENAI_API_KEY}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-5.1',
				max_output_tokens: 500,
				stream: acceptsStream,
				input: buildPromptInput(parsed.data.question, context)
			})
		});

		if (acceptsStream) {
			if (!response.ok || !response.body) {
				const failed = (await response.json().catch(() => null)) as
					| { error?: { message?: string } }
					| null;

				console.error('delivery_share_chat_openai_stream_failed', {
					slug: params.slug,
					status: response.status,
					error: failed?.error?.message ?? 'unknown_openai_error'
				});

				return new Response(sseChunk('error', { message: 'The delivery agent could not answer right now.' }), {
					status: response.ok ? 502 : response.status,
					headers: {
						'content-type': 'text/event-stream; charset=utf-8',
						'cache-control': 'no-cache, no-transform',
						connection: 'keep-alive'
					}
				});
			}

			const encoder = new TextEncoder();
			const decoder = new TextDecoder();

			const stream = new ReadableStream({
				async start(controller) {
					const reader = response.body!.getReader();
					let buffer = '';

					function emit(event: string, payload: unknown) {
						controller.enqueue(encoder.encode(sseChunk(event, payload)));
					}

					function processFrame(frame: string) {
						if (!frame.trim()) return;

						let eventName = 'message';
						const dataLines: string[] = [];

						for (const line of frame.split('\n')) {
							if (line.startsWith('event:')) {
								eventName = line.slice(6).trim();
							} else if (line.startsWith('data:')) {
								dataLines.push(line.slice(5).trim());
							}
						}

						const data = dataLines.join('\n');
						if (!data || data === '[DONE]') {
							return;
						}

						let payload: Record<string, unknown> | null = null;
						try {
							payload = JSON.parse(data) as Record<string, unknown>;
						} catch {
							return;
						}

						if (eventName === 'response.output_text.delta' && typeof payload.delta === 'string') {
							emit('chunk', { delta: payload.delta });
						}

						if (eventName === 'response.completed') {
							emit('done', {});
						}

						if (eventName === 'error') {
							emit('error', {
								message:
									typeof payload.message === 'string'
										? payload.message
										: 'The delivery agent could not answer right now.'
							});
						}
					}

					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;

							buffer += decoder.decode(value, { stream: true });

							while (true) {
								const boundaryIndex = buffer.indexOf('\n\n');
								if (boundaryIndex === -1) break;
								const frame = buffer.slice(0, boundaryIndex);
								buffer = buffer.slice(boundaryIndex + 2);
								processFrame(frame);
							}
						}

						if (buffer.trim()) {
							processFrame(buffer);
						}

						emit('done', {});
					} catch (error) {
						console.error('delivery_share_chat_stream_bridge_failed', {
							slug: params.slug,
							error: error instanceof Error ? error.message : String(error)
						});
						emit('error', { message: 'The delivery agent could not answer right now.' });
					} finally {
						controller.close();
						reader.releaseLock();
					}
				}
			});

			return new Response(stream, {
				headers: {
					'content-type': 'text/event-stream; charset=utf-8',
					'cache-control': 'no-cache, no-transform',
					connection: 'keep-alive'
				}
			});
		}

		const runResult = (await response.json().catch(() => null)) as
			| { output_text?: string; error?: { message?: string } }
			| null;

		if (!response.ok) {
			console.error('delivery_share_chat_openai_failed', {
				slug: params.slug,
				status: response.status,
				error: runResult?.error?.message ?? 'unknown_openai_error'
			});

			return json(
				{
					error: 'The delivery agent could not answer right now.'
				},
				{ status: 502 }
			);
		}

		const answer = extractAnswer(runResult).trim();

		return json({
			answer: answer || 'The delivery agent completed the run but did not return any text.'
		});
	} catch (error) {
		console.error('delivery_share_chat_failed', {
			slug: params.slug,
			error: error instanceof Error ? error.message : String(error)
		});

		return json(
			{
				error: 'The delivery agent could not answer right now.'
			},
			{ status: 502 }
		);
	}
};
