import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SERVICE_NAME = 'webflow-template-review-mcp';
const TOOL_NAME = 'template_review_list_queue';
const INVOKED_TOOLS = [TOOL_NAME] as const;

export interface WorkflowPilotToolTransport {
  listTools(): Promise<Array<{ name: string }>>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface WorkflowPilotLiveAdapterReceipt {
  schemaVersion: 'workflow_live_adapter_receipt.v0.1';
  mode: 'shadow';
  adapterId: 'review';
  owner: 'Webflow Template Review MCP';
  authBoundary: 'create-something-identity';
  serviceName: typeof SERVICE_NAME;
  toolName: typeof TOOL_NAME;
  requestedLimit: number;
  observedItemCount: number;
  rawResponseSha256: string;
  discoveryVerified: true;
  readScopeVerified: true;
  mutationsPerformed: 0;
  invokedTools: [...typeof INVOKED_TOOLS];
}

export class WorkflowPilotLiveAdapterError extends Error {
  readonly code:
    | 'LIVE_ADAPTER_INVALID_LIMIT'
    | 'LIVE_ADAPTER_TOOL_DRIFT'
    | 'LIVE_ADAPTER_RESPONSE_UNRECOGNIZED'
    | 'LIVE_ADAPTER_RECEIPT_INVALID';

  constructor(
    code: WorkflowPilotLiveAdapterError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowPilotLiveAdapterError';
    this.code = code;
  }
}

const RECEIPT_KEYS = [
  'adapterId',
  'authBoundary',
  'discoveryVerified',
  'invokedTools',
  'mode',
  'mutationsPerformed',
  'observedItemCount',
  'owner',
  'rawResponseSha256',
  'readScopeVerified',
  'requestedLimit',
  'schemaVersion',
  'serviceName',
  'toolName',
] as const;

export async function loadWorkflowPilotLiveAdapterReceipt(
  receiptPath: string,
): Promise<WorkflowPilotLiveAdapterReceipt> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(receiptPath, 'utf8')) as unknown;
  } catch (cause) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_RECEIPT_INVALID',
      `The live adapter receipt could not be read: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_RECEIPT_INVALID',
      'The live adapter receipt must be a JSON object.',
    );
  }
  const receipt = value as Record<string, unknown>;
  const keys = Object.keys(receipt).sort();
  const valid =
    JSON.stringify(keys) === JSON.stringify([...RECEIPT_KEYS].sort()) &&
    receipt.schemaVersion === 'workflow_live_adapter_receipt.v0.1' &&
    receipt.mode === 'shadow' &&
    receipt.adapterId === 'review' &&
    receipt.owner === 'Webflow Template Review MCP' &&
    receipt.authBoundary === 'create-something-identity' &&
    receipt.serviceName === SERVICE_NAME &&
    receipt.toolName === TOOL_NAME &&
    Number.isInteger(receipt.requestedLimit) &&
    Number(receipt.requestedLimit) >= 1 &&
    Number(receipt.requestedLimit) <= 20 &&
    Number.isInteger(receipt.observedItemCount) &&
    Number(receipt.observedItemCount) >= 0 &&
    typeof receipt.rawResponseSha256 === 'string' &&
    /^sha256:[0-9a-f]{64}$/.test(receipt.rawResponseSha256) &&
    receipt.discoveryVerified === true &&
    receipt.readScopeVerified === true &&
    receipt.mutationsPerformed === 0 &&
    JSON.stringify(receipt.invokedTools) === JSON.stringify([TOOL_NAME]);
  if (!valid) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_RECEIPT_INVALID',
      'The live adapter receipt violated the exact read-only schema.',
    );
  }
  return receipt as unknown as WorkflowPilotLiveAdapterReceipt;
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalize(entry)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex')}`;
}

function parseTextPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return value;
  const parsed = content
    .filter(
      (entry): entry is { type: 'text'; text: string } =>
        Boolean(
          entry &&
            typeof entry === 'object' &&
            (entry as { type?: unknown }).type === 'text' &&
            typeof (entry as { text?: unknown }).text === 'string',
        ),
    )
    .map((entry) => {
      try {
        return JSON.parse(entry.text) as unknown;
      } catch {
        return entry.text;
      }
    });
  return parsed.length === 1 ? parsed[0] : parsed;
}

function findQueue(value: unknown): unknown[] | null {
  const payload = parseTextPayload(value);
  if (Array.isArray(payload)) {
    if (payload.every((entry) => entry && typeof entry === 'object')) return payload;
    for (const entry of payload) {
      const nested = findQueue(entry);
      if (nested) return nested;
    }
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const object = payload as Record<string, unknown>;
  for (const key of ['records', 'items', 'results', 'queue', 'templates', 'data']) {
    if (Array.isArray(object[key])) return object[key] as unknown[];
  }
  for (const entry of Object.values(object)) {
    const nested = findQueue(entry);
    if (nested) return nested;
  }
  return null;
}

export async function observeTemplateReviewQueue(input: {
  transport: WorkflowPilotToolTransport;
  limit?: number;
}): Promise<WorkflowPilotLiveAdapterReceipt> {
  const limit = input.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_INVALID_LIMIT',
      'The live review adapter limit must be an integer from 1 through 20.',
    );
  }

  const tools = await input.transport.listTools();
  if (tools.length !== 1 || tools[0]?.name !== TOOL_NAME) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_TOOL_DRIFT',
      'The owning MCP discovery surface must contain exactly the single allowlisted queue-read tool.',
    );
  }

  const response = await input.transport.callTool(TOOL_NAME, {
    limit,
    status: 'ready_to_review',
    assigned: 'any',
  });
  const queue = findQueue(response);
  if (!queue) {
    throw new WorkflowPilotLiveAdapterError(
      'LIVE_ADAPTER_RESPONSE_UNRECOGNIZED',
      'The queue-read result did not contain a recognized bounded collection.',
    );
  }

  return {
    schemaVersion: 'workflow_live_adapter_receipt.v0.1',
    mode: 'shadow',
    adapterId: 'review',
    owner: 'Webflow Template Review MCP',
    authBoundary: 'create-something-identity',
    serviceName: SERVICE_NAME,
    toolName: TOOL_NAME,
    requestedLimit: limit,
    observedItemCount: queue.length,
    rawResponseSha256: sha256(response),
    discoveryVerified: true,
    readScopeVerified: true,
    mutationsPerformed: 0,
    invokedTools: [...INVOKED_TOOLS],
  };
}
