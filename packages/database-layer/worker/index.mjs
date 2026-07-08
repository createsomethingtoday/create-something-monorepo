import { createDatabaseLayerManagementWorker } from '../dist/index.js';
import { databaseLayerWorkerState } from './generated-state.mjs';

export const databaseLayerWorker = createDatabaseLayerManagementWorker(databaseLayerWorkerState, {
  corsOrigin: 'https://app-governance-dash.createsomething.agency',
  responseFactory: (bodyText, init) => new Response(bodyText, init)
});

export default {
  fetch(request) {
    return databaseLayerWorker.fetch(request);
  }
};
