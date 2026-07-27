<script lang="ts">
  import { onMount } from 'svelte';
  import { encodeBrowserMultipart } from '$lib/client/browser-upload.js';
  import {
    eventWorkState,
    mergeWorkspaceEvents,
    pendingWorkspaceApprovals,
    previewWorkState,
    sessionWorkState,
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
    active: boolean;
    receipt: SessionReceipt;
    preview: PreviewStatus;
  };
  type CodexStatus = PageData['codex'];
  type DeliveryUpdatePlan = {
    planId: string;
    workspaceId: string;
    fromVersion: string;
    toVersion: string;
    added: string[];
    changed: string[];
    removed: string[];
    conflicts: string[];
    preservedClientPaths: string[];
  };

  let { data }: { data: PageData } = $props();
  let importedWorkspaces = $state<Workspace[]>([]);
  let availableWorkspaces = $derived([...data.workspaces, ...importedWorkspaces]);
  let codexStatus = $derived<CodexStatus>(data.codex);
  let workspace = $state<Workspace | null>(null);
  let sessionActive = $state(false);
  let receipt = $state<SessionReceipt | null>(null);
  let events = $state<BrowserWorkspaceEvent[]>([]);
  let preview = $state<PreviewStatus | null>(null);
  let previewRevision = $state(0);
  let diff = $state('');
  let promptText = $state('');
  let attachment = $state<File | null>(null);
  let deliveryPackage = $state<File | null>(null);
  let userMessages = $state<Array<{ text: string; imageName?: string }>>([]);
  let restoring = $state(true);
  let opening = $state(false);
  let resetting = $state(false);
  let closing = $state(false);
  let importing = $state(false);
  let checkingCodex = $state(false);
  let sending = $state(false);
  let notice = $state('Choose an allowlisted workspace to begin.');
  let errorMessage = $state('');
  let fileInput = $state<HTMLInputElement>();
  let deliveryInput = $state<HTMLInputElement>();
  let updateInput = $state<HTMLInputElement>();
  let updatePackage = $state<File | null>(null);
  let updatePlan = $state<DeliveryUpdatePlan | null>(null);
  let lifecycleBusy = $state(false);
  let checkpointId = $state<string | null>(null);
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
    session_resume_failed:
      'The prior Codex conversation could not resume safely. Open a new workspace to start a new conversation.',
    workspace_not_found: 'That workspace is not available.',
    preview_timeout: 'The preview did not become ready in time.',
    preview_crashed: 'The preview process stopped unexpectedly.',
    workspace_request_failed: 'The workspace could not complete that request.',
    workspace_integrity_failed:
      'A file outside the delivered edit boundary changed. Review the policy warning before continuing.',
    package_untrusted:
      'This delivery did not match the trusted CREATE SOMETHING signature or file hashes.',
    release_not_ready: 'This delivery is signed, but its Build release evidence is not ready.',
    workspace_exists: 'That delivered workspace is already installed.',
    workspace_invalid: 'The delivered workspace is missing required source or preview files.',
    delivery_import_unavailable: 'The app delivery trust root is unavailable.',
    invalid_package: 'Choose a valid .csworkspace file no larger than 25 MB.',
    issuer_mismatch: 'This delivery was signed by an untrusted issuer.',
    key_revoked: 'This delivery uses a revoked signing key.',
    key_unknown: 'This delivery signing key is not in the managed trust keyring.',
    package_expired: 'This delivery package has expired. Request a current release.',
    minimum_app_version_unmet: 'Update the Client Workspace app before installing this delivery.',
    update_conflict: 'The update overlaps client changes. Review the listed conflicts.',
    update_not_newer: 'Choose a delivery release newer than the installed version.',
    update_plan_stale: 'The workspace changed after preview. Preview the update again.',
    rollback_unavailable: 'No prior delivery release is available to restore.',
    checkpoint_not_found: 'That checkpoint is no longer available.'
  };

  onMount(() => {
    const storedSession = localStorage.getItem(sessionStorageKey);
    if (storedSession) {
      void restoreSession(storedSession).finally(() => {
        restoring = false;
      });
    } else {
      restoring = false;
    }
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
    if (codexStatus.state !== 'ready') {
      errorMessage = 'Install and sign in to Codex before opening an agent workspace.';
      notice = 'Codex needs attention.';
      return;
    }
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

  async function importDelivery() {
    const delivery = deliveryPackage;
    if (!delivery || importing) return;
    importing = true;
    errorMessage = '';
    notice = 'Verifying the signed delivery and Build release evidence…';
    try {
      const upload = encodeBrowserMultipart([['delivery', delivery]]);
      const result = await readJson<{ workspace: Workspace }>(
        await fetch('/api/deliveries', {
          method: 'POST',
          headers: { 'content-type': upload.contentType },
          body: upload.body
        })
      );
      importedWorkspaces = [...importedWorkspaces, result.workspace].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
      deliveryPackage = null;
      if (deliveryInput) deliveryInput.value = '';
      notice = `${result.workspace.label} verified and installed locally.`;
    } catch (error) {
      showError(error);
    } finally {
      importing = false;
    }
  }

  function codexSummary(status: CodexStatus): string {
    if (status.state === 'ready') return `Codex ${status.version} · ${status.authMode}`;
    if (status.state === 'outdated') return `Codex ${status.version} · Update required`;
    if (status.state === 'unauthenticated') return `Codex ${status.version} · Sign in required`;
    if (status.state === 'missing') return 'Codex not found';
    return 'Codex unavailable';
  }

  async function refreshCodexStatus() {
    if (checkingCodex) return;
    checkingCodex = true;
    errorMessage = '';
    try {
      codexStatus = await readJson<CodexStatus>(await fetch('/api/runtime/codex'));
      notice =
        codexStatus.state === 'ready'
          ? 'Codex is ready. Choose a verified workspace.'
          : 'Codex still needs attention.';
    } catch (error) {
      showError(error);
    } finally {
      checkingCodex = false;
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
      notice = result.active
        ? `Restored ${result.receipt.status} session.`
        : `Restored ${result.receipt.status} receipt in read-only mode. Close it to start a new session.`;
    } catch (error) {
      localStorage.removeItem(sessionStorageKey);
      showError(error);
    } finally {
      opening = false;
    }
  }

  function applySession(result: SessionResponse) {
    workspace = result.workspace;
    sessionActive = result.active;
    receipt = result.receipt;
    events = mergeWorkspaceEvents([], result.receipt.events);
    preview = result.preview;
    if (result.active) connectEvents(result.receipt.sessionId);
    else {
      eventSource?.close();
      eventSource = null;
    }
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
            event.type === 'session.closed'
              ? 'closed'
              : event.type === 'turn.completed'
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
      if (
        event.type === 'session.closed' ||
        event.type === 'turn.completed' ||
        event.type === 'turn.failed'
      ) {
        sending = false;
      }
    };
    eventSource.onerror = () => {
      notice = 'Live activity paused. The saved receipt remains available.';
    };
  }

  async function submitTurn() {
    if (!receipt || !sessionActive || !promptText.trim() || sending) return;
    const submittedText = promptText.trim();
    const submittedImage = attachment?.name;
    sending = true;
    errorMessage = '';
    notice = 'Sending the bounded edit request…';
    try {
      const upload = encodeBrowserMultipart([
        ['text', submittedText],
        ...(attachment ? ([['image', attachment]] as const) : [])
      ]);
      await readJson<{ turnId: string }>(
        await fetch(`/api/sessions/${encodeURIComponent(receipt.sessionId)}/turns`, {
          method: 'POST',
          headers: { 'content-type': upload.contentType },
          body: upload.body
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

  function chooseDelivery(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    deliveryPackage = input.files?.[0] ?? null;
    errorMessage = '';
  }

  function chooseUpdate(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    updatePackage = input.files?.[0] ?? null;
    updatePlan = null;
    errorMessage = '';
  }

  async function previewUpdate() {
    if (!updatePackage || lifecycleBusy) return;
    lifecycleBusy = true;
    errorMessage = '';
    notice = 'Verifying and comparing the signed update…';
    try {
      const upload = encodeBrowserMultipart([['delivery', updatePackage]]);
      const result = await readJson<{ plan: DeliveryUpdatePlan }>(
        await fetch('/api/deliveries/updates', {
          method: 'POST',
          headers: { 'content-type': upload.contentType },
          body: upload.body
        })
      );
      updatePlan = result.plan;
      notice = result.plan.conflicts.length
        ? 'Update preview found client conflicts. Nothing was changed.'
        : 'Update verified. Review its impact before applying.';
    } catch (error) {
      showError(error);
    } finally {
      lifecycleBusy = false;
    }
  }

  async function applyUpdate() {
    if (!updatePlan || updatePlan.conflicts.length || lifecycleBusy) return;
    lifecycleBusy = true;
    errorMessage = '';
    try {
      await readJson<{ plan: DeliveryUpdatePlan }>(
        await fetch(`/api/deliveries/updates/${encodeURIComponent(updatePlan.planId)}/apply`, {
          method: 'POST'
        })
      );
      clearSession();
      updatePackage = null;
      updatePlan = null;
      if (updateInput) updateInput.value = '';
      notice = 'Update applied with client changes preserved. Reopen the workspace to continue.';
    } catch (error) {
      showError(error);
    } finally {
      lifecycleBusy = false;
    }
  }

  async function createCheckpoint() {
    if (!workspace || lifecycleBusy) return;
    lifecycleBusy = true;
    errorMessage = '';
    try {
      const result = await readJson<{ checkpointId: string }>(
        await fetch(`/api/workspaces/${encodeURIComponent(workspace.id)}/checkpoints`, {
          method: 'POST'
        })
      );
      checkpointId = result.checkpointId;
      notice = 'Checkpoint saved. Future changes can be undone to this state.';
    } catch (error) {
      showError(error);
    } finally {
      lifecycleBusy = false;
    }
  }

  async function undoCheckpoint() {
    if (!workspace || !checkpointId || lifecycleBusy) return;
    lifecycleBusy = true;
    errorMessage = '';
    try {
      await readJson<{ restored: boolean }>(
        await fetch(
          `/api/workspaces/${encodeURIComponent(workspace.id)}/checkpoints/${encodeURIComponent(checkpointId)}/undo`,
          { method: 'POST' }
        )
      );
      clearSession();
      notice = 'Checkpoint restored. Reopen the workspace to continue.';
    } catch (error) {
      showError(error);
    } finally {
      lifecycleBusy = false;
    }
  }

  async function rollbackDelivery() {
    if (!workspace || lifecycleBusy) return;
    lifecycleBusy = true;
    errorMessage = '';
    try {
      await readJson<{ rolledBack: boolean }>(
        await fetch(`/api/workspaces/${encodeURIComponent(workspace.id)}/rollback`, {
          method: 'POST'
        })
      );
      clearSession();
      notice = 'Previous delivery and client changes restored. Reopen the workspace to continue.';
    } catch (error) {
      showError(error);
    } finally {
      lifecycleBusy = false;
    }
  }

  async function respondToApproval(approvalId: string, decision: 'accept' | 'decline') {
    if (!receipt || !sessionActive) return;
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

  async function closeWorkspace() {
    if (!receipt || closing) return;
    if (!sessionActive) {
      clearSession();
      notice = 'Saved receipt closed. Open the workspace to start a new governed session.';
      return;
    }
    const closingSessionId = receipt.sessionId;
    closing = true;
    errorMessage = '';
    notice = 'Saving the workspace receipt and releasing its sandbox…';
    eventSource?.close();
    eventSource = null;
    try {
      await readJson<{ ok: boolean }>(
        await fetch(`/api/sessions/${encodeURIComponent(closingSessionId)}/close`, {
          method: 'POST'
        })
      );
      clearSession();
      notice = 'Workspace closed and sandbox released.';
    } catch (error) {
      connectEvents(closingSessionId);
      showError(error);
    } finally {
      closing = false;
    }
  }

  function clearSession() {
    eventSource?.close();
    eventSource = null;
    localStorage.removeItem(sessionStorageKey);
    workspace = null;
    sessionActive = false;
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
  <link
    rel="icon"
    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='11' fill='%23d86f4d'/%3E%3C/svg%3E"
  />
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
    <span
      class="session-state"
      data-work-state={sessionWorkState(
        restoring || opening ? 'opening' : (receipt?.status ?? null),
        pendingWorkspaceApprovals(events).length > 0
      )}
    >
      {restoring
        ? 'restoring'
        : receipt && !sessionActive
          ? 'receipt'
          : (receipt?.status ?? codexStatus.state)}
    </span>
    {#if workspace}
      {#if !data.desktop}
        <button class="quiet-button" type="button" disabled={resetting} onclick={resetWorkspace}>
          {resetting ? 'Resetting…' : 'Reset demo'}
        </button>
      {/if}
      <button class="quiet-button" type="button" disabled={closing} onclick={closeWorkspace}>
        {closing ? 'Closing…' : sessionActive ? 'Close' : 'Close receipt'}
      </button>
    {/if}
  </div>
</header>

{#if restoring}
  <main class="workspace-restoring" data-work-state="planning" aria-live="polite" aria-busy="true">
    <span class="restoring-mark" aria-hidden="true"></span>
    <p class="eyebrow">Receipt readback</p>
    <h1>Restoring your workspace.</h1>
    <p>The saved activity, focused diff, and owned preview are being reconnected.</p>
  </main>
{:else if !workspace}
  <main class="workspace-picker">
    <div class="intro">
      <p class="eyebrow">Client-owned Codex workspace</p>
      <h1>Your delivery.<br />Your Codex. Local control.</h1>
      <p class="lede">
        Import a verified CREATE SOMETHING delivery, then manage it with your authenticated Codex.
        Every action stays visible, bounded, local, and reviewable.
      </p>
      <div
        class="runtime-card"
        data-work-state={codexStatus.state === 'ready' ? 'success' : 'warning'}
      >
        <span class="status-dot"></span>
        <div>
          <p class="eyebrow">Your Codex</p>
          <strong>{codexSummary(codexStatus)}</strong>
          <small>The app never reads or copies Codex credentials.</small>
        </div>
        <button
          class="quiet-button runtime-recheck"
          type="button"
          disabled={checkingCodex}
          aria-busy={checkingCodex}
          onclick={refreshCodexStatus}>Recheck Codex</button
        >
      </div>
      <form
        class="delivery-import"
        onsubmit={(event) => {
          event.preventDefault();
          void importDelivery();
        }}
      >
        <label for="delivery-package">Verified delivery</label>
        <input
          bind:this={deliveryInput}
          id="delivery-package"
          type="file"
          accept=".csworkspace,application/json"
          onchange={chooseDelivery}
        />
        <button class="primary-button" type="submit" disabled={importing || !deliveryPackage}>
          {importing ? 'Verifying…' : 'Import .csworkspace'}
        </button>
      </form>
    </div>
    <section class="picker-panel" aria-labelledby="workspace-heading">
      <div class="panel-heading">
        <div>
          <p class="eyebrow" id="workspace-heading">Available workspaces</p>
          <h2>Choose a project</h2>
        </div>
        <span>{availableWorkspaces.length} verified</span>
      </div>
      {#if availableWorkspaces.length === 0}
        <p class="empty-copy">Import the signed delivery supplied by CREATE SOMETHING to begin.</p>
      {/if}
      {#each availableWorkspaces as availableWorkspace}
        <article class="workspace-card">
          <div class="workspace-monogram" aria-hidden="true">
            {availableWorkspace.label.slice(0, 1)}
          </div>
          <div class="workspace-copy">
            <h3>{availableWorkspace.label}</h3>
            <p>Signed delivery · Workspace-write · Network off</p>
          </div>
          <button
            class="primary-button"
            type="button"
            disabled={opening || codexStatus.state !== 'ready'}
            onclick={() => openWorkspace(availableWorkspace)}
          >
            {opening ? 'Opening…' : 'Open workspace'}
          </button>
        </article>
      {/each}
      {#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}
      <p class="trust-note">
        Local authority only. No deploy, publish, credential, or third-party mutation access.
      </p>
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
            I can inspect and edit this frontend, run focused checks, and explain each action. Add a
            reference image when visual context matters.
          </p>
        </div>
        {#each userMessages as message}
          <div class="message user-message">
            <p class="message-author">You</p>
            <p>{message.text}</p>
            {#if message.imageName}<span class="attachment-chip">Image · {message.imageName}</span
              >{/if}
          </div>
        {/each}
        {#each events.filter((event) => event.type === 'agent.message') as message (message.sequence)}
          <div class="message agent-message">
            <p class="message-author">Workspace agent</p>
            <p>{message.message}</p>
          </div>
        {/each}
        {#if sending}
          <div class="thinking" data-work-state="running" aria-label="Agent is working">
            <i></i><i></i><i></i>
          </div>
        {/if}
      </div>

      <form
        class="composer"
        onsubmit={(event) => {
          event.preventDefault();
          void submitTurn();
        }}
      >
        {#if attachment}
          <div class="selected-attachment">
            <span>Reference image</span>
            <strong>{attachment.name}</strong>
            <button
              type="button"
              aria-label="Remove reference image"
              onclick={() => {
                attachment = null;
                if (fileInput) fileInput.value = '';
              }}>×</button
            >
          </div>
        {/if}
        <label class="sr-only" for="edit-request">Describe the frontend edit</label>
        <textarea
          id="edit-request"
          bind:value={promptText}
          rows="5"
          maxlength="12000"
          placeholder="Describe the frontend change you want to see…"
          disabled={sending || !sessionActive}
        ></textarea>
        <div class="composer-actions">
          <label class="image-button" title="Attach a reference image">
            <input
              bind:this={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!sessionActive}
              onchange={chooseAttachment}
            />
            <span aria-hidden="true">＋</span> Reference
          </label>
          <span class="policy-copy">PNG, JPEG, or WebP · 5 MB max</span>
          <button
            class="send-button"
            type="submit"
            disabled={sending || !sessionActive || !promptText.trim()}
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

      <div
        class="activity-status"
        data-work-state={sessionWorkState(
          restoring || opening ? 'opening' : (receipt?.status ?? null),
          pendingWorkspaceApprovals(events).length > 0
        )}
        aria-live="polite"
      >
        <span class="status-dot"></span>
        <p>{notice}</p>
      </div>

      {#each sessionActive ? pendingWorkspaceApprovals(events) : [] as approval (approval.sequence)}
        <article class="approval-card" data-work-state="approval">
          <p class="eyebrow">Approval required</p>
          <h3>
            {approval.approvalKind === 'command'
              ? 'Run bounded command?'
              : 'Apply bounded file change?'}
          </h3>
          <p>{approval.message}</p>
          <dl class="approval-context">
            {#if approval.paths?.length}
              <div>
                <dt>Affects</dt>
                <dd>{approval.paths.join(', ')}</dd>
              </div>
            {/if}
            {#if approval.reason}
              <div>
                <dt>Reason</dt>
                <dd>{approval.reason}</dd>
              </div>
            {/if}
            {#if approval.scope}
              <div>
                <dt>Scope</dt>
                <dd>{approval.scope}</dd>
              </div>
            {/if}
          </dl>
          <div>
            <button
              type="button"
              class="approve-button"
              onclick={() => respondToApproval(approval.approvalId!, 'accept')}>Approve</button
            >
            <button
              type="button"
              class="decline-button"
              onclick={() => respondToApproval(approval.approvalId!, 'decline')}>Decline</button
            >
          </div>
        </article>
      {/each}

      <div class="activity-list">
        {#if events.length === 0}
          <p class="empty-copy">
            Agent actions, checks, and file changes will appear here in real time.
          </p>
        {/if}
        {#each [...events].reverse() as event (event.sequence)}
          <article class="activity-item">
            <span class="event-marker" data-work-state={eventWorkState(event)}></span>
            <div>
              <div class="event-meta">
                <span>{eventLabel(event.type)}</span>
                <time datetime={event.at}
                  >{new Date(event.at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</time
                >
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
      <details class="delivery-lifecycle">
        <summary>Delivery controls</summary>
        <div class="lifecycle-actions">
          <button
            type="button"
            class="quiet-button"
            disabled={lifecycleBusy}
            onclick={createCheckpoint}
          >
            Save checkpoint
          </button>
          <button
            type="button"
            class="quiet-button"
            disabled={lifecycleBusy || !checkpointId}
            onclick={undoCheckpoint}
          >
            Undo to checkpoint
          </button>
          <button
            type="button"
            class="quiet-button"
            disabled={lifecycleBusy}
            onclick={rollbackDelivery}
          >
            Roll back delivery
          </button>
          {#if receipt}
            <a
              class="quiet-button receipt-link"
              href={`/api/sessions/${encodeURIComponent(receipt.sessionId)}/receipt`}
              download
            >
              Export receipt
            </a>
          {/if}
        </div>
        <label class="update-picker">
          <span>Signed update package</span>
          <input
            bind:this={updateInput}
            type="file"
            accept=".csworkspace,application/json"
            onchange={chooseUpdate}
          />
        </label>
        <button
          class="primary-button"
          type="button"
          disabled={lifecycleBusy || !updatePackage}
          onclick={previewUpdate}
        >
          Preview update
        </button>
        {#if updatePlan}
          <article
            class="update-plan"
            data-work-state={updatePlan.conflicts.length ? 'warning' : 'success'}
          >
            <h3>{updatePlan.fromVersion} → {updatePlan.toVersion}</h3>
            <p>
              {updatePlan.added.length} added · {updatePlan.changed.length} changed · {updatePlan
                .removed.length} removed
            </p>
            {#if updatePlan.preservedClientPaths.length}
              <p>
                <strong>Preserved client work</strong>
                {updatePlan.preservedClientPaths.join(', ')}
              </p>
            {/if}
            {#if updatePlan.conflicts.length}
              <p><strong>Conflicts</strong> {updatePlan.conflicts.join(', ')}</p>
            {/if}
            <button
              class="approve-button"
              type="button"
              disabled={lifecycleBusy || updatePlan.conflicts.length > 0}
              onclick={applyUpdate}
            >
              Apply verified update
            </button>
          </article>
        {/if}
      </details>
    </section>

    <section class="rail preview-rail" aria-labelledby="preview-heading">
      <div class="rail-heading preview-heading-row">
        <div>
          <p class="eyebrow">Result</p>
          <h2 id="preview-heading">Live preview</h2>
        </div>
        <div class="preview-actions">
          <span class="preview-state" data-work-state={previewWorkState(preview?.state ?? null)}
            >{preview?.state ?? 'idle'}</span
          >
          <button
            class="icon-button"
            type="button"
            onclick={refreshArtifacts}
            aria-label="Refresh preview">↻</button
          >
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
            sandbox={data.desktop ? 'allow-same-origin' : 'allow-scripts allow-same-origin'}
          ></iframe>
        {:else}
          <div
            class="preview-placeholder"
            data-work-state={previewWorkState(preview?.state ?? null)}
            role="status"
          >
            <span class="preview-glyph">◫</span>
            <h3>
              {preview?.state === 'blocked' || preview?.state === 'crashed'
                ? 'Preview unavailable'
                : 'Starting preview'}
            </h3>
            <p>
              {preview?.state === 'blocked' || preview?.state === 'crashed'
                ? 'Review the activity rail for the safe failure state.'
                : 'The allowlisted project is booting in its isolated process.'}
            </p>
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
  :global(*) {
    box-sizing: border-box;
  }
  :global(button),
  :global(label) {
    -webkit-tap-highlight-color: transparent;
  }
  :global(button:focus-visible),
  :global(textarea:focus-visible),
  :global(input:focus-visible),
  :global(summary:focus-visible),
  :global(a:focus-visible) {
    outline: 3px solid var(--color-performance-signal);
    outline-offset: 3px;
  }
  [data-work-state] {
    --workspace-state-text: var(--color-performance-work-idle-text);
    --workspace-state-background: var(--color-performance-work-idle-background);
    --workspace-state-border: var(--color-performance-work-idle-border);
  }
  [data-work-state='planning'] {
    --workspace-state-text: var(--color-performance-work-planning-text);
    --workspace-state-background: var(--color-performance-work-planning-background);
    --workspace-state-border: var(--color-performance-work-planning-border);
  }
  [data-work-state='running'] {
    --workspace-state-text: var(--color-performance-work-running-text);
    --workspace-state-background: var(--color-performance-work-running-background);
    --workspace-state-border: var(--color-performance-work-running-border);
  }
  [data-work-state='approval'] {
    --workspace-state-text: var(--color-performance-work-approval-text);
    --workspace-state-background: var(--color-performance-work-approval-background);
    --workspace-state-border: var(--color-performance-work-approval-border);
  }
  [data-work-state='success'] {
    --workspace-state-text: var(--color-performance-work-success-text);
    --workspace-state-background: var(--color-performance-work-success-background);
    --workspace-state-border: var(--color-performance-work-success-border);
  }
  [data-work-state='warning'] {
    --workspace-state-text: var(--color-performance-work-warning-text);
    --workspace-state-background: var(--color-performance-work-warning-background);
    --workspace-state-border: var(--color-performance-work-warning-border);
  }
  [data-work-state='failure'] {
    --workspace-state-text: var(--color-performance-work-failure-text);
    --workspace-state-background: var(--color-performance-work-failure-background);
    --workspace-state-border: var(--color-performance-work-failure-border);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .topbar {
    min-width: 0;
    height: 64px;
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
    align-items: center;
    gap: 1rem;
    padding: 0 1.25rem;
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-bg-elevated);
    border-bottom: 1px solid var(--color-performance-border-emphasis);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    color: inherit;
    text-decoration: none;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.12em;
  }
  .mark {
    width: 11px;
    height: 11px;
    display: block;
    background: var(--color-performance-pressure);
    transform: rotate(45deg);
  }
  .workspace-context {
    text-align: center;
    line-height: 1.15;
  }
  .workspace-context strong {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.86rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--color-performance-pressure);
    font-family: var(--font-performance-mono);
    font-size: 0.63rem;
    font-weight: var(--font-performance-bold);
    letter-spacing: var(--tracking-performance-wider);
    line-height: 1.2;
    text-transform: uppercase;
  }
  .workspace-context .eyebrow {
    color: var(--color-performance-fg-tertiary);
    font-size: 0.56rem;
  }
  .top-actions {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .session-state,
  .preview-state {
    padding: 0.3rem 0.55rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    border: 1px solid var(--workspace-state-border);
    border-radius: var(--radius-performance-sm);
    font-family: var(--font-performance-mono);
    font-size: 0.62rem;
    font-weight: var(--font-performance-bold);
    letter-spacing: var(--tracking-performance-wide);
    text-transform: uppercase;
  }
  .quiet-button {
    padding: 0.35rem 0.55rem;
    color: var(--color-performance-fg-secondary);
    background: transparent;
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: var(--radius-performance-sm);
    cursor: pointer;
    font-size: 0.7rem;
  }
  .workspace-restoring {
    min-height: calc(100vh - 64px);
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.7rem;
    padding: 2rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    text-align: center;
  }
  .workspace-restoring h1 {
    max-width: 780px;
    margin: 0;
    color: var(--color-performance-ink);
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display);
    font-weight: var(--font-performance-medium);
    letter-spacing: var(--tracking-performance-display);
    line-height: var(--leading-performance-display);
  }
  .workspace-restoring > p:last-child {
    max-width: 540px;
    margin: 0;
    color: var(--color-performance-muted);
    line-height: var(--leading-performance-relaxed);
  }
  .restoring-mark {
    width: 14px;
    height: 14px;
    margin-bottom: 0.5rem;
    background: var(--workspace-state-text);
    box-shadow: 0 0 0 8px var(--workspace-state-background);
    transform: rotate(45deg);
    animation: restore-pulse 1.2s ease-in-out infinite;
  }
  @keyframes restore-pulse {
    0%,
    100% {
      opacity: 0.55;
      transform: rotate(45deg) scale(0.88);
    }
    50% {
      opacity: 1;
      transform: rotate(45deg) scale(1);
    }
  }
  .workspace-picker {
    width: min(1180px, calc(100% - 2rem));
    min-height: calc(100vh - 64px);
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    align-items: center;
    gap: clamp(3rem, 7vw, 8rem);
    margin: 0 auto;
    padding: 4rem 0 7rem;
  }
  .intro h1 {
    max-width: 800px;
    margin: 1rem 0 1.5rem;
    font-family: var(--font-performance-display);
    font-size: var(--text-performance-display-xl);
    font-weight: var(--font-performance-medium);
    letter-spacing: var(--tracking-performance-display);
    line-height: var(--leading-performance-display);
  }
  .lede {
    max-width: 590px;
    margin: 0;
    color: var(--color-performance-muted);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }
  .runtime-card {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    max-width: 590px;
    margin-top: 1.5rem;
    padding: 1rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    border: 1px solid var(--workspace-state-border);
    border-radius: var(--radius-performance-md);
  }
  .runtime-card > div {
    display: grid;
    gap: 0.2rem;
  }
  .runtime-card strong {
    color: var(--color-performance-ink);
    font-size: 0.92rem;
  }
  .runtime-card small {
    color: var(--color-performance-muted);
  }
  .runtime-recheck {
    margin-left: auto;
    white-space: nowrap;
  }
  .delivery-import {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.65rem;
    align-items: end;
    max-width: 590px;
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-performance-bg-elevated);
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: var(--radius-performance-md);
  }
  .delivery-import label {
    grid-column: 1 / -1;
    color: var(--color-performance-fg-secondary);
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .delivery-import input {
    min-width: 0;
    color: var(--color-performance-fg-secondary);
    font-size: 0.78rem;
  }
  .picker-panel {
    padding: 1.1rem;
    background: var(--color-performance-panel);
    border: 1px solid var(--color-performance-line);
    box-shadow: var(--shadow-performance-panel);
  }
  .panel-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.5rem 0.4rem 1.2rem;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .panel-heading h2 {
    margin: 0.35rem 0 0;
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-medium);
  }
  .panel-heading > span {
    color: var(--color-performance-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.66rem;
  }
  .workspace-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 0.4rem;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .workspace-monogram {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: var(--color-performance-panel);
    background: var(--color-performance-signal);
    font-family: var(--font-performance-mono);
    border-radius: var(--radius-performance-sm);
  }
  .workspace-copy h3 {
    margin: 0;
    font-size: 0.88rem;
  }
  .workspace-copy p {
    margin: 0.25rem 0 0;
    color: var(--color-performance-muted);
    font-size: 0.66rem;
  }
  .primary-button,
  .send-button,
  .approve-button {
    color: var(--color-performance-panel);
    background: var(--color-performance-ink);
    border: 1px solid var(--color-performance-ink);
    cursor: pointer;
  }
  .primary-button {
    padding: 0.65rem 0.75rem;
    border-radius: var(--radius-performance-sm);
    font-size: 0.69rem;
    font-weight: var(--font-performance-bold);
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
  .trust-note {
    margin: 1rem 0.4rem 0.2rem;
    color: var(--color-performance-muted);
    font-size: 0.62rem;
  }
  .workspace-shell {
    width: 100%;
    min-width: 0;
    height: calc(100vh - 64px);
    display: grid;
    grid-template-columns: minmax(310px, 0.82fr) minmax(290px, 0.72fr) minmax(480px, 1.46fr);
    overflow: hidden;
  }
  .rail {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-performance-line);
    background: var(--color-performance-paper);
  }
  .rail:last-child {
    border-right: 0;
  }
  .rail-heading {
    min-height: 83px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.1rem;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .rail-heading h1,
  .rail-heading h2 {
    margin: 0.35rem 0 0;
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-medium);
  }
  .rail-number {
    color: var(--color-performance-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.75rem;
  }
  .conversation {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding: 1.2rem 1.1rem;
  }
  .message {
    min-width: 0;
    max-width: 92%;
    padding: 0.85rem 0.9rem;
    border: 1px solid var(--color-performance-line);
  }
  .message p {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }
  .message .message-author {
    margin-bottom: 0.45rem;
    color: var(--color-performance-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.57rem;
    font-weight: var(--font-performance-bold);
    letter-spacing: var(--tracking-performance-wider);
    text-transform: uppercase;
  }
  .agent-message {
    align-self: flex-start;
    background: var(--color-performance-panel);
    border-radius: var(--radius-performance-md);
  }
  .user-message {
    align-self: flex-end;
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-bg-elevated);
    border-color: var(--color-performance-bg-elevated);
    border-radius: var(--radius-performance-md);
  }
  .user-message .message-author {
    color: var(--color-performance-fg-tertiary);
  }
  .attachment-chip {
    display: inline-block;
    max-width: 100%;
    margin-top: 0.6rem;
    padding: 0.3rem 0.45rem;
    overflow: hidden;
    color: var(--color-performance-fg-secondary);
    background: var(--color-performance-bg-subtle);
    border-radius: var(--radius-performance-sm);
    font-size: 0.6rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .thinking {
    display: flex;
    gap: 0.25rem;
    padding: 0.35rem 0;
  }
  .thinking i {
    width: 5px;
    height: 5px;
    background: var(--workspace-state-text);
    border-radius: 50%;
    animation: pulse 1.2s infinite ease-in-out;
  }
  .thinking i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .thinking i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes pulse {
    0%,
    70%,
    100% {
      opacity: 0.3;
      transform: translateY(0);
    }
    35% {
      opacity: 1;
      transform: translateY(-3px);
    }
  }
  .composer {
    margin: 0.8rem;
    background: var(--color-performance-panel);
    border: 1px solid var(--color-performance-line);
    box-shadow: var(--shadow-performance-panel);
  }
  .composer textarea {
    width: 100%;
    min-height: 92px;
    display: block;
    resize: vertical;
    padding: 0.85rem;
    color: var(--color-performance-ink);
    background: transparent;
    border: 0;
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .composer textarea:focus {
    outline: 0;
  }
  .composer-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.55rem;
    border-top: 1px solid var(--color-performance-line);
  }
  .image-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.48rem;
    color: var(--color-performance-ink);
    background: var(--color-performance-paper);
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-sm);
    cursor: pointer;
    font-size: 0.64rem;
    font-weight: var(--font-performance-bold);
  }
  .image-button input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .policy-copy {
    flex: 1;
    color: var(--color-performance-muted);
    font-size: 0.56rem;
  }
  .send-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.47rem 0.62rem;
    border-radius: var(--radius-performance-sm);
    font-size: 0.66rem;
    font-weight: var(--font-performance-bold);
  }
  .selected-attachment {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.2rem 0.7rem;
    padding: 0.55rem 0.75rem;
    color: var(--color-performance-ink);
    background: var(--color-performance-signal-soft);
    border-bottom: 1px solid var(--color-performance-line);
    font-size: 0.62rem;
  }
  .selected-attachment span {
    color: var(--color-performance-muted);
  }
  .selected-attachment strong {
    grid-row: 2;
    overflow: hidden;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .selected-attachment button {
    grid-column: 2;
    grid-row: 1 / 3;
    color: var(--color-performance-muted);
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 1rem;
  }
  .error-note {
    margin: 0.6rem;
    color: var(--color-performance-risk);
    font-size: 0.67rem;
    line-height: 1.4;
  }
  .activity-rail {
    background: var(--color-performance-court);
  }
  .activity-status {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .activity-status p {
    margin: 0;
    color: var(--color-performance-muted);
    font-size: 0.67rem;
    line-height: 1.4;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    margin-top: 0.14rem;
    background: var(--workspace-state-text);
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--workspace-state-background);
  }
  .approval-card {
    margin: 0.8rem 0.8rem 0;
    padding: 0.85rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    border: 1px solid var(--workspace-state-border);
    border-left-width: 4px;
  }
  .approval-card h3 {
    margin: 0.45rem 0;
    font-size: 0.78rem;
  }
  .approval-card > p:not(.eyebrow) {
    margin: 0 0 0.75rem;
    color: var(--color-performance-ink-soft);
    font-size: 0.66rem;
    line-height: 1.4;
  }
  .approval-context {
    display: grid;
    gap: 0.35rem;
    margin: 0 0 0.75rem;
    font-size: 0.62rem;
  }
  .approval-context div {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 0.45rem;
  }
  .approval-context dt {
    color: var(--color-performance-ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .approval-context dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .approval-card div {
    display: flex;
    gap: 0.4rem;
  }
  .approve-button,
  .decline-button {
    padding: 0.4rem 0.55rem;
    border-radius: var(--radius-performance-sm);
    font-size: 0.62rem;
    font-weight: var(--font-performance-bold);
  }
  .decline-button {
    color: var(--color-performance-risk);
    background: transparent;
    border: 1px solid var(--color-performance-risk);
    cursor: pointer;
  }
  .activity-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.25rem 0.8rem 0.8rem;
  }
  .empty-copy {
    margin: 1rem 0.2rem;
    color: var(--color-performance-muted);
    font-size: 0.7rem;
    line-height: 1.5;
  }
  .activity-item {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.6rem;
    padding: 0.75rem 0.25rem;
    border-bottom: 1px solid var(--color-performance-line);
  }
  .event-marker {
    width: 7px;
    height: 7px;
    margin-top: 0.25rem;
    background: var(--workspace-state-text);
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--workspace-state-background);
  }
  .event-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    color: var(--color-performance-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.55rem;
    font-weight: var(--font-performance-bold);
    letter-spacing: var(--tracking-performance-wide);
    text-transform: uppercase;
  }
  .event-meta time {
    font-weight: 500;
    letter-spacing: 0;
  }
  .activity-item p {
    margin: 0.3rem 0 0;
    overflow-wrap: anywhere;
    color: var(--color-performance-ink-soft);
    font-size: 0.66rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }
  .diff-panel {
    max-height: 34%;
    overflow: auto;
    color: var(--color-performance-fg-secondary);
    background: var(--color-performance-bg-elevated);
    border-top: 1px solid var(--color-performance-border-emphasis);
  }
  .diff-panel summary {
    display: flex;
    justify-content: space-between;
    padding: 0.7rem 0.8rem;
    cursor: pointer;
    font-size: 0.62rem;
    font-weight: 730;
    list-style: none;
  }
  .diff-panel summary span:last-child {
    color: var(--color-performance-fg-tertiary);
    font-weight: 520;
  }
  .diff-panel pre {
    margin: 0;
    padding: 0.2rem 0.8rem 1rem;
    overflow: auto;
    font-family: var(--font-performance-code);
    font-size: 0.57rem;
    line-height: 1.55;
    white-space: pre;
  }
  .diff-panel > p {
    margin: 0;
    padding: 0.2rem 0.8rem 1rem;
    color: var(--color-performance-fg-tertiary);
    font-size: 0.62rem;
  }
  .delivery-lifecycle {
    padding: 0.7rem 0.8rem;
    background: var(--color-performance-panel);
    border-top: 1px solid var(--color-performance-line);
    font-size: 0.64rem;
  }
  .delivery-lifecycle summary {
    cursor: pointer;
    font-weight: 730;
  }
  .lifecycle-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.7rem 0;
  }
  .receipt-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
  }
  .update-picker {
    display: grid;
    gap: 0.35rem;
    margin: 0.7rem 0;
    color: var(--color-performance-muted);
  }
  .update-picker input {
    min-width: 0;
    font-size: 0.62rem;
  }
  .update-plan {
    margin-top: 0.7rem;
    padding: 0.7rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    border: 1px solid var(--workspace-state-border);
  }
  .update-plan h3,
  .update-plan p {
    margin: 0 0 0.45rem;
    overflow-wrap: anywhere;
  }
  .preview-rail {
    padding: 0;
    background: var(--color-performance-court);
  }
  .preview-heading-row {
    background: var(--color-performance-paper);
  }
  .preview-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }
  .preview-state {
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    border-color: var(--workspace-state-border);
  }
  .icon-button {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    color: var(--color-performance-ink);
    background: var(--color-performance-panel);
    border: 1px solid var(--color-performance-line-strong);
    border-radius: var(--radius-performance-sm);
    cursor: pointer;
  }
  .browser-frame {
    flex: 1;
    min-height: 0;
    margin: 1rem 1rem 0.65rem;
    overflow: hidden;
    background: var(--color-performance-panel);
    border: 1px solid var(--color-performance-line-strong);
    box-shadow: var(--shadow-performance-panel);
  }
  .browser-chrome {
    height: 36px;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.7rem;
    background: var(--color-performance-paper);
    border-bottom: 1px solid var(--color-performance-line);
  }
  .browser-chrome > span {
    width: 7px;
    height: 7px;
    background: var(--color-performance-line-strong);
    border-radius: 50%;
  }
  .browser-chrome > span:first-child {
    background: var(--color-performance-pressure);
  }
  .browser-chrome p {
    flex: 1;
    margin: 0 3.4rem 0 1rem;
    padding: 0.25rem 0.6rem;
    color: var(--color-performance-muted);
    background: var(--color-performance-panel);
    border: 1px solid var(--color-performance-line);
    border-radius: var(--radius-performance-sm);
    font-family: var(--font-performance-mono);
    font-size: 0.55rem;
    text-align: center;
  }
  iframe {
    width: 100%;
    height: calc(100% - 36px);
    display: block;
    background: var(--color-performance-panel);
    border: 0;
  }
  .preview-placeholder {
    height: calc(100% - 36px);
    display: grid;
    place-items: center;
    align-content: center;
    padding: 2rem;
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
    text-align: center;
  }
  .preview-glyph {
    color: var(--workspace-state-text);
    font-size: 2rem;
  }
  .preview-placeholder h3 {
    margin: 0.8rem 0 0.3rem;
    font-weight: var(--font-performance-medium);
  }
  .preview-placeholder p {
    max-width: 320px;
    margin: 0;
    font-size: 0.7rem;
    line-height: 1.5;
  }
  .preview-footer {
    display: flex;
    justify-content: space-between;
    padding: 0 1rem 0.8rem;
    color: var(--color-performance-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.57rem;
  }

  @media (max-width: 1100px) {
    .workspace-shell {
      grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
      overflow-y: auto;
    }
    .preview-rail {
      grid-column: 1 / -1;
      min-height: 68vh;
      border-top: 1px solid var(--color-performance-line);
    }
    .chat-rail,
    .activity-rail {
      min-height: calc(100vh - 64px);
    }
  }
  @media (max-width: 720px) {
    .topbar {
      min-width: 0;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.45rem;
      padding: 0 0.8rem;
    }
    .brand {
      min-width: 0;
      gap: 0.5rem;
      font-size: 0.62rem;
      letter-spacing: 0.08em;
    }
    .top-actions {
      min-width: 0;
      gap: 0.3rem;
    }
    .session-state {
      padding: 0.25rem 0.35rem;
      font-size: 0.52rem;
    }
    .quiet-button {
      padding: 0.3rem 0.4rem;
      font-size: 0.62rem;
    }
    .workspace-context {
      display: none;
    }
    .workspace-picker {
      grid-template-columns: 1fr;
      align-content: center;
      gap: 3rem;
      padding: 3rem 0 5rem;
    }
    .intro h1 {
      font-size: clamp(3.1rem, 15vw, 5.2rem);
    }
    .workspace-shell {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      height: auto;
      display: block;
      overflow: hidden;
    }
    .rail {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line);
    }
    .chat-rail {
      height: calc(100vh - 64px);
    }
    .activity-rail {
      min-height: 78vh;
      height: 88vh;
    }
    .preview-rail {
      min-height: 72vh;
      height: 78vh;
    }
    .workspace-card {
      grid-template-columns: auto 1fr;
    }
    .workspace-card .primary-button {
      grid-column: 1 / -1;
    }
    .policy-copy {
      display: none;
    }
    .browser-chrome p {
      min-width: 0;
      margin-right: 1rem;
    }
    .preview-footer {
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
    }
  }
</style>
