<script lang="ts">
  import {
    applyArcCommand,
    cloneArcDocument,
    visibleComposition,
    type ArcCommand,
    type ArcDocument,
    type ArcScenePatch
  } from './model.js';
  import ArcDeck from './ArcDeck.svelte';
  import { InlineError } from '@create-something/canon';

  interface Props {
    initialDocument: ArcDocument;
    apiEndpoint: string;
    routeId?: string;
    viewerHref?: string;
    exportBaseUrl?: string;
    assetBaseUrl?: string;
    receipts?: Array<{ id: string; revision: number; action: string; actor: string; evidence: string; createdAt: string }>;
  }

  let {
    initialDocument,
    apiEndpoint,
    routeId = 'app-review-governance-arc',
    viewerHref,
    exportBaseUrl,
    assetBaseUrl = '',
    receipts = []
  }: Props = $props();

  function initialSnapshot() {
    const snapshot = cloneArcDocument(initialDocument);
    return {
      document: snapshot,
      revision: snapshot.revision,
      sceneId: snapshot.composition.routes.find((route) => route.id === routeId)?.sceneIds[0] ?? ''
    };
  }

  const initial = initialSnapshot();
  let document = $state<ArcDocument>(initial.document);
  let savedRevision = $state(initial.revision);
  let selectedSceneId = $state(initial.sceneId);
  let past = $state<ArcDocument[]>([]);
  let future = $state<ArcDocument[]>([]);
  let dirty = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let inspectorTab = $state<'design' | 'map' | 'agent' | 'review' | 'notes' | 'media'>('design');
  let agentProposalText = $state('');
  let agentPrompt = $state('Make this scene direct, concrete, and clear about the human decision boundary.');
  let mediaSource = $state('');
  let mediaAlt = $state('');
  let mediaCaption = $state('');
  let mediaModel = $state('local authenticated agent');
  let mediaPromptReference = $state('');
  let mediaRights = $state('First-party or approved customer asset; operator verified before use.');
  let commentBody = $state('');

  const route = $derived(document.composition.routes.find((candidate) => candidate.id === routeId));
  const orderedScenes = $derived(
    (route?.sceneIds ?? []).flatMap((sceneId) => {
      const scene = document.composition.scenes.find((candidate) => candidate.id === sceneId);
      return scene ? [scene] : [];
    })
  );
  const selectedScene = $derived(document.composition.scenes.find((scene) => scene.id === selectedSceneId));
  const activeComposition = $derived(visibleComposition(document, routeId));
  const editable = $derived(document.status === 'draft' || document.status === 'review');
  const activeIndex = $derived(orderedScenes.findIndex((scene) => scene.id === selectedSceneId));
  const mapNodeIds = $derived(document.composition.mapModules[0]?.selection.nodeIds ?? []);
  const availableLayouts = $derived.by(() => {
    if (!selectedScene) return ['statement'] as NonNullable<ArcScenePatch['layout']>[];
    const layouts: NonNullable<ArcScenePatch['layout']>[] = ['statement', 'decision', 'demo', 'proof'];
    if (selectedScene.presentation.media) layouts.push('split', 'image');
    if ((selectedScene.presentation.capabilities?.length ?? 0) >= 2) layouts.push('capabilities');
    if (selectedScene.presentation.code) layouts.push('code');
    if (selectedScene.presentation.relationships?.length) layouts.push('map');
    if ((selectedScene.presentation.branches?.length ?? 0) >= 2) layouts.push('branches');
    return [...new Set(layouts)];
  });

  function context() {
    return {
      actor: 'studio-operator',
      now: new Date().toISOString(),
      id: () => crypto.randomUUID()
    };
  }

  function applyLocal(command: ArcCommand) {
    error = null;
    notice = null;
    try {
      const before = cloneArcDocument(document);
      const result = applyArcCommand(document, command, context());
      past = [...past, before].slice(-80);
      future = [];
      document = result.document;
      dirty = true;
      if (result.changedSceneIds[0]) selectedSceneId = result.changedSceneIds[0];
      notice = result.summary;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The edit could not be applied.';
    }
  }

  function undo() {
    const previous = past.at(-1);
    if (!previous) return;
    future = [cloneArcDocument(document), ...future].slice(0, 80);
    document = previous;
    past = past.slice(0, -1);
    if (!document.composition.scenes.some((scene) => scene.id === selectedSceneId)) {
      selectedSceneId = document.composition.routes.find((candidate) => candidate.id === routeId)?.sceneIds[0] ?? '';
    }
    dirty = true;
    notice = 'Undid the last local edit.';
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    past = [...past, cloneArcDocument(document)].slice(-80);
    document = next;
    future = future.slice(1);
    dirty = true;
    notice = 'Restored the next local edit.';
  }

  async function saveDraft(): Promise<boolean> {
    if (!dirty) return true;
    busy = true;
    error = null;
    try {
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID()
        },
        body: JSON.stringify({ baseRevision: savedRevision, document })
      });
      const payload = (await response.json()) as { document?: ArcDocument; error?: string; receipt?: { id: string } };
      if (!response.ok || !payload.document) throw new Error(payload.error ?? 'The draft could not be saved.');
      document = payload.document;
      savedRevision = payload.document.revision;
      past = [];
      future = [];
      dirty = false;
      notice = `Saved revision ${savedRevision} · receipt ${payload.receipt?.id ?? 'recorded'}`;
      return true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The draft could not be saved.';
      return false;
    } finally {
      busy = false;
    }
  }

  async function sendLifecycle(command: ArcCommand) {
    if (dirty && !(await saveDraft())) return;
    busy = true;
    error = null;
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID()
        },
        body: JSON.stringify(command)
      });
      const payload = (await response.json()) as { document?: ArcDocument; error?: string; receipt?: { id: string } };
      if (!response.ok || !payload.document) throw new Error(payload.error ?? 'The lifecycle action failed.');
      document = payload.document;
      savedRevision = payload.document.revision;
      notice = `${command.type.replaceAll('_', ' ')} · receipt ${payload.receipt?.id ?? 'recorded'}`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The lifecycle action failed.';
    } finally {
      busy = false;
    }
  }

  function patchSelected(patch: ArcScenePatch) {
    if (!selectedScene) return;
    applyLocal({ type: 'patch_scene', sceneId: selectedScene.id, patch });
  }

  function moveSelected(offset: -1 | 1) {
    if (!selectedScene || activeIndex < 0) return;
    applyLocal({ type: 'reorder_scene', sceneId: selectedScene.id, toIndex: activeIndex + offset, routeId });
  }

  function toggleMapNode(nodeId: string, checked: boolean) {
    if (!selectedScene) return;
    const next = checked
      ? [...new Set([...selectedScene.focusNodeIds, nodeId])]
      : selectedScene.focusNodeIds.filter((candidate) => candidate !== nodeId);
    patchSelected({ focusNodeIds: next });
  }

  function agentBrief() {
    if (!selectedScene) return '';
    return JSON.stringify(
      {
        schema: 'create-something/arc-agent-brief@1',
        arcId: document.id,
        revision: savedRevision,
        routeId,
        scene: selectedScene,
        sceneMeta: document.sceneMeta[selectedScene.id],
        request: agentPrompt,
        allowedPatchFields: ['heading', 'explanation', 'takeaway', 'layout', 'notes', 'focusNodeIds', 'motionCue', 'callout', 'code'],
        boundaries: [
          'Return a proposal only; do not imply approval or publication.',
          'Use plain language first and system names only as evidence.',
          'Preserve the pinned map module and cite any changed focus nodes.',
          'Return JSON with kind, summary, patch, model, and prompt.'
        ]
      },
      null,
      2
    );
  }

  async function copyAgentBrief() {
    await navigator.clipboard.writeText(agentBrief());
    notice = 'Copied the structured agent brief. Run it with the locally logged-in Codex or Claude account, then paste the proposal here.';
  }

  function importAgentProposal() {
    if (!selectedScene) return;
    try {
      const proposal = JSON.parse(agentProposalText) as {
        kind?: 'copy' | 'layout' | 'motion' | 'map-focus' | 'image' | 'speaker-notes';
        summary?: string;
        patch?: ArcScenePatch;
        model?: string;
        prompt?: string;
      };
      if (!proposal.kind || !proposal.summary || !proposal.patch || !proposal.model || !proposal.prompt) {
        throw new Error('Proposal JSON needs kind, summary, patch, model, and prompt.');
      }
      applyLocal({
        type: 'propose_scene_patch',
        sceneId: selectedScene.id,
        kind: proposal.kind,
        summary: proposal.summary,
        patch: proposal.patch,
        model: proposal.model,
        prompt: proposal.prompt
      });
      agentProposalText = '';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The proposal JSON is invalid.';
    }
  }

  function attachMedia() {
    if (!selectedScene) return;
    applyLocal({
      type: 'attach_media',
      sceneId: selectedScene.id,
      source: mediaSource,
      alt: mediaAlt,
      caption: mediaCaption,
      model: mediaModel,
      promptReference: mediaPromptReference || 'operator-supplied source',
      rights: mediaRights,
      costUsd: null
    });
  }

  function addReviewComment() {
    if (!selectedScene || !commentBody.trim()) return;
    applyLocal({ type: 'add_comment', sceneId: selectedScene.id, body: commentBody });
    commentBody = '';
  }
</script>

<section class="arc-studio" aria-label="Arc Studio" data-dirty={dirty}>
  <header class="studio-bar">
    <div><span>Arc Studio</span><strong>{document.title}</strong></div>
    <div class="studio-status"><i data-status={document.status}></i><span>{document.status}</span><small>r{savedRevision}{dirty ? ' · unsaved' : ''}</small></div>
    <nav aria-label="Arc document actions">
      <button type="button" onclick={undo} disabled={!past.length || busy}>Undo</button>
      <button type="button" onclick={redo} disabled={!future.length || busy}>Redo</button>
      <button type="button" onclick={saveDraft} disabled={!dirty || busy}>Save draft</button>
      {#if document.status === 'draft'}
        <button class="primary" type="button" onclick={() => sendLifecycle({ type: 'request_review' })} disabled={busy}>Request review</button>
      {:else if document.status === 'review'}
        <button type="button" onclick={() => sendLifecycle({ type: 'reject', reason: 'Changes requested from Arc Studio.' })} disabled={busy}>Request changes</button>
        <button class="primary" type="button" onclick={() => sendLifecycle({ type: 'approve', reason: 'The story, map focus, and evidence are ready.' })} disabled={busy}>Approve</button>
      {:else if document.status === 'approved'}
        <button class="primary" type="button" onclick={() => sendLifecycle({ type: 'publish' })} disabled={busy}>Publish</button>
      {:else if document.status === 'published' || document.status === 'archived' || document.status === 'superseded'}
        <button class="primary" type="button" onclick={() => sendLifecycle({ type: 'recover' })} disabled={busy}>Recover draft</button>
      {/if}
    </nav>
  </header>

  {#if error}<div class="studio-error"><InlineError message={error} size="sm" /></div>{/if}
  {#if notice}<div class="studio-message" aria-live="polite">{notice}</div>{/if}

  <div class="studio-workspace">
    <aside class="storyboard" aria-label="Scene storyboard">
      <header><strong>Scenes</strong><button type="button" onclick={() => applyLocal({ type: 'add_scene', afterSceneId: selectedSceneId, routeId })} disabled={!editable}>Add</button></header>
      <ol>
        {#each orderedScenes as scene, index}
          <li>
            <button
              type="button"
              aria-current={scene.id === selectedSceneId ? 'true' : undefined}
              onclick={() => (selectedSceneId = scene.id)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{scene.label}</strong><small>{scene.presentation.reader.takeaway}</small></div>
              <em>{scene.presentation.layout}</em>
            </button>
          </li>
        {/each}
      </ol>
      <footer>
        <button type="button" onclick={() => moveSelected(-1)} disabled={!editable || activeIndex <= 0}>Up</button>
        <button type="button" onclick={() => moveSelected(1)} disabled={!editable || activeIndex >= orderedScenes.length - 1}>Down</button>
        <button type="button" onclick={() => selectedScene && applyLocal({ type: 'duplicate_scene', sceneId: selectedScene.id })} disabled={!editable || !selectedScene}>Duplicate</button>
        <button type="button" onclick={() => selectedScene && applyLocal({ type: 'remove_scene', sceneId: selectedScene.id })} disabled={!editable || !selectedScene}>Remove</button>
      </footer>
    </aside>

    <main class="stage-wrap">
      <div class="stage-toolbar">
        <span>Responsive stage · changes preview immediately</span>
        <nav>
          {#if viewerHref}<a href={viewerHref}>Viewer</a>{/if}
          {#if exportBaseUrl}
            <a href={`${exportBaseUrl}/web`}>Web</a>
            <a href={`${exportBaseUrl}/pdf`}>PDF</a>
            <a href={`${exportBaseUrl}/json`}>JSON</a>
          {/if}
        </nav>
      </div>
      <div class="stage-canvas">
        <ArcDeck
          composition={activeComposition}
          {routeId}
          title={route?.title ?? document.title}
          description={route?.description ?? document.description}
          ariaLabel="Arc Studio preview scenes"
          {assetBaseUrl}
          enablePresentation
        />
      </div>
    </main>

    <aside class="inspector" aria-label="Scene inspector">
      <nav aria-label="Inspector sections">
        {#each ['design', 'map', 'agent', 'review', 'notes', 'media'] as tab}
          <button type="button" aria-current={inspectorTab === tab ? 'true' : undefined} onclick={() => (inspectorTab = tab as typeof inspectorTab)}>{tab}</button>
        {/each}
      </nav>

      {#if selectedScene}
        <header>
          <span>Scene {activeIndex + 1}</span>
          <strong>{selectedScene.label}</strong>
          <div>
            <button type="button" onclick={() => applyLocal({ type: 'set_scene_lock', sceneId: selectedScene.id, locked: !document.sceneMeta[selectedScene.id].locked })} disabled={!editable}>{document.sceneMeta[selectedScene.id].locked ? 'Unlock' : 'Lock'}</button>
            <button type="button" onclick={() => applyLocal({ type: 'set_scene_hidden', sceneId: selectedScene.id, hidden: !document.sceneMeta[selectedScene.id].hidden })} disabled={!editable}>{document.sceneMeta[selectedScene.id].hidden ? 'Show' : 'Hide'}</button>
          </div>
        </header>

        {#if inspectorTab === 'design'}
          <form class="inspector-form" onsubmit={(event) => event.preventDefault()}>
            <label><span>Scene label</span><input value={selectedScene.label} disabled={!editable} onchange={(event) => patchSelected({ label: event.currentTarget.value })} /></label>
            <label><span>Heading</span><textarea rows="3" disabled={!editable} onchange={(event) => patchSelected({ heading: event.currentTarget.value })}>{selectedScene.presentation.reader.heading}</textarea></label>
            <label><span>Plain-language explanation</span><textarea rows="5" disabled={!editable} onchange={(event) => patchSelected({ explanation: event.currentTarget.value })}>{selectedScene.presentation.reader.explanation}</textarea></label>
            <label><span>Takeaway</span><input value={selectedScene.presentation.reader.takeaway} disabled={!editable} onchange={(event) => patchSelected({ takeaway: event.currentTarget.value })} /></label>
            <label><span>Layout</span><select value={selectedScene.presentation.layout} disabled={!editable} onchange={(event) => patchSelected({ layout: event.currentTarget.value as ArcScenePatch['layout'] })}>
              {#each availableLayouts as layout}<option value={layout}>{layout}</option>{/each}
            </select></label>
            <label><span>Motion cue</span><select value={selectedScene.motion.cue} disabled={!editable} onchange={(event) => patchSelected({ motionCue: event.currentTarget.value as ArcScenePatch['motionCue'] })}>
              {#each ['signal-reveal', 'module-focus', 'handoff-trace', 'decision-gate', 'recovery-loop', 'proof-stamp'] as cue}<option value={cue}>{cue}</option>{/each}
            </select></label>
          </form>
        {:else if inspectorTab === 'map'}
          <div class="map-focus">
            <p>Choose the pinned map nodes this scene explains. Relationships remain explicit in the composition.</p>
            {#each mapNodeIds as nodeId}
              <label><input type="checkbox" checked={selectedScene.focusNodeIds.includes(nodeId)} disabled={!editable} onchange={(event) => toggleMapNode(nodeId, event.currentTarget.checked)} /><span>{nodeId.replaceAll('-', ' ')}</span></label>
            {/each}
          </div>
        {:else if inspectorTab === 'agent'}
          <div class="agent-panel">
            <p>Use the locally logged-in Codex or Claude account. The agent returns a proposal; it cannot approve or publish.</p>
            <code>pbpaste | pnpm --filter @create-something/arc agent:local [-- --claude]</code>
            <label><span>What should the agent improve?</span><textarea rows="4" bind:value={agentPrompt}></textarea></label>
            <button type="button" onclick={copyAgentBrief}>Copy agent brief</button>
            <label><span>Paste proposal JSON</span><textarea rows="8" bind:value={agentProposalText} placeholder={'{"kind":"copy","summary":"…","patch":{"heading":"…"},"model":"claude","prompt":"…"}'}></textarea></label>
            <button type="button" class="primary" onclick={importAgentProposal} disabled={!editable || !agentProposalText.trim()}>Stage proposal</button>
            {#each document.proposals.filter((proposal) => proposal.sceneId === selectedScene.id && proposal.status === 'proposed') as proposal}
              <article>
                <span>{proposal.kind} proposal · {proposal.model}</span>
                <strong>{proposal.summary}</strong>
                <div><button type="button" onclick={() => applyLocal({ type: 'decide_scene_proposal', proposalId: proposal.id, decision: 'rejected' })}>Reject</button><button type="button" class="primary" onclick={() => applyLocal({ type: 'decide_scene_proposal', proposalId: proposal.id, decision: 'accepted' })}>Accept patch</button></div>
              </article>
            {/each}
          </div>
        {:else if inspectorTab === 'review'}
          <div class="review-panel">
            <p>Comments, decisions, and receipts keep the human review legible. Approval remains separate from authoring.</p>
            <label><span>Add scene comment</span><textarea rows="4" bind:value={commentBody}></textarea></label>
            <button type="button" class="primary" onclick={addReviewComment} disabled={!commentBody.trim()}>Add comment</button>
            <section><h4>Open comments</h4>
              {#each document.comments.filter((comment) => comment.sceneId === selectedScene.id && !comment.resolved) as comment}
                <article><span>{comment.author}</span><strong>{comment.body}</strong><button type="button" onclick={() => applyLocal({ type: 'resolve_comment', commentId: comment.id })}>Resolve</button></article>
              {:else}<small>No open comments for this scene.</small>{/each}
            </section>
            <section><h4>Recent receipts</h4>
              {#each receipts.slice(0, 8) as receipt}
                <article><span>r{receipt.revision} · {receipt.action.replaceAll('_', ' ')}</span><strong>{receipt.evidence}</strong><small>{receipt.actor}</small></article>
              {:else}<small>Save or change lifecycle state to create a receipt.</small>{/each}
            </section>
          </div>
        {:else if inspectorTab === 'notes'}
          <div class="notes-panel">
            <label><span>Speaker notes</span><textarea rows="14" disabled={!editable} onchange={(event) => patchSelected({ notes: event.currentTarget.value })}>{document.sceneMeta[selectedScene.id].notes}</textarea></label>
            <p>Notes stay out of the audience canvas and appear only from the presenter control.</p>
          </div>
        {:else if inspectorTab === 'media'}
          <div class="media-panel">
            <p>Attach an owned or approved image created by the local agent. Provenance is required before it can enter the deck.</p>
            <label><span>Image URL or local path</span><input bind:value={mediaSource} placeholder="https://… or /images/…" /></label>
            <label><span>Alternative text</span><textarea rows="3" bind:value={mediaAlt}></textarea></label>
            <label><span>Caption</span><textarea rows="3" bind:value={mediaCaption}></textarea></label>
            <label><span>Model or source</span><input bind:value={mediaModel} /></label>
            <label><span>Prompt reference</span><textarea rows="3" bind:value={mediaPromptReference}></textarea></label>
            <label><span>Rights</span><textarea rows="3" bind:value={mediaRights}></textarea></label>
            <button type="button" class="primary" onclick={attachMedia} disabled={!editable || !mediaSource || !mediaAlt || !mediaCaption}>Attach media</button>
          </div>
        {/if}
      {/if}
    </aside>
  </div>
</section>

<style>
  .arc-studio { --studio-line: #d7d4cc; --studio-paper: #f4f0e8; --studio-panel: #fffdf8; --studio-ink: #15130f; display: grid; grid-template-rows: auto auto minmax(0, 1fr); height: 100dvh; overflow: hidden; background: var(--studio-paper); color: var(--studio-ink); }
  button, input, textarea, select, a { font: inherit; }
  button, a { min-height: 2.35rem; border: 1px solid #8f8a80; background: transparent; color: inherit; cursor: pointer; text-decoration: none; }
  button:disabled { cursor: not-allowed; opacity: .42; }
  .primary { background: var(--studio-ink); color: var(--studio-panel); }
  .studio-bar { display: grid; grid-template-columns: minmax(12rem, 1fr) auto minmax(24rem, 1fr); gap: 1rem; align-items: center; min-height: 3.75rem; padding: .55rem .75rem; border-bottom: 1px solid var(--studio-line); background: var(--studio-panel); }
  .studio-bar > div:first-child { display: flex; gap: .65rem; align-items: baseline; min-width: 0; }
  .studio-bar > div:first-child span, .studio-status, .stage-toolbar, .storyboard header, .inspector > nav { font: 650 .67rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
  .studio-bar > div:first-child strong { overflow: hidden; font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
  .studio-bar nav, .storyboard footer { display: flex; justify-content: flex-end; gap: .35rem; }
  .studio-bar button, .stage-toolbar a, .storyboard footer button { padding: .55rem .7rem; font: 650 .66rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
  .studio-status { display: flex; gap: .45rem; align-items: center; }
  .studio-status i { width: .55rem; height: .55rem; border-radius: 50%; background: #b69300; }
  .studio-status i[data-status='published'], .studio-status i[data-status='approved'] { background: #18794e; }
  .studio-status small { color: #6d6860; }
  .studio-message { padding: .45rem .75rem; border-bottom: 1px solid var(--studio-line); background: #eef4eb; font-size: .78rem; }
  .studio-error { border-bottom: 1px solid var(--studio-line); background: #fff0ed; padding: .35rem .75rem; color: #8d211c; }
  .studio-workspace { display: grid; grid-template-columns: 14.5rem minmax(0, 1fr) 20rem; min-height: 0; }
  .storyboard, .inspector { min-height: 0; overflow: auto; background: var(--studio-panel); }
  .storyboard { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; border-right: 1px solid var(--studio-line); }
  .storyboard header { display: flex; justify-content: space-between; align-items: center; padding: .65rem; border-bottom: 1px solid var(--studio-line); }
  .storyboard header button { min-height: 1.9rem; padding: .35rem .5rem; }
  .storyboard ol { margin: 0; padding: 0; overflow: auto; list-style: none; }
  .storyboard li button { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr); gap: .55rem; width: 100%; padding: .75rem .65rem; border: 0; border-bottom: 1px solid var(--studio-line); text-align: left; }
  .storyboard li button[aria-current='true'] { background: var(--studio-paper); box-shadow: inset 3px 0 #1767a9; }
  .storyboard li button > span, .storyboard li button em { color: #777167; font: .62rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .storyboard li button div { display: grid; gap: .3rem; min-width: 0; }
  .storyboard li button strong { font-size: .82rem; }
  .storyboard li button small { overflow: hidden; color: #6d6860; font-size: .7rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
  .storyboard li button em { grid-column: 2; font-style: normal; text-transform: uppercase; }
  .storyboard footer { flex-wrap: wrap; padding: .55rem; border-top: 1px solid var(--studio-line); }
  .stage-wrap { display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; min-height: 0; overflow: hidden; background: #dedad1; }
  .stage-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; min-height: 2.65rem; padding: .45rem .75rem; border-bottom: 1px solid var(--studio-line); background: var(--studio-panel); }
  .stage-toolbar nav { display: flex; gap: .35rem; }
  .stage-toolbar a { display: inline-flex; align-items: center; padding-inline: .6rem; }
  .stage-canvas { min-height: 0; overflow: auto; padding: clamp(.5rem, 1.5vw, 1.25rem); }
  .stage-canvas :global(.performance-narrative-stage) { box-shadow: 0 .75rem 2.5rem rgb(22 19 15 / .12); }
  .stage-canvas :global(.performance-narrative-stage:not([data-presenting='true'])) { padding-block: 1.25rem; }
  .stage-canvas :global(.performance-narrative-stage:not([data-presenting='true']) .performance-narrative-stage__inner) { width: calc(100% - 1rem); gap: 1rem; }
  .stage-canvas :global(.performance-narrative-stage:not([data-presenting='true']) .performance-narrative-stage__header) { padding-inline: .5rem; }
  .stage-canvas :global(.performance-narrative-stage:not([data-presenting='true']) .performance-narrative-stage__header h2) { font-size: clamp(2rem, 4vw, 3.5rem); }
  .inspector { border-left: 1px solid var(--studio-line); }
  .inspector > nav { position: sticky; z-index: 2; top: 0; display: grid; grid-template-columns: repeat(6, 1fr); background: var(--studio-panel); }
  .inspector > nav button { min-width: 0; min-height: 2.65rem; padding: .35rem .15rem; border: 0; border-bottom: 1px solid var(--studio-line); font-size: .58rem; text-transform: uppercase; }
  .inspector > nav button[aria-current='true'] { border-bottom: 3px solid #1767a9; }
  .inspector > header { display: grid; gap: .4rem; padding: .85rem; border-bottom: 1px solid var(--studio-line); }
  .inspector > header > span, .agent-panel article span { color: #6d6860; font: 650 .63rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
  .inspector > header > div { display: flex; gap: .35rem; }
  .inspector > header button { min-height: 1.9rem; padding: .35rem .5rem; font-size: .65rem; }
  .inspector-form, .agent-panel, .review-panel, .notes-panel, .media-panel, .map-focus { display: grid; gap: .85rem; padding: .85rem; }
  label { display: grid; gap: .35rem; }
  label > span { color: #5f5a52; font: 650 .63rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; }
  input, textarea, select { width: 100%; border: 1px solid #aaa49a; border-radius: 0; background: #fff; color: inherit; padding: .55rem; font-size: .84rem; line-height: 1.42; }
  textarea { resize: vertical; }
  .map-focus > p, .agent-panel > p, .review-panel > p, .notes-panel > p, .media-panel > p { margin: 0; color: #6d6860; font-size: .78rem; line-height: 1.5; }
  .agent-panel > code { overflow-x: auto; padding: .6rem; border: 1px solid var(--studio-line); background: #171612; color: #f8f4eb; font: .65rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
  .review-panel section { display: grid; gap: .5rem; border-top: 1px solid var(--studio-line); padding-top: .8rem; }
  .review-panel h4 { margin: 0; font: 650 .65rem/1.2 ui-monospace, monospace; text-transform: uppercase; }
  .review-panel article { display: grid; gap: .4rem; padding: .65rem; border: 1px solid var(--studio-line); }
  .review-panel article span, .review-panel article small { color: #6d6860; font: .62rem/1.3 ui-monospace, monospace; }
  .review-panel article strong { font-size: .75rem; line-height: 1.4; }
  .map-focus label { grid-template-columns: auto 1fr; align-items: start; padding: .5rem 0; border-bottom: 1px solid var(--studio-line); }
  .map-focus input { width: auto; }
  .map-focus label span { font-size: .7rem; line-height: 1.35; text-transform: none; }
  .agent-panel > button, .media-panel > button { padding: .65rem; }
  .agent-panel article { display: grid; gap: .55rem; padding: .75rem; border: 1px solid var(--studio-line); background: var(--studio-paper); }
  .agent-panel article > div { display: flex; gap: .35rem; }
  .agent-panel article button { padding: .5rem; font-size: .68rem; }
  @media (max-width: 72rem) { .studio-workspace { grid-template-columns: 11.5rem minmax(0, 1fr) 18rem; } .studio-bar { grid-template-columns: 1fr auto; } .studio-bar nav { grid-column: 1 / -1; justify-content: flex-start; overflow-x: auto; } }
  @media (max-width: 52rem) { .arc-studio { height: auto; min-height: 100dvh; overflow: visible; } .studio-workspace { grid-template-columns: 1fr; } .storyboard { max-height: 14rem; border-right: 0; border-bottom: 1px solid var(--studio-line); } .storyboard ol { display: flex; } .storyboard li { flex: 0 0 min(14rem, 76vw); } .stage-wrap { min-height: 38rem; } .inspector { border-top: 1px solid var(--studio-line); border-left: 0; } }
</style>
