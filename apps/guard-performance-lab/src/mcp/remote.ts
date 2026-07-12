import {
  resolveGuardApplicationAccess,
  type GuardApplicationAccess,
  type RuntimeEnv
} from '../lib/server/access.js';
import { labStore, type LabStore } from '../lib/server/store.js';
import { createGuardLabMcpServer } from './server.js';

export async function authorizeRemoteGuardMcp(input: {
  request: Request;
  url: URL;
  env: RuntimeEnv;
  fetch?: typeof globalThis.fetch;
  store?: LabStore;
}): Promise<{
  access: GuardApplicationAccess;
  server: ReturnType<typeof createGuardLabMcpServer> | null;
}> {
  const access = await resolveGuardApplicationAccess(input);
  return {
    access,
    server: access.scope ? createGuardLabMcpServer(input.store ?? labStore, access.scope) : null
  };
}
