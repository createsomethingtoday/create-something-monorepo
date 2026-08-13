<script lang="ts">
  import { dev } from '$app/environment';
  import {
    THRESHOLD_DWELLING_SPATIAL_PACKAGE,
    assetBrowserUrl,
    chapterForId,
    createSessionAnnotation,
    portalsFrom,
    type WorkWaySessionAnnotation
  } from '$lib/workway/threshold-dwelling-spatial-package';

  const spatialPackage = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const tabletopPlan = assetBrowserUrl(spatialPackage, 'tabletop-plan-svg');
  const publicRoomVisual = assetBrowserUrl(spatialPackage, 'public-room-hero-png');
  const localPreview = dev;

  let mode = $state<'tabletop' | 'chapter'>('tabletop');
  let activeChapterId = $state('kitchen');
  let annotationText = $state('Island clearance: compare the proposed 4 in south move.');
  let annotations = $state<WorkWaySessionAnnotation[]>([]);

  const activeChapter = $derived(chapterForId(spatialPackage, activeChapterId));
  const activePortals = $derived(portalsFrom(spatialPackage, activeChapterId));
  const activeDimensions = $derived(
    `${activeChapter.widthIn / 12} ft × ${activeChapter.depthIn / 12} ft`
  );

  function enterChapter(chapterId: string) {
    activeChapterId = chapterId;
    mode = 'chapter';
  }

  function traverse(portalId: string) {
    const portal = activePortals.find((candidate) => candidate.id === portalId);
    if (!portal) throw new Error(`Unknown portal from ${activeChapterId}: ${portalId}`);
    enterChapter(portal.toChapterId);
  }

  function createAnnotation() {
    const annotation = createSessionAnnotation(
      spatialPackage,
      activeChapterId,
      annotationText,
      annotations.length + 1
    );
    annotations = [...annotations, annotation];
  }

  function returnToTabletop() {
    mode = 'tabletop';
  }
</script>

<svelte:head>
  <title>WorkWay Spatial Package Preview</title>
  <meta
    name="description"
    content="Local-only WorkWay spatial package preview for the Threshold Dwelling Rev 0.8 proposal."
  />
</svelte:head>

{#if !localPreview}
  <section class="unavailable" data-testid="local-preview-only">
    <p class="eyebrow">WORKWAY · LOCAL PREVIEW</p>
    <h1>This spatial walkthrough is available only in local development.</h1>
    <p>
      The package contract is source-controlled, but this prototype is not a public product route,
      a construction document, or a substitute for a native Vision Pro verification.
    </p>
  </section>
{:else}
  <main class="preview-shell" data-testid="workway-spatial-preview">
    <header class="topbar">
      <div>
        <p class="eyebrow">WORKWAY · LOCAL SPATIAL PACKAGE</p>
        <h1>Threshold Dwelling</h1>
      </div>
      <dl class="package-stamp" aria-label="Active package identity">
        <div>
          <dt>Package</dt>
          <dd data-testid="package-id">{spatialPackage.id}</dd>
        </div>
        <div>
          <dt>Canonical</dt>
          <dd>{spatialPackage.canonicalProject.projectId} · Rev {spatialPackage.canonicalProject.projectRevision}</dd>
        </div>
        <div>
          <dt>Spatial</dt>
          <dd data-testid="spatial-revision">Rev {spatialPackage.spatialRevision}</dd>
        </div>
      </dl>
    </header>

    <section class="guardrail" aria-label="Preview boundary">
      <span class="guardrail-mark">●</span>
      <p>
        Derived visualization only. No source documents, construction authority, survey claim, or
        shipped USD/USDZ asset is present in this local client package.
      </p>
    </section>

    <div class="experience-grid">
      <aside class="navigator" aria-label="Spatial package navigator">
        <div class="mode-switcher" aria-label="View mode">
          <button
            class:active={mode === 'tabletop'}
            onclick={returnToTabletop}
            data-testid="tabletop-mode"
          >
            Tabletop
          </button>
          <button
            class:active={mode === 'chapter'}
            onclick={() => enterChapter(activeChapterId)}
            data-testid="chapter-mode"
          >
            1:1 chapter
          </button>
        </div>

        <div class="navigator-section">
          <p class="section-label">Chapters</p>
          <div class="chapter-list">
            {#each spatialPackage.roomChapters as chapter}
              <button
                class:active={mode === 'chapter' && activeChapterId === chapter.id}
                onclick={() => enterChapter(chapter.id)}
                aria-current={mode === 'chapter' && activeChapterId === chapter.id ? 'page' : undefined}
              >
                <span>{chapter.title}</span>
                <small>{chapter.widthIn / 12} × {chapter.depthIn / 12} ft</small>
              </button>
            {/each}
          </div>
        </div>

        <div class="navigator-section capability">
          <p class="section-label">Native delivery</p>
          <p>USD · unissued</p>
          <p>USDZ · unissued</p>
        </div>
      </aside>

      <section class="scene" aria-live="polite">
        {#if mode === 'tabletop'}
          <div class="scene-heading">
            <div>
              <p class="section-label">Tabletop / project overview</p>
              <h2>Review the whole proposal before entering a room.</h2>
            </div>
            <span class="mode-pill" data-testid="mode-state">Tabletop</span>
          </div>

          <div class="tabletop-canvas">
            <img
              src={tabletopPlan}
              alt="Threshold Dwelling Rev 0.8 derived floor plan"
              data-testid="tabletop-plan"
            />
            <div class="tabletop-overlay">
              <p>Rev {spatialPackage.spatialRevision} / design intent</p>
              <strong>65 ft × 42 ft primary footprint</strong>
              <span>2,730 sq ft candidate baseline</span>
            </div>
          </div>

          <div class="tabletop-actions">
            <button class="primary-action" onclick={() => enterChapter('kitchen')} data-testid="enter-kitchen">
              Enter kitchen chapter
            </button>
            <p>
              Tabletop is a project-scale review. Entering a chapter preserves room dimensions and
              rebases the local stage; it does not simulate free walking through the full house.
            </p>
          </div>
        {:else}
          <div class="scene-heading">
            <div>
              <p class="section-label">1:1 room chapter / {activeChapter.entityId}</p>
              <h2 data-testid="chapter-title">{activeChapter.title}</h2>
            </div>
            <span class="mode-pill" data-testid="mode-state">1:1 chapter</span>
          </div>

          <div class="chapter-canvas" data-testid="room-stage">
            {#if ['kitchen', 'dining', 'living'].includes(activeChapterId)}
              <img src={publicRoomVisual} alt="Proposed public room material visualization" />
            {/if}
            <div class="chapter-grid"></div>
            <div class="dimension-card">
              <p>Dimensionally meaningful</p>
              <strong data-testid="chapter-dimensions">{activeDimensions}</strong>
              <span>local stage: {activeChapter.safeStage.minimumWidthIn / 12} × {activeChapter.safeStage.minimumDepthIn / 12} ft minimum guidance</span>
            </div>
            <p class="rebase-note">ROOM-CHAPTER REBASE · NOT GLOBAL FREE ROAM</p>
          </div>

          <div class="chapter-actions">
            <button class="secondary-action" onclick={returnToTabletop} data-testid="return-tabletop">
              Return to tabletop
            </button>
            {#each activePortals as portal}
              {@const destination = chapterForId(spatialPackage, portal.toChapterId)}
              <button
                class="primary-action"
                onclick={() => traverse(portal.id)}
                data-testid={`portal-${portal.id}`}
              >
                Traverse portal → {destination.title}
              </button>
            {:else}
              <p class="quiet-note">No further portal is defined from this chapter.</p>
            {/each}
          </div>
        {/if}
      </section>

      <aside class="session-panel" aria-label="Local session timeline">
        <div>
          <p class="section-label">Session / local only</p>
          <h2>Decision timeline</h2>
          <p class="session-note">
            Annotations exist in this browser session only. Reloading preserves package identity and
            clears this local session state.
          </p>
        </div>

        <label for="annotation">Add an annotation</label>
        <textarea id="annotation" bind:value={annotationText} rows="4" data-testid="annotation-input"></textarea>
        <button class="primary-action" onclick={createAnnotation} data-testid="create-annotation">
          Create annotation
        </button>

        <ol class="timeline" data-testid="session-timeline">
          {#each annotations as annotation}
            <li>
              <span class="timeline-type">{annotation.kind}</span>
              <strong>{annotation.text}</strong>
              <code data-testid="annotation-operation-id">{annotation.operationId}</code>
              <small>{chapterForId(spatialPackage, annotation.chapterId).title} · Rev {annotation.spatialRevision}</small>
            </li>
          {:else}
            <li class="timeline-empty">No session operations yet.</li>
          {/each}
        </ol>
      </aside>
    </div>

    <footer class="proof-footer">
      <p>Package validation: client-safe · construction-ready: false · client source documents: excluded</p>
      <p>Native Vision Pro/RealityKit validation remains a separate future phase.</p>
    </footer>
  </main>
{/if}

<style>
  :global(body) {
    background: #10110f;
  }

  .preview-shell,
  .unavailable {
    box-sizing: border-box;
    min-height: 100vh;
    color: #f4f2e9;
    background:
      radial-gradient(circle at 73% 6%, rgba(171, 137, 80, 0.18), transparent 25rem),
      #10110f;
  }

  .preview-shell {
    padding: clamp(1rem, 3vw, 3rem);
  }

  .unavailable {
    display: grid;
    place-content: center;
    gap: 1rem;
    padding: 2rem;
  }

  .unavailable h1,
  .unavailable p {
    max-width: 42rem;
  }

  .topbar,
  .scene-heading,
  .chapter-actions,
  .proof-footer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
  }

  .topbar {
    margin-bottom: 1rem;
  }

  h1,
  h2,
  p,
  dl {
    margin: 0;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3.75rem);
    font-weight: 500;
    letter-spacing: -0.05em;
  }

  h2 {
    font-size: clamp(1.35rem, 2vw, 2rem);
    font-weight: 500;
    letter-spacing: -0.03em;
  }

  .eyebrow,
  .section-label,
  .timeline-type,
  dt,
  .rebase-note {
    color: #aca99c;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .package-stamp {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: 36rem;
    border: 1px solid #3b3c37;
  }

  .package-stamp div {
    min-width: 0;
    padding: 0.75rem;
    border-right: 1px solid #3b3c37;
  }

  .package-stamp div:last-child {
    border-right: 0;
  }

  dd {
    margin: 0.25rem 0 0;
    color: #f4f2e9;
    font: 0.72rem/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;
    overflow-wrap: anywhere;
  }

  .guardrail {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(208, 167, 93, 0.42);
    color: #e5d2ae;
    background: rgba(157, 114, 45, 0.1);
    font-size: 0.82rem;
  }

  .guardrail-mark {
    color: #d9a65a;
  }

  .experience-grid {
    display: grid;
    grid-template-columns: minmax(12rem, 0.72fr) minmax(0, 2.35fr) minmax(15rem, 0.86fr);
    min-height: 40rem;
    border: 1px solid #3b3c37;
  }

  .navigator,
  .session-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1rem;
    background: rgba(18, 19, 17, 0.88);
  }

  .navigator {
    border-right: 1px solid #3b3c37;
  }

  .session-panel {
    border-left: 1px solid #3b3c37;
  }

  .mode-switcher {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #3b3c37;
  }

  button {
    cursor: pointer;
    border: 0;
    border-radius: 0;
    color: inherit;
    background: none;
    font: inherit;
  }

  .mode-switcher button {
    padding: 0.65rem 0.4rem;
    color: #b9b7ac;
    font-size: 0.78rem;
  }

  .mode-switcher button + button {
    border-left: 1px solid #3b3c37;
  }

  .mode-switcher button.active,
  .chapter-list button.active {
    color: #121310;
    background: #f1eee4;
  }

  .navigator-section {
    display: grid;
    gap: 0.55rem;
  }

  .chapter-list {
    display: grid;
    gap: 1px;
    background: #343530;
  }

  .chapter-list button {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.55rem 0.6rem;
    color: #e3e1d7;
    background: #181916;
    text-align: left;
    font-size: 0.76rem;
  }

  .chapter-list small,
  .capability p,
  .session-note,
  .quiet-note {
    color: #a9a79c;
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .capability {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid #3b3c37;
  }

  .scene {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 1rem;
    min-width: 0;
    padding: clamp(1rem, 2vw, 1.75rem);
    background: #24241f;
  }

  .mode-pill {
    padding: 0.38rem 0.55rem;
    border: 1px solid #8f8b7b;
    color: #dedbce;
    font: 0.68rem ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: nowrap;
  }

  .tabletop-canvas,
  .chapter-canvas {
    position: relative;
    overflow: hidden;
    min-height: 25rem;
    border: 1px solid #5a594f;
    background: #dedbcf;
  }

  .tabletop-canvas::after,
  .chapter-canvas::after {
    position: absolute;
    inset: 0;
    content: '';
    pointer-events: none;
    background-image: linear-gradient(rgba(20, 21, 18, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(20, 21, 18, 0.05) 1px, transparent 1px);
    background-size: 1.5rem 1.5rem;
  }

  .tabletop-canvas img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 25rem;
    object-fit: contain;
    padding: 1rem;
  }

  .tabletop-overlay,
  .dimension-card,
  .rebase-note {
    position: absolute;
    z-index: 1;
  }

  .tabletop-overlay {
    right: 1rem;
    bottom: 1rem;
    display: grid;
    gap: 0.2rem;
    max-width: 15rem;
    padding: 0.75rem;
    color: #f0ede3;
    background: rgba(18, 19, 17, 0.91);
    font-size: 0.75rem;
  }

  .tabletop-overlay p,
  .tabletop-overlay span {
    color: #bebcaf;
  }

  .tabletop-actions,
  .chapter-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.7rem;
  }

  .tabletop-actions p {
    flex: 1 1 20rem;
    color: #b5b2a7;
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .primary-action,
  .secondary-action {
    padding: 0.72rem 0.85rem;
    font-size: 0.78rem;
    line-height: 1.1;
  }

  .primary-action {
    color: #131410;
    background: #e3bd75;
  }

  .primary-action:hover {
    background: #f2d398;
  }

  .secondary-action {
    border: 1px solid #777469;
    color: #e9e6da;
  }

  .chapter-canvas {
    isolation: isolate;
    background: linear-gradient(145deg, #262923, #b9a17c 180%);
  }

  .chapter-canvas img {
    position: absolute;
    z-index: -2;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.45;
    filter: saturate(0.65) contrast(0.85);
  }

  .chapter-grid {
    position: absolute;
    z-index: -1;
    inset: 10%;
    border: 2px solid rgba(244, 242, 233, 0.75);
    background: repeating-linear-gradient(90deg, rgba(244, 242, 233, 0.14) 0 1px, transparent 1px 2rem);
  }

  .dimension-card {
    left: 1.25rem;
    bottom: 1.25rem;
    display: grid;
    gap: 0.25rem;
    padding: 0.8rem;
    color: #f5f2e8;
    background: rgba(18, 19, 17, 0.9);
  }

  .dimension-card p,
  .dimension-card span {
    color: #c8c4b4;
    font-size: 0.72rem;
  }

  .dimension-card strong {
    font: 1.35rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .rebase-note {
    top: 1rem;
    right: 1rem;
    padding: 0.4rem;
    color: #f5f1e7;
    background: rgba(18, 19, 17, 0.67);
  }

  .session-panel h2 {
    margin-top: 0.2rem;
  }

  .session-note {
    margin-top: 0.5rem;
  }

  label {
    font-size: 0.78rem;
  }

  textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    border: 1px solid #5a594f;
    border-radius: 0;
    padding: 0.65rem;
    color: #f0ede3;
    background: #151612;
    font: 0.78rem/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .timeline {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .timeline li {
    display: grid;
    gap: 0.35rem;
    padding: 0.7rem;
    border-left: 2px solid #d2a85f;
    background: #191a16;
    font-size: 0.78rem;
  }

  .timeline code {
    color: #d9bd81;
    font-size: 0.67rem;
    overflow-wrap: anywhere;
  }

  .timeline small {
    color: #aaa79b;
    font-size: 0.68rem;
  }

  .timeline .timeline-empty {
    display: block;
    border-left-color: #55564f;
    color: #99968c;
  }

  .proof-footer {
    margin-top: 1rem;
    color: #aba89d;
    font-size: 0.72rem;
    line-height: 1.45;
  }

  @media (max-width: 900px) {
    .topbar,
    .proof-footer {
      display: grid;
    }

    .package-stamp {
      width: 100%;
      max-width: none;
    }

    .experience-grid {
      grid-template-columns: 1fr;
    }

    .navigator,
    .session-panel {
      border: 0;
    }

    .navigator {
      border-bottom: 1px solid #3b3c37;
    }

    .session-panel {
      border-top: 1px solid #3b3c37;
    }

    .chapter-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .capability {
      margin-top: 0;
    }
  }

  @media (max-width: 520px) {
    .preview-shell {
      padding: 0.75rem;
    }

    .package-stamp,
    .chapter-list {
      grid-template-columns: 1fr;
    }

    .package-stamp div,
    .package-stamp div:last-child {
      border-right: 0;
      border-bottom: 1px solid #3b3c37;
    }

    .package-stamp div:last-child {
      border-bottom: 0;
    }

    .scene-heading {
      display: grid;
    }

    .mode-pill {
      justify-self: start;
    }
  }
</style>
