import worker from '../dist/index.js';

const expected = [
  'demoEvidenceSync',
  'inspectRunbookReadiness',
  'instantiateRunbook',
  'runbookEvidenceWebhook'
];
const actual = worker.manifest.capabilities.map((capability) => capability.key);
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Capability manifest mismatch: ${JSON.stringify(actual)}`);
}
const readiness = worker.manifest.capabilities.find(
  (capability) => capability.key === 'inspectRunbookReadiness'
);
if (readiness?.config?.hints?.readOnlyHint !== true) {
  throw new Error('inspectRunbookReadiness is missing readOnlyHint.');
}
console.log(`Verified ${actual.length} capabilities with SDK ${worker.manifest.sdkVersion}.`);
