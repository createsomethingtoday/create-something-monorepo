<script lang="ts">
  import { StatusBadge } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { shortTimestamp, truncateMiddle } from '$lib/format';
  import { atlasStatusBadge, migrationBadge, priorityBadge, stateLabel } from '$lib/status';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type AtlasNode = PageData['nodes'][number];
  type AtlasEdge = PageData['edges'][number];
  type MapNode = AtlasNode & {
    mapX: number;
    mapY: number;
    mapWidth: number;
    mapHeight: number;
  };
  type MapEdge = AtlasEdge & {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  type EdgeMode = 'summary' | 'ownership' | 'topology' | 'all';
  type EdgeMetadata = {
    confidence?: number;
    relation_evidence_kind?: string;
    relation_kind?: string;
    intra_canvas_relation?: boolean;
  };
  type DecoratedEdge = AtlasEdge & {
    family: 'ownership' | 'topology' | 'other';
    evidenceKind: string;
    relationKind: string;
    confidence: number | null;
  };

  let edgeMode = $state<EdgeMode>('summary');

  const canvasBadge = $derived(atlasStatusBadge(data.canvas.status));
  const totals = $derived({
    nodes: data.nodes.length,
    edges: data.edges.length,
    relations: data.relations.length,
    bindings: data.bindings.length,
    actions: data.actions.length,
    runs: data.runs.length,
    receipts: data.receipts.length
  });
  const edgeModeOptions: { mode: EdgeMode; label: string }[] = [
    { mode: 'summary', label: 'Summary' },
    { mode: 'ownership', label: 'Ownership' },
    { mode: 'topology', label: 'Topology' },
    { mode: 'all', label: 'All' }
  ];
  const decoratedEdges = $derived(data.edges.map(decorateEdge));
  const visibleEdges = $derived(decoratedEdges.filter((edge) => edgeVisibleInMode(edge, edgeMode)));
  const mapModel = $derived(buildMapModel(data.nodes, visibleEdges));
  const edgeCounts = $derived({
    summary: decoratedEdges.filter((edge) => edgeVisibleInMode(edge, 'summary')).length,
    ownership: decoratedEdges.filter((edge) => edgeVisibleInMode(edge, 'ownership')).length,
    topology: decoratedEdges.filter((edge) => edgeVisibleInMode(edge, 'topology')).length,
    all: decoratedEdges.length
  });

  function dimension(value: number | null | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function buildFallbackLevels(nodes: AtlasNode[], edges: AtlasEdge[]): Map<string, number> {
    const ids = new Set(nodes.map((node) => node.node_id));
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    for (const node of nodes) {
      incoming.set(node.node_id, 0);
      outgoing.set(node.node_id, []);
    }
    for (const edge of edges) {
      if (!ids.has(edge.source_node_id) || !ids.has(edge.target_node_id)) continue;
      incoming.set(edge.target_node_id, (incoming.get(edge.target_node_id) ?? 0) + 1);
      outgoing.get(edge.source_node_id)?.push(edge.target_node_id);
    }

    const levels = new Map<string, number>();
    const roots = nodes.filter((node) => (incoming.get(node.node_id) ?? 0) === 0);
    const queue = (roots.length ? roots : nodes).map((node) => node.node_id);
    for (const id of queue) levels.set(id, 0);

    while (queue.length) {
      const id = queue.shift();
      if (!id) continue;
      const nextLevel = (levels.get(id) ?? 0) + 1;
      for (const target of outgoing.get(id) ?? []) {
        if (!levels.has(target)) {
          levels.set(target, nextLevel);
          queue.push(target);
        }
      }
    }

    for (const node of nodes) {
      if (!levels.has(node.node_id)) levels.set(node.node_id, 0);
    }
    return levels;
  }

  function parseEdgeMetadata(edge: AtlasEdge): EdgeMetadata {
    if (!edge.metadata_json) return {};
    try {
      const parsed = JSON.parse(edge.metadata_json);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function decorateEdge(edge: AtlasEdge): DecoratedEdge {
    const metadata = parseEdgeMetadata(edge);
    const family = metadata.intra_canvas_relation
      ? 'topology'
      : edge.edge_id.includes('_client_match_')
        ? 'ownership'
        : 'other';
    return {
      ...edge,
      family,
      evidenceKind: metadata.relation_evidence_kind ?? 'recorded',
      relationKind: metadata.relation_kind ?? edge.label ?? 'edge',
      confidence: typeof metadata.confidence === 'number' && Number.isFinite(metadata.confidence) ? metadata.confidence : null
    };
  }

  function edgeVisibleInMode(edge: DecoratedEdge, mode: EdgeMode): boolean {
    if (mode === 'all') return true;
    if (mode === 'ownership') return edge.family === 'ownership';
    if (mode === 'topology') return edge.family === 'topology';
    if (edge.family !== 'ownership') return false;
    return edge.evidenceKind === 'imported' || edge.confidence === null || edge.confidence >= 0.9;
  }

  function edgeModeCount(mode: EdgeMode): number {
    return edgeCounts[mode];
  }

  function buildMapModel(nodes: AtlasNode[], edges: AtlasEdge[]) {
    const visibleNodes = nodes.slice(0, 96);
    const nodeIds = new Set(visibleNodes.map((node) => node.node_id));
    const hasCoordinates = visibleNodes.some(
      (node) => typeof node.x === 'number' && Number.isFinite(node.x) && typeof node.y === 'number' && Number.isFinite(node.y)
    );

    let mapNodes: MapNode[];
    if (hasCoordinates) {
      mapNodes = visibleNodes.map((node) => ({
        ...node,
        mapX: typeof node.x === 'number' && Number.isFinite(node.x) ? node.x : 0,
        mapY: typeof node.y === 'number' && Number.isFinite(node.y) ? node.y : 0,
        mapWidth: dimension(node.width, 210),
        mapHeight: dimension(node.height, 72)
      }));
    } else {
      const levels = buildFallbackLevels(visibleNodes, edges);
      const columns = new Map<number, AtlasNode[]>();
      for (const node of visibleNodes) {
        const level = levels.get(node.node_id) ?? 0;
        const list = columns.get(level) ?? [];
        list.push(node);
        columns.set(level, list);
      }
      mapNodes = [];
      let xOffset = 32;
      for (const [, columnNodes] of [...columns.entries()].sort(([a], [b]) => a - b)) {
        const maxRows = columnNodes.length > 24 ? 12 : 5;
        columnNodes
          .sort((a, b) => `${a.kind}:${a.label}`.localeCompare(`${b.kind}:${b.label}`))
          .forEach((node, index) => {
            const wrappedColumn = Math.floor(index / maxRows);
            const wrappedRow = index % maxRows;
            mapNodes.push({
              ...node,
              mapX: xOffset + wrappedColumn * 260,
              mapY: 32 + wrappedRow * 106,
              mapWidth: dimension(node.width, 220),
              mapHeight: dimension(node.height, 76)
            });
          });
        xOffset += Math.max(1, Math.ceil(columnNodes.length / maxRows)) * 260;
      }
    }

    if (mapNodes.length === 0) {
      return {
        nodes: [] as MapNode[],
        edges: [] as MapEdge[],
        width: 640,
        height: 320,
        truncated: false,
        layout: 'empty'
      };
    }

    const minX = Math.min(...mapNodes.map((node) => node.mapX));
    const minY = Math.min(...mapNodes.map((node) => node.mapY));
    const normalizedNodes = mapNodes.map((node) => ({
      ...node,
      mapX: node.mapX - minX + 32,
      mapY: node.mapY - minY + 32
    }));
    const nodeById = new Map(normalizedNodes.map((node) => [node.node_id, node]));
    const mapEdges = edges
      .filter((edge) => nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id))
      .map((edge) => {
        const source = nodeById.get(edge.source_node_id);
        const target = nodeById.get(edge.target_node_id);
        if (!source || !target) return null;
        return {
          ...edge,
          x1: source.mapX + source.mapWidth,
          y1: source.mapY + source.mapHeight / 2,
          x2: target.mapX,
          y2: target.mapY + target.mapHeight / 2
        };
      })
      .filter((edge): edge is MapEdge => Boolean(edge));

    const width = Math.max(720, Math.max(...normalizedNodes.map((node) => node.mapX + node.mapWidth)) + 48);
    const height = Math.max(360, Math.max(...normalizedNodes.map((node) => node.mapY + node.mapHeight)) + 48);
    return {
      nodes: normalizedNodes,
      edges: mapEdges,
      width,
      height,
      truncated: nodes.length > visibleNodes.length,
      layout: hasCoordinates ? 'stored geometry' : 'database fallback'
    };
  }
</script>

<a class="back-link" href="/atlas">Atlas</a>

<div class="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
  <StatusBadge label={stateLabel(data.canvas.status)} tone={canvasBadge.tone} variant="dot" />
  <h1 class="page-title">{data.canvas.title}</h1>
  {#if data.canvas.client}
    <span class="row-muted">{data.canvas.client}</span>
  {/if}
</div>

<div class="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
  {#if data.canvas.workflow}
    <span class="row-muted">{data.canvas.workflow}</span>
  {/if}
  <span class="mono-caption" title={data.canvas.canvas_id}>{truncateMiddle(data.canvas.canvas_id, 52)}</span>
  {#if data.canvas.source_kind || data.canvas.source_id}
    <span class="mono-caption">{data.canvas.source_kind ?? 'source'}:{truncateMiddle(data.canvas.source_id, 36)}</span>
  {/if}
  <span class="mono-caption">updated {shortTimestamp(data.canvas.updated_at)}</span>
</div>

<div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
  <div class="metric-cell">
    <span class="metric-value">{totals.nodes}</span>
    <span class="metric-label">nodes</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.edges}</span>
    <span class="metric-label">edges</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.relations}</span>
    <span class="metric-label">relations</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.bindings}</span>
    <span class="metric-label">bindings</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.actions}</span>
    <span class="metric-label">actions</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.runs}</span>
    <span class="metric-label">runs</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.receipts}</span>
    <span class="metric-label">receipts</span>
  </div>
</div>

<section class="map-shell mt-8" aria-labelledby="atlas-map-title">
  <div class="map-header">
    <div>
      <h2 id="atlas-map-title" class="panel-title">Workflow map</h2>
      <p class="map-caption">
        {mapModel.layout}
        {#if mapModel.truncated}
          · showing first {mapModel.nodes.length} nodes
        {/if}
      </p>
    </div>
    <div class="edge-mode-control" aria-label="Edge visibility">
      {#each edgeModeOptions as option (option.mode)}
        <button
          type="button"
          class:active={edgeMode === option.mode}
          aria-pressed={edgeMode === option.mode}
          onclick={() => (edgeMode = option.mode)}
        >
          <span>{option.label}</span>
          <span class="edge-mode-count">{edgeModeCount(option.mode)}</span>
        </button>
      {/each}
    </div>
    <div class="map-counts">
      <span>{mapModel.nodes.length} rendered nodes</span>
      <span>{mapModel.edges.length} rendered edges</span>
      <span>{totals.edges} total edges</span>
    </div>
  </div>

  <div class="map-scroll" role="region" aria-label={`${data.canvas.title} map preview`}>
    <div class="map-plane" style={`width: ${mapModel.width}px; height: ${mapModel.height}px;`}>
      <svg class="edge-layer" width={mapModel.width} height={mapModel.height} viewBox={`0 0 ${mapModel.width} ${mapModel.height}`} aria-hidden="true">
        <defs>
          <marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {#each mapModel.edges as edge (edge.edge_id)}
          <path
            class="map-edge"
            d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 72} ${edge.y1}, ${edge.x2 - 72} ${edge.y2}, ${edge.x2} ${edge.y2}`}
            marker-end="url(#edge-arrow)"
          />
        {/each}
      </svg>

      {#each mapModel.nodes as node (node.node_id)}
        {@const nodeBadge = atlasStatusBadge(node.status)}
        <article
          class="map-node"
          data-status={node.status}
          style={`left: ${node.mapX}px; top: ${node.mapY}px; width: ${node.mapWidth}px; min-height: ${node.mapHeight}px;`}
          title={node.node_id}
        >
          <div class="map-node-topline">
            <span class="node-kind">{node.kind}</span>
            <span class="node-state" data-tone={nodeBadge.tone}>{stateLabel(node.status)}</span>
          </div>
          <h3 class="map-node-label">{node.label}</h3>
          {#if node.evidence}
            <p class="map-node-evidence">{truncateMiddle(node.evidence, 42)}</p>
          {/if}
        </article>
      {/each}
    </div>
  </div>
</section>

<div class="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.6fr)]">
  <div class="flex min-w-0 flex-col gap-6">
    <Panel title="Nodes" count={data.nodes.length}>
      {#if data.nodes.length === 0}
        <p class="empty-note">No nodes recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.nodes as node (node.node_id)}
            {@const nodeBadge = atlasStatusBadge(node.status)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(node.status)} tone={nodeBadge.tone} variant="dot" />
                <span class="row-title">{node.label}</span>
                <span class="mono-caption">{node.kind}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(node.updated_at)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={node.node_id}>{truncateMiddle(node.node_id, 42)}</span>
                {#if node.evidence}
                  <span class="mono-caption" title={node.evidence}>evidence:{truncateMiddle(node.evidence, 42)}</span>
                {/if}
              </div>
              {#if node.notes}
                <p class="row-note mt-1">{node.notes}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Edges" count={visibleEdges.length}>
      {#if data.edges.length === 0}
        <p class="empty-note">No edges recorded for this canvas.</p>
      {:else}
        <div class="edge-list-toolbar">
          <span class="mono-caption">{visibleEdges.length} visible / {data.edges.length} total</span>
          <button type="button" onclick={() => (edgeMode = 'all')}>Show all</button>
        </div>
        <ul>
          {#each visibleEdges as edge (edge.edge_id)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="row-title">{edge.source_label ?? edge.source_node_id}</span>
                <span class="mono-caption">{edge.label ?? 'edge'}</span>
                <span class="row-muted">{edge.target_label ?? edge.target_node_id}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={edge.edge_id}>{truncateMiddle(edge.edge_id, 42)}</span>
                {#if edge.evidence}
                  <span class="mono-caption" title={edge.evidence}>{truncateMiddle(edge.evidence, 52)}</span>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{edge.family}</span>
                <span class="mono-caption">{edge.evidenceKind}</span>
                <span class="mono-caption">{edge.relationKind}</span>
                {#if edge.confidence !== null}
                  <span class="mono-caption">{Math.round(edge.confidence * 100)}%</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Source relations" count={data.relations.length}>
      {#if data.relations.length === 0}
        <p class="empty-note">No source-record relations recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.relations as relation (relation.id)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="row-title">{relation.source_title ?? relation.source_record_id}</span>
                <span class="mono-caption">{relation.relation_kind}</span>
                <span class="row-muted">{relation.target_title ?? relation.target_record_id}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{relation.evidence_kind}</span>
                <span class="mono-caption">{relation.source_type} -> {relation.target_type}</span>
                <span class="mono-caption">{Math.round(relation.confidence * 100)}%</span>
                {#if relation.source_node_id}
                  <span class="mono-caption" title={relation.source_node_id}>{truncateMiddle(relation.source_node_id, 28)}</span>
                {/if}
                {#if relation.target_node_id}
                  <span class="mono-caption" title={relation.target_node_id}>{truncateMiddle(relation.target_node_id, 28)}</span>
                {/if}
              </div>
              {#if relation.reason}
                <p class="row-note mt-1">{relation.reason}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </div>

  <div class="flex min-w-0 flex-col gap-6">
    <Panel title="Actions" count={data.actions.length}>
      {#if data.actions.length === 0}
        <p class="empty-note">No workflow actions recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.actions as action (action.action_id)}
            {@const actionBadge = migrationBadge(action.status)}
            {@const priority = priorityBadge(action.priority)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(action.status)} tone={actionBadge.tone} variant="dot" />
                <StatusBadge label={action.priority} tone={priority.tone} variant="dot" />
                <span class="row-title">{action.title}</span>
                <span class="mono-caption">{action.gate_kind}</span>
                <span class="mono-caption">{action.action_kind}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(action.updated_at)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={action.action_id}>{truncateMiddle(action.action_id, 34)}</span>
                {#if action.node_label || action.node_id}
                  <span class="mono-caption" title={action.node_id ?? undefined}>{truncateMiddle(action.node_label ?? action.node_id, 34)}</span>
                {/if}
                <span class="mono-caption">by {action.proposed_by}</span>
                {#if action.owner}
                  <span class="mono-caption">owner {action.owner}</span>
                {/if}
                {#if action.approved_by}
                  <span class="mono-caption">approved by {action.approved_by}</span>
                {/if}
                {#if action.artifact_url}
                  <a class="out-link" href={action.artifact_url} target="_blank" rel="noreferrer">Artifact</a>
                {/if}
              </div>
              {#if action.description}
                <p class="row-note mt-1">{action.description}</p>
              {/if}
              {#if action.evidence}
                <p class="row-note mt-1">{action.evidence}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Runs" count={data.runs.length}>
      {#if data.runs.length === 0}
        <p class="empty-note">No workflow runs recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.runs as run (run.run_id)}
            {@const runBadge = migrationBadge(run.status)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(run.status)} tone={runBadge.tone} variant="dot" />
                <span class="row-title">{run.node_label ?? run.node_id ?? 'Canvas run'}</span>
                <span class="mono-caption">{run.actor}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(run.updated_at)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={run.run_id}>{truncateMiddle(run.run_id, 36)}</span>
                <span class="mono-caption">started {shortTimestamp(run.started_at)}</span>
                {#if run.completed_at}
                  <span class="mono-caption">completed {shortTimestamp(run.completed_at)}</span>
                {/if}
                {#if run.receipt_url}
                  <a class="out-link" href={run.receipt_url} target="_blank" rel="noreferrer">Receipt</a>
                {/if}
              </div>
              {#if run.error}
                <p class="row-note mt-1">{run.error}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Source bindings" count={data.bindings.length}>
      {#if data.bindings.length === 0}
        <p class="empty-note">No source-record bindings recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.bindings as binding (binding.id)}
            {@const migration = migrationBadge(binding.migration_state)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(binding.migration_state)} tone={migration.tone} variant="dot" />
                <span class="row-title">{binding.record_title ?? binding.record_external_id}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{binding.binding_kind}</span>
                <span class="mono-caption">{binding.canonical_type}</span>
                <span class="mono-caption">{binding.source_name}</span>
                {#if binding.confidence !== null}
                  <span class="mono-caption">{Math.round(binding.confidence * 100)}%</span>
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={binding.substrate_id ?? undefined}>
                  {truncateMiddle(binding.substrate_id, 36)}
                </span>
                <span class="mono-caption" title={binding.record_external_id}>{truncateMiddle(binding.record_external_id, 28)}</span>
              </div>
              {#if binding.reason}
                <p class="row-note mt-1">{binding.reason}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Receipts" count={data.receipts.length}>
      {#if data.receipts.length === 0}
        <p class="empty-note">No receipts recorded for this canvas.</p>
      {:else}
        <ul>
          {#each data.receipts as receipt (receipt.id)}
            <li class="data-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{receipt.receipt_type}</span>
                <span class="mono-caption">{receipt.created_by}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(receipt.created_at)}</span>
              </div>
              <p class="row-note mt-1">{receipt.summary}</p>
              {#if receipt.node_id || receipt.artifact_url}
                <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {#if receipt.node_id}
                    <span class="mono-caption" title={receipt.node_id}>{truncateMiddle(receipt.node_id, 36)}</span>
                  {/if}
                  {#if receipt.artifact_url}
                    <a class="out-link" href={receipt.artifact_url} target="_blank" rel="noreferrer">Artifact</a>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </div>
</div>

<style>
  .back-link {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-decoration: underline;
  }

  .back-link:hover {
    color: var(--color-fg-primary);
  }

  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .metric-cell {
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
  }

  .metric-value {
    display: block;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    line-height: 1;
  }

  .metric-label {
    display: block;
    margin-top: var(--space-xs);
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .map-shell {
    overflow: hidden;
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
  }

  .map-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-shell-surface-secondary);
  }

  .edge-mode-control {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    justify-content: center;
    min-width: 280px;
  }

  .edge-mode-control button,
  .edge-list-toolbar button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    min-height: 32px;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-shell-surface);
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    line-height: 1;
  }

  .edge-mode-control button {
    padding: 0 var(--space-xs);
  }

  .edge-mode-control button:hover,
  .edge-list-toolbar button:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .edge-mode-control button.active {
    border-color: var(--color-fg-primary);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .edge-mode-count {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    margin-left: 2px;
    opacity: 0.78;
  }

  .panel-title {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
  }

  .map-caption,
  .map-counts {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .map-counts {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-sm);
    white-space: nowrap;
  }

  .map-scroll {
    overflow: auto;
    max-height: 520px;
    background-color: var(--color-bg-pure);
    background-image:
      linear-gradient(var(--color-border-default) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-border-default) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  .map-plane {
    position: relative;
  }

  .edge-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .edge-layer marker path {
    fill: var(--color-fg-muted);
  }

  .map-edge {
    fill: none;
    stroke: var(--color-fg-muted);
    stroke-width: 1.5;
    stroke-opacity: 0.72;
  }

  .map-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
  }

  .map-node[data-status='run'] {
    border-color: var(--color-success-border);
  }

  .map-node[data-status='wait'] {
    border-color: var(--color-warning-border);
  }

  .map-node[data-status='stop'] {
    border-color: var(--color-error-border);
  }

  .map-node-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  .node-kind,
  .node-state {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .node-state[data-tone='success'] {
    color: var(--color-success);
  }

  .node-state[data-tone='warning'] {
    color: var(--color-warning);
  }

  .node-state[data-tone='error'] {
    color: var(--color-error);
  }

  .node-state[data-tone='info'] {
    color: var(--color-info);
  }

  .map-node-label {
    overflow-wrap: anywhere;
    font-size: var(--text-body-sm);
    line-height: 1.25;
    color: var(--color-fg-primary);
  }

  .map-node-evidence {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }

  .data-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .data-row:last-child {
    border-bottom: none;
  }

  .row-title {
    color: var(--color-fg-primary);
  }

  .row-muted,
  .row-note {
    color: var(--color-fg-tertiary);
  }

  .edge-list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-shell-surface-secondary);
  }

  .edge-list-toolbar button {
    padding: 0 var(--space-sm);
  }

  @media (max-width: 840px) {
    .map-header {
      flex-direction: column;
      align-items: stretch;
    }

    .edge-mode-control {
      justify-content: flex-start;
      min-width: 0;
    }

    .map-counts {
      justify-content: flex-start;
      white-space: normal;
    }
  }

  .row-note {
    font-size: var(--text-body-sm);
  }

  .mono-caption {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .out-link {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    text-decoration: underline;
  }

  .out-link:hover {
    color: var(--color-fg-primary);
  }
</style>
