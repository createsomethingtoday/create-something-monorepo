<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { encodeBrowserMultipart } from '$lib/client/browser-upload.js';
  import {
    conversationMessages,
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
  let localPrompts = $state<Record<number, string>>({});
  let promptText = $state('');
  let attachment = $state<File | null>(null);
  let deliveryPackage = $state<File | null>(null);
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
  let historyQuery = $state('');
  let projectQuery = $state('');
  let activeSection = $state('chat-heading');
  let sessionMenu = $state<HTMLDetailsElement>();
  let sessionMenuToggle = $state<HTMLElement>();
  let visibleWorkspaces = $derived(availableWorkspaces.filter((item) => item.label.toLowerCase().includes(projectQuery.trim().toLowerCase())));
  let approvals = $derived(sessionActive ? pendingWorkspaceApprovals(events) : []);

  async function focusSection(id: string) {
    activeSection = id;
    await tick();
    document.getElementById(id)?.focus();
  }

  function closeSessionMenu(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !sessionMenu?.open) return;
    sessionMenu.open = false;
    sessionMenuToggle?.focus();
  }
  let historyStatus = $state<'idle' | 'available' | 'empty' | 'unavailable'>('idle');
  let historyResults = $state<Array<{ sessionId: string; provider: string }>>([]);
  let searchingHistory = $state(false);
  let eventSource: EventSource | null = null;

  const sessionStorageKey = 'create-something.client-workspace.session';
  const promptStorageKey = (sessionId: string) => `${sessionStorageKey}.prompts.${sessionId}`;

  function loadLocalPrompts(sessionId: string): Record<number, string> {
    try {
      const saved = JSON.parse(sessionStorage.getItem(promptStorageKey(sessionId)) ?? '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      return Object.fromEntries(
        Object.entries(saved).filter(([sequence, text]) =>
          /^\d+$/.test(sequence) && typeof text === 'string' && text.length <= 12_000
        )
      ) as Record<number, string>;
    } catch {
      return {};
    }
  }

  const safeErrors: Record<string, string> = {
    invalid_upload: 'Choose a PNG, JPEG, or WebP image no larger than 5 MB.',
    invalid_turn: 'Describe the frontend change before sending.',
    turn_conflict: 'The current edit is still running. Wait for it to finish.',
    approval_not_found: 'That approval is no longer pending.',
    forbidden_intent: 'Deploy, publish, invite, and credential actions are unavailable here.',
    reset_unavailable: 'The immutable workspace seed is unavailable.',
    workspace_resetting: 'The workspace is resetting. Try again when reset finishes.',
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

  async function searchHistory() {
    if (!workspace || !historyQuery.trim() || searchingHistory) return;
    searchingHistory = true;
    try {
      const params = new URLSearchParams({ q: historyQuery.trim() });
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspace.id)}/history?${params}`);
      const history = await readJson<{
        status: 'available' | 'empty' | 'unavailable';
        results: Array<{ sessionId: string; provider: string }>;
      }>(response);
      historyStatus = history.status;
      historyResults = history.results;
    } catch {
      historyStatus = 'unavailable';
      historyResults = [];
    } finally {
      searchingHistory = false;
    }
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
      await focusSection('chat-heading');
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
    localPrompts = loadLocalPrompts(result.receipt.sessionId);
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
    sending = true;
    errorMessage = '';
    notice = 'Sending the bounded edit request…';
    try {
      const upload = encodeBrowserMultipart([
        ['text', submittedText],
        ...(attachment ? ([['image', attachment]] as const) : [])
      ]);
      const turn = await readJson<{ turnId: string; userEventSequence: number }>(
        await fetch(`/api/sessions/${encodeURIComponent(receipt.sessionId)}/turns`, {
          method: 'POST',
          headers: { 'content-type': upload.contentType },
          body: upload.body
        })
      );
      localPrompts = { ...localPrompts, [turn.userEventSequence]: submittedText };
      try {
        sessionStorage.setItem(promptStorageKey(receipt.sessionId), JSON.stringify(localPrompts));
      } catch {
        // The live conversation still shows the prompt when browser storage is unavailable.
      }
      events = mergeWorkspaceEvents(events, [{
        sequence: turn.userEventSequence,
        at: new Date().toISOString(),
        type: 'user.message',
        message: 'Client edit request submitted.',
        ...(attachment ? { hasAttachment: true } : {})
      }]);
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
    if (receipt) {
      try {
        sessionStorage.removeItem(promptStorageKey(receipt.sessionId));
      } catch {
        // Browser storage can be unavailable; the in-memory conversation is still cleared.
      }
    }
    void focusSection('workspace-heading');
    projectQuery = '';
    workspace = null;
    sessionActive = false;
    receipt = null;
    events = [];
    preview = null;
    diff = '';
    localPrompts = {};
    notice = 'Choose an allowlisted workspace to begin.';
    errorMessage = '';
  }

  function eventLabel(type: BrowserWorkspaceEvent['type']) {
    return type.replace('.', ' ');
  }
</script>

<svelte:window onkeydown={closeSessionMenu} />

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

<div class="cs-workspace client-workspace">
<a class="cs-skip-link" href="#workspace-main">Skip to workspace</a>
<div class="app-layout">
<aside class="app-navigation" aria-label="Workspace navigation">
  <a class="brand" href="/" aria-label="CREATE SOMETHING client workspace home">
    <span class="mark" aria-hidden="true"></span>
    <span>CREATE SOMETHING</span><span class="cs-product-name">Workspace</span>
  </a>
  {#if workspace}
    <div class="nav-project"><span class="eyebrow">Current project</span><strong>{workspace.label}</strong></div>
    <nav class="workspace-sections" aria-label="Workspace sections">
      <a href="#chat-heading" aria-current={activeSection === 'chat-heading' ? 'location' : undefined} onclick={() => focusSection('chat-heading')}><span aria-hidden="true">↗</span> Conversation</a>
      <a href="#activity-heading" aria-current={activeSection === 'activity-heading' ? 'location' : undefined} onclick={() => focusSection('activity-heading')}><span aria-hidden="true">≡</span> Review <span class="approval-count" aria-live="polite">{approvals.length ? `${approvals.length} pending` : ''}</span></a>
      <a href="#preview-heading" aria-current={activeSection === 'preview-heading' ? 'location' : undefined} onclick={() => focusSection('preview-heading')}><span aria-hidden="true">◫</span> Preview</a>
    </nav>
    <button class="quiet-button switch-project" type="button" disabled={closing} onclick={closeWorkspace}>{closing ? 'Closing…' : 'Close & switch project'}</button>
  {:else}
    <nav class="workspace-sections" aria-label="Workspace sections"><a href="#workspace-heading" aria-current="page"><span aria-hidden="true">◫</span> Projects <span class="cs-label">{availableWorkspaces.length}</span></a></nav>
  {/if}
  <div class="navigation-footer"><span class="eyebrow">Client workspace</span><p>Describe. Review. Refine.</p></div>
</aside>
<div class="app-content">
<header class="topbar">
  <div class="workspace-context">
    <span class="eyebrow">{workspace ? 'Projects / Session' : 'Workspace / Start'}</span>
    <strong>{workspace?.label ?? 'Projects'}</strong>
  </div>
  <div class="top-actions">
    {#if data.remote && data.paperclipIssueUrl}
      <a class="quiet-button" href={data.paperclipIssueUrl} target="_blank" rel="noopener noreferrer">
        Client assignment
      </a>
    {/if}
    <span
      class="session-state cs-state"
      data-work-state={sessionWorkState(
        restoring || opening ? 'opening' : (receipt?.status ?? null),
        pendingWorkspaceApprovals(events).length > 0
      )}
    >
      {pendingWorkspaceApprovals(events).length && sessionActive
        ? 'Needs approval'
        : restoring
        ? 'Restoring'
        : opening
          ? 'Opening'
        : receipt && !sessionActive
          ? 'receipt'
          : (receipt?.status ?? codexStatus.state)}
    </span>
    {#if workspace}
      <details class="session-menu" bind:this={sessionMenu}>
        <summary bind:this={sessionMenuToggle}>Session</summary>
        <div class="session-menu-items">
          <button class="quiet-button" type="button" disabled={closing} onclick={closeWorkspace}>{closing ? 'Closing…' : sessionActive ? 'Close session' : 'Close receipt'}</button>
          {#if !data.desktop}<button class="quiet-button" type="button" disabled={resetting} onclick={resetWorkspace}>{resetting ? 'Resetting…' : 'Reset demo'}</button>{/if}
        </div>
      </details>
    {/if}
  </div>
</header>

{#if restoring}
  <main id="workspace-main" tabindex="-1" class="workspace-restoring" data-work-state="planning" aria-live="polite" aria-busy="true">
    <span class="restoring-mark" aria-hidden="true"></span>
    <p class="eyebrow">Receipt readback</p>
    <h1>Restoring your workspace.</h1>
    <p>The saved activity, focused diff, and owned preview are being reconnected.</p>
  </main>
{:else if !workspace}
  <main id="workspace-main" tabindex="-1" class="workspace-picker">
    <div class="intro">
      <p class="eyebrow">Your work</p>
      <h1>Projects</h1>
      <p class="lede">
        Open a project to work with your agent. Review each change alongside the live preview.
      </p>
    </div>
    <section class="picker-panel" aria-labelledby="workspace-heading">
      <div class="panel-heading">
        <div>
          <h2 id="workspace-heading" tabindex="-1">Available projects</h2>
        </div>
        <span class="cs-label">{availableWorkspaces.length} available</span>
      </div>
      {#if availableWorkspaces.length > 1}
        <label class="project-search">Find a project<input type="search" bind:value={projectQuery} placeholder="Search projects" /></label>
      {/if}
      {#if availableWorkspaces.length === 0}
        <p class="empty-copy">Import the signed delivery supplied by CREATE SOMETHING to begin.</p>
      {/if}
      {#if availableWorkspaces.length && !visibleWorkspaces.length}<p class="empty-copy" role="status">No projects match “{projectQuery}”. Clear the search to see all projects.</p>{/if}
      {#each visibleWorkspaces as availableWorkspace}
        <article class="workspace-card">
          <div class="workspace-monogram" aria-hidden="true">
            {availableWorkspace.label.slice(0, 1)}
          </div>
          <div class="workspace-copy">
            <h3>{availableWorkspace.label}</h3>
            <p>Governed edits · Network off</p>
          </div>
          <button
            class="primary-button"
            type="button"
            disabled={opening || codexStatus.state !== 'ready'}
            aria-label={`Open ${availableWorkspace.label}`}
            onclick={() => openWorkspace(availableWorkspace)}
          >
            {opening ? 'Opening…' : 'Open workspace'}
          </button>
        </article>
      {/each}
      {#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}
      <p class="trust-note">
        {data.remote ? 'Work runs on the controlled device.' : 'Local authority only.'}
        No deploy, publish, credential, or third-party mutation access.
      </p>
    </section>
    <section class="workspace-setup" aria-label="Workspace setup">
      <p class="start-feedback" role="status">{opening || importing || notice !== 'Choose an allowlisted workspace to begin.' ? notice : ''}</p>
      <div class="setup-heading"><h2>Session readiness</h2><span class="cs-label">Before you start</span></div>
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
      <details class="delivery-disclosure">
        <summary>Import a signed delivery</summary>
        <form
          class="delivery-import"
          onsubmit={(event) => {
            event.preventDefault();
            void importDelivery();
          }}
        >
          <label for="delivery-package">Delivery package</label>
          <p id="delivery-help">Choose the .csworkspace file supplied by CREATE SOMETHING. Its signature is checked before import.</p>
          <input
            bind:this={deliveryInput}
            id="delivery-package"
            aria-describedby="delivery-help delivery-file-state"
            type="file"
            accept=".csworkspace,application/json"
            onchange={chooseDelivery}
          />
          <p id="delivery-file-state" aria-live="polite">{deliveryPackage ? `Ready to verify: ${deliveryPackage.name}` : 'No delivery selected. Existing projects are ready above.'}</p>
          <button class="quiet-button" type="submit" disabled={importing || !deliveryPackage}>
            {importing ? 'Verifying…' : 'Import .csworkspace'}
          </button>
        </form>
      </details>
    </section>
  </main>
{:else}
  <main id="workspace-main" tabindex="-1" class="workspace-shell">
    <section class="rail chat-rail" aria-labelledby="chat-heading">
      <div class="rail-heading">
        <div>
          <h1 id="chat-heading" tabindex="-1">Conversation</h1>
        </div>
        <span class="cs-label">Workspace agent</span>
      </div>

      <div class="conversation" aria-live="polite">
        <div class="message agent-message welcome-message">
          <p class="message-author">Workspace agent</p>
          <p>
            I can inspect and edit this frontend, run focused checks, and explain each action. Add a
            reference image when visual context matters.
          </p>
        </div>
        {#each conversationMessages(events, localPrompts) as message (message.sequence)}
          <div class:agent-message={message.author === 'agent'} class:user-message={message.author === 'user'} class="message">
            <p class="message-author">{message.author === 'user' ? 'You' : 'Workspace agent'}</p>
            <p>{message.text}</p>
            {#if message.hasAttachment}<span class="attachment-chip">Reference image</span>{/if}
          </div>
        {/each}
        {#if sending}
          <div class="thinking" data-work-state="running" role="status">
            <span class="status-dot" aria-hidden="true"></span> Agent is working…
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
          rows="3"
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
          <h2 id="activity-heading" tabindex="-1">Review changes</h2>
        </div>
        <span class="cs-label">{approvals.length ? `${approvals.length} awaiting your decision` : 'Activity + diff'}</span>
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


      <div class="review-content">
      <div class="review-decisions">
      {#each approvals as approval (approval.sequence)}
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
          <div class="approval-actions">
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

      {#if !approvals.length}<p class="review-empty">No decisions waiting. Agent actions and checks appear below.</p>{/if}
      <details class="activity-disclosure" open={events.length > 0}>
        <summary>Session activity <span class="cs-label">{events.length} events</span></summary>
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

      </details>
      <details class="history-disclosure">
        <summary>Search prior activity</summary>
      <form class="history-search" onsubmit={(event) => { event.preventDefault(); void searchHistory(); }}>
        <label for="history-query">Prior agent history in this workspace</label>
        <div class="history-search-controls">
          <input id="history-query" bind:value={historyQuery} maxlength="200" placeholder="Search CTX history" />
          <button type="submit" disabled={searchingHistory || !historyQuery.trim()}>
            {searchingHistory ? 'Searching…' : 'Search'}
          </button>
        </div>
        {#if historyStatus === 'empty'}<p>No matching history found for this workspace.</p>{/if}
        {#if historyStatus === 'unavailable'}<p>CTX history is unavailable on this device.</p>{/if}
        {#each historyResults as item}
          <article class="history-result">
            <small>{item.provider} · {item.sessionId}</small>
            <p>Matching session available on this device. Open CTX locally for transcript details.</p>
          </article>
        {/each}
      </form>

      </details>

      </div>
      <div class="review-artifacts">
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
      </div>
      </div>
    </section>

    <section class="rail preview-rail" aria-labelledby="preview-heading">
      <div class="rail-heading preview-heading-row">
        <div>
          <h2 id="preview-heading" tabindex="-1">Live preview</h2>
        </div>
        <div class="preview-actions">
          <span class="preview-state cs-state" data-work-state={previewWorkState(preview?.state ?? null)}
            >{preview?.state ?? 'idle'}</span
          >
          <button
            class="icon-button"
            type="button"
            onclick={refreshArtifacts}
            aria-label="Refresh preview">↻</button
          >

        </div>
      </div>
      <div class="browser-frame">
        <div class="browser-chrome">
          <span class="cs-label">Preview</span><p>{workspace.label}</p>
        </div>
        {#if preview?.state === 'ready'}
          <iframe
            title={`${workspace.label} live preview`}
            src={`${preview.previewPath}?revision=${previewRevision}`}
            sandbox={data.desktop ? 'allow-same-origin' : data.remote ? 'allow-scripts' : 'allow-scripts allow-same-origin'}
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
                : preview?.state === 'stopped' || !sessionActive ? 'Preview stopped' : 'Starting preview'}
            </h3>
            <p>
              {preview?.state === 'blocked' || preview?.state === 'crashed'
                ? 'Review changes for details, then refresh the preview to check its status.'
                : preview?.state === 'stopped' || !sessionActive ? 'Open a new workspace session to see the live result.' : 'Your project is starting. The preview will appear here when it is ready.'}
            </p>
          </div>
        {/if}
      </div>
      <footer class="preview-footer">
        <span>Auto-refreshes after source edits</span>
        <span>Network off · {data.remote ? 'Controlled device' : 'Local workspace'}</span>
      </footer>
    </section>
  </main>
{/if}
</div>
</div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  .client-workspace {
    min-height: 100dvh;
  }
  :global(.client-workspace button),
  :global(.client-workspace input),
  :global(.client-workspace textarea) {
    font: inherit;
  }
  :global(.client-workspace button),
  :global(.client-workspace .quiet-button) {
    min-height: var(--workspace-control-height);
    padding: 0.4rem var(--workspace-gap-small);
    border: 1px solid var(--workspace-line);
    border-radius: var(--workspace-radius);
    color: var(--workspace-fg);
    background: var(--workspace-raised);
    cursor: pointer;
    font-size: var(--workspace-text);
    text-decoration: none;
  }
  :global(.client-workspace button:hover:not(:disabled)),
  :global(.client-workspace a.quiet-button:hover) {
    background: var(--workspace-hover);
    border-color: var(--workspace-strong-line);
  }
  :global(.client-workspace button:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }
  :global(.client-workspace input),
  :global(.client-workspace textarea) {
    accent-color: var(--workspace-focus);
  }
  :global(.client-workspace input::placeholder),
  :global(.client-workspace textarea::placeholder) {
    color: var(--workspace-quiet);
  }
  :global(.client-workspace summary) {
    cursor: pointer;
    min-height: var(--workspace-control-height);
    padding: var(--workspace-gap-small) var(--workspace-gap);
    color: var(--workspace-muted);
  }
  .topbar {
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: var(--workspace-gap);
    padding: var(--workspace-gap-small) var(--workspace-gap);
    border-bottom: 1px solid var(--workspace-line);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--workspace-gap-small);
    color: var(--workspace-fg);
    text-decoration: none;
    font: var(--workspace-meta) var(--font-performance-mono);
    white-space: nowrap;
  }
  .mark {
    width: 10px;
    height: 10px;
    background: var(--workspace-fg);
  }
  .workspace-context {
    min-width: 0;
    padding-left: var(--workspace-gap);
    border-left: 1px solid var(--workspace-line);
  }
  .workspace-context strong {
    display: block;
    max-width: 28ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--workspace-text);
    margin-top: 0.25rem;
  }
  .eyebrow {
    margin: 0;
    color: var(--workspace-quiet);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  .top-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--workspace-gap-small);
    margin-left: auto;
  }
  .session-state {
    text-transform: capitalize;
  }
  .workspace-restoring {
    min-height: 60dvh;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: var(--workspace-gap);
    padding: var(--space-performance-lg);
    text-align: center;
  }
  .workspace-restoring h1 {
    margin: 0;
    font-size: var(--text-performance-h2);
  }
  .workspace-restoring > p:last-child {
    color: var(--workspace-muted);
    max-width: 50ch;
    line-height: 1.6;
  }
  .restoring-mark {
    width: 12px;
    height: 12px;
    background: var(--workspace-focus);
  }
  .workspace-picker {
    width: min(100%, 1040px);
    margin-inline: auto;
    padding: var(--space-performance-lg);
    display: grid;
    gap: var(--space-performance-md);
    align-content: start;
  }
  .workspace-setup, .intro, .picker-panel { min-width: 0; }
  .intro h1 {
    margin: var(--workspace-gap) 0;
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
    letter-spacing: var(--tracking-performance-tight);
    line-height: 1.15;
  }
  .lede {
    color: var(--workspace-muted);
    line-height: 1.65;
    max-width: 48ch;
    margin: 0;
    font-size: var(--text-performance-body-sm);
  }
  .setup-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--workspace-gap-small);
    margin-top: 0;
  }
  .setup-heading h2 {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
  }
  .runtime-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--workspace-gap-small);
    margin-top: var(--workspace-gap);
    padding: var(--workspace-gap);
    background: var(--workspace-state-background);
    border-left: 2px solid var(--workspace-state-border);
  }
  .runtime-card > div {
    display: grid;
    gap: var(--workspace-gap-small);
  }
  .runtime-card strong {
    color: var(--workspace-state-text);
    font-size: var(--workspace-text);
    font-weight: var(--font-performance-medium);
  }
  .runtime-card small {
    color: var(--workspace-muted);
    font-size: var(--workspace-meta);
    line-height: 1.5;
  }
  .runtime-recheck {
    grid-column: 2;
    justify-self: start;
  }
  .delivery-disclosure {
    margin-top: var(--workspace-gap);
    border-top: 1px solid var(--workspace-line);
    padding-top: var(--workspace-gap);
  }
  .delivery-disclosure summary {
    cursor: pointer;
    color: var(--workspace-muted);
    font-size: var(--workspace-text);
    padding-block: var(--workspace-gap-small);
  }
  .delivery-import p {
    margin: 0;
    color: var(--workspace-muted);
    font-size: var(--workspace-meta);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .delivery-import input::file-selector-button {
    border: 1px solid var(--workspace-line);
    border-radius: var(--workspace-radius);
    background: var(--workspace-raised);
    color: var(--workspace-fg);
    padding: var(--workspace-gap-small) var(--workspace-gap);
    margin-right: var(--workspace-gap-small);
    font: inherit;
    cursor: pointer;
  }
  .delivery-import input::file-selector-button:hover { border-color: var(--workspace-muted); }
  .delivery-import {
    display: grid;
    gap: var(--workspace-gap-small);
    margin-top: var(--workspace-gap);
    padding: var(--workspace-gap) 0;
  }
  .delivery-import label,
  .update-picker span {
    font-weight: var(--font-performance-medium);
  }
  .delivery-import input,
  .update-picker input {
    max-width: 100%;
    min-width: 0;
    color: var(--workspace-muted);
    font-size: var(--workspace-meta);
  }
  .delivery-import button {
    justify-self: start;
  }
  .picker-panel {
    min-width: 0;
    border: 1px solid var(--workspace-line);
    border-radius: var(--workspace-radius);
    background: var(--workspace-panel);
  }
  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--workspace-gap);
    padding: var(--space-performance-md);
    border-bottom: 1px solid var(--workspace-line);
  }
  .panel-heading h2 {
    margin: 0.4rem 0 0;
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-semibold);
  }
  .workspace-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--workspace-gap);
    padding: var(--space-performance-md);
    border-bottom: 1px solid var(--workspace-line);
  }
  .workspace-monogram {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    background: var(--workspace-raised);
    border: 1px solid var(--workspace-line);
    font-family: var(--font-performance-mono);
  }
  .workspace-copy h3 {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    overflow-wrap: anywhere;
  }
  .workspace-copy p {
    margin: 0.4rem 0 0;
    color: var(--workspace-quiet);
    font-size: var(--workspace-meta);
  }
  .workspace-card button {
    grid-column: 2;
    justify-self: start;
  }
  .trust-note {
    padding: var(--workspace-gap) var(--space-performance-md);
    margin: 0;
    color: var(--workspace-quiet);
    font-size: var(--workspace-meta);
    line-height: 1.6;
  }
  .client-workspace .primary-button,
  .client-workspace .send-button {
    background: var(--workspace-fg);
    border-color: var(--workspace-fg);
    color: var(--workspace-bg);
    font-weight: var(--font-performance-semibold);
  }
  .client-workspace .primary-button:hover:not(:disabled),
  .client-workspace .send-button:hover:not(:disabled) {
    background: var(--color-performance-paper);
    color: var(--workspace-bg);
  }
  .workspace-sections { display: grid; gap: var(--workspace-gap-small); }
  .workspace-sections a {
    display: flex; align-items: center; gap: var(--workspace-gap-small);
    min-height: var(--workspace-control-height); padding: var(--workspace-gap-small);
    border-radius: var(--workspace-radius); color: var(--workspace-muted); text-decoration: none;
  }
  .workspace-sections a[aria-current], .workspace-sections a:hover { background: var(--workspace-hover); color: var(--workspace-fg); }
  .approval-count { margin-left: auto; color: var(--color-performance-review-soft); font: var(--workspace-meta) var(--font-performance-mono); }
  .workspace-shell {
    width: 100%; display: grid; min-width: 0;
    grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.3fr);
    align-items: start;
  }
  .chat-rail { grid-column: 1; grid-row: 1; height: clamp(460px, calc(100dvh - 240px), 720px); }
  .preview-rail { grid-column: 2; grid-row: 1; height: clamp(460px, calc(100dvh - 240px), 720px); }
  .activity-rail { grid-column: 1 / -1; grid-row: 2; border-top: 1px solid var(--workspace-line); }
  .rail {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--workspace-line);
  }
  .rail:last-child {
    border-right: 0;
  }
  .rail-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--workspace-gap);
    min-height: 52px;
    padding: var(--workspace-gap);
    border-bottom: 1px solid var(--workspace-line);
    flex-shrink: 0;
  }
  .rail-heading h1,
  .rail-heading h2 {
    margin: 0;
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
    scroll-margin-top: 60px;
  }
  .conversation {
    min-width: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--workspace-gap);
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-md);
  }
  .message {
    max-width: 100%;
    min-width: 0;
  }
  .message p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--workspace-text);
    line-height: 1.65;
  }
  .welcome-message p {
    white-space: normal;
  }
  .message .message-author {
    margin-bottom: var(--workspace-gap-small);
    color: var(--workspace-quiet);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  .user-message {
    padding: var(--workspace-gap);
    border-left: 2px solid var(--workspace-focus);
    background: var(--workspace-raised);
  }
  .attachment-chip {
    display: block;
    overflow-wrap: anywhere;
    margin-top: var(--workspace-gap-small);
    color: var(--workspace-quiet);
    font-size: var(--workspace-meta);
  }
  .thinking {
    display: flex;
    gap: var(--workspace-gap-small);
    align-items: center;
    color: var(--workspace-state-text);
  }
  .composer {
    margin: var(--workspace-gap);
    border: 1px solid var(--workspace-strong-line);
    border-radius: var(--workspace-radius);
    background: var(--workspace-raised);
  }
  .composer:focus-within {
    border-color: var(--workspace-focus);
  }
  .composer textarea {
    width: 100%;
    display: block;
    min-height: 100px;
    max-height: 35dvh;
    resize: vertical;
    padding: var(--workspace-gap);
    border: 0;
    color: var(--workspace-fg);
    background: transparent;
    line-height: 1.6;
    font-size: var(--workspace-text);
  }
  .composer-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap-small);
    border-top: 1px solid var(--workspace-line);
  }
  .image-button {
    display: inline-flex;
    align-items: center;
    min-height: var(--workspace-control-height);
    gap: 0.3rem;
    padding: 0.3rem;
    cursor: pointer;
    color: var(--workspace-muted);
  }
  .image-button:focus-within {
    outline: 2px solid var(--workspace-focus);
    outline-offset: 2px;
  }
  .image-button input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .policy-copy {
    color: var(--workspace-quiet);
    font-size: var(--workspace-meta);
    flex: 1 0 100%;
    order: 3;
  }
  .send-button {
    margin-left: auto;
  }
  .selected-attachment {
    display: flex;
    align-items: center;
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap-small);
    border-bottom: 1px solid var(--workspace-line);
    font-size: var(--workspace-meta);
  }
  .selected-attachment strong {
    min-width: 0;
    overflow-wrap: anywhere;
    flex: 1;
  }
  .selected-attachment > span {
    color: var(--workspace-quiet);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .error-note {
    margin: var(--workspace-gap);
    padding: var(--workspace-gap-small);
    border-left: 2px solid var(--color-performance-stop);
    color: var(--color-performance-stop-soft);
    background: color-mix(
      in srgb,
      var(--color-performance-stop) 15%,
      var(--workspace-bg)
    );
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  .activity-rail {
    overflow-y: auto;
    background: var(--workspace-panel);
  }
  .activity-status {
    display: flex;
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap);
    border-bottom: 1px solid var(--workspace-line);
  }
  .activity-status p {
    margin: 0;
    color: var(--workspace-muted);
    line-height: 1.6;
  }
  .status-dot,
  .event-marker {
    display: block;
    width: 6px;
    height: 6px;
    margin-top: 0.45rem;
    flex: 0 0 auto;
    background: var(--workspace-state-text);
    border-radius: 50%;
  }
  .approval-card {
    flex-shrink: 0;
    margin: var(--workspace-gap);
    padding: var(--workspace-gap);
    border: 1px solid var(--workspace-state-border);
    border-left-width: 3px;
    background: var(--workspace-state-background);
    color: var(--workspace-state-text);
  }
  .approval-card .eyebrow {
    color: inherit;
  }
  .approval-card h3 {
    font-size: var(--text-performance-body-sm);
    margin: var(--workspace-gap-small) 0;
  }
  .approval-card > p:not(.eyebrow) {
    color: var(--workspace-muted);
    margin: var(--workspace-gap-small) 0;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  .approval-context {
    display: grid;
    gap: var(--workspace-gap-small);
    margin: var(--workspace-gap) 0;
    font-size: var(--workspace-meta);
  }
  .approval-context div {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: var(--workspace-gap-small);
  }
  .approval-context dt {
    color: var(--workspace-quiet);
  }
  .approval-context dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-performance-mono);
    line-height: 1.5;
  }
  .approval-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--workspace-gap-small);
  }
  .client-workspace .approve-button {
    color: var(--color-performance-ink);
    background: var(--color-performance-review-soft);
    border-color: var(--color-performance-review-soft);
  }
  .activity-list {
    padding: 0 var(--workspace-gap);
  }
  .empty-copy {
    color: var(--workspace-quiet);
    padding: var(--workspace-gap);
    line-height: 1.6;
  }
  .activity-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap) 0;
    border-bottom: 1px solid var(--workspace-line);
  }
  .event-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--workspace-gap-small);
    color: var(--workspace-quiet);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  .activity-item p {
    margin: var(--workspace-gap-small) 0 0;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  .history-disclosure {
    margin-top: auto;
  }
  .history-disclosure,
  .diff-panel,
  .delivery-lifecycle {
    flex-shrink: 0;
    border-top: 1px solid var(--workspace-line);
  }
  .history-search {
    padding: var(--workspace-gap);
  }
  .history-search label {
    display: block;
    margin-bottom: var(--workspace-gap-small);
    color: var(--workspace-muted);
  }
  .history-search-controls {
    display: flex;
    gap: var(--workspace-gap-small);
  }
  .history-search-controls input {
    min-width: 0;
    width: 100%;
    padding: var(--workspace-gap-small);
    background: var(--workspace-raised);
    border: 1px solid var(--workspace-line);
    color: var(--workspace-fg);
  }
  .history-search p,
  .history-result {
    overflow-wrap: anywhere;
    color: var(--workspace-muted);
    line-height: 1.6;
  }
  .diff-panel summary span:last-child {
    float: right;
    color: var(--workspace-quiet);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  .diff-panel pre {
    max-height: 35dvh;
    overflow: auto;
    margin: 0;
    padding: var(--workspace-gap);
    background: var(--workspace-bg);
    color: var(--workspace-muted);
    font: var(--workspace-meta)/1.7 var(--font-performance-mono);
  }
  .diff-panel > p {
    margin: 0;
    padding: var(--workspace-gap);
    color: var(--workspace-quiet);
  }
  .lifecycle-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap);
  }
  .receipt-link {
    display: inline-flex;
    align-items: center;
  }
  .update-picker {
    display: grid;
    gap: var(--workspace-gap-small);
    padding: var(--workspace-gap);
  }
  .delivery-lifecycle > button {
    margin: 0 var(--workspace-gap) var(--workspace-gap);
  }
  .update-plan {
    padding: var(--workspace-gap);
    background: var(--workspace-state-background);
    border-top: 1px solid var(--workspace-state-border);
  }
  .update-plan h3 {
    font-size: var(--workspace-text);
  }
  .update-plan p {
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  .preview-rail {
    background: var(--workspace-bg);
  }
  .preview-actions {
    display: flex;
    align-items: center;
    gap: var(--workspace-gap-small);
  }
  .icon-button {
    width: var(--workspace-control-height);
  }
  .browser-frame {
    flex: 1;
    min-height: 0;
    margin: var(--workspace-gap);
    border: 1px solid var(--workspace-line);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .browser-chrome {
    display: flex;
    align-items: center;
    gap: var(--workspace-gap);
    min-height: 36px;
    padding: 0 var(--workspace-gap);
    background: var(--workspace-raised);
    border-bottom: 1px solid var(--workspace-line);
  }
  .browser-chrome p {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--workspace-muted);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  iframe {
    flex: 1;
    min-height: 0;
    width: 100%;
    border: 0;
    background: var(--color-performance-panel);
  }
  .preview-placeholder {
    flex: 1;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: var(--workspace-gap-small);
    text-align: center;
    padding: var(--space-performance-md);
    color: var(--workspace-state-text);
    background: var(--workspace-state-background);
  }
  .preview-glyph {
    font-size: var(--text-performance-h1);
  }
  .preview-placeholder h3 {
    margin: 0;
    font-size: var(--text-performance-body-sm);
  }
  .preview-placeholder p {
    margin: 0;
    max-width: 38ch;
    line-height: 1.6;
    color: var(--workspace-muted);
  }
  .preview-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--workspace-gap-small);
    padding: 0 var(--workspace-gap) var(--workspace-gap);
    color: var(--workspace-quiet);
    font: var(--workspace-meta) var(--font-performance-mono);
  }
  .app-layout { display: grid; grid-template-columns: 208px minmax(0, 1fr); min-height: 100dvh; }
  .app-navigation { position: sticky; top: 0; align-self: start; height: 100dvh; display: flex; flex-direction: column; gap: var(--space-performance-md); padding: var(--workspace-gap); border-right: 1px solid var(--workspace-line); background: var(--workspace-panel); }
  .brand { flex-wrap: wrap; min-height: 40px; white-space: normal; }
  .brand .cs-product-name { flex-basis: 100%; padding-left: calc(10px + var(--workspace-gap-small)); }
  .nav-project { display: grid; gap: var(--workspace-gap-small); padding: var(--workspace-gap-small); }
  .nav-project strong { overflow-wrap: anywhere; font-weight: var(--font-performance-medium); }
  .navigation-footer { margin-top: auto; padding: var(--workspace-gap-small); color: var(--workspace-quiet); }
  .navigation-footer p { margin-bottom: 0; font-size: var(--workspace-meta); }
  .app-content { min-width: 0; }
  .workspace-context { border: 0; padding: 0; }
  .topbar { min-width: 0; min-height: 64px; background: var(--workspace-panel); }
  .session-menu { position: relative; }
  .session-menu summary { border: 1px solid var(--workspace-line); border-radius: var(--workspace-radius); }
  .session-menu-items { position: absolute; right: 0; top: 100%; z-index: 20; width: 180px; display: grid; gap: var(--workspace-gap-small); padding: var(--workspace-gap-small); border: 1px solid var(--workspace-strong-line); background: var(--workspace-panel); }
  .workspace-card { grid-template-columns: auto minmax(0, 1fr) auto; padding: var(--workspace-gap) var(--space-performance-md); }
  .workspace-card button { grid-column: 3; grid-row: 1; }
  .panel-heading { padding: var(--workspace-gap) var(--space-performance-md); }
  .panel-heading h2 { margin: 0; font-size: var(--text-performance-body-sm); }
  .runtime-card { grid-template-columns: auto minmax(0, 1fr) auto; background: transparent; border: 1px solid var(--workspace-line); }
  .runtime-recheck { grid-column: 3; grid-row: 1; }
  .project-search { display: grid; gap: var(--workspace-gap-small); padding: var(--workspace-gap); color: var(--workspace-muted); }
  .project-search input { min-width: 0; width: 100%; padding: var(--workspace-gap-small); border: 1px solid var(--workspace-line); background: var(--workspace-bg); color: var(--workspace-fg); }
  .start-feedback:empty { display: none; }
  .start-feedback { color: var(--workspace-muted); }
  .review-content { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .review-decisions, .review-artifacts { min-width: 0; }
  .review-artifacts { border-left: 1px solid var(--workspace-line); }
  .review-empty { margin: 0; padding: var(--workspace-gap); color: var(--workspace-muted); line-height: 1.6; }
  .activity-list { max-height: 360px; overflow-y: auto; }
  .activity-disclosure summary { display: flex; align-items: center; justify-content: space-between; }
  .activity-disclosure summary::before { content: '▸'; margin-right: var(--workspace-gap-small); }
  .activity-disclosure[open] summary::before { content: '▾'; }
  .rail-heading h1, .rail-heading h2 { margin: 0; scroll-margin-top: var(--workspace-gap); }
  @media (max-width: 1100px) {
    .app-layout { grid-template-columns: 176px minmax(0, 1fr); }
    .workspace-picker { padding: var(--space-performance-md); }
    .workspace-shell { grid-template-columns: minmax(280px, 1fr) minmax(0, 1fr); }
    .preview-actions { flex-wrap: wrap; justify-content: flex-end; }
    .rail-heading > .cs-label { display: none; }
  }
  @media (max-width: 820px) {
    .app-layout { display: block; }
    .app-navigation { height: auto; z-index: 30; padding: var(--workspace-gap-small) var(--workspace-gap); gap: var(--workspace-gap-small); border-right: 0; border-bottom: 1px solid var(--workspace-line); }
    .brand { min-height: 24px; font-size: var(--workspace-meta); }
    .brand .cs-product-name { flex-basis: auto; padding-left: 0; margin-left: auto; }
    .nav-project, .navigation-footer, .switch-project { display: none; }
    .workspace-sections { display: flex; justify-content: space-between; gap: var(--workspace-gap-small); }
    .workspace-sections a { min-height: 44px; padding-inline: var(--workspace-gap-small); flex-wrap: wrap; gap: 4px; }
    .workspace-sections a > span[aria-hidden] { display: none; }
    .approval-count { margin-left: 0; }
    .rail-heading h1, .rail-heading h2, #workspace-heading { scroll-margin-top: 120px; }
  }
  @media (max-width: 720px) {
    .topbar { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--workspace-gap-small); }
    .top-actions { margin-left: auto; gap: var(--workspace-gap-small); }
    .workspace-context { min-width: 0; }
    .workspace-context strong { white-space: normal; overflow-wrap: anywhere; }
    .workspace-picker { width: 100%; padding: var(--workspace-gap); gap: var(--space-performance-md); }
    .intro h1 { font-size: var(--text-performance-h2); margin-block: var(--workspace-gap-small); }
    .panel-heading, .workspace-card { padding: var(--workspace-gap); }
    .workspace-card { grid-template-columns: auto minmax(0, 1fr); }
    .workspace-card button { grid-column: 2; grid-row: 2; }
    .runtime-card { grid-template-columns: auto minmax(0, 1fr); }
    .runtime-recheck { grid-column: 2; grid-row: 2; }
    .workspace-shell { display: flex; flex-direction: column; }
    .rail { width: 100%; border-right: 0; border-bottom: 1px solid var(--workspace-line); }
    .chat-rail { height: auto; min-height: 380px; }
    .conversation { max-height: 45dvh; flex: auto; }
    .composer textarea { min-height: 88px; }
    .activity-rail { height: auto; overflow: visible; }
    .review-content { display: block; }
    .review-artifacts { border-left: 0; }
    .activity-list { max-height: 45dvh; }
    .preview-rail { height: 70dvh; min-height: 400px; }
    .composer textarea, .history-search-controls input, .project-search input { font-size: var(--text-performance-body); }
    .rail-heading > .cs-label { display: none; }
    .setup-heading .cs-label { display: none; }
  }
</style>
