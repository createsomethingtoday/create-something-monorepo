<script lang="ts">
  import { StatusBadge } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { excerpt, relativeTime, shortTimestamp } from '$lib/format';
  import {
    findingStatusBadge,
    notificationBadge,
    priorityBadge,
    stateLabel,
    triageBadge
  } from '$lib/status';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const finding = $derived(data.finding);
  const statusBadge = $derived(findingStatusBadge(finding.status));

  const metadata = $derived(
    [
      { label: 'Category', value: finding.category_title, mono: false },
      { label: 'Owner', value: finding.owner, mono: false },
      { label: 'App', value: finding.app_name, mono: false },
      { label: 'App client id', value: finding.app_client_id, mono: true },
      { label: 'Created by', value: finding.created_by, mono: true },
      {
        label: 'Verified by reviewer',
        value: finding.verified_by_reviewer ? 'yes' : 'no',
        mono: false
      },
      { label: 'Airtable record', value: finding.airtable_record_id, mono: true },
      { label: 'Atlas canvas', value: finding.atlas_canvas_id, mono: true },
      { label: 'Atlas node', value: finding.atlas_node_id, mono: true },
      { label: 'Created', value: finding.created_at, mono: true },
      { label: 'Updated', value: finding.updated_at, mono: true }
    ].filter((entry) => entry.value)
  );
</script>

<a href="/findings" class="back-link">← Findings</a>

<header class="mt-4">
  <div class="flex flex-wrap items-center gap-3">
    <span class="finding-id">#{finding.id}</span>
    <StatusBadge
      label={stateLabel(finding.status)}
      tone={statusBadge.tone}
      emphasis={statusBadge.emphasis}
    />
    {#if finding.priority}
      {@const badge = priorityBadge(finding.priority)}
      <StatusBadge label={finding.priority} tone={badge.tone} />
    {/if}
    {#if finding.decision_needed}
      <StatusBadge label="decision needed" tone="warning" emphasis />
    {/if}
  </div>
  <h1 class="finding-title mt-3">{finding.title}</h1>
</header>

<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
  <div class="flex min-w-0 flex-col gap-6">
    <!-- Summary -->
    <Panel title="Summary">
      {#if finding.summary}
        <p class="prose-block">{finding.summary}</p>
      {:else}
        <p class="empty-note">No summary recorded.</p>
      {/if}
    </Panel>

    <!-- Decision -->
    {#if finding.decision_needed || finding.decision_summary}
      <Panel title="Decision">
        {#if finding.decision_summary}
          <p class="prose-block">{finding.decision_summary}</p>
        {:else}
          <p class="empty-note">Decision needed — no decision summary recorded yet.</p>
        {/if}
      </Panel>
    {/if}

    <!-- Attached items -->
    <Panel title="Attached items" count={data.items.length}>
      {#if data.items.length === 0}
        <p class="empty-note">No items linked to this finding.</p>
      {:else}
        <ul>
          {#each data.items as item (item.id)}
            {@const badge = triageBadge(item.triage_state)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge label={stateLabel(item.triage_state)} tone={badge.tone} variant="dot" />
                {#if item.source_name}
                  <span class="mono-caption">{item.source_name}</span>
                {/if}
                {#if item.author}
                  <span class="row-author">{item.author}</span>
                {/if}
                {#if item.posted_at}
                  <span class="mono-caption" title={item.posted_at}>
                    {relativeTime(item.posted_at)}
                  </span>
                {/if}
                {#if item.permalink}
                  <a class="out-link ml-auto" href={item.permalink} target="_blank" rel="noreferrer">
                    Slack ↗
                  </a>
                {/if}
              </div>
              {#if item.text}
                <p class="row-text mt-1">{excerpt(item.text)}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <!-- Audit slice -->
    <Panel title="Audit events" count={data.events.length}>
      {#if data.events.length === 0}
        <p class="empty-note">No events recorded for this finding.</p>
      {:else}
        <ul>
          {#each data.events as event (event.id)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="mono-caption" title={event.created_at}>
                  {shortTimestamp(event.created_at)}
                </span>
                <span class="mono-caption">{event.actor}</span>
                <span class="event-action">{event.action}</span>
              </div>
              {#if event.payload_json}
                <details class="payload-details mt-1">
                  <summary>payload</summary>
                  <pre class="payload-pre">{event.payload_json}</pre>
                </details>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
  </div>

  <div class="flex min-w-0 flex-col gap-6">
    <!-- Metadata -->
    <Panel title="Record">
      <dl class="metadata-grid grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {#each metadata as entry (entry.label)}
          <dt class="metadata-label">{entry.label}</dt>
          <dd class="metadata-value" class:mono={entry.mono}>{entry.value}</dd>
        {/each}
      </dl>
    </Panel>

    <!-- Links -->
    <Panel title="Links" count={data.links.length}>
      {#if data.links.length === 0}
        <p class="empty-note">No links recorded.</p>
      {:else}
        <ul>
          {#each data.links as link (link.id)}
            <li class="record-row flex items-baseline gap-3">
              <span class="mono-caption">{link.kind}</span>
              <a class="out-link truncate" href={link.url} target="_blank" rel="noreferrer">
                {link.label ?? link.url}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <!-- Notifications -->
    <Panel title="Notifications" count={data.notifications.length}>
      {#if data.notifications.length === 0}
        <p class="empty-note">No notifications for this finding.</p>
      {:else}
        <ul>
          {#each data.notifications as notification (notification.id)}
            {@const badge = notificationBadge(notification.status)}
            <li class="record-row">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <StatusBadge
                  label={stateLabel(notification.status)}
                  tone={badge.tone}
                  variant="dot"
                />
                <span class="mono-caption">{notification.target}</span>
                {#if notification.sent_at}
                  <span class="mono-caption" title={notification.sent_at}>
                    sent {relativeTime(notification.sent_at)}
                  </span>
                {/if}
              </div>
              <p class="row-text mt-1">{excerpt(notification.body, 200)}</p>
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
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    color: var(--color-fg-secondary);
  }

  .finding-id {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .finding-title {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
  }

  .prose-block {
    padding: var(--space-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    white-space: pre-wrap;
  }

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .record-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .record-row:last-child {
    border-bottom: none;
  }

  .row-author {
    color: var(--color-fg-primary);
  }

  .row-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .mono-caption {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .event-action {
    color: var(--color-fg-primary);
  }

  .out-link {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    text-decoration: underline;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .out-link:hover {
    color: var(--color-fg-primary);
  }

  .metadata-grid {
    padding: var(--space-sm);
  }

  .metadata-label {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .metadata-value {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    overflow-wrap: anywhere;
  }

  .metadata-value.mono {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--color-fg-tertiary);
  }

  .payload-details summary {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    cursor: pointer;
  }

  .payload-pre {
    margin-top: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    overflow-x: auto;
  }
</style>
