export const OFFER_SAVINGS_READ_SCOPE = 'offer-savings:read';
export const OFFER_SAVINGS_WRITE_SCOPE = 'offer-savings:write';

export interface OfferSavingsWorkerEnv {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  IDENTITY_WORKER?: Fetcher;
  OPENAI_API_KEY?: string;
  OFFER_AGENT_MODEL?: string;
  OFFER_AGENT_MAX_TURNS?: string;
  CS_IDENTITY_ISSUER?: string;
  OAUTH_ALLOWED_EMAILS?: string;
}

export interface OfferSavingsRequestProps {
  [key: string]: unknown;
  subject: string;
  email: string;
  scopes: string[];
}
