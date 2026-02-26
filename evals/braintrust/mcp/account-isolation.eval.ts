import { Eval, type Score } from 'braintrust';
import {
  bearerHeaders,
  getByPath,
  httpProbe,
  parseJsonRecord,
  readEnv,
  readOptionalEnv,
} from './shared.js';

type AccountIsolationInput = {
  name: string;
  routeUrl?: string;
  routeToken?: string;
  accountHeaderName: string;
  expectedAccountPath: string;
  accountA: string;
  accountB: string;
  body?: Record<string, unknown>;
};

type AccountIsolationOutput = {
  skipped: boolean;
  reason?: string;
  statusA: number | null;
  statusB: number | null;
  reachable: boolean;
  extractedAccountA?: string;
  extractedAccountB?: string;
  reflectsAccountA: boolean;
  reflectsAccountB: boolean;
  isolatesAccounts: boolean;
  errorA?: string;
  errorB?: string;
};

const ACCOUNT_ISOLATION_CASES = [
  {
    input: {
      name: 'header-based-account-isolation',
      routeUrl: readOptionalEnv('MCP_ACCOUNT_ISOLATION_URL'),
      routeToken: readOptionalEnv('MCP_ACCOUNT_ISOLATION_TOKEN'),
      accountHeaderName: readEnv('MCP_ACCOUNT_HEADER_NAME', 'x-mcp-account-id'),
      expectedAccountPath: readEnv('MCP_ACCOUNT_FIELD_PATH', 'accountId'),
      accountA: readEnv('MCP_ACCOUNT_A', 'tenant-a'),
      accountB: readEnv('MCP_ACCOUNT_B', 'tenant-b'),
      body: parseJsonRecord(readOptionalEnv('MCP_ACCOUNT_ISOLATION_BODY_JSON')),
    } satisfies AccountIsolationInput,
    metadata: {
      suite: 'mcp-fleet',
      eval: 'account_isolation',
    },
  },
];

function reachabilityScore(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'account_route_reachable', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'account_route_reachable',
    score: output.reachable ? 1 : 0,
    metadata: { statusA: output.statusA, statusB: output.statusB, errorA: output.errorA, errorB: output.errorB },
  };
}

function configuredScore(output: AccountIsolationOutput): Score {
  return {
    name: 'configured_for_live_run',
    score: output.skipped ? 0 : 1,
    metadata: { skipped: output.skipped, reason: output.reason },
  };
}

function reflectionScoreA(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'reflects_account_a', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'reflects_account_a',
    score: output.reflectsAccountA ? 1 : 0,
    metadata: { extracted: output.extractedAccountA },
  };
}

function reflectionScoreB(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'reflects_account_b', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'reflects_account_b',
    score: output.reflectsAccountB ? 1 : 0,
    metadata: { extracted: output.extractedAccountB },
  };
}

function separationScore(output: AccountIsolationOutput): Score {
  if (output.skipped) {
    return { name: 'accounts_separate', score: null, metadata: { reason: output.reason } };
  }

  return {
    name: 'accounts_separate',
    score: output.isolatesAccounts ? 1 : 0,
    metadata: {
      extractedA: output.extractedAccountA,
      extractedB: output.extractedAccountB,
    },
  };
}

void Eval<AccountIsolationInput, AccountIsolationOutput>('create-something-mcp-fleet', {
  experimentName: 'account_isolation',
  data: ACCOUNT_ISOLATION_CASES,
  task: async (input): Promise<AccountIsolationOutput> => {
    if (!input.routeUrl) {
      return {
        skipped: true,
        reason: 'Set MCP_ACCOUNT_ISOLATION_URL to an endpoint that echoes resolved account IDs.',
        statusA: null,
        statusB: null,
        reachable: false,
        reflectsAccountA: false,
        reflectsAccountB: false,
        isolatesAccounts: false,
      };
    }

    const sharedHeaders = bearerHeaders(input.routeToken);
    const method = input.body ? 'POST' : 'GET';

    const [probeA, probeB] = await Promise.all([
      httpProbe({
        url: input.routeUrl,
        method,
        headers: {
          ...sharedHeaders,
          [input.accountHeaderName]: input.accountA,
        },
        body: input.body,
      }),
      httpProbe({
        url: input.routeUrl,
        method,
        headers: {
          ...sharedHeaders,
          [input.accountHeaderName]: input.accountB,
        },
        body: input.body,
      }),
    ]);

    const extractedAccountA = getByPath(probeA.json, input.expectedAccountPath);
    const extractedAccountB = getByPath(probeB.json, input.expectedAccountPath);
    const extractedAString = typeof extractedAccountA === 'string' ? extractedAccountA : undefined;
    const extractedBString = typeof extractedAccountB === 'string' ? extractedAccountB : undefined;

    const reflectsAccountA = extractedAString === input.accountA;
    const reflectsAccountB = extractedBString === input.accountB;

    return {
      skipped: false,
      statusA: probeA.status,
      statusB: probeB.status,
      reachable: probeA.ok && probeB.ok,
      extractedAccountA: extractedAString,
      extractedAccountB: extractedBString,
      reflectsAccountA,
      reflectsAccountB,
      isolatesAccounts:
        reflectsAccountA && reflectsAccountB && extractedAString !== extractedBString,
      errorA: probeA.error,
      errorB: probeB.error,
    };
  },
  scores: [
    ({ output }) => configuredScore(output),
    ({ output }) => reachabilityScore(output),
    ({ output }) => reflectionScoreA(output),
    ({ output }) => reflectionScoreB(output),
    ({ output }) => separationScore(output),
  ],
});
