import { json } from '@sveltejs/kit';
import { runDeliveryOsAgent } from '@create-something/delivery-os';
import { z } from 'zod';

import { extractAnswer, parseVectorStoreIds } from '$lib/server/delivery-os-chat';
import { createSeedDeliveryOsStore, deliveryClients } from '$lib/server/delivery-os-store';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
	engagementId: z.string().trim().min(1),
	question: z.string().trim().min(3).max(4000)
});

export const POST: RequestHandler = async ({ cookies, platform, request }) => {
	await requireAgencyOperator({ cookies, platform });

	if (!platform?.env.OPENAI_API_KEY) {
		return json(
			{
				error: 'Delivery chat is not configured. Set OPENAI_API_KEY to enable the operator agent.'
			},
			{ status: 503 }
		);
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{
				error: 'Provide both an engagement and a delivery question.'
			},
			{ status: 400 }
		);
	}

	const { engagementId, question } = parsed.data;
	const store = createSeedDeliveryOsStore();
	const engagement = await store.getEngagement({ engagementId });
	if (!engagement) {
		return json(
			{
				error: 'That engagement is not available in the current delivery workspace.'
			},
			{ status: 404 }
		);
	}

	const client = deliveryClients.find((row) => row.id === engagement.clientId);
	const vectorStoreIds = parseVectorStoreIds(platform.env.DELIVERY_OS_VECTOR_STORE_IDS);

	try {
		const runResult = await runDeliveryOsAgent({
			store,
			apiKey: platform.env.OPENAI_API_KEY,
			vectorStoreIds: vectorStoreIds.length ? vectorStoreIds : undefined,
			maxTurns: 8,
			input: [
				`You are answering an operator question about a delivery engagement.`,
				`Client: ${client?.name ?? 'Unknown client'}`,
				`Engagement: ${engagement.name}`,
				`Status: ${engagement.status}`,
				`Question: ${question}`,
				`Answer concisely. Ground the answer in engagement status, components, artifacts, milestones, integrations, risks, access items, and commercials when relevant.`,
				`If the answer references a document or artifact, mention the artifact title explicitly.`
			].join('\n')
		});

		const answer = extractAnswer((runResult as { finalOutput?: unknown }).finalOutput).trim();
		return json({
			answer: answer || 'The delivery agent completed the run but did not return any text.'
		});
	} catch (error) {
		console.error('delivery_os_chat_failed', {
			engagementId,
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
