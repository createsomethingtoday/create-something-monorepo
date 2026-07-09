import type { DatabaseLayerDemoState } from './types.js';

export const databaseLayerDemoState: DatabaseLayerDemoState = {
  runtime: {
    name: 'Substrate',
    posture: 'first-class',
    storage: ['Cloudflare D1 relational records', 'R2 files and receipts', 'Atlas graph state'],
    apiBoundary: 'Typed HTTP/JSON resources expose records, bindings, actions, runs, and receipts.',
    mcpBoundary: 'MCP resources and tools operate the same record model under policy.',
    uiBoundary: 'The UI is a fast WebGPU-ready projection over the database contract, not a second source of truth.',
    atlasBoundary: 'Atlas maps are durable database records rendered by Canon/canvas-kernel surfaces for human inspection.',
    desktopBoundary: 'Desktop is a local-first shell over shared Substrate state, not a competing database.'
  },
  records: [
    {
      id: 'src_clients_create_something',
      source: 'Notion Clients',
      sourceType: 'notion_database',
      title: 'CREATE SOMETHING internal operating system',
      owner: 'Micah',
      status: 'ready',
      bindingHealth: 'bound',
      atlasCanvasId: 'create-something-internal-operating-system-source-map',
      atlasNodeId: 'source_record_clients_create_something',
      relationCount: 12,
      receiptId: 'receipt_transfer_ready',
      updatedAt: '2026-07-07T14:24:00.000Z',
      summary:
        'Client source row captured, identified, projected into Atlas, and connected to the internal operating map.'
    },
    {
      id: 'src_workstreams_agency_ops',
      source: 'Notion Workstreams',
      sourceType: 'notion_database',
      title: 'Agency Ops PM interface',
      owner: 'CREATE SOMETHING',
      status: 'complete',
      bindingHealth: 'bound',
      atlasCanvasId: 'create-something-agency-ops-client-map',
      atlasNodeId: 'source_record_workstream_agency_ops_pm',
      relationCount: 18,
      receiptId: 'receipt_source_update_complete',
      updatedAt: '2026-07-07T14:26:00.000Z',
      summary:
        'Workstream row has source relations, Atlas binding, completed source-update action, and proof receipt.'
    },
    {
      id: 'src_agents_reviewer',
      source: 'Notion Agents',
      sourceType: 'notion_database',
      title: 'Reviewer hub agent',
      owner: 'Automation',
      status: 'review',
      bindingHealth: 'reviewed',
      atlasCanvasId: 'create-something-agent-runtime-map',
      atlasNodeId: 'source_record_agent_reviewer_hub',
      relationCount: 7,
      receiptId: 'receipt_reviewed_relation',
      updatedAt: '2026-07-07T14:29:00.000Z',
      summary:
        'Agent source row is mapped and reviewed; next action is policy review before broader automation.'
    },
    {
      id: 'src_mcp_app_governance',
      source: 'MCP Services',
      sourceType: 'notion_database',
      title: 'App Governance MCP',
      owner: 'Database layer',
      status: 'ready',
      bindingHealth: 'bound',
      atlasCanvasId: 'create-something-database-layer-map',
      atlasNodeId: 'source_record_mcp_app_governance',
      relationCount: 21,
      receiptId: 'receipt_mcp_parity',
      updatedAt: '2026-07-07T14:31:00.000Z',
      summary:
        'MCP service row points to the live API/MCP boundary and the app-governance proof instance.'
    }
  ],
  bindings: [
    {
      recordId: 'src_clients_create_something',
      canvasId: 'create-something-internal-operating-system-source-map',
      nodeId: 'source_record_clients_create_something',
      canvasTitle: 'CREATE SOMETHING internal operating system',
      nodeLabel: 'Client source record',
      relationEvidence: 'Imported relation evidence plus source-map projection.'
    },
    {
      recordId: 'src_workstreams_agency_ops',
      canvasId: 'create-something-agency-ops-client-map',
      nodeId: 'source_record_workstream_agency_ops_pm',
      canvasTitle: 'Agency Ops PM client map',
      nodeLabel: 'Agency Ops PM interface',
      relationEvidence: 'Explicit Notion workstream relation and completed source-update receipt.'
    },
    {
      recordId: 'src_agents_reviewer',
      canvasId: 'create-something-agent-runtime-map',
      nodeId: 'source_record_agent_reviewer_hub',
      canvasTitle: 'Agent runtime map',
      nodeLabel: 'Reviewer hub agent',
      relationEvidence: 'Reviewed relation island with policy owner retained.'
    },
    {
      recordId: 'src_mcp_app_governance',
      canvasId: 'create-something-database-layer-map',
      nodeId: 'source_record_mcp_app_governance',
      canvasTitle: 'CREATE SOMETHING database layer',
      nodeLabel: 'App Governance MCP',
      relationEvidence: 'Live MCP/API instance proves the database-layer boundary.'
    }
  ],
  actions: [
    {
      id: 'action_public_demo',
      recordId: 'src_clients_create_something',
      state: 'run',
      title: 'Render public database demo',
      owner: 'Agency front end',
      policy: 'Read-only sample data only',
      detail: 'Show filtered records, Atlas binding, related action, and receipt without exposing private state.'
    },
    {
      id: 'action_extract_contract',
      recordId: 'src_mcp_app_governance',
      state: 'wait',
      title: 'Extract reusable schema',
      owner: 'Database layer',
      policy: 'Second consumer required',
      detail: 'Keep app-governance stable while reusable source/action/receipt contracts move into the shared layer.'
    },
    {
      id: 'action_policy_review',
      recordId: 'src_agents_reviewer',
      state: 'stop',
      title: 'Hold agent write expansion',
      owner: 'Judgment layer',
      policy: 'Approval required before production writes',
      detail: 'Agent-managed repair is visible, but broader write authority waits for policy evidence.'
    },
    {
      id: 'action_close_transfer',
      recordId: 'src_workstreams_agency_ops',
      state: 'complete',
      title: 'Close source transfer',
      owner: 'Operator',
      policy: 'Evidence-gated completion',
      detail: 'Source update is complete because the receipt records the external source-truth update.'
    }
  ],
  receipts: [
    {
      id: 'receipt_transfer_ready',
      recordId: 'src_clients_create_something',
      type: 'transfer',
      summary: 'Notion transfer readiness is ready with no open source-update actions.',
      evidence: '11 sources captured, 115 records projected, zero unreviewed blockers.',
      createdAt: '2026-07-07T14:35:00.000Z'
    },
    {
      id: 'receipt_source_update_complete',
      recordId: 'src_workstreams_agency_ops',
      type: 'proof',
      summary: 'Workstream relation proof completed and action closed.',
      evidence: 'External source-truth relation updated, then imported back into D1.',
      createdAt: '2026-07-07T14:36:00.000Z'
    },
    {
      id: 'receipt_reviewed_relation',
      recordId: 'src_agents_reviewer',
      type: 'decision',
      summary: 'Reviewed relation state is visible before more agent authority is granted.',
      evidence: 'Review ledger keeps the gap decision inspectable for humans and agents.',
      createdAt: '2026-07-07T14:37:00.000Z'
    },
    {
      id: 'receipt_mcp_parity',
      recordId: 'src_mcp_app_governance',
      type: 'handoff',
      summary: 'App Governance proves API/MCP/dashboard parity for a concrete database instance.',
      evidence: 'Same D1 records drive MCP tools, dashboard rows, Atlas maps, actions, and receipts.',
      createdAt: '2026-07-07T14:38:00.000Z'
    }
  ],
  capabilities: [
    {
      label: 'Typed records',
      surface: 'API',
      detail: 'Every source record, Atlas binding, action, and receipt has a stable JSON shape.'
    },
    {
      label: 'Agent tools',
      surface: 'MCP',
      detail: 'Agents can inspect, propose, repair, and receipt database-layer state under policy.'
    },
    {
      label: 'Policy gates',
      surface: 'Agent',
      detail: 'Run, wait, stop, and complete states are records instead of hidden prompt instructions.'
    },
    {
      label: 'Readable control',
      surface: 'UI',
      detail: 'Humans can filter, select, inspect bindings, and verify receipts in the browser.'
    }
  ],
  performanceBudgets: [
    {
      label: 'Record navigation',
      surface: 'local',
      target: 'Immediate local filter, selection, and row-to-detail movement on loaded records.',
      baseline: 'Obsidian-like command speed for the operator path.',
      detail:
        'Filtering and selection should stay client-local for active working sets; cloud reads refresh the state without blocking inspection.'
    },
    {
      label: 'Direct record URLs',
      surface: 'cloud',
      target: 'Every important record, Atlas node, action, run, and receipt has a durable address.',
      baseline: 'No hidden canvas-only state.',
      detail:
        'The system should open directly into the object under review, then show adjacent records without forcing a full workspace reload.'
    },
    {
      label: 'Agent read path',
      surface: 'agent',
      target: 'Agents can inspect the same source record, binding, action, and receipt through API/MCP.',
      baseline: 'No UI scraping or prompt-only state.',
      detail:
        'The database layer should make agent work cheap to verify because every action writes back to a durable object.'
    },
    {
      label: 'Proof refresh',
      surface: 'cloud',
      target: 'Receipts and audit entries stream into the interface as small state updates.',
      baseline: 'Fast notes app feel with shared database durability.',
      detail:
        'The UI should favor incremental refresh, optimistic inspection, and stable geometry over full-page churn.'
    }
  ],
  systemDesignPrinciples: [
    {
      label: 'Topology is data',
      tier: 'Database',
      principle:
        'Maps, nodes, edges, source bindings, relations, actions, runs, and receipts are first-class records.',
      evidence: 'Atlas can render and agents can operate without depending on browser session JSON.'
    },
    {
      label: 'Execution is inspectable',
      tier: 'Automation',
      principle:
        'Workflow movement happens through API/MCP actions and runs, then closes with receipts.',
      evidence: 'Run, wait, stop, complete, and blocked states are stored as objects with owners and policy.'
    },
    {
      label: 'Judgment is attached',
      tier: 'Judgment',
      principle:
        'Approvals, waivers, policy reasons, and handoff decisions stay beside the affected record.',
      evidence: 'A reviewer can inspect why a record is ready without reading a chat transcript.'
    },
    {
      label: 'UI is a projection',
      tier: 'Database',
      principle:
        'The fastest possible front end reads cached working sets and updates the canonical records.',
      evidence: 'The browser, desktop shell, API, MCP, and agents share the same Substrate object model.'
    }
  ]
};

export function getDatabaseLayerRecord(recordId: string) {
  return databaseLayerDemoState.records.find((record) => record.id === recordId) ?? null;
}
