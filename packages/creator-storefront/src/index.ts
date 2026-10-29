/**
 * creator-storefront — storefront authoring service and public read API
 * (packages/webflow-dashboard/docs/creator-storefront/CONTRACT.md).
 */
import { AirtableAuthoringStore } from './airtable';
import { handleRequest } from './app';
import type { AppServices } from './app';
import { requireAuthoringConfig, requirePublicConfig } from './config';
import type { Env } from './config';
import { unwrap } from './dispatch';
import type { CreatorStorefrontWriter } from './durable-object';
import { TemplateSearchInventory } from './inventory';
import { D1ReadModel } from './read-model';

export { CreatorStorefrontWriter } from './durable-object';

const services: AppServices = {
	readModel: (env) => new D1ReadModel(requirePublicConfig(env).readModel),
	publicInventory: (env) => new TemplateSearchInventory(requirePublicConfig(env).templateSearchUrl, undefined, 2500),
	store: (env) => {
		const config = requireAuthoringConfig(env);
		return new AirtableAuthoringStore({ apiKey: config.airtableApiKey, apiBaseUrl: config.airtableApiBaseUrl });
	},
	runWriter: async (env, op, creator, input) => {
		const namespace = requireAuthoringConfig(env).writerNamespace as unknown as DurableObjectNamespace<CreatorStorefrontWriter>;
		const stub = namespace.get(namespace.idFromName(creator.id));
		return unwrap(await stub.run(op, creator, input));
	}
};

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env, services);
	}
} satisfies ExportedHandler<Env>;
