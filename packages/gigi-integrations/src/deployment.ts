/** Replaced by Bun at compilation. Never select a credential destination from runtime env. */
declare const __GIGI_BUILD_LANE__: string | undefined;
export const PRODUCTION_RESOURCE = 'https://gigi-connector.createsomething.workers.dev';
export const DEV_RESOURCE = 'https://gigi-connector-dev.createsomething.workers.dev';
export function deploymentResource(lane: string | undefined): string {
  if (lane === undefined || lane === 'production') return PRODUCTION_RESOURCE;
  if (lane === 'dev') return DEV_RESOURCE;
  throw new Error('invalid_gigi_deployment');
}
export const COMPANION_RESOURCE = deploymentResource(typeof __GIGI_BUILD_LANE__ === 'undefined' ? undefined : __GIGI_BUILD_LANE__);
