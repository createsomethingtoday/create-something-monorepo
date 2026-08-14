<script lang="ts">
  import { dev } from '$app/environment';
  import {
    THRESHOLD_DWELLING_SPATIAL_PACKAGE,
    DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT,
    assetBrowserUrl,
    chapterForId,
    composerProposalForIntent,
    createSessionAnnotation,
    createSessionProposalDecision,
    interpretThresholdDwellingComposerIntent,
    portalsFrom,
    type WorkWayComposerInterpretation,
    type WorkWaySessionAnnotation,
    type WorkWaySessionOperation,
    type WorkWaySessionProposalDecision
  } from '$lib/workway/threshold-dwelling-spatial-package';
  import WorkWayMassingViewer from '$lib/workway/WorkWayMassingViewer.svelte';
  import {
    THRESHOLD_DWELLING_MASSING_GUIDE,
    createThresholdDwellingMassingGeometry
  } from '$lib/workway/threshold-dwelling-massing';

  const spatialPackage = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const tabletopPlan = assetBrowserUrl(spatialPackage, 'tabletop-plan-svg');
  const publicRoomVisual = assetBrowserUrl(spatialPackage, 'public-room-hero-png');
  const massingGlb = assetBrowserUrl(spatialPackage, 'browser-massing-glb');
  const localPreview = dev;

  const massingGuide = THRESHOLD_DWELLING_MASSING_GUIDE;
  const massingGeometry = createThresholdDwellingMassingGeometry(massingGuide);
  const physicalSceneEvidenceFacts = spatialPackage.physicalSceneContract.evidenceFacts;
  const acceptedPhysicalSceneEvidenceCount = physicalSceneEvidenceFacts.filter(
    (fact) => fact.evidenceStatus === 'accepted'
  ).length;

  let mode = $state<'tabletop' | 'massing' | 'chapter'>('tabletop');
  let activeChapterId = $state('kitchen');
  let annotationText = $state('Island clearance: compare the proposed 4 in south move.');
  let annotations = $state<WorkWaySessionAnnotation[]>([]);
  let proposalDecision = $state<WorkWaySessionProposalDecision | null>(null);
  let composerIntent = $state(DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT);
  let composerInterpretation = $state<WorkWayComposerInterpretation | null>(null);

  const initialKitchenIslandProposal = composerProposalForIntent(
    spatialPackage,
    DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT
  );
  if (!initialKitchenIslandProposal) {
    throw new Error('The Rust-derived default Composer proposal is unavailable for this package.');
  }
  const kitchenIslandProposal = initialKitchenIslandProposal;
  const activeChapter = $derived(chapterForId(spatialPackage, activeChapterId));
  const activePortals = $derived(portalsFrom(spatialPackage, activeChapterId));
  const activeDimensions = $derived(
    `${activeChapter.widthIn / 12} ft × ${activeChapter.depthIn / 12} ft`
  );
  const sessionOperations = $derived<readonly WorkWaySessionOperation[]>([
    ...(proposalDecision ? [proposalDecision] : []),
    ...annotations
  ]);

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

  function enterMassing() {
    mode = 'massing';
  }

  function recordProposalDecision(decision: WorkWaySessionProposalDecision['decision']) {
    proposalDecision = createSessionProposalDecision(spatialPackage, kitchenIslandProposal, decision);
  }

  function submitComposerIntent() {
    composerInterpretation = interpretThresholdDwellingComposerIntent(spatialPackage, composerIntent);
    proposalDecision = null;
  }

  function recordComposerProposalDecision(decision: WorkWaySessionProposalDecision['decision']) {
    if (!composerInterpretation || composerInterpretation.kind !== 'proposed') {
      throw new Error('A valid Composer proposal is required before recording a decision.');
    }
    proposalDecision = createSessionProposalDecision(
      spatialPackage,
      composerInterpretation.proposal,
      decision
    );
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
        shipped USD/USDZ asset is present in this local client package. The browser 3D massing guide
        is review-only: the physical 1:1 scene gate is blocked until issued vertical, opening, and
        site geometry is accepted.
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
            class:active={mode === 'massing'}
            onclick={enterMassing}
            data-testid="massing-mode"
          >
            3D guide
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
          <p class="section-label">Render delivery</p>
          <p>2D plan · available</p>
          <p>Browser 3D · available</p>
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
            <button class="primary-action" onclick={enterMassing} data-testid="enter-massing">
              Inspect 3D massing
            </button>
            <button class="secondary-action" onclick={() => enterChapter('kitchen')} data-testid="enter-kitchen">
              Enter kitchen chapter
            </button>
            <p>
              Tabletop is a project-scale review. Entering a chapter preserves room dimensions and
              rebases the local stage; it does not simulate free walking through the full house.
            </p>
          </div>
        {:else if mode === 'massing'}
          <div class="scene-heading">
            <div>
              <p class="section-label">3D massing / dimensional floor-plan basis</p>
              <h2>Inspect the same proposal as a spatial volume.</h2>
            </div>
            <span class="mode-pill" data-testid="mode-state">3D guide</span>
          </div>

          <WorkWayMassingViewer geometry={massingGeometry} guide={massingGuide} />

          <aside class="truth-gate" data-testid="physical-scene-gate" aria-label="Physical scene issuance gate">
            <p class="section-label">Physical 1:1 scene</p>
            <strong>Blocked · {spatialPackage.physicalSceneContract.unissuedFactIds.length} geometry fact sets unissued</strong>
            <span>
              The plan is exact in its issued horizontal scope. Elevations, wall/roof assemblies,
              openings, structure, MEP coordination, and site thresholds still require traceable,
              accepted geometry.
            </span>
          </aside>

          <details class="evidence-readiness" data-testid="physical-scene-evidence-readiness">
            <summary>
              Evidence readiness · {acceptedPhysicalSceneEvidenceCount} of {physicalSceneEvidenceFacts.length} accepted
            </summary>
            <p>
              This client receives status and required reviewer roles only. Private documents, source
              references, asserted values, and reviewer identities remain outside the spatial package.
            </p>
            <ul>
              {#each physicalSceneEvidenceFacts as fact}
                <li>
                  <div>
                    <strong>{fact.title}</strong>
                    <span class:accepted={fact.evidenceStatus === 'accepted'} class="evidence-status">
                      {fact.evidenceStatus}
                    </span>
                  </div>
                  <span>Review: {fact.requiredReviewerRoles.join(' · ')}</span>
                </li>
              {/each}
            </ul>
          </details>

          <div class="tabletop-actions">
            <button class="secondary-action" onclick={returnToTabletop} data-testid="massing-return-tabletop">
              Return to tabletop
            </button>
            <a class="secondary-action" href={massingGlb} download data-testid="download-massing-glb">
              Download GLB
            </a>
            <button class="primary-action" onclick={() => enterChapter('kitchen')}>
              Enter kitchen chapter
            </button>
            <p>
              This is a dimensional plan-based massing view, not an elevation, window schedule,
              structural model, or permitted building model.
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
            {#if activeChapterId === kitchenIslandProposal.chapterId}
              <div
                class:decision-recorded={proposalDecision !== null}
                class="proposal-overlay"
                data-testid="island-clearance-proposal"
              >
                <p>PROPOSED · REVIEW BEFORE APPLY</p>
                <strong>Island → 4 in south</strong>
                <span>Refrigerator clearance 38 → 42 in · opposite aisle 48 → 44 in</span>
              </div>
            {/if}
            <div class="dimension-card">
              <p>Dimensionally meaningful</p>
              <strong data-testid="chapter-dimensions">{activeDimensions}</strong>
              <span>horizontal plan scope only · physical 1:1 scene blocked pending issued geometry</span>
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

        <section class="proposal-card" aria-label="Kitchen island clearance proposal">
          <p class="section-label">Proposed change</p>
          <h3>Kitchen island clearance</h3>
          <p>{kitchenIslandProposal.intent}</p>
          <dl class="proposal-measurements">
            {#each kitchenIslandProposal.measurements as measurement}
              <div>
                <dt>{measurement.id.replaceAll('-', ' ')}</dt>
                <dd>{measurement.currentIn} → {measurement.proposedIn} in{measurement.targetIn ? ` · target ${measurement.targetIn} in` : ''}</dd>
              </div>
            {/each}
          </dl>
          {#if proposalDecision}
            <p class="decision-status" data-testid="proposal-decision-status">
              {proposalDecision.decision === 'accepted' ? 'Accepted' : 'Rejected'} locally. Canonical geometry has not changed.
            </p>
          {:else}
            <div class="proposal-actions">
              <button
                class="primary-action"
                onclick={() => recordProposalDecision('accepted')}
                data-testid="accept-island-proposal"
              >
                Approve and record
              </button>
              <button
                class="secondary-action"
                onclick={() => recordProposalDecision('rejected')}
                data-testid="reject-island-proposal"
              >
                Reject
              </button>
            </div>
          {/if}
          <p class="proposal-boundary">
            Local decision only. It neither applies geometry nor establishes construction or code compliance.
          </p>
        </section>

        <section class="proposal-card" aria-label="Composer change review" data-testid="composer-review">
          <p class="section-label">Composer / bounded intent</p>
          <h3>Propose a typed change</h3>
          <p>
            Composer can interpret only codified operations. It proposes a deterministic change set;
            it does not author mesh geometry or accept its own work.
          </p>
          <label for="composer-intent">Change intent</label>
          <textarea
            id="composer-intent"
            bind:value={composerIntent}
            rows="3"
            data-testid="composer-intent-input"
          ></textarea>
          <button class="primary-action" onclick={submitComposerIntent} data-testid="submit-composer-intent">
            Propose change
          </button>
          {#if composerInterpretation?.kind === 'proposed'}
            <div class="composer-result" data-testid="composer-proposed-result">
              <p class="section-label">Deterministic proposal</p>
              <code data-testid="composer-proposal-id">{composerInterpretation.proposal.id}</code>
              <p>
                {composerInterpretation.proposal.operation.kind === 'move-entity'
                  ? `${composerInterpretation.proposal.operation.entityId} → ${composerInterpretation.proposal.operation.deltaYIn} in south`
                  : `${composerInterpretation.proposal.operation.entityId} → ${composerInterpretation.proposal.operation.materialRoleId}`}
              </p>
              <p>Validation: deterministic · {composerInterpretation.validation.issueIds.length} issues</p>
              <dl class="proposal-measurements">
                {#each composerInterpretation.proposal.measurements as measurement}
                  <div>
                    <dt>{measurement.id.replaceAll('-', ' ')}</dt>
                    <dd>{measurement.currentIn} → {measurement.proposedIn} in{measurement.targetIn ? ` · target ${measurement.targetIn} in` : ''}</dd>
                  </div>
                {/each}
              </dl>
              {#if proposalDecision?.proposalId === composerInterpretation.proposal.id}
                <p class="decision-status" data-testid="composer-decision-status">
                  {proposalDecision.decision === 'accepted' ? 'Accepted' : 'Rejected'} locally. Canonical geometry has not changed.
                </p>
              {:else}
                <div class="proposal-actions">
                  <button
                    class="primary-action"
                    onclick={() => recordComposerProposalDecision('accepted')}
                    data-testid="accept-composer-proposal"
                  >
                    Accept and record
                  </button>
                  <button
                    class="secondary-action"
                    onclick={() => recordComposerProposalDecision('rejected')}
                    data-testid="reject-composer-proposal"
                  >
                    Reject
                  </button>
                </div>
              {/if}
            </div>
          {:else if composerInterpretation?.kind === 'blocked'}
            <div class="composer-result composer-blocked" data-testid="composer-blocked-result">
              <p class="section-label">Blocked / evidence gate</p>
              <code>{composerInterpretation.reasonId}</code>
              <p>{composerInterpretation.explanation}</p>
            </div>
          {/if}
        </section>

        <label for="annotation">Add an annotation</label>
        <textarea id="annotation" bind:value={annotationText} rows="4" data-testid="annotation-input"></textarea>
        <button class="primary-action" onclick={createAnnotation} data-testid="create-annotation">
          Create annotation
        </button>

        <ol class="timeline" data-testid="session-timeline">
          {#each sessionOperations as operation}
            {#if operation.kind === 'create-annotation'}
              <li>
                <span class="timeline-type">{operation.kind}</span>
                <strong>{operation.text}</strong>
                <code data-testid="annotation-operation-id">{operation.operationId}</code>
                <small>{chapterForId(spatialPackage, operation.chapterId).title} · Rev {operation.spatialRevision}</small>
              </li>
            {:else}
              <li>
                <span class="timeline-type">{operation.kind}</span>
                <strong>Kitchen island proposal {operation.decision}</strong>
                <code data-testid="proposal-decision-operation-id">{operation.operationId}</code>
                <small>Local session record · Rev {operation.spatialRevision}</small>
              </li>
            {/if}
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
  h3,
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .truth-gate {
    display: grid;
    gap: 0.35rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid #8f7140;
    background: #2a261c;
  }

  .truth-gate strong {
    color: #efd18f;
    font-size: 0.82rem;
  }

  .truth-gate span {
    max-width: 52rem;
    color: #cbc0a8;
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .evidence-readiness {
    padding: 0.8rem 0.9rem;
    border: 1px solid #56574f;
    background: #1c1e1a;
  }

  .evidence-readiness summary {
    cursor: pointer;
    color: #e7e2d4;
    font: 0.74rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .evidence-readiness > p {
    max-width: 52rem;
    margin: 0.8rem 0;
    color: #b8b5aa;
    font-size: 0.75rem;
    line-height: 1.5;
  }

  .evidence-readiness ul {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .evidence-readiness li {
    display: grid;
    gap: 0.16rem;
    padding: 0.55rem 0;
    border-top: 1px solid #3c3e37;
  }

  .evidence-readiness li > div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.45rem;
  }

  .evidence-readiness strong {
    color: #e4e0d4;
    font-size: 0.78rem;
  }

  .evidence-readiness li > span {
    color: #a9a79c;
    font-size: 0.72rem;
    line-height: 1.4;
  }

  .evidence-status {
    color: #e1b966;
    font: 0.65rem ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: uppercase;
  }

  .evidence-status.accepted {
    color: #a9ce9d;
  }

  .primary-action,
  .secondary-action {
    padding: 0.72rem 0.85rem;
    font-size: 0.78rem;
    line-height: 1.1;
  }

  a.secondary-action {
    text-decoration: none;
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

  .proposal-overlay {
    position: absolute;
    z-index: 1;
    top: 3.75rem;
    left: 1.25rem;
    display: grid;
    gap: 0.25rem;
    max-width: min(21rem, calc(100% - 2.5rem));
    padding: 0.7rem;
    border: 1px solid rgba(229, 189, 117, 0.85);
    color: #f8f0dc;
    background: rgba(42, 35, 23, 0.84);
    font-size: 0.72rem;
  }

  .proposal-overlay p {
    color: #eccb85;
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  .proposal-overlay span {
    color: #ded5bd;
    line-height: 1.4;
  }

  .proposal-overlay.decision-recorded {
    border-color: #8c9e79;
    background: rgba(37, 49, 33, 0.87);
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

  .proposal-card {
    display: grid;
    gap: 0.55rem;
    padding: 0.8rem;
    border: 1px solid #5a594f;
    background: rgba(31, 31, 26, 0.78);
  }

  .proposal-card h3 {
    font-size: 1rem;
    font-weight: 500;
  }

  .proposal-card > p:not(.section-label):not(.proposal-boundary):not(.decision-status) {
    color: #d1cec0;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .proposal-measurements {
    display: grid;
    gap: 0.35rem;
    margin: 0;
  }

  .proposal-measurements div {
    display: grid;
    gap: 0.12rem;
  }

  .proposal-measurements dt,
  .proposal-measurements dd {
    color: #bbb7a8;
    font-size: 0.66rem;
    letter-spacing: normal;
    text-transform: none;
  }

  .proposal-measurements dd {
    margin: 0;
    color: #f0e1ba;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .proposal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .decision-status {
    color: #d6e2c8;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .proposal-boundary {
    color: #aaa79b;
    font-size: 0.67rem;
    line-height: 1.4;
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
