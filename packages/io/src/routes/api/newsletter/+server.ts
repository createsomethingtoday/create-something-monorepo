import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processSubscription, type NewsletterRequest } from '@create-something/components/newsletter';

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	try {
		const body = (await request.json()) as NewsletterRequest;
		const { result, status } = await processSubscription(
			body,
			platform?.env,
			getClientAddress(),
			'io'
		);
		return json(result, { status });
	} catch (err) {
		console.error('Newsletter signup error:', err);
		return json(
			{
				success: false,
				message: `Error processing newsletter signup: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
