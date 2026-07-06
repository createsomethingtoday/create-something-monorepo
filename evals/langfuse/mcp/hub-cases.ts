export type HubCaseConfig = {
  name: string;
  url: string;
  authTokenEnvVars: string[];
  sessionTokenEnvVar?: string;
  expectedAccountId?: string;
};

export function readOneEnv(envVarNames: string[]): string | undefined {
  for (const envVarName of envVarNames) {
    const value = process.env[envVarName]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export const HUB_CASE_CONFIGS: HubCaseConfig[] = [
  {
    name: 'lainy',
    url: 'https://lainy.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_LAINY_API_TOKEN', 'CS_HUB_LAINY_AUTH_TOKEN'],
    expectedAccountId: 'acct_lainy',
  },
  {
    name: 'danny',
    url: 'https://danny.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_DANNY_API_TOKEN', 'CS_HUB_DANNY_AUTH_TOKEN'],
    sessionTokenEnvVar: 'CS_HUB_DANNY_SESSION_TOKEN',
    expectedAccountId: 'acct_danny',
  },
  {
    name: 'august',
    url: 'https://august.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_AUGUST_API_TOKEN', 'CS_HUB_AUGUST_AUTH_TOKEN'],
    expectedAccountId: 'acct_august',
  },
  {
    name: 'aaron-outerfields',
    url: 'https://aaron-outerfields.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_AARON_OUTERFIELDS_API_TOKEN', 'CS_HUB_AARON_OUTERFIELDS_AUTH_TOKEN'],
    expectedAccountId: 'acct_aaron_outerfields',
  },
  {
    name: 'andre-outerfields',
    url: 'https://andre-outerfields.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_ANDRE_OUTERFIELDS_API_TOKEN', 'CS_HUB_ANDRE_OUTERFIELDS_AUTH_TOKEN'],
    expectedAccountId: 'acct_andre_outerfields',
  },
  {
    name: 'fillip',
    url: 'https://fillip.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_FILLIP_API_TOKEN', 'CS_HUB_FILIP_API_TOKEN', 'CS_HUB_FILIP_AUTH_TOKEN'],
    expectedAccountId: 'acct_fillip',
  },
  {
    name: 'leah',
    url: 'https://leah.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_LEAH_API_TOKEN', 'CS_HUB_LEAH_AUTH_TOKEN'],
    expectedAccountId: 'acct_leah',
  },
  {
    name: 'mj',
    url: 'https://mj.mcp.createsomething.agency/mcp',
    authTokenEnvVars: ['CS_HUB_MJ_API_TOKEN', 'CS_HUB_MJ_AUTH_TOKEN'],
    expectedAccountId: 'acct_mj',
  },
];
