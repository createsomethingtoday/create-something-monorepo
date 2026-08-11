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

  function mediaForScene(scene: AtlasCompositionScene) {
    const mediaId = scene.presentation.media?.artifactId;
    return mediaId ? composition.artifacts.find((artifact) => artifact.id === mediaId) : undefined;
  }

  function formatCost(costUsd: number | null): string {
    return costUsd === null ? 'Not separately metered' : `$${costUsd.toFixed(2)}`;
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
  <title>App Review Governance Arc · CREATE SOMETHING</title>
  <meta
    name="description"
    content="A presentation-native Arc showing how App Review intake, Preflight evidence, governed action, and receipts fit together."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="arc-prototype property-performance">
  <header class="arc-hero">
    <div>
      <p class="arc-kicker">Arc / App Review Governance / local operating fixture</p>
      <h1>Tell the whole operating story.</h1>
      <p>
        A presentation-native Arc carries a human from the App Submission Form through controlled
        Preflight evidence, source context, a bounded operator decision, and an inspectable receipt.
        The map stays shared; each scene chooses the composition that explains its moment.
      </p>
    </div>
    <dl class="arc-hero__facts" aria-label="Arc prototype boundaries">
      <div><dt>Deck</dt><dd>7 composable scenes</dd></div>
      <div><dt>Map</dt><dd>Pinned local fixture</dd></div>
      <div><dt>Authority</dt><dd>Operator gate</dd></div>
      <div><dt>Writes</dt><dd>None outside this browser</dd></div>
    </dl>
  </header>

  <section class="arc-contract" aria-labelledby="arc-contract-title">
    <div>
      <span>Composability contract</span>
      <h2 id="arc-contract-title">One shared map. Three reusable contexts.</h2>
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
    description="Use the rail, arrow keys, Home/End, direct scene URLs, or Present deck. Motion is data-authored and has a static reduced-motion equivalent; no transition is the only way to understand the story."
    {scenes}
    enablePresentation
    expression="editorial"
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
      {@const media = mediaForScene(scene)}
      <div
        class="arc-scene"
        data-layout={scene.presentation.layout}
        data-motion-cue={scene.motion.cue}
      >
        <div class="arc-scene__meta">
          <span>{scene.presentation.eyebrow}</span>
          <strong>{scene.motion.cue.replace('-', ' ')}</strong>
          <small>{scene.motion.source} · reduced motion: {scene.motion.reducedMotion}</small>
        </div>

        {#if scene.presentation.layout === 'statement'}
          <section class="arc-slide arc-slide--statement">
            <p class="arc-slide__eyebrow">{scene.presentation.callout?.label}</p>
            <strong>{scene.presentation.callout?.value}</strong>
            <p>{scene.presentation.callout?.detail}</p>
          </section>
        {:else if scene.presentation.layout === 'split'}
          <section class="arc-slide arc-slide--split">
            <div class="arc-slide__copy">
              <p class="arc-slide__eyebrow">{scene.presentation.callout?.label}</p>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            {#if media}
              <figure class="arc-slide__media">
                <img src={media.provenance.source} alt={media.provenance.alt} />
                <figcaption>{scene.presentation.media?.caption}</figcaption>
              </figure>
            {/if}
          </section>
        {:else if scene.presentation.layout === 'code'}
          <section class="arc-slide arc-slide--code">
            <div class="arc-code__bar">
              <span>{scene.presentation.code?.filename}</span>
              <small>{scene.presentation.code?.language}</small>
            </div>
            <pre><code class={`language-${scene.presentation.code?.language}`}>{scene.presentation.code?.content}</code></pre>
            <p>{scene.presentation.callout?.detail}</p>
          </section>
        {:else if scene.presentation.layout === 'map'}
          <section class="arc-module" aria-label={`Map module focused on ${scene.label}`}>
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
            <p class="arc-module__legend">{scene.presentation.callout?.detail}</p>
          </section>
        {:else if scene.presentation.layout === 'image'}
          <section class="arc-slide arc-slide--image">
            {#if media}
              <img src={media.provenance.source} alt={media.provenance.alt} />
              <p class="arc-slide__caption">{scene.presentation.media?.caption}</p>
            {/if}
            <div class="arc-image__decision">
              <p class="arc-slide__eyebrow">{scene.presentation.callout?.label}</p>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
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
            </div>
          </section>
        {:else if scene.presentation.layout === 'demo'}
          <section class="arc-slide arc-slide--demo" aria-live="polite">
            <div>
              <p class="arc-slide__eyebrow">{scene.presentation.callout?.label}</p>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <dl class="arc-demo__status">
              <div><dt>Proposal</dt><dd>{proposal?.status ?? 'Not drafted'}</dd></div>
              <div><dt>Target</dt><dd>None</dd></div>
              <div><dt>Authority</dt><dd>Local only</dd></div>
              <div><dt>Next</dt><dd>{proposal?.status === 'approved' ? 'Run in Decide' : 'Operator decision'}</dd></div>
            </dl>
          </section>
        {:else if scene.presentation.layout === 'proof'}
          <section class="arc-slide arc-slide--proof" data-receipt-state={receipt ? 'recorded' : 'waiting'} aria-live="polite">
            <div>
              <p class="arc-slide__eyebrow">{scene.presentation.callout?.label}</p>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <div class="arc-receipt">
              <span>Receipt</span>
              {#if receipt}
                <strong>{receipt.kind} · {receipt.status}</strong>
                <p>{receipt.evidence}</p>
                <small>Issued by {receipt.issuer} · {receipt.mode}</small>
              {:else}
                <strong>Waiting for a locally approved run</strong>
                <p>The receipt remains absent until an operator approves and the local runtime executes the bounded action.</p>
              {/if}
            </div>
          </section>
        {/if}

        <details class="arc-sources">
          <summary>Scene sources · {scene.artifactIds.length} linked artifacts</summary>
          <div>
            {#each scene.artifactIds as artifactId}
              {@const artifact = composition.artifacts.find((item) => item.id === artifactId)}
              {#if artifact}
                <article>
                  <span>{artifact.kind}</span>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.summary}</p>
                  <small>{artifact.provenance.source}</small>
                </article>
              {/if}
            {/each}
          </div>
        </details>
      </div>
    {/snippet}
  </PerformanceNarrativeStage>

  {#if motionArtifact}
    <aside class="arc-motion-note">
      <span>AI-native presentation boundary</span>
      <p>{motionArtifact.summary}</p>
      <small>
        Model: {motionArtifact.provenance.model} · Prompt: {motionArtifact.provenance.promptReference} · Rights: {motionArtifact.provenance.rights} · Cost: {formatCost(motionArtifact.provenance.costUsd)}
      </small>
    </aside>
  {/if}
</main>

<style>
  .arc-prototype { min-height: 100vh; background: var(--color-performance-paper, #f3f3f0); color: var(--color-performance-ink, #090909); }
  .arc-hero, .arc-contract, .arc-motion-note { width: min(calc(100% - 2rem), 1120px); margin-inline: auto; }
  .arc-hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(260px, .7fr); gap: clamp(2rem, 8vw, 7rem); padding: clamp(4rem, 11vw, 8rem) 0 clamp(2.5rem, 5vw, 4rem); }
  .arc-kicker, .arc-contract > div > span, .arc-motion-note > span, .arc-scene__meta, .arc-slide__eyebrow, .arc-sources summary, .arc-receipt > span { color: var(--color-performance-muted, #5f605a); font: 600 .7rem/1.2 var(--font-performance-mono, ui-monospace, monospace); letter-spacing: .1em; text-transform: uppercase; }
  .arc-hero h1 { max-width: 10ch; margin: .85rem 0 1.15rem; font-size: clamp(3.25rem, 8vw, 7.25rem); letter-spacing: -.075em; line-height: .88; }
  .arc-hero > div > p:last-child { max-width: 60ch; margin: 0; font-size: clamp(1.06rem, 2vw, 1.28rem); line-height: 1.55; }
  .arc-hero__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-self: end; margin: 0; border-top: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div { padding: 1rem 0; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div:nth-child(odd) { padding-right: 1rem; border-right: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero__facts div:nth-child(even) { padding-left: 1rem; }
  .arc-hero__facts dt { color: var(--color-performance-muted, #5f605a); font-size: .72rem; text-transform: uppercase; }
  .arc-hero__facts dd { margin: .4rem 0 0; font-size: .9rem; font-weight: 650; }
  .arc-contract { display: grid; grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr); gap: 2rem; padding: 1.75rem 0; border-top: 1px solid var(--color-performance-ink, #090909); }
  .arc-contract h2 { max-width: 12ch; margin: .5rem 0 0; font-size: clamp(1.75rem, 3vw, 2.7rem); line-height: 1; }
  .arc-contract ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin: 0; padding: 0; background: var(--color-performance-line, #d7d7d2); list-style: none; }
  .arc-contract li { display: grid; gap: .55rem; padding: 1rem; background: var(--color-performance-paper, #f3f3f0); }
  .arc-contract li strong { color: var(--color-performance-controlled, #0057b8); font: 700 .75rem/1 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-contract li span { font-size: .86rem; line-height: 1.42; }
  .arc-contract li small { color: var(--color-performance-muted, #5f605a); font-size: .7rem; line-height: 1.35; }
  .arc-preview { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding: 1rem; border: 1px solid var(--color-performance-line, #d7d7d2); background: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 85%, white); }
  .arc-preview div { display: grid; gap: .3rem; }
  .arc-preview span, .arc-preview small { color: var(--color-performance-muted, #5f605a); font: .7rem/1.3 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-preview p { max-width: 48ch; margin: 0; font-size: .84rem; line-height: 1.45; }
  .arc-scene { display: grid; gap: 1rem; }
  .arc-scene__meta { display: flex; flex-wrap: wrap; gap: .5rem .85rem; align-items: baseline; padding-bottom: .7rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-scene__meta strong { color: var(--color-performance-ink, #090909); font-size: .75rem; text-transform: capitalize; }
  .arc-scene__meta small { color: var(--color-performance-muted, #5f605a); font-size: .68rem; letter-spacing: 0; text-transform: none; }
  .arc-slide { min-width: 0; border: 1px solid var(--color-performance-ink, #090909); }
  .arc-slide strong { display: block; font-family: var(--font-performance-display, inherit); font-size: clamp(1.65rem, 3.4vw, 3.45rem); letter-spacing: -.045em; line-height: .98; }
  .arc-slide__eyebrow { margin: 0 0 .7rem; }
  .arc-slide--statement { display: grid; align-content: center; min-height: 21rem; padding: clamp(1.5rem, 5vw, 4rem); background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-slide--statement .arc-slide__eyebrow { color: #e1d687; }
  .arc-slide--statement > p:last-child { max-width: 50ch; margin: 1.25rem 0 0; color: #c9c8c0; font-size: 1rem; line-height: 1.55; }
  .arc-slide--split { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); min-height: 21rem; }
  .arc-slide__copy { display: grid; align-content: center; padding: clamp(1.5rem, 4vw, 3.5rem); }
  .arc-slide__copy > p:last-child { max-width: 33ch; margin: 1rem 0 0; color: var(--color-performance-muted, #5f605a); font-size: .96rem; line-height: 1.5; }
  .arc-slide__media { position: relative; min-height: 17rem; margin: 0; overflow: hidden; background: #111; }
  .arc-slide__media img, .arc-slide--image > img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 68% center; }
  .arc-slide__media figcaption, .arc-slide__caption { position: absolute; right: .8rem; bottom: .8rem; left: .8rem; margin: 0; padding: .55rem .65rem; background: rgb(9 9 9 / .8); color: #f3f3f0; font-size: .72rem; line-height: 1.35; }
  .arc-slide--code { overflow: hidden; background: #111; color: #eeece2; }
  .arc-code__bar { display: flex; justify-content: space-between; gap: 1rem; padding: .75rem 1rem; border-bottom: 1px solid rgb(255 255 255 / .22); color: #d8d5c5; font: .7rem/1.2 var(--font-performance-mono, ui-monospace, monospace); }
  .arc-slide--code pre { margin: 0; padding: clamp(1rem, 3vw, 2rem); overflow: auto; color: #f4df84; font: .82rem/1.6 var(--font-performance-mono, ui-monospace, monospace); }
  .arc-slide--code > p { margin: 0; padding: .9rem 1rem; border-top: 1px solid rgb(255 255 255 / .22); color: #bfbbb0; font-size: .8rem; line-height: 1.45; }
  .arc-module { overflow: hidden; border: 1px solid var(--color-performance-ink, #090909); background: #111; color: #f2f1eb; }
  .arc-module__topline { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; border-bottom: 1px solid rgb(255 255 255 / .24); color: #cbc9c0; font: .7rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-module__topline span { color: #fffdf5; font-weight: 700; }
  .arc-map { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .75rem; min-height: 205px; padding: 1rem; isolation: isolate; }
  .arc-map__trace { position: absolute; z-index: -1; top: 50%; left: 5%; width: 90%; border-top: 1px dashed rgb(225 220 201 / .6); transform: rotate(-5deg); }
  .arc-map__node { display: grid; align-content: end; min-height: 82px; padding: .7rem; border: 1px solid rgb(255 255 255 / .22); background: rgb(255 255 255 / .05); opacity: .42; transition: opacity .18s ease, transform .18s ease, border-color .18s ease; }
  .arc-map__node span { color: #a7a49a; font: .68rem/1 var(--font-performance-mono, ui-monospace, monospace); }
  .arc-map__node strong { margin-top: .5rem; font-size: .83rem; line-height: 1.05; }
  .arc-map__node--focused { border-color: #ebd26c; background: rgb(235 210 108 / .14); opacity: 1; }
  .arc-module__legend { margin: 0; padding: .8rem 1rem; border-top: 1px solid rgb(255 255 255 / .24); color: #bdbbb2; font-size: .78rem; line-height: 1.45; }
  .arc-slide--image { position: relative; min-height: 28rem; overflow: hidden; background: #111; }
  .arc-slide--image > img { position: absolute; inset: 0; }
  .arc-image__decision { position: relative; z-index: 1; display: grid; align-content: end; min-height: 28rem; max-width: min(34rem, 92%); padding: clamp(1.25rem, 4vw, 3rem); background: linear-gradient(90deg, rgb(9 9 9 / .94), rgb(9 9 9 / .62), transparent); color: #f3f3f0; }
  .arc-image__decision .arc-slide__eyebrow { color: #e1d687; }
  .arc-image__decision > p:not(.arc-slide__eyebrow):not(.arc-action__status):not(.arc-action__error) { margin: 1rem 0 1.25rem; color: #d8d6ce; font-size: .92rem; line-height: 1.48; }
  .arc-action__controls { display: flex; flex-wrap: wrap; gap: .5rem; }
  .arc-action__controls button { min-height: 2.6rem; border: 1px solid #f3f3f0; background: transparent; color: #f3f3f0; padding: .6rem .72rem; font: 650 .72rem/1 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; cursor: pointer; }
  .arc-action__controls button:hover:not(:disabled), .arc-action__controls .arc-action__approve { background: #f3f3f0; color: #111; }
  .arc-action__controls button:disabled { cursor: wait; opacity: .6; }
  .arc-action__status, .arc-action__error { margin: .75rem 0 0; font-size: .76rem; line-height: 1.4; }
  .arc-action__error { color: #ffb8aa; }
  .arc-slide--demo, .arc-slide--proof { display: grid; grid-template-columns: minmax(0, 1fr) minmax(14rem, .65fr); gap: 1px; background: var(--color-performance-line, #d7d7d2); }
  .arc-slide--demo > div, .arc-slide--proof > div { padding: clamp(1.3rem, 3vw, 2.5rem); background: var(--color-performance-paper, #f3f3f0); }
  .arc-slide--demo > div > p:last-child, .arc-slide--proof > div > p:last-child { max-width: 36ch; margin: 1rem 0 0; color: var(--color-performance-muted, #5f605a); font-size: .92rem; line-height: 1.5; }
  .arc-demo__status { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 0; background: var(--color-performance-line, #d7d7d2); }
  .arc-demo__status div { padding: 1rem; background: #111; color: #f3f3f0; }
  .arc-demo__status dt { color: #aaa79b; font: .66rem/1 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-demo__status dd { margin: .45rem 0 0; font-size: .85rem; font-weight: 650; }
  .arc-slide--proof[data-receipt-state='recorded'] { background: #27744f; }
  .arc-receipt { display: grid; align-content: center; gap: .65rem; background: #111 !important; color: #f3f3f0; }
  .arc-receipt > span { color: #d6d49f; }
  .arc-receipt > strong { font-size: 1rem; }
  .arc-receipt p { margin: 0; color: #d4d2ca; font-size: .82rem; line-height: 1.45; }
  .arc-receipt small { color: #b8b6ad; font-size: .72rem; }
  .arc-sources { border-top: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-sources summary { padding: .75rem 0; cursor: pointer; }
  .arc-sources > div { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1px; background: var(--color-performance-line, #d7d7d2); }
  .arc-sources article { padding: .85rem; background: var(--color-performance-paper, #f3f3f0); }
  .arc-sources article span, .arc-sources article small { display: block; color: var(--color-performance-muted, #5f605a); font: .65rem/1.3 var(--font-performance-mono, ui-monospace, monospace); }
  .arc-sources article strong { display: block; margin: .45rem 0; font-size: .84rem; }
  .arc-sources article p { margin: 0 0 .7rem; font-size: .76rem; line-height: 1.4; }
  .arc-motion-note { padding: 2rem 0 4rem; border-top: 1px solid var(--color-performance-ink, #090909); }
  .arc-motion-note p { max-width: 55ch; margin: .5rem 0; font-size: .98rem; }
  .arc-motion-note small { color: var(--color-performance-muted, #5f605a); font-size: .72rem; line-height: 1.45; }
  @media (prefers-reduced-motion: no-preference) {
    .arc-scene[data-motion-cue='signal-reveal'] .arc-slide--statement { animation: arc-arrive 500ms cubic-bezier(.2, .8, .2, 1) both; }
    .arc-scene[data-motion-cue='handoff-trace'] .arc-slide__media, .arc-scene[data-motion-cue='handoff-trace'] .arc-code__bar { animation: arc-arrive 600ms cubic-bezier(.2, .8, .2, 1) both; }
    .arc-scene[data-motion-cue='module-focus'] .arc-map__node--focused { animation: arc-focus 760ms cubic-bezier(.2, .8, .2, 1) both; animation-delay: calc(var(--node-index) * 50ms); }
    .arc-scene[data-motion-cue='decision-gate'] .arc-image__decision { animation: arc-arrive 600ms cubic-bezier(.2, .8, .2, 1) both; }
    .arc-scene[data-motion-cue='recovery-loop'] .arc-demo__status { animation: arc-arrive 600ms cubic-bezier(.2, .8, .2, 1) both; }
    .arc-scene[data-motion-cue='proof-stamp'] .arc-receipt { animation: arc-proof 640ms cubic-bezier(.2, .8, .2, 1) both; }
  }
  @keyframes arc-arrive { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes arc-focus { 0% { transform: scale(.94); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
  @keyframes arc-proof { from { filter: brightness(1.7); transform: scale(.985); } to { filter: brightness(1); transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .arc-scene *, .arc-scene *::before, .arc-scene *::after { animation: none !important; transition: none !important; } .arc-map__node--focused { outline: 2px solid #ebd26c; outline-offset: -3px; } }
  @media (max-width: 760px) { .arc-hero, .arc-contract, .arc-slide--split, .arc-slide--demo, .arc-slide--proof { grid-template-columns: 1fr; } .arc-contract ol, .arc-map { grid-template-columns: repeat(2, minmax(0, 1fr)); } .arc-preview { align-items: start; flex-direction: column; } .arc-slide--image, .arc-image__decision { min-height: 24rem; } .arc-image__decision { max-width: 100%; background: linear-gradient(0deg, rgb(9 9 9 / .94), rgb(9 9 9 / .35)); } }
</style>
