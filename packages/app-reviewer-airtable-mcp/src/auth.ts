import { AuthError, defaultPolicy } from '@create-something/mcp-core';
import type { AccountContext, AuthProvider } from '@create-something/mcp-core';

import { DEFAULT_AIRTABLE_BASE_ID } from './schemas/index.js';

export interface AppReviewerAirtableEnv {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_PAT?: string;
  MCP_BEARER_TOKEN?: string;
  AIRTABLE_BASE_ID?: string;
  APP_REVIEWER_AIRTABLE_BASE_ID?: string;
  APP_REVIEWER_MCP_ACCOUNT_ID?: string;
  APP_REVIEWER_AIRTABLE_INCLUDE_SENSITIVE_DEFAULT?: string;
}

function readRuntimeValue(env: AppReviewerAirtableEnv | undefined, key: keyof AppReviewerAirtableEnv): string | undefined {
  const fromWorker = env?.[key]?.trim();
  if (fromWorker) return fromWorker;

  const fromNode = process.env[key]?.trim();
  return fromNode || undefined;
}

function readBoolean(value: string | undefined): boolean {
  return /^(1|true|yes)$/i.test(value ?? '');
}

export class AppReviewerAirtableAuthProvider implements AuthProvider<AppReviewerAirtableEnv> {
  async resolve(_request: Request | null, env?: AppReviewerAirtableEnv): Promise<AccountContext> {
    const apiKey = readRuntimeValue(env, 'AIRTABLE_API_KEY') ?? readRuntimeValue(env, 'AIRTABLE_PAT');
    if (!apiKey) {
      throw new AuthError('Missing Airtable token. Set AIRTABLE_API_KEY in the runtime environment or Infisical.');
    }

    const baseId =
      readRuntimeValue(env, 'APP_REVIEWER_AIRTABLE_BASE_ID') ??
      readRuntimeValue(env, 'AIRTABLE_BASE_ID') ??
      DEFAULT_AIRTABLE_BASE_ID;

    const includeSensitiveDefault = readBoolean(
      readRuntimeValue(env, 'APP_REVIEWER_AIRTABLE_INCLUDE_SENSITIVE_DEFAULT'),
    );

    return {
      accountId: readRuntimeValue(env, 'APP_REVIEWER_MCP_ACCOUNT_ID') ?? 'app-reviewer-airtable',
      tokenProvider: {
        getAccessToken: async () => apiKey,
      },
      metadata: {
        baseId,
        includeSensitiveDefault,
      },
      policy: defaultPolicy({
        readOnly: true,
        scopes: ['airtable:read', 'app-reviewer:assets', 'app-reviewer:asset-versions'],
        constraints: {
          mcpToolAccessMode: 'read_only',
          defaultBaseId: baseId,
          includeSensitiveDefault,
        },
      }),
    };
  }
}
