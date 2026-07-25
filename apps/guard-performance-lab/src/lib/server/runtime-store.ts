import { D1LabStore } from './d1-store.js';
import { JsonFileLabStore, type LabStore } from './store.js';
import { LabService } from './lab-service.js';
import type { GuardD1Database } from './d1-store.js';

type RuntimePlatform = { env?: { ENVIRONMENT?: string; GUARD_LAB_DB?: GuardD1Database } };

export function storeForRuntime(platform?: RuntimePlatform): LabStore {
  const processEnvironment = typeof process !== 'undefined' ? process.env.ENVIRONMENT : undefined;
  const explicitLocalPath = typeof process !== 'undefined' ? process.env.GUARD_LAB_DATA_PATH?.trim() : undefined;
  const environment = processEnvironment ?? platform?.env?.ENVIRONMENT;
  if (explicitLocalPath && environment !== 'production') return new JsonFileLabStore(explicitLocalPath);
  if (platform?.env?.GUARD_LAB_DB) return new D1LabStore(platform.env.GUARD_LAB_DB);
  if (environment === 'production') {
    throw new Error('Production Guard Lab requires the GUARD_LAB_DB durable D1 binding.');
  }
  return new JsonFileLabStore();
}

export function labServiceForRuntime(platform?: RuntimePlatform): LabService {
  return new LabService(storeForRuntime(platform));
}
