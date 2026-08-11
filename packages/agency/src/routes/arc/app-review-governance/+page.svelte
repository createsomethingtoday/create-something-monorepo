<script lang="ts">
  import {
    APP_REVIEW_GOVERNANCE_COMPOSITION,
    type AtlasActionProposal,
    type AtlasActionReceipt,
    type AtlasCompositionScene
  } from '@create-something/atlas-composition';
  import {
    PerformanceNarrativeStage,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  const composition = APP_REVIEW_GOVERNANCE_COMPOSITION;
  const arcRoute = composition.routes.find((route) => route.id === 'app-review-governance-arc');
  if (!arcRoute) throw new Error('App Review Governance Arc route is required.');

  const toneByKind: Record<AtlasCompositionScene['kind'], PerformanceNarrativeScene['tone']> = {
    signal: 'review',
    automation: 'neutral',
    map: 'neutral',
    judgment: 'review',
    runbook: 'allow',
    receipt: 'allow'
  };

  const scenes: PerformanceNarrativeScene[] = arcRoute.sceneIds.map((sceneId) => {
    const scene = composition.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new Error(`Unknown Arc scene: ${sceneId}`);
    return {
      id: scene.id,
      label: scene.label,
      summary: scene.summary,
      title: scene.title,
      detail: scene.detail,
      tone: toneByKind[scene.kind],
      evidence: scene.evidence,
      receipts: scene.id === 'proof' ? ['Local fixture only · no external write'] : undefined
    };
  });

  const nodeLabels: Record<string, string> = {
    'app-submission-form': 'App submission form',
    'app-review-preflight': 'App Review Preflight',
    'webflow-app-preflight-skills': 'Preflight skills',
    'slack-signal': 'Slack signal',
    'claude-agent': 'Claude / agent',
    'app-governance-mcp': 'Governance MCP',
    'd1-governance-record': 'D1 record',
    'airtable-projection': 'Airtable projection',
    'zendesk-context': 'Zendesk context',
    'operator-decision': 'Operator decision',
    'workflow-receipt': 'Receipt'
  };
  const mapModule = composition.mapModules[0];
  const motionArtifact = composition.artifacts.find((artifact) => artifact.id === 'motion-authoring-contract');

  let proposal = $state<AtlasActionProposal | null>(null);
  let receipt = $state<AtlasActionReceipt | null>(null);
  let actionError = $state<string | null>(null);
  let actionBusy = $state(false);

  function sourceScene(sceneId: string): AtlasCompositionScene {
    const scene = composition.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new Error(`Unknown Arc scene: ${sceneId}`);
    return scene;
  }

  async function localAction(type: 'propose' | 'decide' | 'execute', decision?: 'approved' | 'rejected') {
    actionBusy = true;
    actionError = null;
    try {
      const response = await fetch('/api/arcs/app-review-governance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, decision, proposal })
      });
      const payload = (await response.json()) as {
        action?: AtlasActionProposal;
        error?: string;
        proposal?: AtlasActionProposal;
        receipt?: AtlasActionReceipt;
      };
      if (!response.ok) throw new Error(payload.error ?? 'The local action could not complete.');
      if (payload.proposal) proposal = payload.proposal;
      if (payload.action) proposal = payload.action;
      if (payload.receipt) receipt = payload.receipt;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The local action could not complete.';
    } finally {
      actionBusy = false;
    }
  }
</script>

<svelte:head>
  <title>App Review Governance Arc · local prototype</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="arc-prototype property-performance">
  <header class="arc-hero">
    <div>
      <p class="arc-kicker">Arc / local prototype / map → decision → proof</p>
      <h1>App Review Governance</h1>
      <p>
        A durable story of how an App Submission Form, App Review Preflight, and versioned Preflight skills become a governed, operator-approved action and receipt—without collapsing Slack, Airtable, Zendesk, D1, agents, or MCPs into one ambiguous system.
      </p>
    </div>
    <dl class="arc-hero__facts" aria-label="Arc prototype boundaries">
      <div><dt>Map</dt><dd>Pinned local fixture</dd></div>
      <div><dt>Writes</dt><dd>None outside this browser</dd></div>
      <div><dt>Motion</dt><dd>Agent-authored cues</dd></div>
      <div><dt>Authority</dt><dd>Operator gate</dd></div>
    </dl>
  </header>

  <section class="arc-contract" aria-labelledby="arc-contract-title">
    <div>
      <span>Composability contract</span>
      <h2 id="arc-contract-title">One Map Module, three useful contexts.</h2>
    </div>
    <ol>
      {#each composition.routes as route}
        <li data-route-kind={route.kind}>
          <strong>{route.kind}</strong>
          <span>{route.description}</span>
          <small>{route.sceneIds.length} referenced scenes · same map module</small>
        </li>
      {/each}
    </ol>
  </section>

  <PerformanceNarrativeStage
    id="app-review-governance-arc"
    eyebrow="A reusable operating artifact"
    title="Intake → Decision → Proof"
    description="Every page carries a data-authored motion cue. The intake scene keeps the form, controlled Preflight evidence, and skills gate distinct from an operator decision. Motion is a controllable state change, never the only way to understand the story. Use the scene rail, arrows, or a direct URL fragment to navigate."
    {scenes}
    ariaLabel="App Review Governance Arc scenes"
  >
    {#snippet preview()}
      <div class="arc-preview" aria-label="App Review governance map module">
        <div>
          <span>Map Module</span>
          <strong>{mapModule.title}</strong>
          <small>{mapModule.map.version.mode} · {mapModule.map.version.id}</small>
        </div>
        <p>{mapModule.description}</p>
      </div>
    {/snippet}

    {#snippet artifact(narrativeScene: PerformanceNarrativeScene)}
      {@const scene = sourceScene(narrativeScene.id)}
      <div class="arc-scene" data-motion-cue={scene.motion.cue}>
        <div class="arc-scene__meta">
          <span>Motion cue</span>
          <strong>{scene.motion.cue.replace('-', ' ')}</strong>
          <small>{scene.motion.source} · reduced motion: {scene.motion.reducedMotion}</small>
        </div>

        <div class="arc-module" aria-label={`Map module focused on ${scene.label}`}>
          <div class="arc-module__topline">
            <span>{mapModule.title}</span>
            <small>{mapModule.map.version.mode} version {mapModule.map.version.id}</small>
          </div>
          <div class="arc-map" data-motion-cue={scene.motion.cue}>
            <div class="arc-map__trace" aria-hidden="true"></div>
            {#each mapModule.selection.nodeIds as nodeId, index}
              <div
                class:arc-map__node--focused={scene.focusNodeIds.includes(nodeId)}
                class="arc-map__node"
                style:--node-index={index}
                data-node={nodeId}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{nodeLabels[nodeId]}</strong>
              </div>
            {/each}
          </div>
          <p class="arc-module__legend">
            Focused nodes are the portion of the same shared map used by this scene. The module is referenced, never copied or nested.
          </p>
        </div>

        <div class="arc-scene__evidence">
          {#each scene.artifactIds as artifactId}
            {@const artifact = composition.artifacts.find((item) => item.id === artifactId)}
            {#if artifact}
              <article>
                <span>{artifact.kind}</span>
                <h4>{artifact.title}</h4>
                <p>{artifact.summary}</p>
                <small>{artifact.provenance.source}</small>
              </article>
            {/if}
          {/each}
        </div>

        {#if scene.id === 'decide'}
          <section class="arc-action" aria-labelledby="arc-action-title">
            <div>
              <span>Operator loop</span>
              <h4 id="arc-action-title">One bounded action, no hidden authority.</h4>
              <p>
                The MCP can draft this local action. Only an operator decision can move it forward; execution returns a local runtime receipt.
              </p>
            </div>
            <div class="arc-action__controls">
              {#if !proposal}
                <button type="button" onclick={() => localAction('propose')} disabled={actionBusy}>Draft action</button>
              {:else if proposal.status === 'proposed'}
                <button type="button" onclick={() => localAction('decide', 'rejected')} disabled={actionBusy}>Reject</button>
                <button type="button" class="arc-action__approve" onclick={() => localAction('decide', 'approved')} disabled={actionBusy}>Approve local action</button>
              {:else if proposal.status === 'approved'}
                <button type="button" class="arc-action__approve" onclick={() => localAction('execute')} disabled={actionBusy}>Run approved action</button>
              {:else}
                <strong data-action-state={proposal.status}>{proposal.status}</strong>
              {/if}
            </div>
            {#if proposal}
              <p class="arc-action__status" aria-live="polite">
                <strong>{proposal.status}</strong> · {proposal.title} · gate: {proposal.gate}
              </p>
            {/if}
            {#if actionError}<p class="arc-action__error" role="alert">{actionError}</p>{/if}
          </section>
        {:else if scene.id === 'run' && proposal}
          <section class="arc-run-state" aria-live="polite">
            <span>Run state</span>
            <strong>{proposal.status}</strong>
            <p>{proposal.status === 'approved' ? 'The operator has cleared the local-only gate.' : 'The run cannot proceed unless the proposal is approved.'}</p>
          </section>
        {:else if scene.id === 'proof'}
          <section class="arc-receipt" data-receipt-state={receipt ? 'recorded' : 'waiting'} aria-live="polite">
            <span>Receipt</span>
            {#if receipt}
              <strong>{receipt.kind} · {receipt.status}</strong>
              <p>{receipt.evidence}</p>
              <small>Issued by {receipt.issuer} · {receipt.mode}</small>
            {:else}
              <strong>Waiting for a locally approved run</strong>
              <p>The receipt remains absent until the operator approves and the local runtime executes the bounded action.</p>
            {/if}
          </section>
        {/if}
      </div>
    {/snippet}
  </PerformanceNarrativeStage>

  {#if motionArtifact}
    <aside class="arc-motion-note">
      <span>AI-native motion boundary</span>
      <p>{motionArtifact.summary}</p>
      <small>
        Model: {motionArtifact.provenance.model} · Prompt: {motionArtifact.provenance.promptReference} · Rights: {motionArtifact.provenance.rights} · Cost: ${motionArtifact.provenance.costUsd.toFixed(2)}
      </small>
    </aside>
  {/if}
</main>

<style>
  .arc-prototype { background: var(--color-performance-paper, #f3f3f0); color: var(--color-performance-ink, #090909); min-height: 100vh; }
  .arc-hero, .arc-contract, .arc-motion-note { width: min(calc(100% - 2rem), 1120px); margin-inline: auto; }
  .arc-hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(260px, .7fr); gap: clamp(2rem, 8vw, 7rem); padding: clamp(5rem, 13vw, 10rem) 0 clamp(3rem, 6vw, 5rem); }
  .arc-kicker, .arc-contract > div > span, .arc-scene__meta > span, .arc-motion-note > span, .arc-action span, .arc-run-state span, .arc-receipt > span { color: var(--color-performance-muted, #5f605a); font: 600 .72rem/1.2 var(--font-mono, ui-monospace, monospace); letter-spacing: .12em; text-transform: uppercase; }
  .arc-hero h1 { max-width: 11ch; margin: .8rem 0 1.25rem; font-size: clamp(3.4rem, 8.5vw, 7.7rem); letter-spacing: -.075em; line-height: .88; }
  .arc-hero p { max-width: 62ch; font-size: clamp(1.08rem, 2vw, 1.35rem); line-height: 1.55; }
  .arc-hero__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-self: end; margin: 0; border-top: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div { padding: 1rem 0; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div:nth-child(odd) { padding-right: 1rem; border-right: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div:nth-child(even) { padding-left: 1rem; }
  .arc-hero__facts dt { color: var(--color-performance-muted, #5f605a); font-size: .78rem; text-transform: uppercase; }
  .arc-hero__facts dd { margin: .4rem 0 0; font-weight: 650; }
  .arc-contract { display: grid; grid-template-columns: minmax(0, .65fr) minmax(0, 1.35fr); gap: 2rem; padding: 2rem 0; border-top: 1px solid var(--color-performance-ink, #090909); }
  .arc-contract h2 { max-width: 12ch; margin: .5rem 0 0; font-size: clamp(1.7rem, 3vw, 2.7rem); line-height: 1; }
  .arc-contract ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin: 0; padding: 0; background: var(--color-performance-line, #d7d7d2); list-style: none; }
  .arc-contract li { display: grid; gap: .55rem; padding: 1rem; background: var(--color-performance-paper, #f3f3f0); }
  .arc-contract li strong { color: var(--color-performance-accent, #b8441b); font: 700 .78rem/1 var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-contract li span { font-size: .9rem; line-height: 1.4; }
  .arc-contract li small { color: var(--color-performance-muted, #5f605a); font-size: .72rem; }
  .arc-preview { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding: 1rem; border: 1px solid var(--color-performance-line, #d7d7d2); background: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 85%, white); }
  .arc-preview div { display: grid; gap: .3rem; }
  .arc-preview span, .arc-preview small { color: var(--color-performance-muted, #5f605a); font: .72rem/1.3 var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-preview strong { font-size: 1rem; }
  .arc-preview p { max-width: 48ch; margin: 0; font-size: .85rem; line-height: 1.45; }
  .arc-scene { display: grid; gap: 1rem; }
  .arc-scene__meta { display: flex; align-items: baseline; gap: .6rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); padding-bottom: .7rem; }
  .arc-scene__meta strong { font-size: .86rem; text-transform: capitalize; }
  .arc-scene__meta small { color: var(--color-performance-muted, #5f605a); font-size: .74rem; }
  .arc-module { overflow: hidden; border: 1px solid var(--color-performance-ink, #090909); background: #111; color: #f2f1eb; }
  .arc-module__topline { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; border-bottom: 1px solid rgb(255 255 255 / .24); color: #cbc9c0; font: .72rem/1.2 var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-module__topline span { color: #fffdf5; font-weight: 700; }
  .arc-map { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; min-height: 205px; padding: 1rem; isolation: isolate; }
  .arc-map__trace { position: absolute; z-index: -1; top: 50%; left: 5%; width: 90%; border-top: 1px dashed rgb(225 220 201 / .6); transform: rotate(-5deg); }
  .arc-map__node { display: grid; align-content: end; min-height: 82px; padding: .7rem; border: 1px solid rgb(255 255 255 / .22); background: rgb(255 255 255 / .05); opacity: .42; transition: opacity .18s ease, transform .18s ease, border-color .18s ease; }
  .arc-map__node span { color: #a7a49a; font: .68rem/1 var(--font-mono, ui-monospace, monospace); }
  .arc-map__node strong { margin-top: .5rem; font-size: .83rem; line-height: 1.05; }
  .arc-map__node--focused { border-color: #ebd26c; background: rgb(235 210 108 / .14); opacity: 1; }
  .arc-module__legend { margin: 0; padding: .8rem 1rem; border-top: 1px solid rgb(255 255 255 / .24); color: #bdbbb2; font-size: .75rem; line-height: 1.45; }
  .arc-scene__evidence { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1px; background: var(--color-performance-line, #d7d7d2); }
  .arc-scene__evidence article { padding: 1rem; background: var(--color-performance-paper, #f3f3f0); }
  .arc-scene__evidence span { color: var(--color-performance-muted, #5f605a); font: .68rem/1 var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-scene__evidence h4 { margin: .45rem 0; font-size: .96rem; }
  .arc-scene__evidence p { margin: 0 0 .75rem; font-size: .8rem; line-height: 1.45; }
  .arc-scene__evidence small { color: var(--color-performance-muted, #5f605a); font-size: .7rem; }
  .arc-action, .arc-run-state, .arc-receipt { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem 2rem; padding: 1rem; border: 1px solid var(--color-performance-ink, #090909); }
  .arc-action h4, .arc-run-state strong, .arc-receipt strong { margin: .4rem 0; font-size: 1rem; }
  .arc-action p, .arc-run-state p, .arc-receipt p { max-width: 56ch; margin: .45rem 0 0; font-size: .82rem; line-height: 1.45; }
  .arc-action__controls { display: flex; flex-wrap: wrap; align-items: start; justify-content: end; gap: .5rem; }
  .arc-action button { border: 1px solid var(--color-performance-ink, #090909); background: transparent; color: inherit; padding: .65rem .75rem; font: 650 .78rem/1 var(--font-mono, ui-monospace, monospace); cursor: pointer; }
  .arc-action button:hover:not(:disabled), .arc-action__approve { background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-action button:disabled { cursor: wait; opacity: .55; }
  .arc-action__status, .arc-action__error { grid-column: 1 / -1; border-top: 1px solid var(--color-performance-line, #d7d7d2); padding-top: .75rem; }
  .arc-action__error { color: #a02617; }
  .arc-run-state, .arc-receipt { grid-template-columns: 1fr; }
  .arc-run-state { border-color: #8b7420; background: #f9f2d6; }
  .arc-receipt { border-style: dashed; }
  .arc-receipt[data-receipt-state='recorded'] { border-style: solid; border-width: 2px; background: #e7f2e9; }
  .arc-motion-note { margin-top: 3rem; padding: 1rem 0 4rem; border-top: 1px solid var(--color-performance-ink, #090909); }
  .arc-motion-note p { max-width: 55ch; margin: .5rem 0; font-size: 1rem; }
  .arc-motion-note small { color: var(--color-performance-muted, #5f605a); font-size: .74rem; line-height: 1.45; }
  @media (prefers-reduced-motion: no-preference) {
    .arc-scene[data-motion-cue='signal-reveal'] .arc-map__node--focused { animation: arc-signal 720ms cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--node-index) * 80ms); }
    .arc-scene[data-motion-cue='handoff-trace'] .arc-map__trace { animation: arc-trace 1.4s ease-in-out infinite; }
    .arc-scene[data-motion-cue='module-focus'] .arc-map__node--focused { animation: arc-focus 920ms cubic-bezier(.2, .8, .2, 1) both; }
    .arc-scene[data-motion-cue='decision-gate'] .arc-module { animation: arc-gate 1.15s ease-in-out infinite; }
    .arc-scene[data-motion-cue='recovery-loop'] .arc-map__trace { animation: arc-loop 1.2s linear infinite; }
    .arc-scene[data-motion-cue='proof-stamp'] .arc-module { animation: arc-proof 820ms cubic-bezier(.2, .8, .2, 1) both; }
  }
  @keyframes arc-signal { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes arc-trace { 0%, 100% { opacity: .28; transform: rotate(-5deg) scaleX(.3); transform-origin: left; } 50% { opacity: 1; transform: rotate(-5deg) scaleX(1); transform-origin: left; } }
  @keyframes arc-focus { 0% { transform: scale(.92); } 55% { transform: scale(1.04); } 100% { transform: scale(1); } }
  @keyframes arc-gate { 0%, 100% { box-shadow: inset 0 0 0 0 rgb(235 210 108 / 0); } 50% { box-shadow: inset 0 0 0 3px rgb(235 210 108 / .85); } }
  @keyframes arc-loop { to { transform: rotate(-5deg) translateX(22px); } }
  @keyframes arc-proof { from { filter: brightness(1.9); transform: scale(.985); } to { filter: brightness(1); transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .arc-scene *, .arc-scene *::before, .arc-scene *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; } .arc-map__node--focused { outline: 2px solid #ebd26c; outline-offset: -3px; } }
  @media (max-width: 760px) { .arc-hero, .arc-contract { grid-template-columns: 1fr; } .arc-contract ol, .arc-map { grid-template-columns: repeat(2, minmax(0, 1fr)); } .arc-preview, .arc-module__topline { align-items: start; flex-direction: column; } .arc-action { grid-template-columns: 1fr; } .arc-action__controls { justify-content: start; } }
</style>
