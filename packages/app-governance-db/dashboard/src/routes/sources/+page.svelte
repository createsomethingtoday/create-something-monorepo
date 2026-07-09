<script lang="ts">
  import { StatusBadge } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { relativeTime, shortTimestamp, truncateMiddle } from '$lib/format';
  import { freshnessBadge, identityBadge, migrationBadge, stateLabel } from '$lib/status';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const totals = $derived({
    sources: data.sources.length,
    records: data.sources.reduce((sum, source) => sum + source.records, 0),
    missing: data.sources.reduce((sum, source) => sum + source.missing_substrate, 0),
    projected: data.transferAudit.reduce((sum, source) => sum + source.source_projected_records, 0),
    transferSources: data.transferAudit.length,
    boundSources: data.transferAudit.filter((source) => source.bound_records > 0).length,
    unboundRecords: data.transferAudit.reduce((sum, source) => sum + source.unbound_records, 0),
    reviewedUnboundRecords: data.transferAudit.reduce((sum, source) => sum + source.reviewed_unbound_records, 0),
    relationSources: data.transferAudit.filter((source) => source.outgoing_relations + source.incoming_relations > 0).length,
    relationIsolatedRecords: data.transferAudit.reduce((sum, source) => sum + source.relation_isolated_records, 0),
    reviewedRelationIsolatedRecords: data.transferAudit.reduce(
      (sum, source) => sum + source.reviewed_relation_isolated_records,
      0
    ),
    openBindingGaps: data.transferAudit.reduce(
      (sum, source) => sum + Math.max(0, source.unbound_records - source.reviewed_unbound_records),
      0
    ),
    openRelationIslands: data.transferAudit.reduce(
      (sum, source) =>
        sum + Math.max(0, source.relation_isolated_records - source.reviewed_relation_isolated_records),
      0
    ),
    sourceUpdates: data.sourceUpdateReviews.length,
    runs: data.recentRuns.length
  });

  const gapKindLabel = (kind: string) => (kind === 'binding_gap' ? 'binding gap' : 'relation island');
  const actionLabel = (status: string | null) => (status ? `action ${stateLabel(status)}` : 'no action');
  const actionTone = (status: string | null) => migrationBadge(status ?? 'missing').tone;
  const readinessLabel = $derived(data.notionReadiness.ready ? 'ready' : 'not ready');
  const readinessTone = $derived(data.notionReadiness.ready ? 'success' : 'error');
  const planActionLabel = (action: string) => action.replaceAll('_', ' ');
  const blockerTone = (kind: string) =>
    kind === 'source_update_action' ? 'error' : kind === 'binding_gap' ? 'warning' : 'info';
</script>

<h1 class="page-title">Sources</h1>
<p class="page-note mt-2">
  Row-level source records, identity hygiene, cursors, and import runs before projection into Atlas.
</p>

<div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
  <div class="metric-cell">
    <span class="metric-value">{totals.sources}</span>
    <span class="metric-label">sources</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.records}</span>
    <span class="metric-label">records</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.missing}</span>
    <span class="metric-label">identity gaps</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.projected}</span>
    <span class="metric-label">projected</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.boundSources}/{totals.transferSources}</span>
    <span class="metric-label">bound sources</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.relationSources}/{totals.transferSources}</span>
    <span class="metric-label">relation sources</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.reviewedUnboundRecords}/{totals.unboundRecords}</span>
    <span class="metric-label">unbound rows</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.reviewedRelationIsolatedRecords}/{totals.relationIsolatedRecords}</span>
    <span class="metric-label">relation islands</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.openBindingGaps}/{totals.openRelationIslands}</span>
    <span class="metric-label">open queue</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.sourceUpdates}</span>
    <span class="metric-label">source updates</span>
  </div>
  <div class="metric-cell">
    <span class="metric-value">{totals.runs}</span>
    <span class="metric-label">recent runs</span>
  </div>
</div>

<div class="mt-6">
  <Panel title="Notion transfer readiness" count={data.notionReadiness.blockers.length}>
    <div class="readiness-panel">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <StatusBadge label={readinessLabel} tone={readinessTone} variant="dot" />
        <span class="readiness-title">CREATE SOMETHING Notion to Atlas transfer</span>
        <span class="mono-caption ml-auto">
          {data.notionReadiness.captured_sources}/{data.notionReadiness.expected_sources} sources
        </span>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.records}</span>
          <span class="readiness-label">records</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.identity_gaps}</span>
          <span class="readiness-label">identity gaps</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.source_projection_gaps}</span>
          <span class="readiness-label">projection gaps</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.unreviewed_unbound_records}</span>
          <span class="readiness-label">binding blockers</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.unreviewed_relation_islands}</span>
          <span class="readiness-label">relation blockers</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.open_source_update_actions}</span>
          <span class="readiness-label">open actions</span>
        </div>
        <div class="readiness-stat">
          <span class="readiness-value">{data.notionReadiness.client_map_count}/{data.notionReadiness.client_rows}</span>
          <span class="readiness-label">client maps</span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p class="section-label">Blockers</p>
          {#if data.notionReadiness.blockers.length === 0}
            <p class="empty-note compact">No readiness blockers recorded.</p>
          {:else}
            <ul class="status-list">
              {#each data.notionReadiness.blockers as blocker (blocker.kind)}
                <li>
                  <span class="mono-caption">{blocker.kind}</span>
                  <span>{blocker.message}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div>
          <p class="section-label">Warnings</p>
          {#if data.notionReadiness.warnings.length === 0}
            <p class="empty-note compact">No readiness warnings recorded.</p>
          {:else}
            <ul class="status-list">
              {#each data.notionReadiness.warnings as warning (warning.kind)}
                <li>
                  <span class="mono-caption">{warning.kind}</span>
                  <span>{warning.message}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>

      {#if data.latestImportWarnings.length > 0}
        <div class="mt-4">
          <p class="section-label">Latest import warnings</p>
          <ul class="warning-grid">
            {#each data.latestImportWarnings as warning (warning.run_id)}
              <li>
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <StatusBadge label={stateLabel(warning.status)} tone={migrationBadge(warning.status).tone} variant="dot" />
                  <span class="record-title">{warning.source_name}</span>
                  <span class="mono-caption ml-auto">{shortTimestamp(warning.updated_at)}</span>
                </div>
                <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span class="mono-caption" title={warning.run_id}>{truncateMiddle(warning.run_id, 32)}</span>
                  <span class="mono-caption" title={warning.source_external_id}>{truncateMiddle(warning.source_external_id, 28)}</span>
                </div>
                {#if warning.error}
                  <p class="run-error mt-1">{warning.error}</p>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </Panel>
</div>

<div class="mt-6">
  <Panel title="Blocker review plan" count={data.blockerReviewPlan.groups.length}>
    <div class="readiness-panel">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <StatusBadge label="proposal only" tone="info" variant="dot" />
        <span class="readiness-title">{data.blockerReviewPlan.total_blockers} blockers in {data.blockerReviewPlan.groups.length} groups</span>
        <span class="mono-caption ml-auto">{data.blockerReviewPlan.group_by}</span>
      </div>
      {#if data.blockerReviewPlan.truncated}
        <p class="run-error mt-2">Plan is capped at {data.blockerReviewPlan.row_limit} blocker rows.</p>
      {/if}

      {#if data.blockerReviewPlan.groups.length === 0}
        <p class="empty-note compact">No blocker groups recorded.</p>
      {:else}
        <ul class="plan-list mt-4">
          {#each data.blockerReviewPlan.groups as group (group.group_key)}
            <li class="plan-group">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="record-title">{group.group_key}</span>
                <span class="mono-caption">{group.total} blockers</span>
                <span class="mono-caption ml-auto">{planActionLabel(group.proposed_review_action)}</span>
              </div>

              <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {#each Object.entries(group.blocker_counts) as [kind, count] (kind)}
                  <StatusBadge label={`${stateLabel(kind)} ${count}`} tone={blockerTone(kind)} variant="dot" />
                {/each}
                {#each Object.entries(group.action_status_counts) as [status, count] (status)}
                  <StatusBadge label={`${stateLabel(status)} ${count}`} tone={migrationBadge(status).tone} variant="dot" />
                {/each}
                {#if group.handoff_action_status}
                  <StatusBadge label={`handoff ${stateLabel(group.handoff_action_status)}`} tone={migrationBadge(group.handoff_action_status).tone} variant="dot" />
                  <span class="mono-caption" title={group.handoff_action_id ?? undefined}>
                    {group.handoff_action_priority ?? 'P?'} {truncateMiddle(group.handoff_action_id ?? '', 34)}
                  </span>
                  <a class="inline-action" href={`/sources?handoff=${group.handoff_action_id}`}>Rows</a>
                  {#if group.handoff_action_updated_at}
                    <span class="mono-caption">{shortTimestamp(group.handoff_action_updated_at)}</span>
                  {/if}
                  {#if group.handoff_action_status === 'proposed'}
                    <form method="POST" action="?/updateBlockerReviewHandoffStatus">
                      <input type="hidden" name="action_id" value={group.handoff_action_id ?? ''} />
                      <input type="hidden" name="status" value="running" />
                      <button type="submit" class="inline-action">Start handoff</button>
                    </form>
                    <form method="POST" action="?/updateBlockerReviewHandoffStatus">
                      <input type="hidden" name="action_id" value={group.handoff_action_id ?? ''} />
                      <input type="hidden" name="status" value="blocked" />
                      <button type="submit" class="inline-action">Block</button>
                    </form>
                  {:else if group.handoff_action_status === 'running'}
                    <form method="POST" action="?/updateBlockerReviewHandoffStatus">
                      <input type="hidden" name="action_id" value={group.handoff_action_id ?? ''} />
                      <input type="hidden" name="status" value="blocked" />
                      <button type="submit" class="inline-action">Block</button>
                    </form>
                  {:else if group.handoff_action_status === 'blocked'}
                    <form method="POST" action="?/updateBlockerReviewHandoffStatus">
                      <input type="hidden" name="action_id" value={group.handoff_action_id ?? ''} />
                      <input type="hidden" name="status" value="proposed" />
                      <button type="submit" class="inline-action">Reopen</button>
                    </form>
                  {/if}
                {:else}
                  <form method="POST" action="?/createBlockerReviewHandoff">
                    <input type="hidden" name="source_external_id" value={group.source_external_id} />
                    <input type="hidden" name="canonical_type" value={group.canonical_type} />
                    <button type="submit" class="inline-action">Create handoff</button>
                  </form>
                {/if}
              </div>

              <ul class="plan-samples">
                {#each group.samples as sample (`${sample.blocker_kind}:${sample.source_record_id}:${sample.action_id ?? ''}`)}
                  <li>
                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <StatusBadge label={stateLabel(sample.blocker_kind)} tone={blockerTone(sample.blocker_kind)} variant="dot" />
                      <span class="record-title">{sample.title ?? sample.external_id}</span>
                      {#if sample.action_status}
                        <StatusBadge label={stateLabel(sample.action_status)} tone={migrationBadge(sample.action_status).tone} variant="dot" />
                      {/if}
                    </div>
                    <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span class="mono-caption" title={sample.external_id}>{truncateMiddle(sample.external_id, 30)}</span>
                      {#if sample.action_id}
                        <span class="mono-caption" title={sample.action_id}>{sample.action_priority ?? 'P?'} {truncateMiddle(sample.action_id, 34)}</span>
                      {/if}
                      {#if sample.has_binding_gap}
                        <span class="mono-caption">binding missing</span>
                      {/if}
                      {#if sample.has_relation_island}
                        <span class="mono-caption">relation island</span>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </Panel>
</div>

{#if data.selectedHandoff}
  <div class="mt-6">
    <Panel title="Handoff rows" count={data.selectedHandoff.rows.length}>
      <div class="readiness-panel">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <StatusBadge label={`handoff ${stateLabel(data.selectedHandoff.status)}`} tone={migrationBadge(data.selectedHandoff.status).tone} variant="dot" />
          <span class="readiness-title">{data.selectedHandoff.title}</span>
          <span class="mono-caption ml-auto" title={data.selectedHandoff.action_id}>
            {data.selectedHandoff.priority} {truncateMiddle(data.selectedHandoff.action_id, 42)}
          </span>
        </div>

        <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span class="mono-caption">{data.selectedHandoff.total} rows</span>
          <span class="mono-caption">{data.selectedHandoff.source_name ?? data.selectedHandoff.source_external_id}</span>
          <span class="mono-caption">{data.selectedHandoff.canonical_type}</span>
          {#each Object.entries(data.selectedHandoff.blocker_counts) as [kind, count] (kind)}
            <StatusBadge label={`${stateLabel(kind)} ${count}`} tone={blockerTone(kind)} variant="dot" />
          {/each}
          {#each Object.entries(data.selectedHandoff.action_status_counts) as [status, count] (status)}
            <StatusBadge label={`${stateLabel(status)} ${count}`} tone={migrationBadge(status).tone} variant="dot" />
          {/each}
          {#if data.selectedHandoff.truncated}
            <span class="run-error">Limited to 200 rows.</span>
          {/if}
          <a class="inline-action" href="/sources">Close rows</a>
        </div>

        <ul class="handoff-rows">
          {#each data.selectedHandoff.rows as row (`${row.blocker_kind}:${row.source_record_id}:${row.action_id ?? ''}`)}
            <li>
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <StatusBadge label={stateLabel(row.blocker_kind)} tone={blockerTone(row.blocker_kind)} variant="dot" />
                <span class="record-title">{row.title ?? row.external_id}</span>
                {#if row.action_status}
                  <StatusBadge label={stateLabel(row.action_status)} tone={migrationBadge(row.action_status).tone} variant="dot" />
                {/if}
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={row.external_id}>{truncateMiddle(row.external_id, 34)}</span>
                <span class="mono-caption">record {row.source_record_id}</span>
                {#if row.action_id}
                  <span class="mono-caption" title={row.action_id}>{row.action_priority ?? 'P?'} {truncateMiddle(row.action_id, 38)}</span>
                {/if}
                {#if row.has_binding_gap}
                  <span class="mono-caption">binding missing</span>
                {/if}
                {#if row.has_relation_island}
                  <span class="mono-caption">relation island</span>
                {/if}
              </div>
              {#if row.blocker_kind !== 'source_update_action'}
                <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <form method="POST" action="?/reviewTransferGap">
                    <input type="hidden" name="source_record_id" value={row.source_record_id} />
                    <input type="hidden" name="review_kind" value={row.blocker_kind} />
                    <input type="hidden" name="status" value="reviewed" />
                    <input type="hidden" name="title" value={row.title ?? row.external_id} />
                    <input type="hidden" name="handoff_action_id" value={data.selectedHandoff.action_id} />
                    <button type="submit" class="inline-action">Review</button>
                  </form>
                  <form method="POST" action="?/reviewTransferGap">
                    <input type="hidden" name="source_record_id" value={row.source_record_id} />
                    <input type="hidden" name="review_kind" value={row.blocker_kind} />
                    <input type="hidden" name="status" value="waived" />
                    <input type="hidden" name="title" value={row.title ?? row.external_id} />
                    <input type="hidden" name="handoff_action_id" value={data.selectedHandoff.action_id} />
                    <button type="submit" class="inline-action">Waive</button>
                  </form>
                  <form method="POST" action="?/reviewTransferGap">
                    <input type="hidden" name="source_record_id" value={row.source_record_id} />
                    <input type="hidden" name="review_kind" value={row.blocker_kind} />
                    <input type="hidden" name="status" value="needs_source_update" />
                    <input type="hidden" name="title" value={row.title ?? row.external_id} />
                    <input type="hidden" name="handoff_action_id" value={data.selectedHandoff.action_id} />
                    <button type="submit" class="inline-action">Source update</button>
                  </form>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </Panel>
  </div>
{/if}

<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
  <Panel title="Source ledger" count={data.sources.length}>
    {#if data.sources.length === 0}
      <p class="empty-note">No source records captured yet.</p>
    {:else}
      <ul>
        {#each data.sources as source (`${source.source_type}:${source.external_id}`)}
          {@const fresh = freshnessBadge(source.last_synced_at)}
          <li class="source-row">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <StatusBadge label={fresh.label} tone={fresh.tone} variant="dot" />
              <span class="source-title">{source.name}</span>
              <span class="mono-caption">{source.source_type}</span>
              {#if source.workspace}
                <span class="row-muted">{source.workspace}</span>
              {/if}
              <span class="mono-caption ml-auto" title={source.last_synced_at ?? undefined}>
                {relativeTime(source.last_synced_at)}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span class="mono-caption">{source.records} records</span>
              <span class="mono-caption">{source.missing_substrate} identity gaps</span>
              <span class="mono-caption">{source.ready_records} ready</span>
              <span class="mono-caption">{source.imported_records} imported</span>
              <span class="mono-caption">{source.error_records} errors</span>
            </div>
            <div class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span class="mono-caption" title={source.external_id}>{truncateMiddle(source.external_id, 36)}</span>
              {#if source.cursor_value}
                <span class="mono-caption" title={source.cursor_value}>cursor:{truncateMiddle(source.cursor_value, 32)}</span>
              {/if}
              {#if source.synced_by}
                <span class="mono-caption">by {source.synced_by}</span>
              {/if}
              {#if source.atlas_canvas_id}
                <span class="mono-caption" title={source.atlas_canvas_id}>atlas:{truncateMiddle(source.atlas_canvas_id, 28)}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <div class="flex min-w-0 flex-col gap-6">
    <Panel title="Open transfer queue" count={data.openTransferGaps.length}>
      {#if data.openTransferGaps.length === 0}
        <p class="empty-note">No open binding or relation-island reviews.</p>
      {:else}
        <ul>
          {#each data.openTransferGaps as gap (`${gap.source_record_id}:${gap.review_kind}`)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={gapKindLabel(gap.review_kind)} tone={gap.review_kind === 'binding_gap' ? 'warning' : 'info'} variant="dot" />
                <span class="record-title">{gap.title ?? gap.external_id}</span>
                <span class="mono-caption ml-auto">{gap.status}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{gap.source_name}</span>
                <span class="mono-caption">{gap.canonical_type}</span>
                <span class="mono-caption" title={gap.external_id}>{truncateMiddle(gap.external_id, 28)}</span>
                {#if gap.has_binding_gap}
                  <span class="mono-caption">binding missing</span>
                {/if}
                {#if gap.has_relation_island}
                  <span class="mono-caption">relation island</span>
                {/if}
              </div>
              {#if gap.reason}
                <p class="run-error mt-1">{gap.reason}</p>
              {/if}
              <form method="POST" action="?/markNeedsSourceUpdate" class="mt-2">
                <input type="hidden" name="source_record_id" value={gap.source_record_id} />
                <input type="hidden" name="review_kind" value={gap.review_kind} />
                <input type="hidden" name="title" value={gap.title ?? gap.external_id} />
                <button type="submit" class="inline-action">Needs source update</button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Source update queue" count={data.sourceUpdateReviews.length}>
      {#if data.sourceUpdateReviews.length === 0}
        <p class="empty-note">No reviewed source-update handoffs.</p>
      {:else}
        <ul>
          {#each data.sourceUpdateReviews as review (review.id)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={gapKindLabel(review.review_kind)} tone={review.review_kind === 'binding_gap' ? 'warning' : 'info'} variant="dot" />
                <span class="record-title">{review.title ?? review.external_id}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(review.updated_at)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{review.source_name}</span>
                <span class="mono-caption">{review.canonical_type}</span>
                <span class="mono-caption">by {review.reviewed_by}</span>
                <span class="mono-caption" title={review.external_id}>{truncateMiddle(review.external_id, 28)}</span>
                <StatusBadge label={actionLabel(review.workflow_action_status)} tone={actionTone(review.workflow_action_status)} variant="dot" />
                {#if review.workflow_action_id}
                  <span class="mono-caption" title={review.workflow_action_id}>
                    {review.workflow_action_priority ?? 'P?'} {truncateMiddle(review.workflow_action_id, 34)}
                  </span>
                  {#if review.workflow_action_status === 'proposed'}
                    <form method="POST" action="?/updateSourceUpdateActionStatus">
                      <input type="hidden" name="action_id" value={review.workflow_action_id} />
                      <input type="hidden" name="status" value="running" />
                      <button type="submit" class="inline-action">Start action</button>
                    </form>
                    <form method="POST" action="?/updateSourceUpdateActionStatus">
                      <input type="hidden" name="action_id" value={review.workflow_action_id} />
                      <input type="hidden" name="status" value="blocked" />
                      <button type="submit" class="inline-action">Block</button>
                    </form>
                  {:else if review.workflow_action_status === 'running'}
                    <form method="POST" action="?/updateSourceUpdateActionStatus">
                      <input type="hidden" name="action_id" value={review.workflow_action_id} />
                      <input type="hidden" name="status" value="blocked" />
                      <button type="submit" class="inline-action">Block</button>
                    </form>
                    <form method="POST" action="?/recordSourceUpdateResult" class="proof-form">
                      <input type="hidden" name="action_id" value={review.workflow_action_id} />
                      <textarea
                        name="evidence"
                        class="proof-input"
                        rows="2"
                        minlength="10"
                        required
                        aria-label="Source update proof"
                        placeholder="Source update proof"
                      ></textarea>
                      <button type="submit" class="inline-action">Record proof</button>
                    </form>
                  {:else if review.workflow_action_status === 'blocked'}
                    <form method="POST" action="?/updateSourceUpdateActionStatus">
                      <input type="hidden" name="action_id" value={review.workflow_action_id} />
                      <input type="hidden" name="status" value="proposed" />
                      <button type="submit" class="inline-action">Reopen</button>
                    </form>
                  {/if}
                {/if}
                {#if review.has_binding_gap}
                  <span class="mono-caption">binding missing</span>
                {/if}
                {#if review.has_relation_island}
                  <span class="mono-caption">relation island</span>
                {/if}
              </div>
              {#if review.reason}
                <p class="run-error mt-1">{review.reason}</p>
              {/if}
              {#if review.workflow_action_receipt_summary}
                <p class="row-note mt-1">
                  <span class="mono-caption">{review.workflow_action_receipt_type}</span>
                  {review.workflow_action_receipt_summary}
                  {#if review.workflow_action_receipt_created_at}
                    <span class="mono-caption">{shortTimestamp(review.workflow_action_receipt_created_at)}</span>
                  {/if}
                </p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Transfer audit" count={data.transferAudit.length}>
      {#if data.transferAudit.length === 0}
        <p class="empty-note">No source transfer audit rows recorded.</p>
      {:else}
        <ul>
          {#each data.transferAudit as source (`${source.source_type}:${source.external_id}`)}
            {@const migration = migrationBadge(source.transfer_state)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(source.transfer_state)} tone={migration.tone} variant="dot" />
                <span class="record-title">{source.name}</span>
                <span class="mono-caption ml-auto">{source.records} rows</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{source.mapped_records} mapped</span>
                <span class="mono-caption">{source.identity_gaps} gaps</span>
                <span class="mono-caption">{source.source_projected_records} source map</span>
                <span class="mono-caption">{source.bound_records} client bindings</span>
                <span class="mono-caption">{source.reviewed_unbound_records}/{source.unbound_records} unbound reviewed</span>
                <span class="mono-caption">{source.outgoing_relations + source.incoming_relations} relations</span>
                <span class="mono-caption">{source.reviewed_relation_isolated_records}/{source.relation_isolated_records} islands reviewed</span>
                <span class="mono-caption">{source.imported_relations} imported</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Identity gaps" count={data.missingRecords.length}>
      {#if data.missingRecords.length === 0}
        <p class="empty-note">No unresolved source-record identity gaps.</p>
      {:else}
        <ul>
          {#each data.missingRecords as record (record.id)}
            {@const identity = identityBadge(record.identity_state)}
            {@const migration = migrationBadge(record.migration_state)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(record.identity_state)} tone={identity.tone} variant="dot" />
                <StatusBadge label={stateLabel(record.migration_state)} tone={migration.tone} variant="dot" />
              </div>
              <p class="record-title mt-1">{record.title ?? record.external_id}</p>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{record.canonical_type}</span>
                <span class="mono-caption" title={record.external_id}>{truncateMiddle(record.external_id, 28)}</span>
                <span class="mono-caption">{shortTimestamp(record.updated_at)}</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel title="Recent import runs" count={data.recentRuns.length}>
      {#if data.recentRuns.length === 0}
        <p class="empty-note">No source import runs recorded.</p>
      {:else}
        <ul>
          {#each data.recentRuns as run (run.run_id)}
            {@const badge = migrationBadge(run.status)}
            <li class="run-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(run.status)} tone={badge.tone} variant="dot" />
                <span class="mono-caption" title={run.run_id}>{truncateMiddle(run.run_id, 32)}</span>
                <span class="mono-caption ml-auto">{shortTimestamp(run.updated_at)}</span>
              </div>
              <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption">{run.received} received</span>
                <span class="mono-caption">{run.upserted} upserted</span>
                <span class="mono-caption">{run.missing_substrate} gaps</span>
                {#if run.retry_after_seconds !== null}
                  <span class="mono-caption">retry {run.retry_after_seconds}s</span>
                {/if}
              </div>
              {#if run.error}
                <p class="run-error mt-1">{run.error}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </div>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .page-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
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

  .source-row,
  .record-row,
  .run-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .source-row:last-child,
  .record-row:last-child,
  .run-row:last-child {
    border-bottom: none;
  }

  .source-title,
  .record-title {
    color: var(--color-fg-primary);
  }

  .record-title,
  .run-error,
  .row-note {
    font-size: var(--text-body-sm);
  }

  .row-muted,
  .run-error,
  .row-note {
    color: var(--color-fg-tertiary);
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

  .empty-note.compact {
    padding: var(--space-xs) 0;
  }

  .readiness-panel {
    padding: var(--space-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .readiness-title {
    color: var(--color-fg-primary);
    font-weight: 600;
  }

  .readiness-stat {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-xs);
    background: var(--color-shell-surface);
  }

  .readiness-value {
    display: block;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-body);
    color: var(--color-fg-primary);
    line-height: 1.1;
  }

  .readiness-label,
  .section-label {
    display: block;
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .status-list {
    display: grid;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }

  .status-list li {
    display: grid;
    gap: 0.15rem;
    border-top: 1px solid var(--color-border-default);
    padding-top: var(--space-xs);
  }

  .warning-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }

  .warning-grid li {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-xs);
  }

  .plan-list {
    display: grid;
    gap: var(--space-sm);
  }

  .plan-group {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-sm);
    background: var(--color-shell-surface);
  }

  .plan-samples {
    display: grid;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }

  .plan-samples li {
    border-top: 1px solid var(--color-border-default);
    padding-top: var(--space-xs);
  }

  .handoff-rows {
    display: grid;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }

  .handoff-rows li {
    border-top: 1px solid var(--color-border-default);
    padding-top: var(--space-xs);
  }

  .inline-action {
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-shell-surface);
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    padding: 0.35rem 0.55rem;
  }

  .inline-action:hover {
    border-color: var(--color-fg-muted);
    color: var(--color-fg-primary);
  }

  .proof-form {
    display: flex;
    flex-basis: 100%;
    gap: var(--space-xs);
    align-items: stretch;
    margin-top: var(--space-xs);
  }

  .proof-input {
    min-width: 14rem;
    flex: 1;
    resize: vertical;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-shell-surface);
    color: var(--color-fg-primary);
    font: inherit;
    font-size: var(--text-caption);
    padding: 0.45rem 0.55rem;
  }

  .proof-input:focus {
    border-color: var(--color-fg-muted);
    outline: none;
  }
</style>
