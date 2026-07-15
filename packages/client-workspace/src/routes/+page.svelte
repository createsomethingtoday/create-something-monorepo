<script lang="ts">
  import { onMount } from 'svelte';
  import {
    mergeWorkspaceEvents,
    pendingWorkspaceApprovals,
    type BrowserWorkspaceEvent
  } from '$lib/client/workspace-view.js';
  import type { PageData } from './$types';

  type Workspace = PageData['workspaces'][number];
  type SessionReceipt = {
    sessionId: string;
    workspaceId: string;
    status: 'opening' | 'ready' | 'running' | 'completed' | 'failed' | 'closed';
    updatedAt: string;
    events: BrowserWorkspaceEvent[];
  };
  type PreviewStatus = {
    state: 'idle' | 'starting' | 'ready' | 'blocked' | 'crashed' | 'stopped';
    previewPath: string;
  };
  type SessionResponse = {
    workspace: Workspace;
    receipt: SessionReceipt;
    preview: PreviewStatus;
  };

  let { data }: { data: PageData } = $props();
  let workspace = $state<Workspace | null>(null);
  let receipt = $state<SessionReceipt | null>(null);
  let events = $state<BrowserWorkspaceEvent[]>([]);
  let preview = $state<PreviewStatus | null>(null);
  let previewRevision = $state(0);
  let diff = $state('');
  let promptText = $state('');
  let attachment = $state<File | null>(null);
  let userMessages = $state<Array<{ text: string; imageName?: string }>>([]);
  let opening = $state(false);
  let resetting = $state(false);
  let sending = $state(false);
  let notice = $state('Choose an allowlisted workspace to begin.');
  let errorMessage = $state('');
  let fileInput = $state<HTMLInputElement>();
  let eventSource: EventSource | null = null;

  const sessionStorageKey = 'create-something.client-workspace.session';

  const safeErrors: Record<string, string> = {
    invalid_upload: 'Choose a PNG, JPEG, or WebP image no larger than 5 MB.',
    invalid_turn: 'Describe the frontend change before sending.',
    turn_conflict: 'The current edit is still running. Wait for it to finish.',
    approval_not_found: 'That approval is no longer pending.',
    forbidden_intent: 'Deploy, publish, invite, and credential actions are unavailable here.',
    reset_unavailable: 'The immutable workspace seed is unavailable.',
    session_not_found: 'The prior local session has ended. Open a new workspace.',
    workspace_not_found: 'That workspace is not available.',
    preview_timeout: 'The preview did not become ready in time.',
    preview_crashed: 'The preview process stopped unexpectedly.',
    workspace_request_failed: 'The workspace could not complete that request.'
  };

  onMount(() => {
    const storedSession = localStorage.getItem(sessionStorageKey);
    if (storedSession) void restoreSession(storedSession);
    return () => eventSource?.close();
  });

  async function readJson<T>(response: Response): Promise<T> {
    const body = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      const code = typeof body.error === 'string' ? body.error : 'workspace_request_failed';
      throw new Error(code);
    }
    return body;
  }

  function showError(error: unknown) {
    const code = error instanceof Error ? error.message : 'workspace_request_failed';
    errorMessage = safeErrors[code] ?? safeErrors.workspace_request_failed;
    notice = 'Action needs attention.';
  }

  async function openWorkspace(selected: Workspace) {
    opening = true;
    errorMessage = '';
    notice = 'Starting the governed workspace and preview…';
    try {
      const result = await readJson<SessionResponse>(
        await fetch(`/api/workspaces/${encodeURIComponent(selected.id)}/sessions`, {
          method: 'POST'
        })
      );
      applySession(result);
      localStorage.setItem(sessionStorageKey, result.receipt.sessionId);
      notice = 'Workspace ready. Describe a visible frontend change.';
    } catch (error) {
      showError(error);
    } finally {
      opening = false;
    }
  }

  async function restoreSession(sessionId: string) {
    opening = true;
    errorMessage = '';
    notice = 'Restoring the latest local receipt…';
    try {
      const result = await readJson<SessionResponse>(
        await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`)
      );
      applySession(result);
      await refreshDiff();
      notice = `Restored ${result.receipt.status} session.`;
    } catch (error) {
      localStorage.removeItem(sessionStorageKey);
      showError(error);
    } finally {
      opening = false;
    }
  }

  function applySession(result: SessionResponse) {
    workspace = result.workspace;
    receipt = result.receipt;
    events = mergeWorkspaceEvents([], result.receipt.events);
    preview = result.preview;
    connectEvents(result.receipt.sessionId);
  }

  function connectEvents(sessionId: string) {
    eventSource?.close();
    eventSource = new EventSource(`/api/sessions/${encodeURIComponent(sessionId)}/events`);
    eventSource.onmessage = (message) => {
      const event = JSON.parse(message.data) as BrowserWorkspaceEvent;
      events = mergeWorkspaceEvents(events, [event]);
      if (receipt) {
        receipt = {
          ...receipt,
          status:
            event.type === 'turn.completed'
              ? 'completed'
              : event.type === 'turn.failed' || event.type === 'runtime.error'
                ? 'failed'
                : event.type === 'turn.started'
                  ? 'running'
                  : receipt.status,
          updatedAt: event.at,
          events
        };
      }
      if (
        event.type === 'file.changed' ||
        event.type === 'diff.updated' ||
        event.type === 'turn.completed' ||
        event.type === 'turn.failed'
      ) {
        void refreshArtifacts();
      }
      notice = event.message;
      if (event.type === 'turn.completed' || event.type === 'turn.failed') sending = false;
    };
    eventSource.onerror = () => {
      notice = 'Live activity paused. The saved receipt remains available.';
    };
  }

  async function submitTurn() {
    if (!receipt || !promptText.trim() || sending) return;
    const submittedText = promptText.trim();
    const submittedImage = attachment?.name;
    sending = true;
    errorMessage = '';
    notice = 'Sending the bounded edit request…';
    try {
      const form = new FormData();
      form.set('text', submittedText);
      if (attachment) form.set('image', attachment);
      await readJson<{ turnId: string }>(
        await fetch(`/api/sessions/${encodeURIComponent(receipt.sessionId)}/turns`, {
          method: 'POST',
          body: form
        })
      );
      userMessages = [...userMessages, { text: submittedText, imageName: submittedImage }];
      promptText = '';
      attachment = null;
      if (fileInput) fileInput.value = '';
      notice = 'Agent turn started. Activity will appear live.';
    } catch (error) {
      sending = false;
      showError(error);
    }
  }

  function chooseAttachment(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    attachment = input.files?.[0] ?? null;
    errorMessage = '';
  }

  async function respondToApproval(approvalId: string, decision: 'accept' | 'decline') {
    if (!receipt) return;
    errorMessage = '';
    try {
      await readJson<{ ok: boolean }>(
        await fetch(
          `/api/sessions/${encodeURIComponent(receipt.sessionId)}/approvals/${encodeURIComponent(approvalId)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ decision })
          }
        )
      );
      notice = decision === 'accept' ? 'Bounded action approved.' : 'Action declined.';
    } catch (error) {
      showError(error);
    }
  }

  async function refreshDiff() {
    if (!receipt) return;
    try {
      const result = await readJson<{ diff: string }>(
        await fetch(`/api/sessions/${encodeURIComponent(receipt.sessionId)}/diff`)
      );
      diff = result.diff;
    } catch (error) {
      showError(error);
    }
  }

  async function refreshArtifacts() {
    await refreshDiff();
    previewRevision += 1;
  }

  async function resetWorkspace() {
    if (!workspace || resetting) return;
    resetting = true;
    errorMessage = '';
    notice = 'Resetting the governed demo to its immutable seed…';
    try {
      await readJson<{ ok: boolean }>(
        await fetch(`/api/workspaces/${encodeURIComponent(workspace.id)}/reset`, {
          method: 'POST'
        })
      );
      clearSession();
      notice = 'Demo reset complete. Open the workspace for a clean run.';
    } catch (error) {
      showError(error);
    } finally {
      resetting = false;
    }
  }

  function clearSession() {
    eventSource?.close();
    eventSource = null;
    localStorage.removeItem(sessionStorageKey);
    workspace = null;
    receipt = null;
    events = [];
    preview = null;
    diff = '';
    userMessages = [];
    notice = 'Choose an allowlisted workspace to begin.';
    errorMessage = '';
  }

  function eventLabel(type: BrowserWorkspaceEvent['type']) {
    return type.replace('.', ' ');
  }
</script>

<svelte:head>
  <title>Client Workspace — CREATE SOMETHING</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='11' fill='%23d86f4d'/%3E%3C/svg%3E" />
  <meta
    name="description"
    content="Governed, real-time frontend editing for CREATE SOMETHING client workspaces."
  />
</svelte:head>

<header class="topbar">
  <a class="brand" href="/" aria-label="CREATE SOMETHING client workspace home">
    <span class="mark" aria-hidden="true"></span>
    <span>CREATE SOMETHING</span>
  </a>
  <div class="workspace-context">
    <span class="eyebrow">Client workspace</span>
    <strong>{workspace?.label ?? 'No workspace open'}</strong>
  </div>
  <div class="top-actions">
    <span class:active={receipt?.status === 'running'} class="session-state">
      {receipt?.status ?? 'local MVP'}
    </span>
    {#if workspace}
      <button class="quiet-button" type="button" disabled={resetting} onclick={resetWorkspace}>
        {resetting ? 'Resetting…' : 'Reset demo'}
      </button>
      <button class="quiet-button" type="button" onclick={clearSession}>Close</button>
    {/if}
  </div>
</header>

{#if !workspace}
  <main class="workspace-picker">
    <div class="intro">
      <p class="eyebrow">Governed frontend editing</p>
      <h1>Describe the change.<br />Watch it become real.</h1>
      <p class="lede">
        Chat with a multimodal coding agent inside one allowlisted project. Every action stays
        visible, bounded, and reviewable.
      </p>
    </div>
    <section class="picker-panel" aria-labelledby="workspace-heading">
      <div class="panel-heading">
        <div>
          <p class="eyebrow" id="workspace-heading">Available workspaces</p>
          <h2>Choose a project</h2>
        </div>
        <span>{data.workspaces.length} allowlisted</span>
      </div>
      {#each data.workspaces as availableWorkspace}
        <article class="workspace-card">
          <div class="workspace-monogram" aria-hidden="true">{availableWorkspace.label.slice(0, 1)}</div>
          <div class="workspace-copy">
            <h3>{availableWorkspace.label}</h3>
            <p>Git-backed · Workspace-write · Network off</p>
          </div>
          <button
            class="primary-button"
            type="button"
            disabled={opening}
            onclick={() => openWorkspace(availableWorkspace)}
          >
            {opening ? 'Opening…' : 'Open workspace'}
          </button>
        </article>
      {/each}
      {#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}
      <p class="trust-note">Operator pilot only. No deploy, publish, or credential authority.</p>
    </section>
  </main>
{:else}
  <main class="workspace-shell">
    <section class="rail chat-rail" aria-labelledby="chat-heading">
      <div class="rail-heading">
        <div>
          <p class="eyebrow">Intent</p>
          <h1 id="chat-heading">Edit with the agent</h1>
        </div>
        <span class="rail-number">01</span>
      </div>

      <div class="conversation" aria-live="polite">
        <div class="message agent-message">
          <p class="message-author">Workspace agent</p>
          <p>
            I can inspect and edit this frontend, run focused checks, and explain each action. Add
            a reference image when visual context matters.
          </p>
        </div>
        {#each userMessages as message}
          <div class="message user-message">
            <p class="message-author">You</p>
            <p>{message.text}</p>
            {#if message.imageName}<span class="attachment-chip">Image · {message.imageName}</span>{/if}
          </div>
        {/each}
        {#each events.filter((event) => event.type === 'agent.message') as message (message.sequence)}
          <div class="message agent-message">
            <p class="message-author">Workspace agent</p>
            <p>{message.message}</p>
          </div>
        {/each}
        {#if sending}
          <div class="thinking" aria-label="Agent is working"><i></i><i></i><i></i></div>
        {/if}
      </div>

      <form class="composer" onsubmit={(event) => { event.preventDefault(); void submitTurn(); }}>
        {#if attachment}
          <div class="selected-attachment">
            <span>Reference image</span>
            <strong>{attachment.name}</strong>
            <button type="button" aria-label="Remove reference image" onclick={() => { attachment = null; if (fileInput) fileInput.value = ''; }}>×</button>
          </div>
        {/if}
        <label class="sr-only" for="edit-request">Describe the frontend edit</label>
        <textarea
          id="edit-request"
          bind:value={promptText}
          rows="5"
          maxlength="12000"
          placeholder="Describe the frontend change you want to see…"
          disabled={sending}
        ></textarea>
        <div class="composer-actions">
          <label class="image-button" title="Attach a reference image">
            <input
              bind:this={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onchange={chooseAttachment}
            />
            <span aria-hidden="true">＋</span> Reference
          </label>
          <span class="policy-copy">PNG, JPEG, or WebP · 5 MB max</span>
          <button
            class="send-button"
            type="submit"
            disabled={sending || !promptText.trim()}
            aria-label="Send edit request"
          >
            {sending ? 'Working' : 'Send'} <span aria-hidden="true">↗</span>
          </button>
        </div>
        {#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}
      </form>
    </section>

    <section class="rail activity-rail" aria-labelledby="activity-heading">
      <div class="rail-heading">
        <div>
          <p class="eyebrow">Evidence</p>
          <h2 id="activity-heading">Activity + diff</h2>
        </div>
        <span class="rail-number">02</span>
      </div>

      <div class="activity-status" aria-live="polite">
        <span class:running={receipt?.status === 'running'} class="status-dot"></span>
        <p>{notice}</p>
      </div>

      {#each pendingWorkspaceApprovals(events) as approval (approval.sequence)}
        <article class="approval-card">
          <p class="eyebrow">Approval required</p>
          <h3>{approval.approvalKind === 'command' ? 'Run bounded command?' : 'Apply bounded file change?'}</h3>
          <p>{approval.message}</p>
          <div>
            <button type="button" class="approve-button" onclick={() => respondToApproval(approval.approvalId!, 'accept')}>Approve</button>
            <button type="button" class="decline-button" onclick={() => respondToApproval(approval.approvalId!, 'decline')}>Decline</button>
          </div>
        </article>
      {/each}

      <div class="activity-list">
        {#if events.length === 0}
          <p class="empty-copy">Agent actions, checks, and file changes will appear here in real time.</p>
        {/if}
        {#each [...events].reverse() as event (event.sequence)}
          <article class="activity-item">
            <span class:event-failed={event.status === 'failed'} class:event-pending={event.status === 'pending'} class="event-marker"></span>
            <div>
              <div class="event-meta">
                <span>{eventLabel(event.type)}</span>
                <time datetime={event.at}>{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
              <p>{event.message}</p>
            </div>
          </article>
        {/each}
      </div>

      <details class="diff-panel" open={Boolean(diff)}>
        <summary>
          <span>Workspace diff</span>
          <span>{diff ? 'Live' : 'No changes'}</span>
        </summary>
        {#if diff}<pre>{diff}</pre>{:else}<p>No source changes recorded yet.</p>{/if}
      </details>
    </section>

    <section class="rail preview-rail" aria-labelledby="preview-heading">
      <div class="rail-heading preview-heading-row">
        <div>
          <p class="eyebrow">Result</p>
          <h2 id="preview-heading">Live preview</h2>
        </div>
        <div class="preview-actions">
          <span class:ready={preview?.state === 'ready'} class="preview-state">{preview?.state ?? 'idle'}</span>
          <button class="icon-button" type="button" onclick={refreshArtifacts} aria-label="Refresh preview">↻</button>
          <span class="rail-number">03</span>
        </div>
      </div>
      <div class="browser-frame">
        <div class="browser-chrome" aria-hidden="true">
          <span></span><span></span><span></span>
          <p>{workspace.label.toLowerCase().replaceAll(' ', '-')}.preview</p>
        </div>
        {#if preview?.state === 'ready'}
          <iframe
            title={`${workspace.label} live preview`}
            src={`${preview.previewPath}?revision=${previewRevision}`}
          ></iframe>
        {:else}
          <div class="preview-placeholder" role="status">
            <span class="preview-glyph">◫</span>
            <h3>{preview?.state === 'blocked' || preview?.state === 'crashed' ? 'Preview unavailable' : 'Starting preview'}</h3>
            <p>{preview?.state === 'blocked' || preview?.state === 'crashed' ? 'Review the activity rail for the safe failure state.' : 'The allowlisted project is booting in its isolated process.'}</p>
          </div>
        {/if}
      </div>
      <footer class="preview-footer">
        <span>Auto-refreshes after source edits</span>
        <span>Network off · Local only</span>
      </footer>
    </section>
  </main>
{/if}

<style>
  :global(*) { box-sizing: border-box; }
  :global(button), :global(label) { -webkit-tap-highlight-color: transparent; }
  :global(button:focus-visible), :global(textarea:focus-visible), :global(input:focus-visible), :global(summary:focus-visible), :global(a:focus-visible) { outline: 3px solid var(--color-performance-signal); outline-offset: 3px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .topbar { height: 64px; display: grid; grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr); align-items: center; gap: 1rem; padding: 0 1.25rem; color: var(--color-performance-fg-primary); background: var(--color-performance-bg-elevated); border-bottom: 1px solid var(--color-performance-border-emphasis); }
  .brand { display: inline-flex; align-items: center; gap: .7rem; color: inherit; text-decoration: none; font-size: .72rem; font-weight: 750; letter-spacing: .12em; }
  .mark { width: 11px; height: 11px; display: block; background: var(--color-performance-pressure); transform: rotate(45deg); }
  .workspace-context { text-align: center; line-height: 1.15; }
  .workspace-context strong { display: block; margin-top: .2rem; font-size: .86rem; }
  .eyebrow { margin: 0; color: var(--color-performance-pressure); font-family: var(--font-performance-mono); font-size: .63rem; font-weight: var(--font-performance-bold); letter-spacing: var(--tracking-performance-wider); line-height: 1.2; text-transform: uppercase; }
  .workspace-context .eyebrow { color: var(--color-performance-fg-tertiary); font-size: .56rem; }
  .top-actions { justify-self: end; display: flex; align-items: center; gap: .6rem; }
  .session-state, .preview-state { padding: .3rem .55rem; color: var(--color-performance-fg-secondary); background: var(--color-performance-bg-subtle); border: 1px solid var(--color-performance-border-default); border-radius: var(--radius-performance-sm); font-family: var(--font-performance-mono); font-size: .62rem; font-weight: var(--font-performance-bold); letter-spacing: var(--tracking-performance-wide); text-transform: uppercase; }
  .session-state.active { color: var(--color-performance-review); background: var(--color-performance-review-soft); border-color: var(--color-performance-review); }
  .quiet-button { padding: .35rem .55rem; color: var(--color-performance-fg-secondary); background: transparent; border: 1px solid var(--color-performance-border-emphasis); border-radius: var(--radius-performance-sm); cursor: pointer; font-size: .7rem; }
  .workspace-picker { width: min(1180px, calc(100% - 2rem)); min-height: calc(100vh - 64px); display: grid; grid-template-columns: 1.25fr .75fr; align-items: center; gap: clamp(3rem, 7vw, 8rem); margin: 0 auto; padding: 4rem 0 7rem; }
  .intro h1 { max-width: 800px; margin: 1rem 0 1.5rem; font-family: var(--font-performance-display); font-size: var(--text-performance-display-xl); font-weight: var(--font-performance-medium); letter-spacing: var(--tracking-performance-display); line-height: var(--leading-performance-display); }
  .lede { max-width: 590px; margin: 0; color: var(--color-performance-muted); font-size: var(--text-performance-body-lg); line-height: var(--leading-performance-relaxed); }
  .picker-panel { padding: 1.1rem; background: var(--color-performance-panel); border: 1px solid var(--color-performance-line); box-shadow: var(--shadow-performance-panel); }
  .panel-heading { display: flex; align-items: flex-start; justify-content: space-between; padding: .5rem .4rem 1.2rem; border-bottom: 1px solid var(--color-performance-line); }
  .panel-heading h2 { margin: .35rem 0 0; font-size: var(--text-performance-h2); font-weight: var(--font-performance-medium); }
  .panel-heading > span { color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: .66rem; }
  .workspace-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .8rem; padding: 1rem .4rem; border-bottom: 1px solid var(--color-performance-line); }
  .workspace-monogram { width: 38px; height: 38px; display: grid; place-items: center; color: var(--color-performance-panel); background: var(--color-performance-signal); font-family: var(--font-performance-mono); border-radius: var(--radius-performance-sm); }
  .workspace-copy h3 { margin: 0; font-size: .88rem; }
  .workspace-copy p { margin: .25rem 0 0; color: var(--color-performance-muted); font-size: .66rem; }
  .primary-button, .send-button, .approve-button { color: var(--color-performance-panel); background: var(--color-performance-ink); border: 1px solid var(--color-performance-ink); cursor: pointer; }
  .primary-button { padding: .65rem .75rem; border-radius: var(--radius-performance-sm); font-size: .69rem; font-weight: var(--font-performance-bold); }
  button:disabled { cursor: not-allowed; opacity: .48; }
  .trust-note { margin: 1rem .4rem .2rem; color: var(--color-performance-muted); font-size: .62rem; }
  .workspace-shell { height: calc(100vh - 64px); display: grid; grid-template-columns: minmax(310px, .82fr) minmax(290px, .72fr) minmax(480px, 1.46fr); overflow: hidden; }
  .rail { min-width: 0; display: flex; flex-direction: column; border-right: 1px solid var(--color-performance-line); background: var(--color-performance-paper); }
  .rail:last-child { border-right: 0; }
  .rail-heading { min-height: 83px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.1rem; border-bottom: 1px solid var(--color-performance-line); }
  .rail-heading h1, .rail-heading h2 { margin: .35rem 0 0; font-size: var(--text-performance-h3); font-weight: var(--font-performance-medium); }
  .rail-number { color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: .75rem; }
  .conversation { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; padding: 1.2rem 1.1rem; }
  .message { max-width: 92%; padding: .85rem .9rem; border: 1px solid var(--color-performance-line); }
  .message p { margin: 0; font-size: .78rem; line-height: 1.55; white-space: pre-wrap; }
  .message .message-author { margin-bottom: .45rem; color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: .57rem; font-weight: var(--font-performance-bold); letter-spacing: var(--tracking-performance-wider); text-transform: uppercase; }
  .agent-message { align-self: flex-start; background: var(--color-performance-panel); border-radius: var(--radius-performance-md); }
  .user-message { align-self: flex-end; color: var(--color-performance-fg-primary); background: var(--color-performance-bg-elevated); border-color: var(--color-performance-bg-elevated); border-radius: var(--radius-performance-md); }
  .user-message .message-author { color: var(--color-performance-fg-tertiary); }
  .attachment-chip { display: inline-block; max-width: 100%; margin-top: .6rem; padding: .3rem .45rem; overflow: hidden; color: var(--color-performance-fg-secondary); background: var(--color-performance-bg-subtle); border-radius: var(--radius-performance-sm); font-size: .6rem; text-overflow: ellipsis; white-space: nowrap; }
  .thinking { display: flex; gap: .25rem; padding: .35rem 0; }
  .thinking i { width: 5px; height: 5px; background: var(--color-performance-signal); border-radius: 50%; animation: pulse 1.2s infinite ease-in-out; }
  .thinking i:nth-child(2) { animation-delay: .15s; } .thinking i:nth-child(3) { animation-delay: .3s; }
  @keyframes pulse { 0%, 70%, 100% { opacity: .3; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-3px); } }
  .composer { margin: .8rem; background: var(--color-performance-panel); border: 1px solid var(--color-performance-line); box-shadow: var(--shadow-performance-panel); }
  .composer textarea { width: 100%; min-height: 92px; display: block; resize: vertical; padding: .85rem; color: var(--color-performance-ink); background: transparent; border: 0; font-size: .78rem; line-height: 1.5; }
  .composer textarea:focus { outline: 0; }
  .composer-actions { display: flex; align-items: center; gap: .55rem; padding: .55rem; border-top: 1px solid var(--color-performance-line); }
  .image-button { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .48rem; color: var(--color-performance-ink); background: var(--color-performance-paper); border: 1px solid var(--color-performance-line); border-radius: var(--radius-performance-sm); cursor: pointer; font-size: .64rem; font-weight: var(--font-performance-bold); }
  .image-button input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .policy-copy { flex: 1; color: var(--color-performance-muted); font-size: .56rem; }
  .send-button { display: inline-flex; align-items: center; gap: .35rem; padding: .47rem .62rem; border-radius: var(--radius-performance-sm); font-size: .66rem; font-weight: var(--font-performance-bold); }
  .selected-attachment { display: grid; grid-template-columns: 1fr auto; gap: .2rem .7rem; padding: .55rem .75rem; color: var(--color-performance-ink); background: var(--color-performance-signal-soft); border-bottom: 1px solid var(--color-performance-line); font-size: .62rem; }
  .selected-attachment span { color: var(--color-performance-muted); }
  .selected-attachment strong { grid-row: 2; overflow: hidden; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
  .selected-attachment button { grid-column: 2; grid-row: 1 / 3; color: var(--color-performance-muted); background: transparent; border: 0; cursor: pointer; font-size: 1rem; }
  .error-note { margin: .6rem; color: var(--color-performance-risk); font-size: .67rem; line-height: 1.4; }
  .activity-rail { background: var(--color-performance-court); }
  .activity-status { display: flex; align-items: flex-start; gap: .55rem; padding: .75rem 1rem; border-bottom: 1px solid var(--color-performance-line); }
  .activity-status p { margin: 0; color: var(--color-performance-muted); font-size: .67rem; line-height: 1.4; }
  .status-dot { width: 7px; height: 7px; flex: 0 0 auto; margin-top: .14rem; background: var(--color-performance-ready); border-radius: 50%; }
  .status-dot.running { background: var(--color-performance-review); box-shadow: 0 0 0 4px var(--color-performance-review-soft); }
  .approval-card { margin: .8rem .8rem 0; padding: .85rem; background: var(--color-performance-review-soft); border: 1px solid var(--color-performance-review); border-left-width: 4px; }
  .approval-card h3 { margin: .45rem 0; font-size: .78rem; }
  .approval-card > p:not(.eyebrow) { margin: 0 0 .75rem; color: var(--color-performance-ink-soft); font-size: .66rem; line-height: 1.4; }
  .approval-card div { display: flex; gap: .4rem; }
  .approve-button, .decline-button { padding: .4rem .55rem; border-radius: var(--radius-performance-sm); font-size: .62rem; font-weight: var(--font-performance-bold); }
  .decline-button { color: var(--color-performance-risk); background: transparent; border: 1px solid var(--color-performance-risk); cursor: pointer; }
  .activity-list { flex: 1; min-height: 0; overflow-y: auto; padding: .25rem .8rem .8rem; }
  .empty-copy { margin: 1rem .2rem; color: var(--color-performance-muted); font-size: .7rem; line-height: 1.5; }
  .activity-item { display: grid; grid-template-columns: auto 1fr; gap: .6rem; padding: .75rem .25rem; border-bottom: 1px solid var(--color-performance-line); }
  .event-marker { width: 7px; height: 7px; margin-top: .25rem; background: var(--color-performance-ready); border-radius: 50%; }
  .event-marker.event-failed { background: var(--color-performance-stop); } .event-marker.event-pending { background: var(--color-performance-review); }
  .event-meta { display: flex; justify-content: space-between; gap: .5rem; color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: .55rem; font-weight: var(--font-performance-bold); letter-spacing: var(--tracking-performance-wide); text-transform: uppercase; }
  .event-meta time { font-weight: 500; letter-spacing: 0; }
  .activity-item p { margin: .3rem 0 0; color: var(--color-performance-ink-soft); font-size: .66rem; line-height: 1.45; white-space: pre-wrap; }
  .diff-panel { max-height: 34%; overflow: auto; color: var(--color-performance-fg-secondary); background: var(--color-performance-bg-elevated); border-top: 1px solid var(--color-performance-border-emphasis); }
  .diff-panel summary { display: flex; justify-content: space-between; padding: .7rem .8rem; cursor: pointer; font-size: .62rem; font-weight: 730; list-style: none; }
  .diff-panel summary span:last-child { color: var(--color-performance-fg-tertiary); font-weight: 520; }
  .diff-panel pre { margin: 0; padding: .2rem .8rem 1rem; overflow: auto; font-family: var(--font-performance-code); font-size: .57rem; line-height: 1.55; white-space: pre; }
  .diff-panel > p { margin: 0; padding: .2rem .8rem 1rem; color: var(--color-performance-fg-tertiary); font-size: .62rem; }
  .preview-rail { padding: 0; background: var(--color-performance-court); }
  .preview-heading-row { background: var(--color-performance-paper); }
  .preview-actions { display: flex; align-items: center; gap: .55rem; }
  .preview-state { color: var(--color-performance-muted); background: var(--color-performance-paper); border-color: var(--color-performance-line); }
  .preview-state.ready { color: var(--color-performance-ready); background: var(--color-performance-ready-soft); border-color: var(--color-performance-ready); }
  .icon-button { width: 28px; height: 28px; display: grid; place-items: center; color: var(--color-performance-ink); background: var(--color-performance-panel); border: 1px solid var(--color-performance-line-strong); border-radius: var(--radius-performance-sm); cursor: pointer; }
  .browser-frame { flex: 1; min-height: 0; margin: 1rem 1rem .65rem; overflow: hidden; background: var(--color-performance-panel); border: 1px solid var(--color-performance-line-strong); box-shadow: var(--shadow-performance-panel); }
  .browser-chrome { height: 36px; display: flex; align-items: center; gap: .3rem; padding: 0 .7rem; background: var(--color-performance-paper); border-bottom: 1px solid var(--color-performance-line); }
  .browser-chrome > span { width: 7px; height: 7px; background: var(--color-performance-line-strong); border-radius: 50%; }
  .browser-chrome > span:first-child { background: var(--color-performance-pressure); }
  .browser-chrome p { flex: 1; margin: 0 3.4rem 0 1rem; padding: .25rem .6rem; color: var(--color-performance-muted); background: var(--color-performance-panel); border: 1px solid var(--color-performance-line); border-radius: var(--radius-performance-sm); font-family: var(--font-performance-mono); font-size: .55rem; text-align: center; }
  iframe { width: 100%; height: calc(100% - 36px); display: block; background: var(--color-performance-panel); border: 0; }
  .preview-placeholder { height: calc(100% - 36px); display: grid; place-items: center; align-content: center; padding: 2rem; color: var(--color-performance-muted); text-align: center; }
  .preview-glyph { color: var(--color-performance-signal); font-size: 2rem; }
  .preview-placeholder h3 { margin: .8rem 0 .3rem; font-weight: var(--font-performance-medium); }
  .preview-placeholder p { max-width: 320px; margin: 0; font-size: .7rem; line-height: 1.5; }
  .preview-footer { display: flex; justify-content: space-between; padding: 0 1rem .8rem; color: var(--color-performance-muted); font-family: var(--font-performance-mono); font-size: .57rem; }

  @media (max-width: 1100px) {
    .workspace-shell { grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr); overflow-y: auto; }
    .preview-rail { grid-column: 1 / -1; min-height: 68vh; border-top: 1px solid var(--color-performance-line); }
    .chat-rail, .activity-rail { min-height: calc(100vh - 64px); }
  }
  @media (max-width: 720px) {
    .topbar { grid-template-columns: 1fr auto; padding: 0 .8rem; }
    .workspace-context { display: none; }
    .workspace-picker { grid-template-columns: 1fr; align-content: center; gap: 3rem; padding: 3rem 0 5rem; }
    .intro h1 { font-size: clamp(3.1rem, 15vw, 5.2rem); }
    .workspace-shell { height: auto; display: block; overflow: visible; }
    .rail { min-height: auto; border-right: 0; border-bottom: 1px solid var(--color-performance-line); }
    .chat-rail { height: calc(100vh - 64px); }
    .activity-rail { min-height: 78vh; height: 88vh; }
    .preview-rail { min-height: 72vh; height: 78vh; }
    .workspace-card { grid-template-columns: auto 1fr; }
    .workspace-card .primary-button { grid-column: 1 / -1; }
    .policy-copy { display: none; }
  }
</style>
