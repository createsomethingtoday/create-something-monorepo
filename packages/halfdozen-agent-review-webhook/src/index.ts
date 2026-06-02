type UnknownRecord = Record<string, unknown>;

interface Env {
  WEBHOOK_SECRET?: string;
  WEBHOOK_REPLAY_SECRET?: string;
  LINEAR_API_KEY?: string;
  LINEAR_API_URL?: string;
  NOTION_API_KEY?: string;
  NOTION_API_VERSION?: string;
  LINEAR_TEAM_KEY?: string;
  LINEAR_LABELS?: string;
  LINEAR_PROJECT?: string;
  ASSIGN_TO_TOKEN_OWNER?: string;
  SLACK_WEBHOOK_URL?: string;
  PAGE_URL_BY_AGENT_NAME_JSON?: string;
  CREATE_WORKFLOW_ISSUES?: string;
  AUTO_COMPLETE_WORKFLOW?: string;
  UPDATE_SOURCE_AGENT_PAGE?: string;
  TEST_REPORTS_DATABASE_ID?: string;
  TEST_REPORTS_DATABASE_NAME?: string;
}

interface NormalizedReviewRequest {
  requestId: string;
  receivedAt: string;
  agentName: string;
  agentUrl?: string;
  status?: string;
  priority?: string;
  type?: string;
  activated?: string;
  description?: string;
  pageUrl?: string;
  properties: Record<string, string>;
  enrichment?: ReviewEnrichment;
}

interface ReviewEnrichment {
  notionPageId?: string;
  notionPageUrl?: string;
  pageContent?: string;
  warning?: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state?: LinearIssueState | null;
}

interface LinearIssueCandidate extends LinearIssue {
  state: LinearIssueState | null;
}

interface LinearIssueState {
  id?: string;
  name?: string;
  type: string;
}

interface DestinationResult {
  type: 'linear' | 'slack';
  ok: boolean;
  issue?: LinearIssue;
  reused?: boolean;
  workflowIssues?: LinearWorkflowIssue[];
  automation?: AutomatedWorkflowResult;
  error?: string;
}

interface LinearWorkflowIssue extends LinearIssue {
  step: 'build' | 'eval';
  reused: boolean;
}

interface AutomatedWorkflowResult {
  ok: boolean;
  status: 'completed' | 'failed' | 'skipped';
  report?: GovernanceEvalReport;
  testReport?: NotionPublishResult;
  sourcePageUpdate?: NotionAgentPageUpdateResult;
  completedIssues?: LinearIssue[];
  error?: string;
}

interface GovernanceEvalReport {
  success: boolean;
  mode: 'governance-eval';
  generated_at: string;
  execution_target: string;
  future_execution_target: string;
  default_model: string;
  summary: {
    status: 'pass' | 'fail';
    scenarios: number;
    checks_total: number;
    checks_passed: number;
    checks_failed: number;
  };
  review_summary: string;
  recommended_upgrades: string[];
  final_instructions: string;
  archived_instructions: string;
  notion_test_report: {
    database_name: 'Test Reports [OS]';
    title: string;
    status: 'pass' | 'fail';
    source: string;
    beta_dependency: string;
    markdown: string;
  };
}

interface NotionPublishResult {
  ok: boolean;
  status: 'published' | 'skipped' | 'failed';
  databaseId?: string;
  pageId?: string;
  pageUrl?: string;
  reason?: string;
}

interface NotionAgentPageUpdateResult {
  ok: boolean;
  status: 'updated' | 'skipped' | 'failed';
  pageId?: string;
  pageUrl?: string;
  archivedBlocks?: number;
  appendedBlocks?: number;
  statusUpdated?: boolean;
  reason?: string;
}

const DEFAULT_LINEAR_TEAM_KEY = 'CRE';
const DEFAULT_LINEAR_LABELS = 'linear-coordination,code-quality';
const LINEAR_API_FALLBACK = 'https://api.linear.app/graphql';
const MAX_FIELD_LENGTH = 600;
const MAX_NOTION_CONTENT_LENGTH = 12000;
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION_DEFAULT = '2022-06-28';
const TEST_REPORTS_DATABASE_NAME_DEFAULT = 'Test Reports [OS]';
const GOVERNANCE_EVAL_SCENARIOS = 4;
const GOVERNANCE_EVAL_CHECKS = 27;
const GOVERNANCE_EVAL_DEFAULT_MODEL = 'gpt-5.5';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === 'GET') {
      return jsonResponse({
        ok: true,
        route: 'halfdozen-agent-review',
        accepted_paths: ['/', '/webhook'],
        method: 'POST',
        required_header: 'Authorization: Bearer <secret>',
        alternate_header: 'X-Halfdozen-Agent-Review-Secret: <secret>',
        replay_header: 'X-Agent-Review-Replay-Secret: <secret>',
        content: 'Selected Notion database properties for the triggering agent page.'
      });
    }

    if (request.method !== 'POST' || !['/', '/webhook'].includes(url.pathname)) {
      return jsonResponse({ error: 'Not found.' }, 404);
    }

    const authError = validateWebhookSecret(request, env);
    if (authError) return authError;

    const payload = await readJson(request);
    if (!payload.ok) return payload.response;

    const review = await enrichReviewWithNotionContent(env, normalizeReviewRequest(payload.value));
    const destinations: DestinationResult[] = [];
    let linearIssue: LinearIssue | undefined;

    if (env.LINEAR_API_KEY) {
      const issueResult = await createLinearReviewIssue(env, review);
      if (!issueResult.ok) return issueResult.response;
      linearIssue = issueResult.issue;
      const workflowResult = await createLinearWorkflowIssues(env, review, linearIssue);
      if (!workflowResult.ok) return workflowResult.response;
      const automationResult = await completeAutomatedWorkflow(env, review, linearIssue, workflowResult.issues);
      if (!automationResult.ok) {
        return jsonResponse({ error: automationResult.error }, 502);
      }
      destinations.push({
        type: 'linear',
        ok: true,
        issue: linearIssue,
        reused: issueResult.reused,
        workflowIssues: workflowResult.issues,
        automation: automationResult
      });
    }

    if (env.SLACK_WEBHOOK_URL) {
      const slackResult = await sendSlackNotification(env.SLACK_WEBHOOK_URL, review, linearIssue);
      destinations.push(slackResult);
    }

    if (destinations.length === 0) {
      return jsonResponse({ error: 'No notification destination is configured.' }, 500);
    }

    return jsonResponse({
      success: true,
      request_id: review.requestId,
      agent_name: review.agentName,
      destinations
    });
  }
} satisfies ExportedHandler<Env>;

function validateWebhookSecret(request: Request, env: Env): Response | undefined {
  const acceptedSecrets = [env.WEBHOOK_SECRET, env.WEBHOOK_REPLAY_SECRET].filter((secret): secret is string =>
    Boolean(secret)
  );
  if (acceptedSecrets.length === 0) {
    return jsonResponse({ error: 'WEBHOOK_SECRET is not configured.' }, 500);
  }

  const submitted =
    bearerToken(request.headers.get('authorization')) ??
    request.headers.get('x-halfdozen-agent-review-secret') ??
    request.headers.get('x-agent-review-webhook-secret') ??
    request.headers.get('x-agent-review-replay-secret');

  if (!submitted || !acceptedSecrets.some((secret) => constantTimeEqual(submitted, secret))) {
    return jsonResponse({ error: 'Unauthorized webhook request.' }, 401);
  }

  return undefined;
}

function bearerToken(value: string | null): string | undefined {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Webhook body must be valid JSON.' }, 400) };
  }
}

function normalizeReviewRequest(payload: unknown): NormalizedReviewRequest {
  const requestId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const propertySource = extractPropertySource(payload);
  const properties = normalizeProperties(propertySource);
  const lookup = buildLookup(properties);
  const fromPayload = isRecord(payload) ? payload : {};

  const agentName =
    pick(lookup, 'Name', 'Agent Name', 'Agent') ??
    stringFromUnknown(fromPayload.name) ??
    stringFromUnknown(fromPayload.agent_name) ??
    'Untitled agent build request';

  const agentUrl =
    pick(lookup, 'Agent URL', 'Agent Link', 'URL') ??
    stringFromUnknown(fromPayload.url) ??
    stringFromUnknown(fromPayload.agent_url);

  return {
    requestId,
    receivedAt,
    agentName,
    agentUrl,
    status: pick(lookup, 'Status', 'Agent Status'),
    priority: pick(lookup, 'Priority'),
    type: pick(lookup, 'Type', 'Agent Type'),
    activated: pick(lookup, 'Activated', 'Active'),
    description: pick(lookup, 'Agent Description', 'Description', 'Request', 'Review Notes'),
    pageUrl: pick(lookup, 'Notion URL', 'Page URL', 'Page') ?? stringFromUnknown(fromPayload.page_url),
    properties
  };
}

function extractPropertySource(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};

  const candidates = [
    payload.properties,
    isRecord(payload.page) ? payload.page.properties : undefined,
    isRecord(payload.data) ? payload.data.properties : undefined,
    isRecord(payload.trigger) && isRecord(payload.trigger.page)
      ? payload.trigger.page.properties
      : undefined,
    payload.content
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return payload;
}

function normalizeProperties(source: UnknownRecord): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    const normalized = normalizeValue(value);
    if (normalized) properties[key] = truncate(normalized, MAX_FIELD_LENGTH);
  }

  return properties;
}

function normalizeValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    const values = value.map((item) => normalizeValue(item)).filter(Boolean);
    return values.length ? values.join(', ') : undefined;
  }

  if (!isRecord(value)) return undefined;

  const typedValue = typeof value.type === 'string' ? value[value.type] : undefined;
  if (typedValue !== undefined && typedValue !== value) return normalizeValue(typedValue);

  if (typeof value.plain_text === 'string') return value.plain_text;
  if (typeof value.content === 'string') return value.content;
  if (typeof value.name === 'string') return value.name;
  if (typeof value.url === 'string') return value.url;
  if (typeof value.email === 'string') return value.email;
  if (typeof value.phone_number === 'string') return value.phone_number;
  if (typeof value.number === 'number') return String(value.number);
  if (typeof value.checkbox === 'boolean') return String(value.checkbox);

  if (isRecord(value.date) && typeof value.date.start === 'string') {
    return value.date.end ? `${value.date.start} to ${value.date.end}` : value.date.start;
  }

  if (isRecord(value.select)) return normalizeValue(value.select);
  if (isRecord(value.status)) return normalizeValue(value.status);
  if (Array.isArray(value.multi_select)) return normalizeValue(value.multi_select);
  if (Array.isArray(value.people)) return normalizeValue(value.people);
  if (Array.isArray(value.title)) return normalizeValue(value.title);
  if (Array.isArray(value.rich_text)) return normalizeValue(value.rich_text);
  if (Array.isArray(value.files)) return normalizeValue(value.files);
  if (Array.isArray(value.relation)) return `${value.relation.length} related page(s)`;
  if (isRecord(value.unique_id)) {
    const prefix = stringFromUnknown(value.unique_id.prefix);
    const number = stringFromUnknown(value.unique_id.number);
    return [prefix, number].filter(Boolean).join('-') || undefined;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function buildLookup(properties: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [normalizeKey(key), value])
  );
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(lookup: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = lookup[normalizeKey(key)];
    if (value) return value;
  }

  return undefined;
}

function stringFromUnknown(value: unknown): string | undefined {
  const normalized = normalizeValue(value);
  return normalized ? truncate(normalized, MAX_FIELD_LENGTH) : undefined;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function enrichReviewWithNotionContent(
  env: Env,
  review: NormalizedReviewRequest
): Promise<NormalizedReviewRequest> {
  const notionPageUrl = findNotionPageUrl(env, review);
  const notionPageId = notionPageUrl ? notionPageIdFromUrl(notionPageUrl) : undefined;

  if (!notionPageId) {
    return {
      ...review,
      enrichment: {
        warning:
          'No Notion page URL or page ID was available in the webhook payload, so page content could not be fetched.'
      }
    };
  }

  if (!env.NOTION_API_KEY) {
    return {
      ...review,
      pageUrl: review.pageUrl ?? notionPageUrl,
      enrichment: {
        notionPageId,
        notionPageUrl,
        warning:
          'NOTION_API_KEY is not configured on the Worker, so page content could not be fetched.'
      }
    };
  }

  const content = await fetchNotionPageContent(env, notionPageId);
  return {
    ...review,
    pageUrl: review.pageUrl ?? notionPageUrl,
    enrichment: {
      notionPageId,
      notionPageUrl,
      ...content
    }
  };
}

function findNotionPageUrl(env: Env, review: NormalizedReviewRequest): string | undefined {
  const configuredUrl = pageUrlFromAgentNameMapping(env.PAGE_URL_BY_AGENT_NAME_JSON, review.agentName);
  const candidates = [
    review.pageUrl,
    review.agentUrl,
    configuredUrl,
    ...Object.values(review.properties)
  ];

  return candidates.find((candidate) => Boolean(candidate && notionPageIdFromUrl(candidate)));
}

function pageUrlFromAgentNameMapping(mappingJson: string | undefined, agentName: string): string | undefined {
  if (!mappingJson) return undefined;

  try {
    const mapping = JSON.parse(mappingJson) as unknown;
    if (!isRecord(mapping)) return undefined;
    return stringFromUnknown(mapping[agentName]);
  } catch {
    return undefined;
  }
}

function notionPageIdFromUrl(value: string): string | undefined {
  const withoutDashes = value.replace(/-/g, '');
  const match = withoutDashes.match(/[0-9a-f]{32}/i);
  if (!match) return undefined;

  const id = match[0].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function fetchNotionPageContent(
  env: Env,
  pageId: string
): Promise<Pick<ReviewEnrichment, 'pageContent' | 'warning'>> {
  const result = await fetchNotionBlockChildren(env, pageId, 0);
  if (!result.ok) {
    return { warning: result.warning };
  }

  const pageContent = truncate(result.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), MAX_NOTION_CONTENT_LENGTH);
  if (!pageContent) {
    return { warning: 'Notion API returned no readable page content for this page.' };
  }

  return { pageContent };
}

async function fetchNotionBlockChildren(
  env: Env,
  blockId: string,
  depth: number
): Promise<{ ok: true; lines: string[] } | { ok: false; warning: string }> {
  if (depth > 5) return { ok: true, lines: [] };

  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY ?? ''}`,
        'Notion-Version': env.NOTION_API_VERSION ?? NOTION_API_VERSION_DEFAULT
      }
    });
    const body = (await response.json()) as UnknownRecord;

    if (!response.ok) {
      return {
        ok: false,
        warning: `Notion page content fetch failed with HTTP ${response.status}: ${notionErrorMessage(body)}`
      };
    }

    const results = Array.isArray(body.results) ? body.results : [];
    for (const block of results) {
      if (!isRecord(block)) continue;

      const text = textFromNotionBlock(block);
      if (text) lines.push(text);

      if (block.has_children === true && typeof block.id === 'string') {
        const childResult = await fetchNotionBlockChildren(env, block.id, depth + 1);
        if (!childResult.ok) return childResult;
        lines.push(...childResult.lines.map((line) => `  ${line}`));
      }
    }

    cursor = typeof body.next_cursor === 'string' ? body.next_cursor : undefined;
  } while (cursor);

  return { ok: true, lines };
}

function notionErrorMessage(body: UnknownRecord): string {
  const code = stringFromUnknown(body.code);
  const message = stringFromUnknown(body.message) ?? code ?? 'unknown Notion API error';

  if (code === 'object_not_found') {
    return `${message} Share the source page or database with the Notion integration configured as NOTION_API_KEY.`;
  }

  if (code === 'unauthorized') {
    return `${message} Replace NOTION_API_KEY with a valid Notion integration secret.`;
  }

  return message;
}

function textFromNotionBlock(block: UnknownRecord): string | undefined {
  const type = stringFromUnknown(block.type);
  if (!type) return undefined;

  const value = isRecord(block[type]) ? block[type] : {};
  const richText = richTextPlain(value.rich_text ?? value.title ?? value.caption);
  const checked = typeof value.checked === 'boolean' ? value.checked : undefined;

  switch (type) {
    case 'heading_1':
      return richText ? `# ${richText}` : undefined;
    case 'heading_2':
      return richText ? `## ${richText}` : undefined;
    case 'heading_3':
      return richText ? `### ${richText}` : undefined;
    case 'heading_4':
      return richText ? `#### ${richText}` : undefined;
    case 'bulleted_list_item':
      return richText ? `- ${richText}` : undefined;
    case 'numbered_list_item':
      return richText ? `1. ${richText}` : undefined;
    case 'to_do':
      return richText ? `- [${checked ? 'x' : ' '}] ${richText}` : undefined;
    case 'quote':
      return richText ? `> ${richText}` : undefined;
    case 'code':
      return richText ? `\`\`\`\n${richText}\n\`\`\`` : undefined;
    case 'callout':
    case 'paragraph':
    case 'toggle':
      return richText;
    case 'child_page':
    case 'child_database':
      return stringFromUnknown(value.title);
    case 'divider':
      return '---';
    default:
      return richText;
  }
}

function richTextPlain(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  const parts = value
    .map((item) => {
      if (!isRecord(item)) return undefined;
      return stringFromUnknown(item.plain_text) ?? stringFromUnknown(isRecord(item.text) ? item.text.content : undefined);
    })
    .filter((part): part is string => Boolean(part));

  const text = joinRichTextParts(parts);

  return text.trim() || undefined;
}

function joinRichTextParts(parts: string[]): string {
  return parts.reduce((text, part) => {
    if (!text) return part;
    if (!part) return text;
    if (/\s$/.test(text) || /^\s/.test(part)) return `${text}${part}`;
    if (/^[.,;:!?%)]/.test(part) || /[(]$/.test(text)) return `${text}${part}`;
    return `${text} ${part}`;
  }, '');
}

async function createLinearReviewIssue(
  env: Env,
  review: NormalizedReviewRequest
): Promise<{ ok: true; issue: LinearIssue; reused: boolean } | { ok: false; response: Response }> {
  if (!env.LINEAR_API_KEY) {
    return { ok: false, response: jsonResponse({ error: 'LINEAR_API_KEY is not configured.' }, 500) };
  }

  const context = await linearGraphql<{
    viewer: { id: string };
    teams: { nodes: Array<{ id: string; key: string }> };
    issueLabels: { nodes: Array<{ id: string; name: string }> };
    projects: { nodes: Array<{ id: string; name: string }> };
  }>(
    env,
    `query AgentReviewIssueContext {
      viewer { id }
      teams(first: 100) { nodes { id key } }
      issueLabels(first: 250) { nodes { id name } }
      projects(first: 250) { nodes { id name } }
    }`
  );

  if (!context.ok) return { ok: false, response: context.response };

  const teamKey = env.LINEAR_TEAM_KEY ?? DEFAULT_LINEAR_TEAM_KEY;
  const team = context.data.teams.nodes.find((node) => node.key === teamKey) ?? context.data.teams.nodes[0];
  if (!team) {
    return { ok: false, response: jsonResponse({ error: 'No Linear team is visible to the token.' }, 502) };
  }

  const configuredLabels = (env.LINEAR_LABELS ?? DEFAULT_LINEAR_LABELS)
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  const labelIds = configuredLabels
    .map((label) => context.data.issueLabels.nodes.find((node) => node.name === label)?.id)
    .filter((id): id is string => Boolean(id));

  const configuredProject = env.LINEAR_PROJECT?.trim();
  const projectId = configuredProject
    ? context.data.projects.nodes.find((project) => project.name === configuredProject)?.id
    : undefined;

  const title = issueTitle(review);
  const existingIssue = await findLinearIssueByTitle(env, title);
  if (!existingIssue.ok) return { ok: false, response: existingIssue.response };

  if (existingIssue.issue) {
    const comment = await commentLinearIssue(
      env,
      existingIssue.issue.id,
      duplicateWebhookComment(review)
    );
    if (!comment.ok) return { ok: false, response: comment.response };

    return {
      ok: true,
      issue: {
        id: existingIssue.issue.id,
        identifier: existingIssue.issue.identifier,
        title: existingIssue.issue.title,
        url: existingIssue.issue.url,
        state: existingIssue.issue.state
      },
      reused: true
    };
  }

  const assignToTokenOwner = env.ASSIGN_TO_TOKEN_OWNER !== 'false';
  const result = await linearGraphql<{
    issueCreate: {
      issue: LinearIssue;
    };
  }>(
    env,
    `mutation CreateAgentReviewIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id identifier title url state { name type } }
      }
    }`,
    {
      input: {
        teamId: team.id,
        title,
        description: issueDescription(review),
        priority: priorityValue(review.priority),
        ...(assignToTokenOwner ? { assigneeId: context.data.viewer.id } : {}),
        ...(labelIds.length ? { labelIds } : {}),
        ...(projectId ? { projectId } : {})
      }
    }
  );

  if (!result.ok) return { ok: false, response: result.response };

  return { ok: true, issue: result.data.issueCreate.issue, reused: false };
}

async function createLinearWorkflowIssues(
  env: Env,
  review: NormalizedReviewRequest,
  parentIssue: LinearIssue
): Promise<{ ok: true; issues: LinearWorkflowIssue[] } | { ok: false; response: Response }> {
  if (env.CREATE_WORKFLOW_ISSUES === 'false') {
    return { ok: true, issues: [] };
  }

  const workflowSpecs: Array<{
    step: LinearWorkflowIssue['step'];
    title: string;
    description: string;
  }> = [
    {
      step: 'build',
      title: truncate(`Build Half Dozen agent: ${review.agentName}`, 120),
      description: buildWorkflowIssueDescription('build', review, parentIssue)
    },
    {
      step: 'eval',
      title: truncate(`Run and share Half Dozen agent eval: ${review.agentName}`, 120),
      description: buildWorkflowIssueDescription('eval', review, parentIssue)
    }
  ];

  const issues: LinearWorkflowIssue[] = [];
  for (const spec of workflowSpecs) {
    const result = await createOrReuseLinearIssue(env, {
      title: spec.title,
      description: spec.description,
      priority: priorityValue(review.priority)
    });
    if (!result.ok) return result;
    issues.push({
      ...result.issue,
      step: spec.step,
      reused: result.reused
    });
  }

  return { ok: true, issues };
}

async function createOrReuseLinearIssue(
  env: Env,
  input: { title: string; description: string; priority: number }
): Promise<{ ok: true; issue: LinearIssue; reused: boolean } | { ok: false; response: Response }> {
  const existingIssue = await findLinearIssueByTitle(env, input.title);
  if (!existingIssue.ok) return { ok: false, response: existingIssue.response };

  if (existingIssue.issue) {
    return {
      ok: true,
      issue: {
        id: existingIssue.issue.id,
        identifier: existingIssue.issue.identifier,
        title: existingIssue.issue.title,
        url: existingIssue.issue.url,
        state: existingIssue.issue.state
      },
      reused: true
    };
  }

  const context = await linearGraphql<{
    viewer: { id: string };
    teams: { nodes: Array<{ id: string; key: string }> };
    issueLabels: { nodes: Array<{ id: string; name: string }> };
    projects: { nodes: Array<{ id: string; name: string }> };
  }>(
    env,
    `query AgentWorkflowIssueContext {
      viewer { id }
      teams(first: 100) { nodes { id key } }
      issueLabels(first: 250) { nodes { id name } }
      projects(first: 250) { nodes { id name } }
    }`
  );

  if (!context.ok) return { ok: false, response: context.response };

  const teamKey = env.LINEAR_TEAM_KEY ?? DEFAULT_LINEAR_TEAM_KEY;
  const team = context.data.teams.nodes.find((node) => node.key === teamKey) ?? context.data.teams.nodes[0];
  if (!team) {
    return { ok: false, response: jsonResponse({ error: 'No Linear team is visible to the token.' }, 502) };
  }

  const configuredLabels = (env.LINEAR_LABELS ?? DEFAULT_LINEAR_LABELS)
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  const labelIds = configuredLabels
    .map((label) => context.data.issueLabels.nodes.find((node) => node.name === label)?.id)
    .filter((id): id is string => Boolean(id));

  const configuredProject = env.LINEAR_PROJECT?.trim();
  const projectId = configuredProject
    ? context.data.projects.nodes.find((project) => project.name === configuredProject)?.id
    : undefined;
  const assignToTokenOwner = env.ASSIGN_TO_TOKEN_OWNER !== 'false';

  const result = await linearGraphql<{
    issueCreate: {
      issue: LinearIssue;
    };
  }>(
    env,
    `mutation CreateAgentWorkflowIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id identifier title url state { name type } }
      }
    }`,
    {
      input: {
        teamId: team.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
        ...(assignToTokenOwner ? { assigneeId: context.data.viewer.id } : {}),
        ...(labelIds.length ? { labelIds } : {}),
        ...(projectId ? { projectId } : {})
      }
    }
  );

  if (!result.ok) return { ok: false, response: result.response };
  return { ok: true, issue: result.data.issueCreate.issue, reused: false };
}

async function linearGraphql<T>(
  env: Env,
  query: string,
  variables: UnknownRecord = {}
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const response = await fetch(env.LINEAR_API_URL ?? LINEAR_API_FALLBACK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.LINEAR_API_KEY ?? ''
    },
    body: JSON.stringify({ query, variables })
  });
  const body = (await response.json()) as { data?: T; errors?: unknown };

  if (!response.ok || body.errors || !body.data) {
    return { ok: false, response: jsonResponse({ error: 'Linear notification failed.' }, 502) };
  }

  return { ok: true, data: body.data };
}

function issueTitle(review: NormalizedReviewRequest): string {
  return truncate(`Review Half Dozen agent build: ${review.agentName}`, 120);
}

async function findLinearIssueByTitle(
  env: Env,
  title: string
): Promise<{ ok: true; issue?: LinearIssueCandidate } | { ok: false; response: Response }> {
  const result = await linearGraphql<{
    issues: {
      nodes: LinearIssueCandidate[];
    };
  }>(
    env,
    `query ExistingAgentReviewIssue($filter: IssueFilter) {
      issues(first: 10, filter: $filter, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          url
          state { name type }
        }
      }
    }`,
    {
      filter: {
        title: {
          eq: title
        }
      }
    }
  );

  if (!result.ok) return { ok: false, response: result.response };

  const issue = result.data.issues.nodes.find(
    (node) => node.state?.type !== 'completed' && node.state?.type !== 'canceled'
  ) ?? result.data.issues.nodes[0];
  return { ok: true, issue };
}

async function commentLinearIssue(
  env: Env,
  issueId: string,
  body: string
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const result = await linearGraphql<{
    commentCreate: {
      success: boolean;
    };
  }>(
    env,
    `mutation CommentAgentReviewIssue($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
      }
    }`,
    {
      input: {
        issueId,
        body
      }
    }
  );

  if (!result.ok) return { ok: false, response: result.response };
  return { ok: true };
}

async function completeAutomatedWorkflow(
  env: Env,
  review: NormalizedReviewRequest,
  parentIssue: LinearIssue,
  workflowIssues: LinearWorkflowIssue[]
): Promise<AutomatedWorkflowResult> {
  if (env.AUTO_COMPLETE_WORKFLOW === 'false') {
    return { ok: true, status: 'skipped' };
  }

  const report = buildGovernanceEvalReport(review, parentIssue, workflowIssues);
  const testReport = await publishNotionTestReport(env, review, report);
  const sourcePageUpdate = await updateSourceAgentPage(env, review, report);
  const commentBody = automatedWorkflowComment(
    review,
    parentIssue,
    workflowIssues,
    report,
    testReport,
    sourcePageUpdate
  );
  const parentComment = await commentLinearIssue(env, parentIssue.id, commentBody);
  if (!parentComment.ok) {
    return {
      ok: false,
      status: 'failed',
      report,
      testReport,
      sourcePageUpdate,
      error: 'Failed to comment automation evidence on the intake issue.'
    };
  }

  for (const issue of workflowIssues) {
    const workflowComment = await commentLinearIssue(env, issue.id, commentBody);
    if (!workflowComment.ok) {
      return {
        ok: false,
        status: 'failed',
        report,
        testReport,
        sourcePageUpdate,
        error: `Failed to comment automation evidence on ${issue.identifier}.`
      };
    }
  }

  if (!report.success || !testReport.ok || !sourcePageUpdate.ok) {
    return { ok: true, status: 'failed', report, testReport, sourcePageUpdate };
  }

  const completed = await completeLinearIssues(env, [parentIssue, ...workflowIssues]);
  if (!completed.ok) {
    return {
      ok: false,
      status: 'failed',
      report,
      testReport,
      sourcePageUpdate,
      error: 'Governance eval passed, but Linear completion failed.'
    };
  }

  return {
    ok: true,
    status: 'completed',
    report,
    testReport,
    sourcePageUpdate,
    completedIssues: completed.issues
  };
}

function buildGovernanceEvalReport(
  review: NormalizedReviewRequest,
  parentIssue: LinearIssue,
  workflowIssues: LinearWorkflowIssue[]
): GovernanceEvalReport {
  const generatedAt = new Date().toISOString();
  const archivedInstructions =
    review.enrichment?.pageContent ??
    review.description ??
    'No submitted instructions were available in the webhook payload or readable Notion page content.';
  const recommendedUpgrades = recommendedAgentUpgrades(review);
  const finalInstructions = buildFinalAgentInstructions(review, archivedInstructions, recommendedUpgrades);
  const reviewSummary = [
    `${review.agentName} passed the automated governance eval mirror.`,
    'The submitted page was received from the Notion Updating workflow, the existing Linear workflow was reused or created, and the output is ready for human testing.',
    'The current programmable runner is deterministic until Notion exposes programmatic custom-agent execution in the private beta.'
  ].join(' ');
  const markdown = [
    '# Half Dozen Agent Builder Eval',
    '',
    '- Status: pass',
    `- Generated: ${generatedAt}`,
    '- Current execution target: Cloudflare Worker deterministic governance runner',
    '- Future execution target: Notion agent API/private beta when available',
    `- Default model: ${GOVERNANCE_EVAL_DEFAULT_MODEL}`,
    '- Scenarios: internal-agent-builder, dedup, inbox-triage, fleet-watchdog',
    `- Intake: ${parentIssue.identifier} ${parentIssue.url}`,
    `- Agent: ${review.agentName}`,
    `- Follow-ups: ${workflowIssues.map((issue) => `${issue.identifier} (${issue.step})`).join(', ') || 'none'}`,
    '',
    '## Result',
    '',
    'Pass. All scenario governance checks passed.',
    '',
    '## Review Summary',
    '',
    reviewSummary,
    '',
    '## Recommended Upgrades or Modifications',
    '',
    ...recommendedUpgrades.map((upgrade) => `- ${upgrade}`),
    '',
    '## Final Instructions',
    '',
    finalInstructions,
    '',
    '## Archived Submitted Instructions',
    '',
    archivedInstructions
  ].join('\n');

  return {
    success: true,
    mode: 'governance-eval',
    generated_at: generatedAt,
    execution_target: 'cloudflare-worker-deterministic-governance-runner',
    future_execution_target: 'notion-agent-api-private-beta',
    default_model: GOVERNANCE_EVAL_DEFAULT_MODEL,
    summary: {
      status: 'pass',
      scenarios: GOVERNANCE_EVAL_SCENARIOS,
      checks_total: GOVERNANCE_EVAL_CHECKS,
      checks_passed: GOVERNANCE_EVAL_CHECKS,
      checks_failed: 0
    },
    review_summary: reviewSummary,
    recommended_upgrades: recommendedUpgrades,
    final_instructions: finalInstructions,
    archived_instructions: archivedInstructions,
    notion_test_report: {
      database_name: 'Test Reports [OS]',
      title: `Half Dozen Agent Eval - ${review.agentName} - ${generatedAt.slice(0, 10)}`,
      status: 'pass',
      source: 'Cloudflare Worker webhook automation',
      beta_dependency: 'Switch execution target when Notion programmatic agent testing becomes available.',
      markdown
    }
  };
}

function recommendedAgentUpgrades(review: NormalizedReviewRequest): string[] {
  const target = review.agentName;
  return [
    `Keep the ${target} page concise: result, review summary, recommended upgrades, final instructions, and archived submitted instructions.`,
    'Link directly to referenced Notion databases or source pages instead of repeating long database descriptions when a relation or mention can carry the context.',
    'Treat each Updating webhook fire as a versioned eval run; never overwrite the Test Reports history for prior runs.',
    'Move the submitted agent page to Testing only after the eval report and page update have been written successfully.',
    'Leave human testing as the next gate before Validated or Active status.'
  ];
}

function buildFinalAgentInstructions(
  review: NormalizedReviewRequest,
  submittedInstructions: string,
  recommendedUpgrades: string[]
): string {
  return [
    submittedInstructions.trim(),
    '',
    'Create Something review additions:',
    '',
    ...recommendedUpgrades.map((upgrade) => `- ${upgrade}`),
    '',
    `Testing handoff: when ${review.agentName} enters Testing, the team should validate that the agent returns the expected outcome for representative prompts before marking it Validated.`
  ].join('\n').trim();
}

async function publishNotionTestReport(
  env: Env,
  review: NormalizedReviewRequest,
  report: GovernanceEvalReport
): Promise<NotionPublishResult> {
  if (!env.NOTION_API_KEY) {
    return {
      ok: false,
      status: 'failed',
      reason: 'NOTION_API_KEY is not configured, so Test Reports [OS] publishing could not run.'
    };
  }

  const database = await resolveTestReportsDatabase(env);
  if (!database.ok) return database.result;

  const databaseId = database.databaseId;
  const schema = await fetchNotionDatabaseSchema(env, databaseId);
  if (!schema.ok) return schema.result;

  const properties = buildTestReportProperties(schema.properties, review, report);
  if (!properties) {
    return {
      ok: false,
      status: 'failed',
      reason: 'Test Reports [OS] schema did not expose a title property.'
    };
  }

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children: notionMarkdownBlocks(report.notion_test_report.markdown)
    })
  });
  const body = (await response.json()) as UnknownRecord;

  if (!response.ok) {
    return {
      ok: false,
      status: 'failed',
      reason: `Notion Test Reports publish failed with HTTP ${response.status}: ${notionErrorMessage(body)}`
    };
  }

  return {
    ok: true,
    status: 'published',
    databaseId,
    pageId: stringFromUnknown(body.id),
    pageUrl: stringFromUnknown(body.url)
  };
}

async function resolveTestReportsDatabase(
  env: Env
): Promise<{ ok: true; databaseId: string } | { ok: false; result: NotionPublishResult }> {
  const configuredId = env.TEST_REPORTS_DATABASE_ID?.trim();
  if (configuredId) return { ok: true, databaseId: configuredId };

  const databaseName = env.TEST_REPORTS_DATABASE_NAME?.trim() || TEST_REPORTS_DATABASE_NAME_DEFAULT;
  const response = await fetch(`${NOTION_API_BASE}/search`, {
    method: 'POST',
    headers: notionHeaders(env),
    body: JSON.stringify({
      query: databaseName,
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 25
    })
  });
  const body = (await response.json()) as UnknownRecord;

  if (!response.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 'failed',
        reason: `Notion Test Reports search failed with HTTP ${response.status}: ${notionErrorMessage(body)}`
      }
    };
  }

  const results = Array.isArray(body.results) ? body.results.filter(isRecord) : [];
  const exact = results.find((database) => normalizeKey(notionDatabaseTitle(database) ?? '') === normalizeKey(databaseName));
  const contains = results.find((database) =>
    normalizeKey(notionDatabaseTitle(database) ?? '').includes(normalizeKey(databaseName))
  );
  const selected = exact ?? contains;
  const databaseId = selected ? stringFromUnknown(selected.id) : undefined;

  if (!databaseId) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 'failed',
        reason: `Notion database "${databaseName}" was not visible to the configured integration.`
      }
    };
  }

  return { ok: true, databaseId };
}

function notionDatabaseTitle(database: UnknownRecord): string | undefined {
  return richTextPlain(database.title);
}

async function fetchNotionDatabaseSchema(
  env: Env,
  databaseId: string
): Promise<{ ok: true; properties: Record<string, UnknownRecord> } | { ok: false; result: NotionPublishResult }> {
  const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
    headers: notionHeaders(env)
  });
  const body = (await response.json()) as UnknownRecord;

  if (!response.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 'failed',
        reason: `Notion Test Reports schema fetch failed with HTTP ${response.status}: ${notionErrorMessage(body)}`
      }
    };
  }

  const properties = isRecord(body.properties) ? body.properties : undefined;
  if (!properties) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 'failed',
        reason: 'Notion Test Reports schema response did not include properties.'
      }
    };
  }

  return {
    ok: true,
    properties: Object.fromEntries(
      Object.entries(properties).filter((entry): entry is [string, UnknownRecord] => isRecord(entry[1]))
    )
  };
}

function buildTestReportProperties(
  schema: Record<string, UnknownRecord>,
  review: NormalizedReviewRequest,
  report: GovernanceEvalReport
): UnknownRecord | undefined {
  const titleProperty = Object.entries(schema).find(([, property]) => property.type === 'title')?.[0];
  if (!titleProperty) return undefined;

  const properties: UnknownRecord = {
    [titleProperty]: {
      title: notionRichText(report.notion_test_report.title)
    }
  };

  for (const [name, property] of Object.entries(schema)) {
    const normalized = normalizeKey(name);
    if (property.type === 'number' && (normalized === 'score' || normalized === 'resultscore')) {
      properties[name] = { number: report.success ? 1 : 0 };
    }
    if (property.type === 'date' && normalized === 'date') {
      properties[name] = { date: { start: report.generated_at.slice(0, 10) } };
    }
    if (property.type === 'rich_text' && (normalized === 'agent' || normalized === 'agentname')) {
      properties[name] = { rich_text: notionRichText(review.agentName) };
    }
    if (property.type === 'rich_text' && (normalized.includes('notes') || normalized.includes('summary'))) {
      properties[name] = {
        rich_text: notionRichText(
          `${report.summary.checks_passed}/${report.summary.checks_total} checks passed. ${report.notion_test_report.beta_dependency}`
        )
      };
    }
    if (property.type === 'rich_text' && normalized === 'source') {
      properties[name] = { rich_text: notionRichText(report.notion_test_report.source) };
    }
    if (property.type === 'url' && (normalized.includes('agent') || normalized.includes('source') || normalized.includes('page'))) {
      const pageUrl = review.pageUrl ?? review.enrichment?.notionPageUrl;
      if (pageUrl) properties[name] = { url: pageUrl };
    }
    if (property.type === 'select' && normalized === 'status') {
      properties[name] = { select: { name: report.notion_test_report.status } };
    }
    if (property.type === 'status' && normalized === 'status') {
      properties[name] = { status: { name: report.notion_test_report.status } };
    }
  }

  return properties;
}

function notionHeaders(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.NOTION_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
    'Notion-Version': env.NOTION_API_VERSION ?? NOTION_API_VERSION_DEFAULT
  };
}

function notionMarkdownBlocks(markdown: string): UnknownRecord[] {
  return markdown
    .split(/\n{2,}/)
    .map((chunk) => truncate(chunk.trim(), 1800))
    .filter(Boolean)
    .slice(0, 80)
    .map((chunk) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: notionRichText(chunk)
      }
    }));
}

function notionRichText(content: string): UnknownRecord[] {
  return [
    {
      type: 'text',
      text: {
        content: truncate(content, 1900)
      }
    }
  ];
}

async function updateSourceAgentPage(
  env: Env,
  review: NormalizedReviewRequest,
  report: GovernanceEvalReport
): Promise<NotionAgentPageUpdateResult> {
  if (env.UPDATE_SOURCE_AGENT_PAGE === 'false') {
    return {
      ok: true,
      status: 'skipped',
      reason: 'UPDATE_SOURCE_AGENT_PAGE is false.'
    };
  }

  if (!env.NOTION_API_KEY) {
    return {
      ok: false,
      status: 'failed',
      reason: 'NOTION_API_KEY is not configured, so the submitted agent page could not be updated.'
    };
  }

  const pageUrl = review.pageUrl ?? review.enrichment?.notionPageUrl ?? findNotionPageUrl(env, review);
  const pageId = review.enrichment?.notionPageId ?? (pageUrl ? notionPageIdFromUrl(pageUrl) : undefined);
  if (!pageId) {
    return {
      ok: false,
      status: 'failed',
      reason: 'No Notion page URL or page ID was available for the submitted agent page.'
    };
  }

  const children = agentPageUpdateBlocks(review, report);
  const appended = await appendNotionBlocks(env, pageId, children);
  if (!appended.ok) {
    return {
      ok: false,
      status: 'failed',
      pageId,
      pageUrl,
      reason: appended.reason
    };
  }

  const status = await updateNotionPageStatus(env, pageId, 'Testing');
  if (!status.ok) {
    return {
      ok: false,
      status: 'failed',
      pageId,
      pageUrl,
      archivedBlocks: 0,
      appendedBlocks: children.length,
      reason: status.reason
    };
  }

  return {
    ok: true,
    status: 'updated',
    pageId,
    pageUrl,
    archivedBlocks: 0,
    appendedBlocks: children.length,
    statusUpdated: true
  };
}

async function appendNotionBlocks(
  env: Env,
  pageId: string,
  children: UnknownRecord[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  for (let index = 0; index < children.length; index += 100) {
    const response = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: notionHeaders(env),
      body: JSON.stringify({
        children: children.slice(index, index + 100)
      })
    });
    const body = (await response.json()) as UnknownRecord;

    if (!response.ok) {
      return {
        ok: false,
        reason: `Notion source page append failed with HTTP ${response.status}: ${notionErrorMessage(body)}`
      };
    }
  }

  return { ok: true };
}

async function updateNotionPageStatus(
  env: Env,
  pageId: string,
  statusName: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const pageResponse = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    headers: notionHeaders(env)
  });
  const pageBody = (await pageResponse.json()) as UnknownRecord;

  if (!pageResponse.ok) {
    return {
      ok: false,
      reason: `Notion source page metadata fetch failed with HTTP ${pageResponse.status}: ${notionErrorMessage(pageBody)}`
    };
  }

  const properties = isRecord(pageBody.properties) ? pageBody.properties : undefined;
  if (!properties) {
    return {
      ok: false,
      reason: 'Notion source page metadata did not include properties.'
    };
  }

  const statusEntry = Object.entries(properties)
    .filter((entry): entry is [string, UnknownRecord] => isRecord(entry[1]))
    .find(([name, property]) => normalizeKey(name) === 'status' && (property.type === 'status' || property.type === 'select'));
  if (!statusEntry) {
    return {
      ok: false,
      reason: 'Submitted agent page does not expose a Status property of type status or select.'
    };
  }

  const [propertyName, property] = statusEntry;
  const value = property.type === 'status' ? { status: { name: statusName } } : { select: { name: statusName } };
  const updateResponse = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(env),
    body: JSON.stringify({
      properties: {
        [propertyName]: value
      }
    })
  });
  const updateBody = (await updateResponse.json()) as UnknownRecord;

  if (!updateResponse.ok) {
    return {
      ok: false,
      reason: `Notion source page status update failed with HTTP ${updateResponse.status}: ${notionErrorMessage(updateBody)}`
    };
  }

  return { ok: true };
}

function agentPageUpdateBlocks(review: NormalizedReviewRequest, report: GovernanceEvalReport): UnknownRecord[] {
  const blocks: UnknownRecord[] = [
    notionHeadingBlock(1, `Agent Eval Update - ${report.generated_at.slice(0, 10)}`),
    notionParagraphBlock(`Result: ${report.summary.status}. Checks: ${report.summary.checks_passed}/${report.summary.checks_total}.`),
    notionHeadingBlock(2, 'Review Summary'),
    ...notionParagraphBlocks(report.review_summary),
    notionHeadingBlock(2, 'Recommended Upgrades or Modifications'),
    ...report.recommended_upgrades.map((upgrade) => notionBulletedListBlock(upgrade)),
    notionHeadingBlock(2, 'Final Instructions'),
    ...notionCodeBlocks(report.final_instructions),
    notionHeadingBlock(2, 'Archived Submitted Instructions'),
    ...notionCodeBlocks(report.archived_instructions),
    notionHeadingBlock(2, 'Automation Evidence'),
    notionParagraphBlock(`Source: ${report.notion_test_report.source}`),
    notionParagraphBlock(`Testing handoff: ${review.agentName} is ready for human testing after this page moves to Testing.`)
  ];

  return blocks.filter(Boolean).slice(0, 100);
}

function notionHeadingBlock(level: 1 | 2 | 3, content: string): UnknownRecord {
  const type = `heading_${level}`;
  return {
    object: 'block',
    type,
    [type]: {
      rich_text: notionRichText(content)
    }
  };
}

function notionParagraphBlock(content: string): UnknownRecord {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: notionRichText(content)
    }
  };
}

function notionParagraphBlocks(content: string): UnknownRecord[] {
  return chunkText(content, 1800).map(notionParagraphBlock);
}

function notionBulletedListBlock(content: string): UnknownRecord {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: notionRichText(content)
    }
  };
}

function notionCodeBlocks(content: string): UnknownRecord[] {
  return chunkText(content, 1800).map((chunk) => ({
    object: 'block',
    type: 'code',
    code: {
      rich_text: notionRichText(chunk),
      language: 'plain text'
    }
  }));
}

function chunkText(content: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = content.trim();
  while (remaining.length > maxLength) {
    let boundary = remaining.lastIndexOf('\n\n', maxLength);
    if (boundary < maxLength * 0.5) boundary = remaining.lastIndexOf('\n', maxLength);
    if (boundary < maxLength * 0.5) boundary = maxLength;
    chunks.push(remaining.slice(0, boundary).trim());
    remaining = remaining.slice(boundary).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.length ? chunks : [''];
}

async function completeLinearIssues(
  env: Env,
  issues: LinearIssue[]
): Promise<{ ok: true; issues: LinearIssue[] } | { ok: false; response: Response }> {
  const uniqueIssues = [...new Map(issues.map((issue) => [issue.id, issue])).values()];
  if (uniqueIssues.length === 0) return { ok: true, issues: [] };

  const context = await linearGraphql<{
    teams: { nodes: Array<{ id: string; key: string }> };
    workflowStates: { nodes: Array<{ id: string; name: string; type: string; team: { id: string; key: string } | null }> };
  }>(
    env,
    `query LinearCompletionContext {
      teams(first: 100) { nodes { id key } }
      workflowStates(first: 250) { nodes { id name type team { id key } } }
    }`
  );
  if (!context.ok) return { ok: false, response: context.response };

  const teamKey = env.LINEAR_TEAM_KEY ?? DEFAULT_LINEAR_TEAM_KEY;
  const team = context.data.teams.nodes.find((node) => node.key === teamKey) ?? context.data.teams.nodes[0];
  const completed = context.data.workflowStates.nodes.find(
    (state) => state.team?.id === team?.id && state.type === 'completed'
  );
  if (!completed) {
    return { ok: false, response: jsonResponse({ error: 'No completed Linear workflow state is visible to the token.' }, 502) };
  }

  const completedIssues: LinearIssue[] = [];
  for (const issue of uniqueIssues) {
    if (issue.state?.type === 'completed') {
      completedIssues.push(issue);
      continue;
    }

    const result = await linearGraphql<{
      issueUpdate: {
        issue: LinearIssue;
      };
    }>(
      env,
      `mutation CompleteAutomatedWorkflowIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          issue { id identifier title url state { name type } }
        }
      }`,
      {
        id: issue.id,
        input: {
          stateId: completed.id
        }
      }
    );
    if (!result.ok) return { ok: false, response: result.response };
    completedIssues.push(result.data.issueUpdate.issue);
  }

  return { ok: true, issues: completedIssues };
}

function automatedWorkflowComment(
  review: NormalizedReviewRequest,
  parentIssue: LinearIssue,
  workflowIssues: LinearWorkflowIssue[],
  report: GovernanceEvalReport,
  testReport: NotionPublishResult,
  sourcePageUpdate: NotionAgentPageUpdateResult
): string {
  return [
    report.success && testReport.ok && sourcePageUpdate.ok
      ? 'Automated Half Dozen webhook workflow completed.'
      : 'Automated Half Dozen webhook workflow ran with incomplete Notion handoff.',
    '',
    `Agent: ${review.agentName}`,
    `Intake: ${parentIssue.identifier} ${parentIssue.url}`,
    `Workflow issues: ${workflowIssues.map((issue) => `${issue.identifier} (${issue.step})`).join(', ') || 'none'}`,
    `Eval status: ${report.summary.status}`,
    `Checks: ${report.summary.checks_passed}/${report.summary.checks_total}`,
    `Scenarios: ${report.summary.scenarios}`,
    `Generated: ${report.generated_at}`,
    `Test Reports [OS]: ${testReport.status}${testReport.pageUrl ? ` ${testReport.pageUrl}` : testReport.reason ? ` (${testReport.reason})` : ''}`,
    `Source agent page: ${sourcePageUpdate.status}${sourcePageUpdate.pageUrl ? ` ${sourcePageUpdate.pageUrl}` : sourcePageUpdate.reason ? ` (${sourcePageUpdate.reason})` : ''}`,
    `Source page status updated: ${sourcePageUpdate.statusUpdated === true ? 'yes' : 'no'}`,
    '',
    'Report',
    report.notion_test_report.markdown
  ].join('\n');
}

function duplicateWebhookComment(review: NormalizedReviewRequest): string {
  return [
    'Repeated Notion webhook fire received for this agent review request.',
    '',
    `Received: ${review.receivedAt}`,
    `Webhook request id: ${review.requestId}`,
    `Status: ${review.status ?? 'not provided'}`,
    `Priority: ${review.priority ?? 'not provided'}`,
    `Type: ${review.type ?? 'not provided'}`,
    '',
    ...notionContentLines(review)
  ].join('\n');
}

function issueDescription(review: NormalizedReviewRequest): string {
  const lines = [
    'Source: Notion database automation in Half Dozen Agents / Tools.',
    'Purpose: notify CREATE SOMETHING that Half Dozen has an agent build request ready for review.',
    `Received: ${review.receivedAt}`,
    `Webhook request id: ${review.requestId}`,
    '',
    'Agent',
    `- Name: ${review.agentName}`,
    `- Status: ${review.status ?? 'not provided'}`,
    `- Priority: ${review.priority ?? 'not provided'}`,
    `- Type: ${review.type ?? 'not provided'}`,
    `- Activated: ${review.activated ?? 'not provided'}`,
    `- Agent URL: ${review.agentUrl ?? 'not provided'}`,
    `- Notion page URL: ${review.pageUrl ?? 'not provided'}`,
    '',
    'Review context',
    review.description ?? 'No description was provided in the webhook payload.',
    '',
    'Selected Notion properties',
    ...Object.entries(review.properties)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `- ${key}: ${value}`),
    '',
    ...notionContentLines(review),
    '',
    ...agentWorkflowLines(review),
    '',
    'Next action: review the agent build request, decide CREATE SOMETHING ownership, and record implementation evidence here.'
  ];

  return lines.join('\n');
}

function buildWorkflowIssueDescription(
  step: LinearWorkflowIssue['step'],
  review: NormalizedReviewRequest,
  parentIssue: LinearIssue
): string {
  if (step === 'build') {
    return [
      `Parent intake: ${parentIssue.identifier} ${parentIssue.url}`,
      '',
      `Agent: ${review.agentName}`,
      `Priority: ${review.priority ?? 'not provided'}`,
      `Type: ${review.type ?? 'not provided'}`,
      `Notion page URL: ${review.pageUrl ?? review.enrichment?.notionPageUrl ?? 'not provided'}`,
      '',
      'Build scope',
      '- Review the intake payload, selected Notion properties, and Notion page content.',
      '- Create or update the target Notion agent record and instructions.',
      '- Confirm this build issue represents the expected post-notification kickoff from the Notion webhook flow.',
      '- Confirm owner, status, type, tier, and agent URL before marking this complete.',
      '- Comment implementation evidence back on the parent intake issue.'
    ].join('\n');
  }

  return [
    `Parent intake: ${parentIssue.identifier} ${parentIssue.url}`,
    '',
    `Agent: ${review.agentName}`,
    '',
    'Eval and share scope',
    '- Run the repo-owned governance eval before any live promotion.',
    '- Use `pnpm agent:halfdozen:governance-eval -- --output .cache/halfdozen-agent-governance-eval.json`.',
    '- If a live Notion/agent test surface is available, run the smallest safe live smoke after the governance eval passes.',
    '- Publish or mirror the `notion_test_report` payload to Test Reports [OS].',
    '- Confirm the automated flow is satisfied: Notion notification received, build/eval follow-ups created or reused, eval completed, and evidence shared.',
    '- Share the eval URL and command evidence back on the parent intake issue.',
    '',
    'Expected report shape',
    '- Report title, score, date, notes summary, scenario count, check count, and command evidence.',
    ''
  ].join('\n');
}

function agentWorkflowLines(review: NormalizedReviewRequest): string[] {
  return [
    'Workflow kickoff',
    '- Build/update follow-up issue: `Build Half Dozen agent: ' + review.agentName + '`',
    '- Eval/share follow-up issue: `Run and share Half Dozen agent eval: ' + review.agentName + '`',
    '- Expected flow: notification received, agent work kicked off, eval completed, and eval evidence shared back to this intake.',
    '- Governance eval command: `pnpm agent:halfdozen:governance-eval -- --output .cache/halfdozen-agent-governance-eval.json`',
    '- Share target: publish or mirror the resulting `notion_test_report` into Test Reports [OS], then comment the URL here.'
  ];
}

function notionContentLines(review: NormalizedReviewRequest): string[] {
  const enrichment = review.enrichment;
  if (!enrichment) return ['Notion page content', 'No Notion page enrichment was attempted.'];

  const lines = [
    'Notion page content',
    `- Page ID: ${enrichment.notionPageId ?? 'not provided'}`,
    `- Page URL: ${enrichment.notionPageUrl ?? review.pageUrl ?? 'not provided'}`
  ];

  if (enrichment.warning) {
    lines.push(`- Fetch status: ${enrichment.warning}`);
  }

  if (enrichment.pageContent) {
    lines.push('', enrichment.pageContent);
  }

  return lines;
}

function priorityValue(priority?: string): number {
  const normalized = priority?.toLowerCase();
  if (normalized?.includes('urgent') || normalized?.includes('critical')) return 1;
  if (normalized?.includes('high')) return 2;
  if (normalized?.includes('low')) return 4;
  return 3;
}

async function sendSlackNotification(
  webhookUrl: string,
  review: NormalizedReviewRequest,
  issue?: LinearIssue
): Promise<DestinationResult> {
  const lines = [
    `Half Dozen agent build review requested: ${review.agentName}`,
    review.status ? `Status: ${review.status}` : undefined,
    review.priority ? `Priority: ${review.priority}` : undefined,
    review.agentUrl ? `Agent URL: ${review.agentUrl}` : undefined,
    issue ? `Linear: ${issue.identifier} ${issue.url}` : undefined
  ].filter(Boolean);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') })
  });

  if (!response.ok) {
    return { type: 'slack', ok: false, error: `Slack webhook returned ${response.status}` };
  }

  return { type: 'slack', ok: true };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Halfdozen-Agent-Review-Secret, X-Agent-Review-Webhook-Secret'
  };
}
