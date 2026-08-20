import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGovernanceDecision,
  createGovernanceConnection,
  createGovernanceDeliveryReceipt,
  createGovernanceProductAttachment,
  createGovernanceProof,
  createGovernanceSignal,
  type GovernanceConnection,
  type GovernanceDecision,
  type GovernanceDeliveryReceipt,
  type GovernanceProductAttachment,
  type GovernanceProof,
  type GovernanceSignal,
  listGovernanceConnections,
  listGovernanceDecisions,
  listGovernanceDeliveryReceipts,
  listGovernanceProductAttachments,
  listGovernanceProofs,
  listGovernanceSignals
} from '../src/lib/server/governance-runtime.ts';
import {
  GET as getAttachments,
  POST as postAttachment
} from '../src/routes/api/governance/attachments/+server.ts';
import {
  GET as getConnections,
  POST as postConnection
} from '../src/routes/api/governance/connections/+server.ts';
import { buildGovernanceAttachmentGraph } from '../src/lib/server/governance-graph.ts';
import {
  GET as getDecisions,
  POST as postDecision
} from '../src/routes/api/governance/decisions/+server.ts';
import { GET as getGraph } from '../src/routes/api/governance/graph/+server.ts';
import { POST as postSourceUpdate } from '../src/routes/api/governance/intake/source-update/+server.ts';
import {
  GET as getProofs,
  POST as postProof
} from '../src/routes/api/governance/proofs/+server.ts';
import {
  GET as getReceipts,
  POST as postReceipt
} from '../src/routes/api/governance/receipts/+server.ts';
import {
  GET as getSignals,
  POST as postSignal
} from '../src/routes/api/governance/signals/+server.ts';

type TableRow = Record<string, unknown>;
type GovernanceGraph = Awaited<ReturnType<typeof buildGovernanceAttachmentGraph>>;
type ErrorPayload = { error: string };
type SourceUpdateClassification = {
  requires_documentation_review: boolean;
  requires_reviewer_process_review: boolean;
};
type SourceUpdateSignal = GovernanceSignal & {
  payload: {
    classification: SourceUpdateClassification;
    source_update: { channel: string };
    slack_ts?: string;
  };
};
type SourceUpdatePayload = {
  action: 'signal_created' | 'ignored';
  classification: SourceUpdateClassification;
  signal: SourceUpdateSignal | null;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

class FakeStatement {
  constructor(
    private readonly tables: Record<string, TableRow[]>,
    private readonly sql: string,
    private values: unknown[] = []
  ) {}

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    if (this.sql.includes('sqlite_master')) {
      const table = String(this.values[0] ?? '');
      return (this.tables[table] ? { name: table } : null) as T | null;
    }

    const results = await this.all<T>();
    return results.results[0] ?? null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    const tableName = this.tableFromSelect();
    if (!tableName) return { results: [] };

    let rows = [...(this.tables[tableName] ?? [])];
    const limit = Number(this.values.at(-1) ?? 100);
    let filterIndex = 0;

    for (const column of this.filterColumnsForTable(tableName)) {
      if (!this.sql.includes(`${column} = ?`)) continue;
      const expected = this.values[filterIndex++];
      rows = rows.filter((row) => row[column] === expected);
    }

    rows.sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
    return { results: rows.slice(0, limit) as T[] };
  }

  async run(): Promise<{ success: true }> {
    const insertTable = this.tableFromInsert();
    if (!insertTable) return { success: true };

    const row = this.rowFromInsert(insertTable);
    this.tables[insertTable] ??= [];
    this.tables[insertTable].push(row);
    return { success: true };
  }

  private tableFromSelect(): string | undefined {
    return Object.keys(this.tables).find((table) => this.sql.includes(`FROM ${table}`));
  }

  private tableFromInsert(): string | undefined {
    return [
      'governance_signals',
      'governance_decisions',
      'governance_proofs',
      'governance_product_attachments',
      'governance_connections',
      'governance_delivery_receipts'
    ].find((table) => this.sql.includes(`INSERT INTO ${table}`));
  }

  private filterColumnsForTable(tableName: string): string[] {
    if (tableName === 'governance_connections') {
      return ['atlas_canvas_id', 'atlas_node_id', 'kind', 'status'];
    }
    if (tableName === 'governance_delivery_receipts') {
      return ['connection_id', 'record_product_id', 'record_id', 'status'];
    }
    return [
      'atlas_canvas_id',
      'atlas_node_id',
      'signal_id',
      'decision_id',
      'source_product_id',
      'target_product_id'
    ];
  }

  private rowFromInsert(table: string): TableRow {
    if (table === 'governance_signals') {
      const [
        id,
        atlas_canvas_id,
        atlas_node_id,
        source,
        source_url,
        title,
        summary,
        status,
        payload_json,
        created_at,
        updated_at
      ] = this.values;
      return {
        id,
        atlas_canvas_id,
        atlas_node_id,
        source,
        source_url,
        title,
        summary,
        status,
        payload_json,
        created_at,
        updated_at
      };
    }

    if (table === 'governance_decisions') {
      const [
        id,
        signal_id,
        atlas_canvas_id,
        atlas_node_id,
        decision_state,
        decision_owner,
        reason,
        payload_json,
        created_at,
        updated_at
      ] = this.values;
      return {
        id,
        signal_id,
        atlas_canvas_id,
        atlas_node_id,
        decision_state,
        decision_owner,
        reason,
        payload_json,
        created_at,
        updated_at
      };
    }

    if (table === 'governance_product_attachments') {
      const [
        id,
        source_product_id,
        source_record_id,
        target_product_id,
        target_record_id,
        atlas_canvas_id,
        atlas_node_id,
        mode,
        label,
        required,
        metadata_json,
        created_at,
        updated_at
      ] = this.values;
      return {
        id,
        source_product_id,
        source_record_id,
        target_product_id,
        target_record_id,
        atlas_canvas_id,
        atlas_node_id,
        mode,
        label,
        required,
        metadata_json,
        created_at,
        updated_at
      };
    }

    if (table === 'governance_connections') {
      const [
        id,
        kind,
        name,
        status,
        atlas_canvas_id,
        atlas_node_id,
        endpoint_url,
        signing_secret_name,
        event_types_json,
        owner,
        metadata_json,
        created_at,
        updated_at
      ] = this.values;
      return {
        id,
        kind,
        name,
        status,
        atlas_canvas_id,
        atlas_node_id,
        endpoint_url,
        signing_secret_name,
        event_types_json,
        owner,
        metadata_json,
        created_at,
        updated_at
      };
    }

    if (table === 'governance_delivery_receipts') {
      const [
        id,
        connection_id,
        event_type,
        record_product_id,
        record_id,
        status,
        status_code,
        response_excerpt,
        delivered_at,
        metadata_json,
        created_at
      ] = this.values;
      return {
        id,
        connection_id,
        event_type,
        record_product_id,
        record_id,
        status,
        status_code,
        response_excerpt,
        delivered_at,
        metadata_json,
        created_at
      };
    }

    const [
      id,
      signal_id,
      decision_id,
      atlas_canvas_id,
      atlas_node_id,
      evidence,
      outcome,
      receipt_url,
      rollback_note,
      payload_json,
      created_at,
      updated_at
    ] = this.values;
    return {
      id,
      signal_id,
      decision_id,
      atlas_canvas_id,
      atlas_node_id,
      evidence,
      outcome,
      receipt_url,
      rollback_note,
      payload_json,
      created_at,
      updated_at
    };
  }
}

class FakeD1 {
  constructor(private readonly tables: Record<string, TableRow[]> = defaultTables()) {}

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this.tables, sql);
  }
}

function defaultTables(): Record<string, TableRow[]> {
  return {
    governance_signals: [],
    governance_decisions: [],
    governance_proofs: [],
    governance_product_attachments: [],
    governance_connections: [],
    governance_delivery_receipts: []
  };
}

function event(db: FakeD1, url = 'https://createsomething.agency/api/governance/signals') {
  return {
    platform: { env: { DB: db } },
    url: new URL(url)
  } as never;
}

function credentialedGetEvent(
  db: FakeD1,
  url = 'https://createsomething.agency/api/governance/graph',
  options: { configuredKey?: string; providedKey?: string | null } = {}
) {
  const configuredKey = options.configuredKey ?? 'test-internal-key';
  const providedKey = options.providedKey === undefined ? configuredKey : options.providedKey;
  const headers = new Headers();
  if (providedKey) headers.set('authorization', `Bearer ${providedKey}`);
  return {
    platform: { env: { DB: db, AGENCY_INTERNAL_API_KEY: configuredKey } },
    request: new Request(url, { headers }),
    url: new URL(url)
  } as never;
}

function postEvent(
  db: FakeD1,
  body: Record<string, unknown>,
  options: { configuredKey?: string; providedKey?: string | null } = {}
) {
  const configuredKey = options.configuredKey ?? 'test-internal-key';
  const providedKey = options.providedKey === undefined ? configuredKey : options.providedKey;
  const headers = new Headers({ 'content-type': 'application/json' });
  if (providedKey) headers.set('authorization', `Bearer ${providedKey}`);
  return {
    platform: { env: { DB: db, AGENCY_INTERNAL_API_KEY: configuredKey } },
    request: new Request('https://createsomething.agency/api/governance/signals', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } as never;
}

function postEventWithoutConfiguredKey(db: FakeD1, body: Record<string, unknown>) {
  return {
    platform: { env: { DB: db } },
    request: new Request('https://createsomething.agency/api/governance/signals', {
      method: 'POST',
      headers: { authorization: 'Bearer test-internal-key' },
      body: JSON.stringify(body)
    })
  } as never;
}

test('governance runtime records the Signal Decision Proof loop with Atlas attachments', async () => {
  const db = new FakeD1() as unknown as Parameters<typeof createGovernanceSignal>[0];

  const signal = await createGovernanceSignal(db, {
    atlasCanvasId: 'canvas_api_docs',
    atlasNodeId: 'node_api_updates',
    source: 'slack:#api-updates',
    sourceUrl: 'https://slack.example/archives/C123/p456',
    title: 'Checkout API added beta parameter',
    summary: 'Review whether the API docs and reviewer checklist need updates.',
    payload: { channel: 'api-updates', docImpact: true }
  });
  const decision = await createGovernanceDecision(db, {
    signalId: signal.id,
    atlasCanvasId: signal.atlas_canvas_id,
    atlasNodeId: signal.atlas_node_id,
    decisionState: 'wait',
    decisionOwner: 'docs-reviewer@example.com',
    reason: 'Hold approval until the public docs mention the new parameter.',
    payload: { requiresDocs: true, requiresReviewerProcess: true }
  });
  const proof = await createGovernanceProof(db, {
    signalId: signal.id,
    decisionId: decision.id,
    atlasCanvasId: signal.atlas_canvas_id,
    atlasNodeId: signal.atlas_node_id,
    evidence: 'Docs PR and reviewer checklist update were both linked.',
    outcome: 'documented',
    receiptUrl: 'https://github.example/pr/123'
  });

  assert.equal(signal.atlas_canvas_id, 'canvas_api_docs');
  assert.equal(signal.atlas_node_id, 'node_api_updates');
  assert.equal(signal.payload.docImpact, true);
  assert.equal(decision.signal_id, signal.id);
  assert.equal(decision.decision_state, 'wait');
  assert.equal(proof.decision_id, decision.id);
  assert.equal(proof.signal_id, signal.id);

  const canvasSignals = await listGovernanceSignals(db, { atlasCanvasId: 'canvas_api_docs' });
  const signalDecisions = await listGovernanceDecisions(db, { signalId: signal.id });
  const decisionProofs = await listGovernanceProofs(db, { decisionId: decision.id });

  assert.equal(canvasSignals.length, 1);
  assert.equal(signalDecisions[0]?.id, decision.id);
  assert.equal(decisionProofs[0]?.id, proof.id);
});

test('governance runtime records durable product attachments beyond inferred loop edges', async () => {
  const db = new FakeD1() as unknown as Parameters<typeof createGovernanceSignal>[0];

  const signal = await createGovernanceSignal(db, {
    atlasCanvasId: 'canvas_explicit',
    atlasNodeId: 'node_api_updates',
    source: 'slack:#api-updates',
    title: 'API field changed',
    summary: 'The update needs docs review.'
  });
  const decision = await createGovernanceDecision(db, {
    signalId: signal.id,
    atlasCanvasId: signal.atlas_canvas_id,
    atlasNodeId: signal.atlas_node_id,
    decisionState: 'run',
    decisionOwner: 'docs-reviewer@example.com',
    reason: 'Docs update can proceed.'
  });
  const proof = await createGovernanceProof(db, {
    signalId: signal.id,
    decisionId: decision.id,
    atlasCanvasId: signal.atlas_canvas_id,
    atlasNodeId: signal.atlas_node_id,
    evidence: 'Docs PR opened.',
    outcome: 'documented'
  });
  const attachment = await createGovernanceProductAttachment(db, {
    sourceProductId: 'signal',
    sourceRecordId: signal.id,
    targetProductId: 'proof',
    targetRecordId: proof.id,
    atlasCanvasId: signal.atlas_canvas_id,
    atlasNodeId: signal.atlas_node_id,
    mode: 'records',
    label: 'Signal keeps a direct proof receipt.',
    metadata: { reason: 'direct_receipt' }
  });

  assert.equal(attachment.source_product_id, 'signal');
  assert.equal(attachment.target_product_id, 'proof');
  assert.equal(attachment.metadata.reason, 'direct_receipt');

  const attachments = await listGovernanceProductAttachments(db, {
    atlasCanvasId: 'canvas_explicit',
    sourceProductId: 'signal'
  });
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0]?.id, attachment.id);

  const graph = await buildGovernanceAttachmentGraph(db, { atlasCanvasId: 'canvas_explicit' });
  const explicitEdge = graph.attachments.find((edge) => edge.id === `attachment:${attachment.id}`);
  assert.deepEqual(
    explicitEdge && [
      explicitEdge.source,
      explicitEdge.target,
      explicitEdge.source_product_id,
      explicitEdge.target_product_id,
      explicitEdge.mode,
      explicitEdge.label
    ],
    [
      `signal:${signal.id}`,
      `proof:${proof.id}`,
      'signal',
      'proof',
      'records',
      'Signal keeps a direct proof receipt.'
    ]
  );
  assert.equal(
    graph.attachment_capabilities.find(
      (capability) =>
        capability.source_product_id === 'signal' && capability.target_product_id === 'proof'
    )?.current_attachment_count,
    1
  );

  await assert.rejects(
    createGovernanceProductAttachment(db, {
      sourceProductId: 'signal',
      sourceRecordId: signal.id,
      targetProductId: 'signal',
      targetRecordId: signal.id,
      atlasCanvasId: signal.atlas_canvas_id
    }),
    /sourceProductId and targetProductId must be different/
  );
});

test('governance runtime records Sources Subscriptions and Receipts', async () => {
  const db = new FakeD1() as unknown as Parameters<typeof createGovernanceConnection>[0];

  const source = await createGovernanceConnection(db, {
    kind: 'source',
    name: 'API update intake',
    atlasCanvasId: 'canvas_connections',
    atlasNodeId: 'node_api',
    endpointUrl: 'https://example.com/governance/signals',
    signingSecretName: 'GOVERNANCE_SOURCE_SECRET',
    eventTypes: ['signal.received', 'api.updated'],
    owner: 'platform'
  });
  const subscription = await createGovernanceConnection(db, {
    kind: 'subscription',
    name: 'Docs review webhook',
    atlasCanvasId: 'canvas_connections',
    atlasNodeId: 'node_docs',
    endpointUrl: 'https://example.com/webhooks/governance',
    signingSecretName: 'GOVERNANCE_WEBHOOK_SECRET',
    eventTypes: ['decision.approved', 'proof.attached'],
    owner: 'docs'
  });
  const receipt = await createGovernanceDeliveryReceipt(db, {
    connectionId: subscription.id,
    eventType: 'proof.attached',
    recordProductId: 'proof',
    recordId: 'proof_docs',
    status: 'delivered',
    statusCode: 200,
    responseExcerpt: 'ok'
  });

  assert.equal(source.kind, 'source');
  assert.deepEqual(source.event_types, ['signal.received', 'api.updated']);
  assert.equal(subscription.kind, 'subscription');
  assert.deepEqual(subscription.event_types, ['decision.approved', 'proof.attached']);
  assert.equal(receipt.connection_id, subscription.id);
  assert.equal(receipt.status, 'delivered');
  assert.equal(receipt.status_code, 200);

  const sources = await listGovernanceConnections(db, {
    atlasCanvasId: 'canvas_connections',
    connectionKind: 'source'
  });
  const receipts = await listGovernanceDeliveryReceipts(db, {
    connectionId: subscription.id,
    receiptStatus: 'delivered'
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0]?.id, source.id);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0]?.id, receipt.id);
});

test('governance runtime validates required fields and migration availability', async () => {
  const db = new FakeD1({ governance_signals: [] }) as unknown as Parameters<
    typeof createGovernanceDecision
  >[0];

  await assert.rejects(
    createGovernanceSignal(db, {
      atlasCanvasId: '',
      source: 'slack',
      title: 'Missing canvas',
      summary: 'Missing canvas'
    }),
    /atlasCanvasId is required/
  );

  await assert.rejects(
    createGovernanceDecision(db, {
      signalId: 'sig_1',
      atlasCanvasId: 'canvas_1',
      decisionState: 'run',
      decisionOwner: 'operator@example.com',
      reason: 'Ready to run'
    }),
    /governance_decisions table is not available/
  );
});

test('governance connection and receipt APIs create and filter protected records', async () => {
  const db = new FakeD1();

  const connectionResponse = await postConnection(
    postEvent(db, {
      kind: 'subscription',
      name: 'Decision webhook',
      atlas_canvas_id: 'canvas_api_connections',
      atlas_node_id: 'node_decision',
      endpoint_url: 'https://example.com/webhooks/decision',
      event_types: ['decision.approved', 'proof.attached'],
      signing_secret_name: 'GOVERNANCE_WEBHOOK_SECRET'
    })
  );
  const connectionPayload = await readJson<{ connection: GovernanceConnection }>(
    connectionResponse
  );

  assert.equal(connectionResponse.status, 201);
  assert.equal(connectionPayload.connection.kind, 'subscription');
  assert.deepEqual(connectionPayload.connection.event_types, [
    'decision.approved',
    'proof.attached'
  ]);

  const receiptResponse = await postReceipt(
    postEvent(db, {
      connection_id: connectionPayload.connection.id,
      event_type: 'decision.approved',
      record_product_id: 'decision',
      record_id: 'dec_api',
      status: 'delivered',
      status_code: 202
    })
  );
  const receiptPayload = await readJson<{ receipt: GovernanceDeliveryReceipt }>(receiptResponse);

  assert.equal(receiptResponse.status, 201);
  assert.equal(receiptPayload.receipt.connection_id, connectionPayload.connection.id);

  const listConnections = await getConnections(
    credentialedGetEvent(
      db,
      'https://createsomething.agency/api/governance/connections?kind=subscription&atlas_canvas_id=canvas_api_connections'
    )
  );
  const listReceipts = await getReceipts(
    credentialedGetEvent(
      db,
      `https://createsomething.agency/api/governance/receipts?connection_id=${connectionPayload.connection.id}&receipt_status=delivered`
    )
  );
  const unauthorized = await getConnections(
    credentialedGetEvent(db, 'https://createsomething.agency/api/governance/connections', {
      providedKey: null
    })
  );

  assert.equal(listConnections.status, 200);
  const listConnectionsPayload = await readJson<{
    count: number;
    connections: GovernanceConnection[];
  }>(listConnections);
  assert.equal(listConnectionsPayload.count, 1);
  assert.equal(listReceipts.status, 200);
  const listReceiptsPayload = await readJson<{
    count: number;
    receipts: GovernanceDeliveryReceipt[];
  }>(listReceipts);
  assert.equal(listReceiptsPayload.receipts[0]?.id, receiptPayload.receipt.id);
  assert.equal(unauthorized.status, 401);
});

test('governance APIs create and filter runtime records', async () => {
  const db = new FakeD1();
  const signalResponse = await postSignal(
    postEvent(db, {
      atlas_canvas_id: 'canvas_runtime',
      atlas_node_id: 'node_slack',
      source: 'slack:#api-updates',
      title: 'API field renamed',
      summary: 'Documentation may need a rename notice.',
      payload: { channel: 'api-updates' }
    })
  );
  const signalPayload = await readJson<{ signal: GovernanceSignal }>(signalResponse);

  assert.equal(signalResponse.status, 201);
  assert.equal(signalPayload.signal.atlas_canvas_id, 'canvas_runtime');

  const decisionResponse = await postDecision(
    postEvent(db, {
      signal_id: signalPayload.signal.id,
      atlas_canvas_id: 'canvas_runtime',
      atlas_node_id: 'node_slack',
      decision_state: 'run',
      decision_owner: 'reviewer@example.com',
      reason: 'Reviewer process update is needed.'
    })
  );
  const decisionPayload = await readJson<{ decision: GovernanceDecision }>(decisionResponse);
  assert.equal(decisionResponse.status, 201);
  assert.equal(decisionPayload.decision.signal_id, signalPayload.signal.id);

  const proofResponse = await postProof(
    postEvent(db, {
      signal_id: signalPayload.signal.id,
      decision_id: decisionPayload.decision.id,
      atlas_canvas_id: 'canvas_runtime',
      atlas_node_id: 'node_slack',
      evidence: 'Reviewer checklist update shipped.',
      outcome: 'passed',
      receipt_url: 'https://github.example/pr/456'
    })
  );
  assert.equal(proofResponse.status, 201);

  const filteredSignals = await getSignals(
    event(
      db,
      'https://createsomething.agency/api/governance/signals?atlas_canvas_id=canvas_runtime'
    )
  );
  const filteredDecisions = await getDecisions(
    event(
      db,
      `https://createsomething.agency/api/governance/decisions?signal_id=${signalPayload.signal.id}`
    )
  );
  const filteredProofs = await getProofs(
    event(
      db,
      `https://createsomething.agency/api/governance/proofs?decision_id=${decisionPayload.decision.id}`
    )
  );

  assert.equal(filteredSignals.status, 200);
  const filteredSignalsPayload = await readJson<{ count: number; signals: GovernanceSignal[] }>(
    filteredSignals
  );
  const filteredDecisionsPayload = await readJson<{
    count: number;
    decisions: GovernanceDecision[];
  }>(filteredDecisions);
  const filteredProofsPayload = await readJson<{ count: number; proofs: GovernanceProof[] }>(
    filteredProofs
  );
  assert.equal(filteredSignalsPayload.count, 1);
  assert.equal(filteredDecisionsPayload.decisions[0]?.id, decisionPayload.decision.id);
  assert.equal(filteredProofsPayload.proofs[0]?.outcome, 'passed');
});

test('governance attachment API creates and filters explicit product attachments', async () => {
  const db = new FakeD1();

  const createResponse = await postAttachment(
    postEvent(db, {
      source_product_id: 'atlas',
      source_record_id: 'canvas_runtime',
      target_product_id: 'decision',
      target_record_id: 'dec_runtime',
      atlas_canvas_id: 'canvas_runtime',
      atlas_node_id: 'node_policy',
      mode: 'connects',
      label: 'Atlas links directly to an owner decision.',
      metadata: { source: 'operator' }
    })
  );
  const createPayload = await readJson<{ attachment: GovernanceProductAttachment }>(createResponse);

  assert.equal(createResponse.status, 201);
  assert.equal(createPayload.attachment.source_product_id, 'atlas');
  assert.equal(createPayload.attachment.target_product_id, 'decision');
  assert.equal(createPayload.attachment.metadata.source, 'operator');

  const listResponse = await getAttachments(
    credentialedGetEvent(
      db,
      'https://createsomething.agency/api/governance/attachments?atlas_canvas_id=canvas_runtime&target_product_id=decision'
    )
  );
  const listPayload = await readJson<{
    count: number;
    attachments: GovernanceProductAttachment[];
  }>(listResponse);

  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.count, 1);
  assert.equal(listPayload.attachments[0]?.label, 'Atlas links directly to an owner decision.');

  const unauthorized = await postAttachment(
    postEvent(
      db,
      {
        source_product_id: 'atlas',
        source_record_id: 'canvas_runtime',
        target_product_id: 'proof',
        target_record_id: 'proof_runtime',
        atlas_canvas_id: 'canvas_runtime'
      },
      { providedKey: null }
    )
  );
  assert.equal(unauthorized.status, 401);
});

test('governance graph composes Atlas Signal Decision Proof attachments by canvas', async () => {
  const db = new FakeD1();
  const signal = await createGovernanceSignal(
    db as unknown as Parameters<typeof createGovernanceSignal>[0],
    {
      atlasCanvasId: 'canvas_graph',
      atlasNodeId: 'node_api',
      source: 'slack:#api-updates',
      title: 'API update needs review',
      summary: 'Docs and reviewer process need a coordinated review.'
    }
  );
  const decision = await createGovernanceDecision(
    db as unknown as Parameters<typeof createGovernanceDecision>[0],
    {
      signalId: signal.id,
      atlasCanvasId: signal.atlas_canvas_id,
      atlasNodeId: signal.atlas_node_id,
      decisionState: 'wait',
      decisionOwner: 'docs-reviewer@example.com',
      reason: 'Wait for docs and process review.'
    }
  );
  const proof = await createGovernanceProof(
    db as unknown as Parameters<typeof createGovernanceProof>[0],
    {
      signalId: signal.id,
      decisionId: decision.id,
      atlasCanvasId: signal.atlas_canvas_id,
      atlasNodeId: signal.atlas_node_id,
      evidence: 'Review receipt was recorded.',
      outcome: 'documented'
    }
  );

  const graph = await buildGovernanceAttachmentGraph(
    db as unknown as Parameters<typeof buildGovernanceAttachmentGraph>[0],
    {
      atlasCanvasId: 'canvas_graph',
      limit: 100
    }
  );

  assert.equal(graph.schemaVersion, 1);
  assert.equal(graph.atlas.canvas_id, 'canvas_graph');
  assert.deepEqual(graph.product_loop, ['atlas', 'signal', 'decision', 'proof']);
  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    [`atlas:canvas_graph`, `signal:${signal.id}`, `decision:${decision.id}`, `proof:${proof.id}`]
  );
  assert.deepEqual(
    graph.attachments.map((attachment) => [
      attachment.source,
      attachment.target,
      attachment.mode,
      attachment.label
    ]),
    [
      [
        `atlas:canvas_graph`,
        `signal:${signal.id}`,
        'connects',
        'Atlas maps where the signal enters.'
      ],
      [
        `signal:${signal.id}`,
        `decision:${decision.id}`,
        'produces',
        'Signal produces a decision requirement.'
      ],
      [
        `decision:${decision.id}`,
        `proof:${proof.id}`,
        'produces',
        'Decision produces proof of the action or pause.'
      ],
      [
        `proof:${proof.id}`,
        `atlas:canvas_graph`,
        'records',
        'Proof records back onto the Atlas map.'
      ]
    ]
  );
  assert.equal(graph.attachment_capabilities.length, 12);
  assert.deepEqual(
    graph.attachment_capabilities
      .filter((capability) => capability.required)
      .map((capability) => [
        `${capability.source_product_id}->${capability.target_product_id}`,
        capability.attached,
        capability.current_attachment_count
      ]),
    [
      ['atlas->signal', true, 1],
      ['signal->decision', true, 1],
      ['decision->proof', true, 1],
      ['proof->atlas', true, 1]
    ]
  );
  assert.deepEqual(
    graph.attachment_capabilities
      .filter(
        (capability) =>
          !capability.required &&
          ['atlas->decision', 'atlas->proof', 'signal->proof'].includes(
            `${capability.source_product_id}->${capability.target_product_id}`
          )
      )
      .map((capability) => [
        `${capability.source_product_id}->${capability.target_product_id}`,
        capability.can_attach,
        capability.attached
      ]),
    [
      ['atlas->decision', true, false],
      ['atlas->proof', true, false],
      ['signal->proof', true, false]
    ]
  );

  const response = await getGraph(
    credentialedGetEvent(
      db,
      'https://createsomething.agency/api/governance/graph?atlas_canvas_id=canvas_graph'
    )
  );
  const payload = await readJson<{ graph: GovernanceGraph }>(response);

  assert.equal(response.status, 200);
  assert.equal(payload.graph.atlas.canvas_id, 'canvas_graph');
  assert.equal(payload.graph.nodes.length, 4);
  assert.equal(payload.graph.attachments.length, 4);
  assert.equal(payload.graph.attachment_capabilities.length, 12);

  const unauthorized = await getGraph(
    credentialedGetEvent(
      db,
      'https://createsomething.agency/api/governance/graph?atlas_canvas_id=canvas_graph',
      { providedKey: null }
    )
  );
  const unauthorizedPayload = await readJson<ErrorPayload>(unauthorized);

  assert.equal(unauthorized.status, 401);
  assert.match(unauthorizedPayload.error, /governance write credential/i);
});

test('governance graph remains available before explicit attachment migration is applied', async () => {
  const db = new FakeD1({
    governance_signals: [],
    governance_decisions: [],
    governance_proofs: []
  });
  const signal = await createGovernanceSignal(
    db as unknown as Parameters<typeof createGovernanceSignal>[0],
    {
      atlasCanvasId: 'canvas_rollout',
      source: 'slack:#api-updates',
      title: 'API update needs review',
      summary: 'Docs and reviewer process need a coordinated review.'
    }
  );
  const decision = await createGovernanceDecision(
    db as unknown as Parameters<typeof createGovernanceDecision>[0],
    {
      signalId: signal.id,
      atlasCanvasId: signal.atlas_canvas_id,
      decisionState: 'run',
      decisionOwner: 'docs-reviewer@example.com',
      reason: 'Update docs now.'
    }
  );
  await createGovernanceProof(db as unknown as Parameters<typeof createGovernanceProof>[0], {
    signalId: signal.id,
    decisionId: decision.id,
    atlasCanvasId: signal.atlas_canvas_id,
    evidence: 'Docs were updated.',
    outcome: 'documented'
  });

  const graph = await buildGovernanceAttachmentGraph(
    db as unknown as Parameters<typeof buildGovernanceAttachmentGraph>[0],
    {
      atlasCanvasId: 'canvas_rollout'
    }
  );

  assert.equal(graph.nodes.length, 4);
  assert.equal(graph.attachments.length, 4);
  assert.deepEqual(
    graph.attachment_capabilities
      .filter((capability) => capability.required)
      .map((capability) => [
        `${capability.source_product_id}->${capability.target_product_id}`,
        capability.attached
      ]),
    [
      ['atlas->signal', true],
      ['signal->decision', true],
      ['decision->proof', true],
      ['proof->atlas', true]
    ]
  );

  await assert.rejects(
    () =>
      listGovernanceProductAttachments(
        db as unknown as Parameters<typeof listGovernanceProductAttachments>[0]
      ),
    /migration 0032/
  );
});

test('governance write APIs require the internal credential', async () => {
  const db = new FakeD1();
  const unauthorized = await postSignal(
    postEvent(
      db,
      {
        atlas_canvas_id: 'canvas_runtime',
        source: 'slack:#api-updates',
        title: 'API field renamed',
        summary: 'Documentation may need a rename notice.'
      },
      { providedKey: null }
    )
  );
  const unauthorizedPayload = await readJson<ErrorPayload>(unauthorized);

  assert.equal(unauthorized.status, 401);
  assert.match(unauthorizedPayload.error, /governance write credential/i);

  const notConfigured = await postSignal(
    postEventWithoutConfiguredKey(db, {
      atlas_canvas_id: 'canvas_runtime',
      source: 'slack:#api-updates',
      title: 'API field renamed',
      summary: 'Documentation may need a rename notice.'
    })
  );
  const notConfiguredPayload = await readJson<ErrorPayload>(notConfigured);

  assert.equal(notConfigured.status, 503);
  assert.match(notConfiguredPayload.error, /AGENCY_INTERNAL_API_KEY/);
});

test('governance source intake creates Signals for documentation-impacting updates', async () => {
  const db = new FakeD1();
  const response = await postSourceUpdate(
    postEvent(db, {
      source_type: 'slack',
      channel: '#api-updates',
      message_url: 'https://slack.example/archives/C123/p456',
      atlas_canvas_id: 'canvas_api_docs',
      atlas_node_id: 'node_api_updates',
      title: 'Checkout API added beta parameter',
      text: 'The Checkout API added a beta response field. Public docs and OpenAPI reference need updates.',
      payload: { slack_ts: '123.456' }
    })
  );
  const payload = await readJson<SourceUpdatePayload>(response);

  assert.equal(response.status, 201);
  assert.equal(payload.action, 'signal_created');
  assert.equal(payload.classification.requires_documentation_review, true);
  assert.equal(payload.classification.requires_reviewer_process_review, false);
  assert.equal(payload.signal?.source, 'slack:#api-updates');
  assert.equal(payload.signal?.source_url, 'https://slack.example/archives/C123/p456');
  assert.equal(payload.signal?.atlas_canvas_id, 'canvas_api_docs');
  assert.equal(payload.signal?.atlas_node_id, 'node_api_updates');
  assert.equal(payload.signal?.payload.classification.requires_documentation_review, true);
  assert.equal(payload.signal?.payload.source_update.channel, '#api-updates');
  assert.equal(payload.signal?.payload.slack_ts, '123.456');

  const signals = await listGovernanceSignals(db, { atlasCanvasId: 'canvas_api_docs' });
  assert.equal(signals.length, 1);
});

test('governance source intake creates Signals for reviewer-process updates', async () => {
  const db = new FakeD1();
  const response = await postSourceUpdate(
    postEvent(db, {
      source_type: 'slack',
      channel: '#review-ops',
      text: 'Reviewer checklist now requires approval before marketplace submission exceptions are granted.'
    })
  );
  const payload = await readJson<SourceUpdatePayload>(response);

  assert.equal(response.status, 201);
  assert.equal(payload.classification.requires_documentation_review, false);
  assert.equal(payload.classification.requires_reviewer_process_review, true);
  assert.equal(payload.signal?.atlas_canvas_id, 'governance_source_updates');
  assert.equal(payload.signal?.atlas_node_id, 'watched_source_updates');
});

test('governance source intake ignores updates without governance impact', async () => {
  const db = new FakeD1();
  const response = await postSourceUpdate(
    postEvent(db, {
      source_type: 'slack',
      channel: '#api-updates',
      text: 'Heads up: the team lunch moved to noon.'
    })
  );
  const payload = await readJson<SourceUpdatePayload>(response);

  assert.equal(response.status, 202);
  assert.equal(payload.action, 'ignored');
  assert.equal(payload.signal, null);
  assert.equal(payload.classification.requires_documentation_review, false);
  assert.equal(payload.classification.requires_reviewer_process_review, false);

  const signals = await listGovernanceSignals(db);
  assert.equal(signals.length, 0);
});

test('governance source intake requires the internal credential', async () => {
  const db = new FakeD1();
  const response = await postSourceUpdate(
    postEvent(
      db,
      {
        source_type: 'slack',
        channel: '#api-updates',
        text: 'API endpoint changed.'
      },
      { providedKey: null }
    )
  );
  const payload = await readJson<ErrorPayload>(response);

  assert.equal(response.status, 401);
  assert.match(payload.error, /governance write credential/i);
});

test('governance APIs report D1 as required runtime infrastructure', async () => {
  const response = await postSignal({
    platform: undefined,
    request: new Request('https://createsomething.agency/api/governance/signals', {
      method: 'POST',
      body: JSON.stringify({
        atlas_canvas_id: 'canvas_1',
        source: 'slack',
        title: 'Signal',
        summary: 'Summary'
      })
    })
  } as never);
  const payload = await readJson<ErrorPayload>(response);

  assert.equal(response.status, 503);
  assert.match(payload.error, /D1 binding/);
});
