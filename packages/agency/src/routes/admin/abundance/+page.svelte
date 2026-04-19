<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, SEO } from '@create-something/canon';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let savingJobs = $state<Set<string>>(new Set());

  function formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Not yet';
    return new Date(value).toLocaleString();
  }

  function compactDateTime(value: string): string {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function openPostingLabel(value: string): string {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return 'Open posting';
    }
  }
</script>

<SEO
  title="Admin - Abundance"
  description="Inbound job intake triage for Abundance"
  propertyName="agency"
  noindex={true}
/>

<main class="dashboard">
  <header class="dashboard-header">
    <div>
      <p class="eyebrow">Abundance Operator Surface</p>
      <h1>Inbound Jobs</h1>
      <p class="subtitle">
        Working intake database for agent-farmed inbound jobs, with operator review and export.
      </p>
    </div>
    <div class="header-meta">
      <span>Operator: {data.operator_email}</span>
      <span>Refreshed {compactDateTime(data.generatedAt)}</span>
      <a href="/admin/funnel" class="header-link">Back to Funnel</a>
    </div>
  </header>

  {#if form?.error}
    <div class="toast error">{form.error}</div>
  {/if}

  {#if form?.success}
    <div class="toast success">
      Updated {form.updated_job_id} to <strong>{form.updated_status}</strong>.
    </div>
  {/if}

  {#if data.error}
    <div class="toast error">{data.error}</div>
  {/if}

  <section class="stats-grid">
    <Card variant="glass" radius="md" padding="lg" class="stat-card">
      <span class="stat-label">Total Jobs</span>
      <strong class="stat-value">{data.stats.total}</strong>
    </Card>
    <Card variant="glass" radius="md" padding="lg" class="stat-card">
      <span class="stat-label">New</span>
      <strong class="stat-value">{data.stats.new_count}</strong>
    </Card>
    <Card variant="glass" radius="md" padding="lg" class="stat-card">
      <span class="stat-label">Reviewing</span>
      <strong class="stat-value">{data.stats.reviewing_count}</strong>
    </Card>
    <Card variant="glass" radius="md" padding="lg" class="stat-card">
      <span class="stat-label">Qualified</span>
      <strong class="stat-value">{data.stats.qualified_count}</strong>
    </Card>
    <Card variant="glass" radius="md" padding="lg" class="stat-card">
      <span class="stat-label">Rejected</span>
      <strong class="stat-value">{data.stats.rejected_count}</strong>
    </Card>
  </section>

  <Card variant="glass" radius="md" padding="lg" class="glass-emphasis">
    <div class="panel-header">
      <div>
        <h2>Queue</h2>
        <p class="panel-subtitle">
          Showing {data.jobs.length} of {data.total} matching records.
        </p>
      </div>
      <a class="export-link" href={data.exportHref}>Export CSV</a>
    </div>

    <form method="GET" class="filters">
      <label>
        <span>Status</span>
        <select name="status">
          <option value="all" selected={data.filters.status === 'all'}>All statuses</option>
          {#each data.statuses as status}
            <option value={status} selected={data.filters.status === status}>{status}</option>
          {/each}
        </select>
      </label>

      <label>
        <span>Source agent</span>
        <select name="source_agent">
          <option value="" selected={!data.filters.source_agent}>All agents</option>
          {#each data.sourceAgents as agent}
            <option value={agent} selected={data.filters.source_agent === agent}>{agent}</option>
          {/each}
        </select>
      </label>

      <label class="search-field">
        <span>Search</span>
        <input
          type="search"
          name="q"
          value={data.filters.q}
          placeholder="Title, employer, location, dedupe key"
        />
      </label>

      <label>
        <span>Limit</span>
        <select name="limit">
          {#each [25, 50, 100, 250] as limit}
            <option value={limit} selected={data.filters.limit === limit}>{limit}</option>
          {/each}
        </select>
      </label>

      <input type="hidden" name="offset" value="0" />
      <button type="submit" class="btn-filter">Apply</button>
    </form>

    {#if data.jobs.length === 0}
      <div class="empty-state">
        <h3>No inbound jobs yet</h3>
        <p>
          Send a `POST` to `/api/abundance/inbound-jobs` with `source_agent`, `title`, and either
          `dedupe_key` or a stable `job_url`.
        </p>
      </div>
    {:else}
      <div class="jobs-list">
        {#each data.jobs as job}
          <article
            class="job-card"
            class:updated={form?.updated_job_id === job.id}
            class:saving={savingJobs.has(job.id)}
          >
            <div class="job-topline">
              <div class="job-heading">
                <span class={`status-badge status-${job.status}`}>{job.status}</span>
                <h3>{job.title}</h3>
              </div>
              <div class="job-links">
                <span class="timestamp">{compactDateTime(job.last_seen_at)}</span>
                {#if job.job_url}
                  <a href={job.job_url} target="_blank" rel="noreferrer">
                    {openPostingLabel(job.job_url)}
                  </a>
                {/if}
              </div>
            </div>

            <p class="job-summary">
              <strong>{job.employer ?? 'Unknown employer'}</strong>
              {#if job.location}
                <span> · {job.location}</span>
              {/if}
            </p>

            <div class="facts-grid">
              <div>
                <span class="fact-label">Agents</span>
                <strong>{job.source_agents.join(', ')}</strong>
              </div>
              <div>
                <span class="fact-label">Seen</span>
                <strong>{job.seen_count}</strong>
              </div>
              <div>
                <span class="fact-label">Ingested</span>
                <strong>{formatDateTime(job.ingested_at)}</strong>
              </div>
              <div>
                <span class="fact-label">Reviewed</span>
                <strong>{formatDateTime(job.reviewed_at)}</strong>
              </div>
            </div>

            <form
              method="POST"
              action="?/save"
              class="editor"
              use:enhance={() => {
                savingJobs.add(job.id);
                savingJobs = savingJobs;

                return async ({ update }) => {
                  try {
                    await update();
                  } finally {
                    savingJobs.delete(job.id);
                    savingJobs = savingJobs;
                  }
                };
              }}
            >
              <input type="hidden" name="id" value={job.id} />

              <label>
                <span>Status</span>
                <select name="status">
                  {#each data.statuses as status}
                    <option value={status} selected={job.status === status}>{status}</option>
                  {/each}
                </select>
              </label>

              <label class="notes-field">
                <span>Notes</span>
                <textarea
                  name="notes"
                  rows="3"
                  placeholder="Operator notes, recruiter handoff, rejection reason"
                  >{job.notes ?? ''}</textarea
                >
              </label>

              <div class="editor-footer">
                <code>{job.dedupe_key}</code>
                <button type="submit" class="btn-save">
                  {savingJobs.has(job.id) ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>

            <details class="payload">
              <summary>Raw payload</summary>
              <pre>{JSON.stringify(job.raw_payload ?? {}, null, 2)}</pre>
            </details>
          </article>
        {/each}
      </div>
    {/if}
  </Card>
</main>

<style>
  .dashboard {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: var(--space-lg);
    display: grid;
    gap: var(--space-lg);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-lg);
    align-items: flex-start;
  }

  .eyebrow {
    margin: 0 0 var(--space-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.8rem;
    color: var(--color-fg-muted);
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3rem);
  }

  .subtitle {
    margin: var(--space-sm) 0 0;
    max-width: 60ch;
    color: var(--color-fg-muted);
  }

  .header-meta {
    display: grid;
    gap: 0.25rem;
    text-align: right;
    color: var(--color-fg-muted);
    font-size: 0.95rem;
  }

  .header-link {
    color: var(--color-fg);
    text-decoration: none;
    font-weight: 600;
  }

  .header-link:hover {
    text-decoration: underline;
  }

  .toast {
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  }

  .toast.success {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
  }

  .toast.error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-md);
  }

  .stat-card {
    display: grid;
    gap: 0.35rem;
  }

  .stat-label {
    color: var(--color-fg-muted);
    font-size: 0.95rem;
  }

  .stat-value {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .panel-header h2 {
    margin: 0;
  }

  .panel-subtitle {
    margin: 0.35rem 0 0;
    color: var(--color-fg-muted);
  }

  .export-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 1rem;
    border-radius: 999px;
    text-decoration: none;
    color: var(--color-bg);
    background: var(--color-fg);
    font-weight: 600;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .filters label,
  .editor label {
    display: grid;
    gap: 0.45rem;
  }

  .filters span,
  .editor span,
  .fact-label {
    font-size: 0.9rem;
    color: var(--color-fg-muted);
  }

  .filters select,
  .filters input,
  .editor select,
  .editor textarea {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
    border-radius: 0.8rem;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--color-bg-elevated) 70%, transparent);
    color: inherit;
  }

  .search-field {
    min-width: 16rem;
  }

  .btn-filter,
  .btn-save {
    align-self: end;
    border: 0;
    border-radius: 999px;
    padding: 0.8rem 1.2rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .jobs-list {
    display: grid;
    gap: var(--space-md);
  }

  .job-card {
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
    background: color-mix(in srgb, var(--color-bg-elevated) 55%, transparent);
    display: grid;
    gap: 0.9rem;
  }

  .job-card.updated {
    border-color: color-mix(in srgb, var(--color-success) 55%, var(--color-border));
  }

  .job-card.saving {
    opacity: 0.8;
  }

  .job-topline,
  .job-heading,
  .job-links,
  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .job-heading {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .job-heading h3,
  .job-summary {
    margin: 0;
  }

  .job-links {
    flex-wrap: wrap;
    color: var(--color-fg-muted);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .status-new {
    background: color-mix(in srgb, var(--color-info) 22%, transparent);
  }

  .status-reviewing {
    background: color-mix(in srgb, var(--color-warning) 22%, transparent);
  }

  .status-qualified {
    background: color-mix(in srgb, var(--color-success) 22%, transparent);
  }

  .status-rejected,
  .status-archived {
    background: color-mix(in srgb, var(--color-error) 16%, transparent);
  }

  .facts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem;
  }

  .facts-grid > div {
    display: grid;
    gap: 0.2rem;
  }

  .editor {
    display: grid;
    gap: 0.9rem;
  }

  .notes-field {
    min-height: 100%;
  }

  .editor textarea {
    resize: vertical;
    font-family: inherit;
  }

  .editor-footer {
    flex-wrap: wrap;
  }

  .editor-footer code {
    max-width: 100%;
    overflow: auto;
    padding: 0.35rem 0.5rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--color-bg) 70%, transparent);
    font-size: 0.82rem;
  }

  .payload {
    border-top: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
    padding-top: 0.85rem;
  }

  .payload summary {
    cursor: pointer;
    font-weight: 600;
  }

  .payload pre {
    margin: 0.85rem 0 0;
    padding: 0.85rem;
    border-radius: 0.8rem;
    background: color-mix(in srgb, var(--color-bg) 80%, transparent);
    overflow: auto;
    font-size: 0.82rem;
  }

  .empty-state {
    padding: 1rem 0;
    color: var(--color-fg-muted);
  }

  @media (max-width: 900px) {
    .dashboard-header,
    .panel-header,
    .job-topline {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-meta {
      text-align: left;
    }
  }
</style>
