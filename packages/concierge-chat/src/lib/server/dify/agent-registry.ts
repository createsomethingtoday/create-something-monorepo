import { readRuntimeEnv } from '../runtime';

export type DifyOperatorAgentStatus = 'published' | 'imported';
export type DifyCredentialState = 'available' | 'missing';
export type DifyOperatorState = 'production_verified' | 'eval_stale' | 'needs_auth';

export interface DifyOperatorAgent {
  id: string;
  label: string;
  client: string;
  lane: string;
  status: DifyOperatorAgentStatus;
  serviceApiBaseUrl: string;
  apiKeyEnv: string;
  infisicalPath: string;
  evalSuite: string;
  smokeCommand: string;
  operatorSummary: string;
  nextAction: string;
  policyBoundary: string;
  starterPrompts: string[];
}

export interface DifyOperatorAgentView extends DifyOperatorAgent {
  credentialState: DifyCredentialState;
  operatorState: DifyOperatorState;
  operatorStateLabel: string;
  operatorStateDetail: string;
}

export const difyOperatorAgents = [
  {
    id: 'template-review-hub',
    label: 'Template Review Hub',
    client: 'Webflow Marketplace',
    lane: 'Template review',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_TEMPLATE_REVIEW_HUB_API_KEY',
    infisicalPath: '/dify/template-review-hub',
    evalSuite: 'braintrust:eval:dify:template-review-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id template-review-hub',
    operatorSummary: 'Comprehensive template review coordination with validator and E2B evidence.',
    nextAction: 'Review submitted site evidence and keep final marketplace decisions human-owned.',
    policyBoundary:
      'No final marketplace decision or creator-facing write without explicit review approval.',
    starterPrompts: [
      'Complete a full re-review of the submitted Webflow template and show evidence first.',
      'Find blockers before any creator-facing feedback is drafted.',
      'Prepare the next reviewer action with proof and policy references.'
    ]
  },
  {
    id: 'eric-hub',
    label: 'Eric Hub',
    client: 'Webflow Marketplace',
    lane: 'Template reviewer',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_ERIC_HUB_API_KEY',
    infisicalPath: '/dify/eric-hub',
    evalSuite: 'braintrust:eval:dify:eric-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id eric-hub',
    operatorSummary: 'Reviewer-specific lane for template quality evidence and sandbox checks.',
    nextAction:
      'Use reviewer-scoped tools, then summarize findings without making final decisions.',
    policyBoundary: 'Reviewer evidence is advisory until a human confirms the outcome.',
    starterPrompts: [
      'Review the current template evidence as Eric and identify the highest-risk blocker.',
      'Run a read-only readiness pass and return proof beside each claim.',
      'Summarize what an operator should verify before approving feedback.'
    ]
  },
  {
    id: 'natalia-hub',
    label: 'Natalia Hub',
    client: 'Webflow Marketplace',
    lane: 'Template reviewer',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_NATALIA_HUB_API_KEY',
    infisicalPath: '/dify/natalia-hub',
    evalSuite: 'braintrust:eval:dify:natalia-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id natalia-hub',
    operatorSummary: 'Reviewer-specific lane for template re-review and Webflow evidence capture.',
    nextAction:
      'Keep the operator focused on evidence, blocked states, and reviewer-owned next steps.',
    policyBoundary: 'Do not expose private reviewer data or promote draft feedback as final.',
    starterPrompts: [
      'Complete a full re-review as Natalia and separate facts from recommendations.',
      'List missing evidence before making any quality claim.',
      'Prepare an operator handoff with the next action owner clearly named.'
    ]
  },
  {
    id: 'mariana-hub',
    label: 'Mariana Hub',
    client: 'Webflow Marketplace',
    lane: 'Template reviewer',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_MARIANA_HUB_API_KEY',
    infisicalPath: '/dify/mariana-hub',
    evalSuite: 'braintrust:eval:dify:mariana-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id mariana-hub',
    operatorSummary:
      'Reviewer-specific lane for structured template review and sandbox-backed proof.',
    nextAction: 'Return a compact operator brief with risks, proof, and handoff boundaries.',
    policyBoundary: 'Keep writes and final outcomes gated behind human confirmation.',
    starterPrompts: [
      'Review the template as Mariana and return proof for each issue.',
      'Identify whether the current evidence is enough for a reviewer decision.',
      'Create a concise next-action brief for the marketplace operator.'
    ]
  },
  {
    id: 'vicki-hub',
    label: 'Vicki Hub',
    client: 'Webflow Marketplace',
    lane: 'Template reviewer',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_VICKI_HUB_API_KEY',
    infisicalPath: '/dify/vicki-hub',
    evalSuite: 'braintrust:eval:dify:vicki-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id vicki-hub',
    operatorSummary:
      'Reviewer-specific lane for template evidence review with direct action language.',
    nextAction: 'Show the exact blocker, owner, and proof before any escalation.',
    policyBoundary: 'No speculative writeback or marketplace status change from chat alone.',
    starterPrompts: [
      'Review this template as Vicki and identify the strongest evidence-backed finding.',
      'Separate reviewer confidence from missing evidence.',
      'Prepare the operator-ready summary with blocked and ready states.'
    ]
  },
  {
    id: 'pablo-hub',
    label: 'Pablo Hub',
    client: 'Webflow Marketplace',
    lane: 'App review',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_PABLO_HUB_API_KEY',
    infisicalPath: '/dify/pablo-hub',
    evalSuite: 'braintrust:eval:dify:pablo-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id pablo-hub',
    operatorSummary: 'App review lane for marketplace app evidence and policy-aware feedback.',
    nextAction: 'Inspect app review evidence and surface the next reviewer-owned decision.',
    policyBoundary: 'Final app review actions stay outside this chat until explicitly approved.',
    starterPrompts: [
      'Review this app submission and call out any policy or evidence gaps.',
      'Prepare the next app-review operator action with proof beside each claim.',
      'Explain what is safe to tell the developer now and what remains blocked.'
    ]
  },
  {
    id: 'shea-hub',
    label: 'Shea Hub',
    client: 'Webflow Marketplace',
    lane: 'App review',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_SHEA_HUB_API_KEY',
    infisicalPath: '/dify/shea-hub',
    evalSuite: 'braintrust:eval:dify:shea-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id shea-hub',
    operatorSummary: 'App review lane that needs Service API and eval proof before promotion.',
    nextAction: 'Use only verified evidence and keep the eval state visible to the operator.',
    policyBoundary:
      'Treat live output as review assistance until smoke and eval proof are current.',
    starterPrompts: [
      'Review the app submission as Shea and name any missing proof.',
      'Create a read-only review brief for the operator.',
      'Check whether the evidence is enough to draft reviewer feedback.'
    ]
  },
  {
    id: 'abundance-hub',
    label: 'Abundance Hub',
    client: 'Abundance',
    lane: 'Nurse staffing',
    status: 'published',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_ABUNDANCE_HUB_API_KEY',
    infisicalPath: '/dify/abundance-hub',
    evalSuite: 'braintrust:eval:dify:abundance-hub',
    smokeCommand: 'pnpm dify:abundance-hub:smoke',
    operatorSummary: 'Nurse staffing agent with published smoke and Braintrust evidence.',
    nextAction:
      'Help the operator inspect intake, staffing, and handoff state without bypassing gates.',
    policyBoundary: 'Protected nurse actions require verification and governed staffing approval.',
    starterPrompts: [
      'Review the current nurse intake state and name the next safe operator action.',
      'Identify blockers before any staffing or facility handoff.',
      'Summarize what proof is attached and what still needs verification.'
    ]
  },
  {
    id: 'create-something-guide-agent',
    label: 'CREATE SOMETHING Guide',
    client: 'CREATE SOMETHING',
    lane: 'Public guide',
    status: 'published',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_CREATE_SOMETHING_GUIDE_AGENT_API_KEY',
    infisicalPath: '/dify/create-something-guide-agent',
    evalSuite: 'braintrust:eval:dify:create-something-guide-agent',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id create-something-guide-agent',
    operatorSummary: 'Public read-only guide backed by CREATE SOMETHING source material.',
    nextAction: 'Answer strategy and framework questions without exposing private client material.',
    policyBoundary: 'Public-safe answers only; private client agents remain separate.',
    starterPrompts: [
      'Explain the Database / Automation / Judgment model for a new operator.',
      'Describe how MCP creation differs from MCP consumption.',
      'Give a public-safe summary of CREATE SOMETHING agent governance.'
    ]
  },
  {
    id: 'youtube-transcript-notion-agent',
    label: 'YouTube Transcript Notion',
    client: 'CREATE SOMETHING',
    lane: 'Content operations',
    status: 'published',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_YOUTUBE_TRANSCRIPT_NOTION_AGENT_API_KEY',
    infisicalPath: '/dify/youtube-transcript-notion-agent',
    evalSuite: 'braintrust:eval:dify:youtube-transcript',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id youtube-transcript-notion-agent',
    operatorSummary: 'Content operations agent for transcript-to-Notion workflows.',
    nextAction: 'Keep content extraction, draft state, and publishing proof separated.',
    policyBoundary: 'Do not expose Notion credentials, raw tokens, or private workspace links.',
    starterPrompts: [
      'Prepare a transcript capture plan and list the proof an operator should verify.',
      'Summarize what can be safely saved to Notion.',
      'Identify missing video or transcript context before taking action.'
    ]
  },
  {
    id: 'blondish-hub',
    label: 'Blondish Hub',
    client: 'Blondish',
    lane: 'Client hub',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_BLONDISH_HUB_API_KEY',
    infisicalPath: '/dify/blondish-hub',
    evalSuite: 'braintrust:eval:dify:blondish-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id blondish-hub',
    operatorSummary: 'Client hub lane with static-bearer MCP access and API smoke coverage.',
    nextAction: 'Inspect client context and return a governed operator brief.',
    policyBoundary: 'Client-private data stays inside the authenticated operator surface.',
    starterPrompts: [
      'Review the current Blondish context and name the next operator action.',
      'List what evidence is available and what remains blocked.',
      'Prepare a concise client-safe handoff summary.'
    ]
  },
  {
    id: 'morgan-hub',
    label: 'Morgan Hub',
    client: 'Morgan Young / C3',
    lane: 'Client hub',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_MORGAN_HUB_API_KEY',
    infisicalPath: '/dify/morgan-hub',
    evalSuite: 'braintrust:eval:dify:morgan-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id morgan-hub',
    operatorSummary: 'Client hub lane that requires current API smoke proof before promotion.',
    nextAction: 'Keep live claims tied to current smoke evidence.',
    policyBoundary: 'No production-ready claim without current API smoke proof.',
    starterPrompts: [
      'Review this client context and separate confirmed facts from missing proof.',
      'Name the safest next operator step.',
      'Show whether this lane has enough evidence for production use.'
    ]
  },
  {
    id: 'viv-hub',
    label: 'Viv Hub',
    client: 'Viv / Blondish',
    lane: 'Client hub',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_VIV_HUB_API_KEY',
    infisicalPath: '/dify/viv-hub',
    evalSuite: 'braintrust:eval:dify:viv-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id viv-hub',
    operatorSummary: 'Client hub lane with reachable API and static-bearer tool routing.',
    nextAction: 'Make client context legible without exposing private records.',
    policyBoundary: 'Keep private client data behind staff access and bounded summaries.',
    starterPrompts: [
      'Summarize the current Viv lane state for an operator.',
      'Identify evidence-backed next steps and blocked actions.',
      'Prepare a client-safe brief with no raw secret or private workspace data.'
    ]
  },
  {
    id: 'c3-hub',
    label: 'C3 Hub',
    client: 'C3 Denver',
    lane: 'Client hub',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_C3_HUB_API_KEY',
    infisicalPath: '/dify/c3-hub',
    evalSuite: 'braintrust:eval:dify:c3-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id c3-hub',
    operatorSummary: 'Client hub lane pending current smoke evidence before production promotion.',
    nextAction:
      'Use the agent for operator drafting only when credential and smoke state are clear.',
    policyBoundary: 'Treat unverified tool output as draft assistance.',
    starterPrompts: [
      'Review C3 lane context and call out what needs proof.',
      'List the next safe operator action.',
      'Prepare a short evidence-first handoff.'
    ]
  },
  {
    id: 'aaron-hub',
    label: 'Aaron Hub',
    client: 'Outerfields',
    lane: 'Client hub',
    status: 'imported',
    serviceApiBaseUrl: 'https://api.dify.ai/v1',
    apiKeyEnv: 'DIFY_AARON_HUB_API_KEY',
    infisicalPath: '/dify/aaron-hub',
    evalSuite: 'braintrust:eval:dify:aaron-hub',
    smokeCommand: 'pnpm dify:agent:smoke -- --agent-id aaron-hub',
    operatorSummary: 'Client hub lane pending current smoke evidence before production promotion.',
    nextAction: 'Keep client workflow recommendations tied to visible proof.',
    policyBoundary: 'No client-facing action without an operator-approved handoff.',
    starterPrompts: [
      'Review Outerfields context and name the safest next step.',
      'Separate actionable evidence from missing context.',
      'Create an operator brief with blocked states visible.'
    ]
  }
] as const satisfies DifyOperatorAgent[];

export function getDifyOperatorAgent(agentId: string): DifyOperatorAgent | null {
  return difyOperatorAgents.find((agent) => agent.id === agentId) ?? null;
}

export function getDifyAgentApiKey(
  agent: DifyOperatorAgent,
  platform?: App.Platform
): string | null {
  const value = readRuntimeEnv(platform, agent.apiKeyEnv)?.trim();
  return value ? value : null;
}

export function getDifyCredentialState(
  agent: DifyOperatorAgent,
  platform?: App.Platform
): DifyCredentialState {
  return getDifyAgentApiKey(agent, platform) ? 'available' : 'missing';
}

function getOperatorState(
  agent: DifyOperatorAgent,
  credentialState: DifyCredentialState
): DifyOperatorState {
  if (credentialState === 'missing') {
    return 'needs_auth';
  }

  return agent.status === 'published' ? 'production_verified' : 'eval_stale';
}

function getOperatorStateLabel(state: DifyOperatorState): string {
  switch (state) {
    case 'production_verified':
      return 'Production verified';
    case 'eval_stale':
      return 'Eval check required';
    case 'needs_auth':
      return 'Needs API key';
  }
}

function getOperatorStateDetail(agent: DifyOperatorAgent, state: DifyOperatorState): string {
  switch (state) {
    case 'production_verified':
      return `${agent.smokeCommand} and ${agent.evalSuite} are the production proof path.`;
    case 'eval_stale':
      return `Imported Dify app. Run ${agent.smokeCommand} before making production-ready claims.`;
    case 'needs_auth':
      return `Bind ${agent.apiKeyEnv} from Infisical prod:${agent.infisicalPath}.`;
  }
}

export function toDifyOperatorAgentView(
  agent: DifyOperatorAgent,
  platform?: App.Platform
): DifyOperatorAgentView {
  const credentialState = getDifyCredentialState(agent, platform);
  const operatorState = getOperatorState(agent, credentialState);

  return {
    ...agent,
    credentialState,
    operatorState,
    operatorStateLabel: getOperatorStateLabel(operatorState),
    operatorStateDetail: getOperatorStateDetail(agent, operatorState)
  };
}

export function getDifyOperatorAgentViews(platform?: App.Platform): DifyOperatorAgentView[] {
  return difyOperatorAgents.map((agent) => toDifyOperatorAgentView(agent, platform));
}
