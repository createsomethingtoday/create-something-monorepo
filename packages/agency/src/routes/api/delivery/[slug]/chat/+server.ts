import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { extractAnswer } from '$lib/server/delivery-os-chat';
import { getDeliverySharePage } from '$lib/server/delivery-os-store';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
	question: z.string().trim().min(3).max(2000)
});

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
				input: [
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
								text: `Question: ${parsed.data.question}\n\nShared delivery context:\n${JSON.stringify(context, null, 2)}`
							}
						]
					}
				]
			})
		});

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
