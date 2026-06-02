type UnknownRecord = Record<string, unknown>;

interface Env {
  WEBHOOK_SECRET?: string;
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
  identifier: string;
  title: string;
  url: string;
}

interface LinearIssueCandidate extends LinearIssue {
  id: string;
  state: {
    type: string;
  } | null;
}

interface DestinationResult {
  type: 'linear' | 'slack';
  ok: boolean;
  issue?: LinearIssue;
  reused?: boolean;
  workflowIssues?: LinearWorkflowIssue[];
  error?: string;
}

interface LinearWorkflowIssue extends LinearIssue {
  step: 'build' | 'eval';
  reused: boolean;
}

const DEFAULT_LINEAR_TEAM_KEY = 'CRE';
const DEFAULT_LINEAR_LABELS = 'linear-coordination,code-quality';
const LINEAR_API_FALLBACK = 'https://api.linear.app/graphql';
const MAX_FIELD_LENGTH = 600;
const MAX_NOTION_CONTENT_LENGTH = 12000;
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION_DEFAULT = '2022-06-28';

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
      destinations.push({
        type: 'linear',
        ok: true,
        issue: linearIssue,
        reused: issueResult.reused,
        workflowIssues: workflowResult.issues
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
  const expected = env.WEBHOOK_SECRET;
  if (!expected) {
    return jsonResponse({ error: 'WEBHOOK_SECRET is not configured.' }, 500);
  }

  const submitted =
    bearerToken(request.headers.get('authorization')) ??
    request.headers.get('x-halfdozen-agent-review-secret') ??
    request.headers.get('x-agent-review-webhook-secret');

  if (!submitted || !constantTimeEqual(submitted, expected)) {
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
  const existingIssue = await findOpenLinearIssueByTitle(env, title);
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
        identifier: existingIssue.issue.identifier,
        title: existingIssue.issue.title,
        url: existingIssue.issue.url
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
        issue { identifier title url }
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
  const existingIssue = await findOpenLinearIssueByTitle(env, input.title);
  if (!existingIssue.ok) return { ok: false, response: existingIssue.response };

  if (existingIssue.issue) {
    return {
      ok: true,
      issue: {
        identifier: existingIssue.issue.identifier,
        title: existingIssue.issue.title,
        url: existingIssue.issue.url
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
        issue { identifier title url }
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

async function findOpenLinearIssueByTitle(
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
      issues(first: 10, filter: $filter) {
        nodes {
          id
          identifier
          title
          url
          state { type }
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
  );
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

function duplicateWebhookComment(review: NormalizedReviewRequest): string {
  return [
    'Duplicate Notion webhook fire received for this agent review request.',
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
