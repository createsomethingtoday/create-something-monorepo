<script lang="ts">
  import { onMount, tick } from 'svelte';
  import World from './World.svelte';
  import {
    artifactKey,
    artifactObjects,
    initialArtifacts,
    restoreArtifacts,
    applyStoredArtifact,
    currentArtifact,
    artifactStatus,
    type ArtifactId,
    type ArtifactIntent
  } from './artifacts';
  let { onhandoff }: { onhandoff: () => void } = $props();
  let model = $state(initialArtifacts('pending'));
  let loaded = $state(false);
  let busy = $state(false);
  let error = $state('');
  let listOnly = $state(false);
  const object = $derived(artifactObjects.find((o) => o.id === model.selected)!);
  const node = $derived(model.nodes[model.selected]);
  const statuses = $derived(
    Object.fromEntries(artifactObjects.map((o) => [o.id, artifactStatus(model, o.id)]))
  );
  const destination = $derived(
    model.carry
      ? (artifactObjects[artifactObjects.findIndex((o) => o.id === model.carry!.id) + 1]?.id ?? '')
      : ''
  );
  const count = $derived(artifactObjects.filter((o) => currentArtifact(model, o.id)).length);
  function read() {
    const raw = localStorage.getItem(artifactKey);
    if (raw === null) return initialArtifacts(model.epoch);
    const restored = restoreArtifacts(raw);
    if (!restored) throw Error('invalid storage');
    return restored;
  }
  onMount(() => {
    model = initialArtifacts(crypto.randomUUID());
    try {
      model = read();
    } catch {
      error = 'Saved objects could not be validated. Reset only the practice room to recover.';
    }
    loaded = true;
    const sync = (event: StorageEvent) => {
      if (event.key !== artifactKey) return;
      try {
        model = read();
        error = '';
      } catch {
        error = 'Saved objects could not be validated. Reset only the practice room to recover.';
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  });
  async function act(intent: ArtifactIntent) {
    if (!loaded || busy || (error && intent.type !== 'reset')) return;
    if (!navigator.locks) {
      error =
        'This browser cannot lock cross-tab progress. Use a supported browser; no practice action was saved.';
      return;
    }
    const expected = { epoch: model.epoch, version: model.version };
    busy = true;
    try {
      await navigator.locks.request(artifactKey, () => {
        const candidate = applyStoredArtifact(
          localStorage.getItem(artifactKey),
          $state.snapshot(model),
          intent,
          expected
        );
        localStorage.setItem(artifactKey, JSON.stringify(candidate));
        model = candidate;
        error = '';
      });
    } catch {
      error =
        'Objects could not be saved. No real action ran; reload to inspect saved progress or reset this room.';
    } finally {
      busy = false;
    }
    await tick();
    document.getElementById('artifact-heading')?.focus();
  }
  function activate(id: string) {
    const item = id as ArtifactId;
    if (model.carry && model.carry.id !== item) void act({ type: 'place', id: item });
    else if (currentArtifact(model, item) && item !== 'result')
      void act({ type: 'pick', id: item, token: crypto.randomUUID() });
    else void act({ type: 'inspect', id: item });
  }
  async function reset() {
    if (
      confirm(
        'Reset only the practice stack objects? Request lessons and setup self-reports will stay saved.'
      )
    )
      await act({ type: 'reset', epoch: crypto.randomUUID() });
  }
</script>

<section class="artifact-room" aria-labelledby="artifact-room-heading">
  <div class="room-intro">
    <div>
      <p class="eyebrow">BUILD A STACK / PRACTICE ROOM</p>
      <h2 id="artifact-room-heading">Give every piece a place.</h2>
      <p>Unpack a project. Carry it through the room. Inspect each object before moving it on.</p>
    </div>
    <p class="truth">
      Practice only · {count} / 6 objects prepared<br />Real repositories, secrets and deployments:
      <strong>unverified</strong>.
    </p>
  </div>
  <div class="room-layout">
    <div class="room-world">
      <label class="list-toggle"
        ><input type="checkbox" bind:checked={listOnly} /> Use object list only</label
      >
      {#if !listOnly}<World
          selected={model.selected}
          paused={true}
          objects={artifactObjects}
          interactive={true}
          {statuses}
          {destination}
          onselect={activate}
        />{/if}
      <nav class="object-list" aria-label="Practice artifact objects">
        {#each artifactObjects as item}<button
            disabled={!loaded || busy || !!error}
            type="button"
            aria-label={`Open ${item.label}`}
            aria-pressed={model.selected === item.id}
            onclick={() => act({ type: 'inspect', id: item.id })}
            ><span>{item.short}</span><small>{statuses[item.id]}</small></button
          >{/each}
      </nav>
      <p class="carry">
        {#if model.carry}Carrying: <strong
            >{artifactObjects.find((o) => o.id === model.carry!.id)!.output}</strong
          >
          · revision {model.carry.revision}. Next: {artifactObjects.find(
            (o) => o.id === destination
          )?.label}.
          <button disabled={busy || !!error} onclick={() => act({ type: 'cancel' })}
            >Put down</button
          >{:else}Tap an object to inspect or pick it up, then tap its next destination. Tab and
          Enter work too.{/if}
      </p>
    </div>
    <section class="inspector" aria-labelledby="artifact-heading">
      <p class="eyebrow">
        OBJECT / {String(artifactObjects.findIndex((o) => o.id === model.selected) + 1).padStart(
          2,
          '0'
        )}
      </p>
      <h3 id="artifact-heading" tabindex="-1">{object.label}</h3>
      <p class="object-state">
        <strong>{statuses[object.id]}</strong> · {object.output}{node.revision
          ? ` · revision ${node.revision}`
          : ''}
      </p>
      <p role="status" aria-live="polite">{error || model.message}</p>
      <fieldset disabled={!loaded || busy || !!error}>
        <legend>Next action</legend>
        <p>{object.next}</p>
        {#if object.id === 'starter'}
          {#if !node.prepared}<button onclick={() => act({ type: 'unpack' })}
              >Unpack practice starter</button
            >{:else}<p>
              Project: PCN educational health Worker · workflow tests · decision record.
            </p>{/if}
          <p><a href="/workshop/pcn-starter.zip" download>Download the real starter files</a></p>
        {:else if object.id === 'repository'}
          <p>
            Plan: private repository · main branch · starter files. No repository has been created
            or pushed by this game.
          </p>
        {:else if object.id === 'change'}
          <pre><code
              >{'Proposed practice change:\n+ keep providerIntegrations: false\n+ return the educational health response\n+ preserve workflow approval tests'}</code
            ></pre>
          <p>
            Review the proposal before approving its exact revision. This is a prepared example, not
            a live Codex session.
          </p>
          <button
            disabled={!currentArtifact(model, 'change') || model.approved === node.revision}
            onclick={() => act({ type: 'approve' })}>Approve exact practice change</button
          >
          <button
            disabled={!currentArtifact(model, 'change')}
            onclick={() => act({ type: 'revise' })}>Revise practice source</button
          >
        {:else if object.id === 'references'}
          <p>
            Named placeholders: <code>STARTER_CONFIG_REF</code>, <code>OWNER_IDENTITY_REF</code>. No
            values, tokens or credentials are stored here. The starter needs no integration secrets.
          </p>
        {:else if object.id === 'target'}
          <p>
            Account: <strong>Practice account — placeholder</strong>. Worker:
            <code>my-pcn-workshop-starter</code>. Review your own real account in the setup guide.
          </p>
          <label
            >Practice environment <select
              value={model.environment}
              onchange={(e) =>
                act({
                  type: 'environment',
                  value: e.currentTarget.value as 'preview' | 'production'
                })}
              ><option value="preview">Preview (practice)</option><option value="production"
                >Production (practice)</option
              ></select
            ></label
          >
        {:else}
          {#if node.revision}<p>
              Retained practice receipt: beacon revision {node.revision}, destination revision {node
                .source?.revision}. {currentArtifact(model, 'result')
                ? 'Current practice path checked.'
                : 'Stale: rebuild from the changed source; this receipt is not current evidence.'}
            </p>
            <pre><code
                >{JSON.stringify(
                  { service: 'PCN starter', mode: 'educational', providerIntegrations: false },
                  null,
                  2
                )}</code
              ></pre>{/if}
          <p>
            Expected health response, simulated here. No real URL, deployment ID or provider result
            was verified.
          </p>
        {/if}
        {#if model.carry && destination === object.id}<button
            onclick={() => act({ type: 'place', id: object.id })}>Place carried object here</button
          >{/if}
        {#if currentArtifact(model, object.id) && object.id !== 'result'}<button
            onclick={() => act({ type: 'pick', id: object.id, token: crypto.randomUUID() })}
            >Pick up {object.output}</button
          >{/if}
        <details>
          <summary>Inspect connections</summary>
          <p>
            {node.source
              ? `Prepared from ${artifactObjects.find((o) => o.id === node.source!.id)!.output}, revision ${node.source.revision}.`
              : 'No incoming connection.'}
          </p>
          <p>
            Next destination: {artifactObjects[
              artifactObjects.findIndex((o) => o.id === object.id) + 1
            ]?.label ?? 'End of the practice path'}.
          </p>
        </details>
      </fieldset>
      <details open={statuses[object.id] === 'Stale' || !!error}>
        <summary>Recovery</summary>
        <p>{object.recovery}</p>
        <p>
          Progress and errors stay in this browser. Repeated placement of the same source creates no
          extra receipt. Restarting request lessons leaves these objects intact.
        </p>
      </details>
      <button onclick={onhandoff}>Open actual setup walkthrough</button>
      <p class="truth">
        Prepared objects and practice approval are browser-local. Setup guide checks are separate
        self-reports. Verified provider evidence requires a future reviewed integration; this game
        never upgrades a practice result to verified.
      </p>
    </section>
  </div>
  {#if currentArtifact(model, 'result')}<p class="complete">
      Practice stack assembled. Your real stack is still unverified. Use the actual setup
      walkthrough for owner-controlled terminal and account steps.
    </p>{/if}
  <button disabled={!loaded || busy} onclick={reset}>Reset practice stack</button>
</section>

<style>
  .artifact-room {
    margin: 2rem 0 3rem;
    border-top: 1px solid var(--color-border-default, #444);
    padding-top: 1.5rem;
  }
  .room-intro {
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    align-items: start;
  }
  .room-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
    gap: 1.5rem;
    margin: 1.5rem 0;
  }
  .room-world,
  .inspector {
    min-width: 0;
  }
  h2 {
    font-size: 1.8rem;
  }
  h3 {
    font-size: 1.4rem;
  }
  p {
    line-height: 1.6;
  }
  .eyebrow {
    font: 0.7rem var(--font-mono, monospace);
    letter-spacing: 0.08em;
  }
  .truth,
  .carry,
  small {
    color: var(--color-fg-secondary, #aaa);
    font-size: 0.85rem;
  }
  .truth {
    max-width: 34rem;
  }
  .list-toggle {
    display: block;
    margin-bottom: 0.75rem;
  }
  .object-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .object-list button {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: left;
  }
  button {
    min-height: 44px;
    padding: 0.65rem 0.75rem;
    font: inherit;
    color: inherit;
    background: var(--color-bg-secondary, #262626);
    border: 1px solid var(--color-border-default, #444);
    cursor: pointer;
    margin: 0.2rem 0;
  }
  button[aria-pressed='true'] {
    border-color: var(--color-fg-primary, #eee);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  a:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--color-fg-primary, #eee);
    outline-offset: 3px;
  }
  fieldset {
    border: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    font-size: 0.85rem;
    padding: 0;
    margin: 0.5rem 0;
  }
  select {
    display: block;
    max-width: 100%;
    min-height: 44px;
    font: inherit;
    background: var(--color-bg-secondary, #262626);
    color: inherit;
    border: 1px solid var(--color-border-default, #444);
    padding: 0.5rem;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    padding: 0.75rem;
    background: var(--color-bg-secondary, #262626);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  details {
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border-default, #444);
  }
  summary {
    cursor: pointer;
    min-height: 24px;
  }
  .complete {
    padding: 1rem;
    border: 1px solid var(--color-border-default, #444);
  }
  @media (max-width: 800px) {
    .room-intro {
      display: block;
    }
    .room-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
