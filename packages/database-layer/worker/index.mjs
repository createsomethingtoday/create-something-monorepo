import { createDatabaseLayerManagementWorker } from '../dist/index.js';
import { databaseLayerWorkerState } from './generated-state.mjs';
import { handleAgentCommercialReadiness } from './agent-commercial-readiness.mjs';

export const databaseLayerWorker = createDatabaseLayerManagementWorker(databaseLayerWorkerState, {
  corsOrigin: 'https://app-governance-dash.createsomething.agency',
  responseFactory: (bodyText, init) => new Response(bodyText, init)
});

export default {
  async fetch(request, env) {
    const readiness = await handleAgentCommercialReadiness(request, env);
    if (readiness) return readiness;
    return databaseLayerWorker.fetch(request);
  }
};
