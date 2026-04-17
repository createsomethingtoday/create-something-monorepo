import { getAirtableClient } from '../../vendor/core/airtable';
import { getEnvOrThrow } from './env';

export async function getServerAirtable() {
  const env = await getEnvOrThrow();
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable runtime env not available');
  }

  return getAirtableClient(env);
}
