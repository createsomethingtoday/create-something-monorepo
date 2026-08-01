import { createOfferSavingsWorkerHandler } from './router.js';
import { OfferSavingsMCP } from './runtime.js';

export * from './contract.js';
export { createOfferSavingsWorkerHandler } from './router.js';
export { OfferSavingsMCP };

export default createOfferSavingsWorkerHandler({
  mcpFetch: (request, env, ctx) => OfferSavingsMCP.serve('/mcp').fetch(request, env, ctx)
});
