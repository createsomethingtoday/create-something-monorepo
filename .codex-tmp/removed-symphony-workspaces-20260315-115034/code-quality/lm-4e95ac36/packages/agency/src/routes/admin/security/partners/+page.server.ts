import { HALF_DOZEN_PARTNER_KEY, listPartnerClients, parseJsonArray, parseJsonObject } from '$lib/server/partner-auth';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load = async ({ cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });
	const clients = await listPartnerClients(platform!.env.DB, HALF_DOZEN_PARTNER_KEY, { limit: 200 });
	return {
		clients: clients.map((client) => ({
			...client,
			required_toolkits: parseJsonArray(client.required_toolkits_json),
			metadata: parseJsonObject(client.metadata_json),
		})),
	};
};
