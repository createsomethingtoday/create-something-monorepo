import {
  getAirtableClient,
  type AirtableEnv
} from '@create-something/webflow-dashboard-core';
import { getEnvOrThrow } from './env';

export async function getServerAirtable() {
  const env = await getEnvOrThrow();
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable runtime env not available');
  }

  return getAirtableClient(env as AirtableEnv);
}
