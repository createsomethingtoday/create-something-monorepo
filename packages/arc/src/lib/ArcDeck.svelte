<script lang="ts">
  import type {
    AtlasActionProposal,
    AtlasActionReceipt,
    AtlasComposition,
    AtlasCompositionScene
  } from '@create-something/atlas-composition';
  import {
    PerformanceNarrativeStage,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  interface Props {
    composition: AtlasComposition;
    routeId: string;
    title?: string;
    description?: string;
    ariaLabel?: string;
    assetBaseUrl?: string;
    actionEndpoint?: string;
    enablePresentation?: boolean;
  }

  let {
    composition,
    routeId,
    title,
    description,
    ariaLabel = 'Arc scenes',
    assetBaseUrl = '',
    actionEndpoint,
    enablePresentation = true
  }: Props = $props();

  const route = $derived.by(() => {
    const resolved = composition.routes.find((candidate) => candidate.id === routeId);
    if (!resolved) throw new Error(`Unknown Arc route: ${routeId}`);
    return resolved;
  });

  const toneByKind: Record<AtlasCompositionScene['kind'], PerformanceNarrativeScene['tone']> = {
    signal: 'review',
    automation: 'neutral',
    map: 'neutral',
    judgment: 'review',
    runbook: 'allow',
    receipt: 'allow'
  };

  const scenes: PerformanceNarrativeScene[] = $derived.by(() =>
    route.sceneIds.map((sceneId) => {
      const scene = composition.scenes.find((candidate) => candidate.id === sceneId);
      if (!scene) throw new Error(`Unknown Arc scene: ${sceneId}`);
      return {
        id: scene.id,
        label: scene.label,
        summary: scene.presentation.reader.takeaway,
        title: scene.presentation.reader.heading,
        detail: scene.presentation.reader.explanation,
        notes: scene.detail,
        stakeholders: scene.presentation.reader.stakeholders,
        tone: toneByKind[scene.kind],
        evidence: scene.evidence
      };
    })
  );

  const nodeLabels: Record<string, string> = {
    'app-submission-form': 'App submission form',
    'app-review-preflight': 'App Review Preflight',
    'webflow-app-preflight-skills': 'Preflight skills',
    'slack-signal': 'The team alert (Slack)',
    'claude-agent': 'The review assistant (Claude)',
    'app-governance-mcp': 'The governed write path',
    'd1-governance-record': 'The durable review record (D1)',
    'airtable-projection': "The team's readable workspace (Airtable)",
    'zendesk-context': 'The partner conversation (Zendesk)',
    'operator-decision': 'The reviewer decision',
    'workflow-receipt': 'The proof receipt'
  };

  const nodeRoles: Record<string, string> = {
    'd1-governance-record': 'Source of truth',
    'airtable-projection': 'Readable projection',
    'zendesk-context': 'Supporting context'
  };

  let proposal = $state<AtlasActionProposal | null>(null);
  let receipt = $state<AtlasActionReceipt | null>(null);
  let actionError = $state<string | null>(null);
  let actionBusy = $state(false);

  function sourceScene(sceneId: string): AtlasCompositionScene {
    const scene = composition.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) throw new Error(`Unknown Arc scene: ${sceneId}`);
    return scene;
  }

  function mediaForScene(scene: AtlasCompositionScene) {
    const mediaId = scene.presentation.media?.artifactId;
    return mediaId ? composition.artifacts.find((artifact) => artifact.id === mediaId) : undefined;
  }

  function mediaSource(source: string): string {
    if (!assetBaseUrl || !source.startsWith('/')) return source;
    return `${assetBaseUrl.replace(/\/$/, '')}${source}`;
  }

  async function runAction(type: 'propose' | 'decide' | 'execute', decision?: 'approved' | 'rejected') {
    if (!actionEndpoint) return;
    actionBusy = true;
    actionError = null;
    try {
      const response = await fetch(actionEndpoint, {
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
      if (!response.ok) throw new Error(payload.error ?? 'The governed action could not complete.');
      proposal = payload.proposal ?? payload.action ?? proposal;
      receipt = payload.receipt ?? receipt;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The governed action could not complete.';
    } finally {
      actionBusy = false;
    }
  }
</script>

<div class="arc-deck" data-arc-id={composition.id} data-route-kind={route.kind}>
  <PerformanceNarrativeStage
    id={`arc-${composition.id}-${route.kind}`}
    eyebrow={`${route.kind} · ${composition.title}`}
    title={title ?? route.title}
    description={description ?? route.description}
    {scenes}
    {ariaLabel}
    expression="editorial"
    density="compact"
    {enablePresentation}
  >
    {#snippet artifact(activeScene)}
      {@const scene = sourceScene(activeScene.id)}
      {@const media = mediaForScene(scene)}
      <div
        class="arc-composition"
        data-layout={scene.presentation.layout}
        data-motion-cue={scene.motion.cue}
      >
        {#if scene.presentation.layout === 'split' || scene.presentation.layout === 'image'}
          <section class="arc-split">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            {#if media}
              <figure>
                <img src={mediaSource(media.provenance.source)} alt={media.provenance.alt} />
                <figcaption>{scene.presentation.media?.caption}</figcaption>
              </figure>
            {/if}
          </section>
        {:else if scene.presentation.layout === 'capabilities'}
          <section class="arc-capabilities" aria-label={`${scene.label} capabilities and boundaries`}>
            {#each scene.presentation.capabilities ?? [] as capability, index}
              <article>
                <header><span>{String(index + 1).padStart(2, '0')}</span><h4>{capability.title}</h4></header>
                <dl>
                  <div><dt>What it can do</dt><dd>{capability.can}</dd></div>
                  <div><dt>What it produces</dt><dd>{capability.produces}</dd></div>
                  <div><dt>What it cannot decide</dt><dd>{capability.boundary}</dd></div>
                </dl>
              </article>
            {/each}
          </section>
        {:else if scene.presentation.layout === 'code'}
          <section class="arc-code">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <details>
              <summary>See the technical handoff</summary>
              <pre><code>{scene.presentation.code?.content}</code></pre>
            </details>
          </section>
        {:else if scene.presentation.layout === 'map'}
          <section class="arc-map" aria-label={`Map focused on ${scene.label}`}>
            <header><strong>{composition.mapModules[0]?.title}</strong><span>Focused relationship</span></header>
            <ol>
              {#each scene.presentation.relationships ?? [] as relationship}
                <li>
                  <div><span>{nodeRoles[relationship.fromNodeId]}</span><strong>{nodeLabels[relationship.fromNodeId]}</strong></div>
                  <p
                    aria-label={`${nodeLabels[relationship.fromNodeId]}: ${relationship.label} to ${nodeLabels[relationship.toNodeId]}`}
                  ><span>{relationship.label}</span><i aria-hidden="true"></i></p>
                  <div><span>{nodeRoles[relationship.toNodeId]}</span><strong>{nodeLabels[relationship.toNodeId]}</strong></div>
                </li>
              {/each}
            </ol>
            <footer>{scene.presentation.callout?.detail}</footer>
          </section>
        {:else if scene.presentation.layout === 'branches'}
          <section class="arc-branches">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <ol>
              {#each scene.presentation.branches ?? [] as branch}
                <li><strong>{branch.label}</strong><p>{branch.explanation}</p><span>{branch.next}</span></li>
              {/each}
            </ol>
          </section>
        {:else if scene.presentation.layout === 'decision'}
          <section class="arc-decision">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            {#if actionEndpoint}
              <div class="arc-actions">
                {#if !proposal}
                  <button type="button" onclick={() => runAction('propose')} disabled={actionBusy}>Draft creator update</button>
                {:else if proposal.status === 'proposed'}
                  <button type="button" onclick={() => runAction('decide', 'rejected')} disabled={actionBusy}>Reject</button>
                  <button type="button" onclick={() => runAction('decide', 'approved')} disabled={actionBusy}>Approve</button>
                {:else if proposal.status === 'approved'}
                  <button type="button" onclick={() => runAction('execute')} disabled={actionBusy}>Run approved action</button>
                {:else}
                  <strong>{proposal.status}</strong>
                {/if}
              </div>
              {#if actionError}<p class="arc-error" role="alert">{actionError}</p>{/if}
            {:else}
              <p class="arc-boundary">Read-only presentation. Open the governed operator surface to propose an action.</p>
            {/if}
          </section>
        {:else if scene.presentation.layout === 'demo'}
          <section class="arc-demo" aria-live="polite">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <dl>
              <div><dt>Proposal</dt><dd>{proposal?.status ?? 'Not drafted'}</dd></div>
              <div><dt>External message</dt><dd>Not sent</dd></div>
              <div><dt>Authority</dt><dd>Named reviewer approval</dd></div>
              <div><dt>Next step</dt><dd>{proposal?.status === 'approved' ? 'Record the bounded handoff' : 'Wait for a reviewer decision'}</dd></div>
            </dl>
          </section>
        {:else if scene.presentation.layout === 'proof'}
          <section class="arc-proof">
            <div class="arc-copy">
              <span>{scene.presentation.callout?.label}</span>
              <strong>{scene.presentation.callout?.value}</strong>
              <p>{scene.presentation.callout?.detail}</p>
            </div>
            <aside>
              <span>Receipt</span>
              <strong>{receipt ? `${receipt.kind} · ${receipt.status}` : 'Waiting for an approved run'}</strong>
              <p>{receipt?.evidence ?? 'Proof appears only after the governed runtime completes an approved action.'}</p>
            </aside>
          </section>
        {:else}
          <section class="arc-statement">
            <span>{scene.presentation.callout?.label}</span>
            <strong>{scene.presentation.callout?.value}</strong>
            <p>{scene.presentation.callout?.detail}</p>
          </section>
        {/if}
      </div>
    {/snippet}
  </PerformanceNarrativeStage>
</div>

<style>
  .arc-deck { min-width: 0; }
  .arc-composition { min-width: 0; }
  .arc-composition section { border: 1px solid var(--color-performance-ink, #090909); }
  .arc-copy { display: grid; align-content: center; gap: .8rem; padding: clamp(1.25rem, 4vw, 3rem); }
  .arc-copy > span, .arc-statement > span, .arc-proof aside > span, .arc-map span { color: var(--color-performance-muted, #5e6268); font: 650 .7rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-copy > strong, .arc-statement > strong { font: 500 clamp(1.8rem, 4vw, 3.6rem)/.98 var(--font-performance-display, Arial, sans-serif); letter-spacing: -.045em; }
  .arc-copy p, .arc-statement p { max-width: 48ch; margin: 0; color: var(--color-performance-muted, #5e6268); font-size: 1rem; line-height: 1.5; }
  .arc-split { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); min-height: 20rem; }
  figure { position: relative; min-height: 18rem; margin: 0; overflow: hidden; background: var(--color-performance-ink, #090909); }
  figure img { width: 100%; height: 100%; object-fit: cover; }
  figcaption { position: absolute; right: .75rem; bottom: .75rem; left: .75rem; padding: .55rem; background: rgb(9 9 9 / .82); color: var(--color-performance-paper, #f3f3f0); font-size: .78rem; }
  .arc-statement { display: grid; align-content: center; gap: 1rem; min-height: 20rem; padding: clamp(1.5rem, 6vw, 4rem); background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-statement > span, .arc-statement p { color: var(--color-performance-panel, #fff); }
  .arc-capabilities { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); background: var(--color-performance-line, #d7d7d2); gap: 1px; }
  .arc-capabilities article { padding: 1rem; background: var(--color-performance-panel, #fff); }
  .arc-capabilities header { display: flex; gap: .75rem; align-items: baseline; }
  .arc-capabilities h4 { margin: 0; font-size: 1.05rem; }
  .arc-capabilities dl { display: grid; gap: .8rem; margin: 1rem 0 0; }
  .arc-capabilities dt { font: 650 .68rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-capabilities dd { margin: .25rem 0 0; color: var(--color-performance-muted, #5e6268); font-size: .9rem; line-height: 1.42; }
  .arc-code { background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-code .arc-copy p { color: var(--color-performance-panel, #fff); }
  .arc-code details { border-top: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .arc-code summary { padding: .8rem 1rem; font: 650 .72rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; cursor: pointer; }
  .arc-code pre { max-height: 15rem; margin: 0; overflow: auto; padding: 1rem; color: var(--color-performance-review, #d6b650); font: .82rem/1.55 var(--font-performance-code, ui-monospace, monospace); }
  .arc-map { background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-map > header, .arc-map > footer { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; border-bottom: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .arc-map > footer { border-top: 1px solid var(--color-performance-line-strong, #9c9c96); border-bottom: 0; color: var(--color-performance-panel, #fff); font-size: .85rem; }
  .arc-map ol { display: grid; gap: 1rem; margin: 0; padding: 1.25rem; list-style: none; }
  .arc-map li { display: grid; grid-template-columns: minmax(10rem, 1fr) minmax(8rem, .6fr) minmax(10rem, 1fr); align-items: center; }
  .arc-map li > div { display: grid; gap: .5rem; min-height: 6rem; align-content: end; padding: .85rem; border: 1px solid var(--color-performance-review, #d6b650); }
  .arc-map li > p { display: grid; place-items: center; margin: 0; text-align: center; }
  .arc-map li > p i { position: relative; display: block; width: 100%; height: 1px; margin-top: .5rem; background: var(--color-performance-review, #d6b650); }
  .arc-map li > p i::after { position: absolute; top: 50%; right: 0; width: .5rem; height: .5rem; border-top: 1px solid var(--color-performance-review, #d6b650); border-right: 1px solid var(--color-performance-review, #d6b650); content: ''; transform: translateY(-50%) rotate(45deg); }
  .arc-branches { display: grid; grid-template-columns: minmax(14rem, .65fr) minmax(0, 1.35fr); }
  .arc-branches > ol { display: grid; margin: 0; padding: 0; list-style: none; border-left: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-branches li { padding: 1rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-branches li p { color: var(--color-performance-muted, #5e6268); line-height: 1.4; }
  .arc-branches li span { font: 650 .68rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-decision, .arc-proof { min-height: 20rem; background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-decision .arc-copy p, .arc-proof .arc-copy p { color: var(--color-performance-panel, #fff); }
  .arc-actions { display: flex; gap: .5rem; padding: 0 3rem 2rem; }
  .arc-actions button { min-height: 2.75rem; padding: .65rem .85rem; border: 1px solid currentColor; background: transparent; color: inherit; font: 650 .72rem/1 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-boundary, .arc-error { margin: 0; padding: 0 3rem 2rem; color: var(--color-performance-panel, #fff); font-size: .86rem; }
  .arc-demo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, .72fr); min-height: 20rem; background: var(--color-performance-panel, #fff); }
  .arc-demo dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 0; background: var(--color-performance-line, #d7d7d2); }
  .arc-demo dl div { display: grid; align-content: center; gap: .5rem; padding: 1rem; background: var(--color-performance-ink, #090909); color: var(--color-performance-paper, #f3f3f0); }
  .arc-demo dt { color: var(--color-performance-muted, #9c9c96); font: 650 .68rem/1.2 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-demo dd { margin: 0; font-size: 1rem; font-weight: 650; line-height: 1.35; }
  .arc-proof { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, .6fr); align-items: stretch; }
  .arc-proof aside { display: grid; align-content: center; gap: .75rem; padding: 1.5rem; border-left: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .arc-proof aside p { margin: 0; line-height: 1.45; }
  @media (max-width: 48rem) {
    .arc-split, .arc-branches, .arc-demo, .arc-proof { grid-template-columns: 1fr; }
    .arc-map li { grid-template-columns: 1fr; gap: .5rem; }
    .arc-map li > p i { width: 1px; height: 2rem; }
    .arc-map li > p i::after { top: auto; right: 50%; bottom: 0; transform: translateX(50%) rotate(135deg); }
    .arc-proof aside { border-top: 1px solid var(--color-performance-line-strong, #9c9c96); border-left: 0; }
  }
  @media (prefers-reduced-motion: no-preference) {
    :global(.performance-narrative-stage[data-presenting='true']) .arc-composition { animation: arc-enter var(--duration-performance-standard, 300ms) var(--ease-performance-standard, ease-out) both; }
  }
  @keyframes arc-enter { from { opacity: 0; transform: translateY(.35rem); } to { opacity: 1; transform: translateY(0); } }
</style>
