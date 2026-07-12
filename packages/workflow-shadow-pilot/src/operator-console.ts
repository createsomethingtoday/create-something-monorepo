import type {
  WorkflowPilotCompiledRuntimeSummary,
  WorkflowPilotDiscoveryPack,
  WorkflowPilotReconciliationSummary,
  WorkflowPilotScorecard,
} from './types.js';

export interface WorkflowPilotOperatorConsoleData {
  schemaVersion: 'workflow_shadow_operator_console.v0.1';
  boundaries: {
    mode: 'shadow';
    readOnly: true;
    mutationsPerformed: 0;
    proposalApplied: false;
    prohibitedActions: ['approve', 'execute', 'publish', 'resolve'];
  };
  scorecard: WorkflowPilotScorecard;
  discovery: WorkflowPilotDiscoveryPack;
  cases: WorkflowPilotReconciliationSummary['cases'];
  compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
}

export function createWorkflowPilotOperatorConsoleData(input: {
  discoveryPack: WorkflowPilotDiscoveryPack;
  reconciliationSummary: WorkflowPilotReconciliationSummary;
  compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
  scorecard: WorkflowPilotScorecard;
}): WorkflowPilotOperatorConsoleData {
  return {
    schemaVersion: 'workflow_shadow_operator_console.v0.1',
    boundaries: {
      mode: 'shadow',
      readOnly: true,
      mutationsPerformed: 0,
      proposalApplied: false,
      prohibitedActions: ['approve', 'execute', 'publish', 'resolve'],
    },
    scorecard: input.scorecard,
    discovery: input.discoveryPack,
    cases: input.reconciliationSummary.cases,
    compiledRuntime: input.compiledRuntime,
  };
}

export function renderWorkflowPilotOperatorConsole(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%23111613%22/><path d=%22M18 32h28M32 18v28%22 stroke=%22%238ee6b0%22 stroke-width=%226%22/></svg>">
  <title>Workflow Compiler Shadow Pilot</title>
  <style>
    :root { color-scheme:dark; --bg:#0b0d0c; --panel:#121614; --line:#29312d; --muted:#99a49e; --ink:#edf4ef; --accent:#8ee6b0; --warn:#f3c87a; }
    * { box-sizing:border-box; }
    body { margin:0; background:radial-gradient(circle at 80% 0%,#17241c 0,transparent 36rem),var(--bg); color:var(--ink); font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
    main { width:min(1180px,calc(100% - 32px)); margin:0 auto; padding:48px 0 80px; }
    header { display:grid; gap:12px; margin-bottom:32px; }
    .eyebrow,.status { color:var(--accent); text-transform:uppercase; letter-spacing:.12em; font-size:12px; }
    h1,h2,h3,p { margin:0; }
    h1 { max-width:18ch; font:500 clamp(36px,7vw,74px)/.95 system-ui,sans-serif; letter-spacing:-.055em; }
    h2 { font:500 22px/1.2 system-ui,sans-serif; }
    h3 { font:600 14px/1.3 system-ui,sans-serif; }
    .lede { max-width:72ch; color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:20px 0 36px; }
    .metric,.panel,.case,.adapter { border:1px solid var(--line); background:color-mix(in srgb,var(--panel) 92%,transparent); border-radius:12px; }
    .metric { padding:16px; }
    .metric strong { display:block; margin-top:8px; font:500 28px/1 system-ui,sans-serif; }
    .label { color:var(--muted); font-size:12px; }
    .panel { padding:20px; margin-top:12px; }
    .section-head { display:flex; justify-content:space-between; align-items:end; gap:16px; margin:40px 0 12px; }
    .hash { overflow-wrap:anywhere; color:var(--muted); font-size:11px; }
    .list { display:grid; gap:10px; }
    .adapter,.case { padding:15px; display:grid; gap:8px; }
    .adapter-grid { display:grid; grid-template-columns:1.2fr .8fr .8fr; gap:16px; }
    .case-head { display:flex; justify-content:space-between; gap:12px; }
    .pill { display:inline-flex; width:max-content; padding:3px 8px; border:1px solid var(--line); border-radius:999px; color:var(--accent); font-size:11px; }
    .ambiguous { border-color:#725e35; }
    .ambiguous .pill { color:var(--warn); border-color:#725e35; }
    dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 14px; margin:0; }
    dt { color:var(--muted); }
    dd { margin:0; overflow-wrap:anywhere; }
    ul { margin:0; padding-left:20px; color:var(--muted); }
    .error { color:#ff9f9f; }
    @media (max-width:760px) { .grid { grid-template-columns:repeat(2,1fr); } .adapter-grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Read-only evidence surface</p>
      <h1>Workflow Compiler Shadow Pilot</h1>
      <p class="lede">A sanitized view of observed marketplace workflow evidence, compiled governance, ownership boundaries, and unresolved uncertainty.</p>
      <p id="boundary" class="status">Loading verified boundary…</p>
    </header>
    <section id="metrics" class="grid" aria-label="Pilot totals"></section>
    <section class="panel" aria-labelledby="runtime-title"><h2 id="runtime-title">Runtime receipt</h2><dl id="runtime"></dl></section>
    <div class="section-head"><h2>Owning-system adapters</h2><span id="adapter-count" class="label"></span></div>
    <section id="adapters" class="list" aria-label="Owning-system adapters"></section>
    <div class="section-head"><h2>Sanitized discrepancy evidence</h2><span id="case-count" class="label"></span></div>
    <section id="cases" class="list" aria-label="Sanitized discrepancy evidence"></section>
  </main>
  <script>
    const addText = (parent, tag, value, className) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      node.textContent = String(value);
      parent.append(node);
      return node;
    };
    const addDefinition = (list, term, value) => {
      addText(list, 'dt', term);
      addText(list, 'dd', value);
    };
    const render = (data) => {
      document.querySelector('#boundary').textContent = data.boundaries.readOnly
        ? 'Shadow mode · read only · zero mutations'
        : 'Boundary verification failed';
      const metrics = [
        ['Status', data.scorecard.status],
        ['Sources', data.scorecard.sourceCount],
        ['Cases replayed', data.scorecard.caseCount],
        ['Ambiguous', data.scorecard.ambiguousCount],
      ];
      for (const [label, value] of metrics) {
        const card = document.createElement('article'); card.className = 'metric';
        addText(card, 'span', label, 'label'); addText(card, 'strong', value); metricsEl.append(card);
      }
      const runtime = document.querySelector('#runtime');
      addDefinition(runtime, 'Definition', data.compiledRuntime.definitionSha256);
      addDefinition(runtime, 'Manifest', data.compiledRuntime.manifestSha256);
      addDefinition(runtime, 'Compiler', data.compiledRuntime.compilerVersion);
      addDefinition(runtime, 'Artifacts', data.compiledRuntime.artifactCount);
      document.querySelector('#adapter-count').textContent = data.discovery.adapters.length + ' adapters';
      for (const adapter of data.discovery.adapters) {
        const card = document.createElement('article'); card.className = 'adapter adapter-grid';
        const identity = document.createElement('div'); addText(identity, 'h3', adapter.owner); addText(identity, 'p', adapter.id, 'label');
        const authority = document.createElement('dl'); addDefinition(authority, 'Authority', adapter.authority); addDefinition(authority, 'Write', adapter.write);
        const evidence = document.createElement('dl'); addDefinition(evidence, 'Evidence', adapter.evidence); addDefinition(evidence, 'Escalation', adapter.escalation);
        card.append(identity, authority, evidence); document.querySelector('#adapters').append(card);
      }
      document.querySelector('#case-count').textContent = data.cases.length + ' discrepancies';
      for (const item of data.cases) {
        const card = document.createElement('article'); card.className = 'case' + (item.status === 'ambiguous' ? ' ambiguous' : '');
        const head = document.createElement('div'); head.className = 'case-head';
        const title = document.createElement('div'); addText(title, 'h3', item.classification); addText(title, 'p', item.caseFingerprint, 'hash');
        addText(head, 'span', item.status === 'ambiguous' ? 'data_ambiguous' : item.status, 'pill'); head.prepend(title); card.append(head);
        const facts = document.createElement('dl'); addDefinition(facts, 'Rule', item.ruleId); addDefinition(facts, 'Outcome', item.controlledEvidence.observedOutcome); addDefinition(facts, 'Provenance', item.sourcePointers.alignment); card.append(facts);
        if (item.missingEvidence.length) { addText(card, 'h3', 'Missing evidence'); const list = document.createElement('ul'); for (const value of item.missingEvidence) addText(list, 'li', value); card.append(list); }
        document.querySelector('#cases').append(card);
      }
    };
    const metricsEl = document.querySelector('#metrics');
    fetch('./data.json').then((response) => { if (!response.ok) throw new Error('Evidence load failed'); return response.json(); }).then(render).catch((error) => {
      metricsEl.className = 'panel error'; metricsEl.textContent = error.message;
    });
  </script>
</body>
</html>
`;
}
