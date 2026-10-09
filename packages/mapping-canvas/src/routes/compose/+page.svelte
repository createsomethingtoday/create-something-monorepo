<script lang="ts">
  import HyperframesExport from '$lib/composition/HyperframesExport.svelte';
  import { onMount } from 'svelte';
  import FormView from '$lib/composition/FormView.svelte';
  import MotionView from '$lib/composition/MotionView.svelte';
  import {
    createDocument,
    updateContent,
    serialize,
    parseDocument,
    expand,
    STORAGE_KEY,
    type Document
  } from '$lib/composition/model';
  import { handoff, parseHandoff } from '$lib/composition/motion';
  import '../../../../agency/canon-overlay/theme.css';
  const initial = createDocument();
  let doc = $state<Document>(initial),
    mode = $state<'preview' | 'motion'>('preview'),
    notice = $state('Ready to compose.'),
    problem = $state('');
  let title = $state(initial.content.title),
    description = $state(initial.content.description),
    buttonLabel = $state(initial.content.buttonLabel),
    variant = $state<'primary' | 'secondary'>(initial.content.variant);
  function sync() {
    title = doc.content.title;
    description = doc.content.description;
    buttonLabel = doc.content.buttonLabel;
    variant = doc.content.variant;
  }
  onMount(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        doc = parseDocument(saved);
        sync();
        notice = 'Saved composition restored.';
      }
    } catch {
      problem =
        'Could not restore the saved composition. The default is available; your saved bytes have not been overwritten.';
    }
  });
  function apply() {
    try {
      doc = updateContent(doc, { title, description, buttonLabel, variant });
      problem = '';
      notice = 'Props applied to the shared composition.';
    } catch (e) {
      problem = (e as Error).message;
    }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(doc));
      notice = 'Saved on this device.';
      problem = '';
    } catch {
      problem = 'Could not save. Export the composition to keep your changes.';
    }
  }
  function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function exportRender() {
    try {
      const h = await handoff(doc);
      await parseHandoff(JSON.stringify(h));
      download(JSON.stringify(h, null, 2), 'draw-render-handoff.json');
      notice = 'Validated handoff exported. Open it in the render view to export offline HyperFrames HTML.';
    } catch (e) {
      problem = (e as Error).message;
    }
  }
  async function importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const before = doc;
    try {
      if (file.size > 40000) throw Error('Composition is too large.');
      const candidate = parseDocument(await file.text());
      if (before !== doc) throw Error('Composition changed while reading. Choose the file again.');
      doc = candidate;
      sync();
      problem = '';
      notice = 'Composition imported. Save to keep it on this device.';
    } catch (e) {
      problem = `Could not import: ${(e as Error).message} Current composition retained.`;
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:head
  ><title>Compose · Draw local proof</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<div class="app">
  <header>
    <a href="/" aria-label="Draw canvas"
      ><img src="/brand/draw-dark.svg" width="28" height="28" alt="" /><strong>Draw</strong></a
    ><span class="divider"></span><span>Compose</span><span class="local">LOCAL PROOF</span>
  </header>
  <main>
    <section class="intro">
      <div>
        <p class="kicker">REUSABLE BY DESIGN</p>
        <h1>One composition.<br />More than one way to tell it.</h1>
      </div>
      <p>Edit the content. Try the interaction.<br />Then use the same form to teach the idea.</p>
    </section>
    <div class="workspace">
      <aside class="inspector" aria-label="Composition editor">
        <div class="section-head">
          <span>01</span>
          <h2>Content & props</h2>
        </div>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <label for="title">Heading</label><textarea
            id="title"
            bind:value={title}
            maxlength="70"
            rows="2"
            required
          ></textarea>
          <label for="description">Supporting copy</label><textarea
            id="description"
            bind:value={description}
            maxlength="180"
            rows="3"
            required
          ></textarea>
          <label for="button-label">Action label</label><input
            id="button-label"
            bind:value={buttonLabel}
            maxlength="32"
            required
          />
          <label for="variant">Canon variant</label><select id="variant" bind:value={variant}
            ><option value="primary">Primary</option><option value="secondary">Secondary</option
            ></select
          >
          <button class="apply" type="submit">Apply props <span>↗</span></button>
        </form>
        <div class="structure">
          <div class="section-head">
            <span>02</span>
            <h2>Composition</h2>
          </div>
          <p>Request form</p>
          <ul>
            <li>heading <span>slot</span></li>
            <li>
              Details <span>reusable</span>
              <ul>
                <li>TextField</li>
                <li>TextArea</li>
              </ul>
            </li>
            <li>Alert <span>feedback</span></li>
            <li>action <span>slot / Button</span></li>
          </ul>
          <small
            >{expand(doc).filter((n) => n.kind === 'component').length} Canon components · revision {doc.revision}</small
          >
        </div>
        <div class="file-actions">
          <button onclick={save}>Save locally</button><button
            onclick={() => download(serialize(doc), 'draw-composition.json')}>Export JSON</button
          ><label class="import"
            >Import JSON<input
              aria-label="Import composition JSON"
              type="file"
              accept="application/json,.json"
              onchange={importFile}
            /></label
          ><button onclick={exportRender}>Export render handoff</button>
        </div>
      </aside>
      <section class="preview-area" aria-label="Composition workspace">
        <div class="preview-head">
          <div class="tabs">
            <button
              class:chosen={mode === 'preview'}
              aria-pressed={mode === 'preview'}
              onclick={() => (mode = 'preview')}>Interactive</button
            ><button
              class:chosen={mode === 'motion'}
              aria-pressed={mode === 'motion'}
              onclick={() => (mode = 'motion')}>Motion</button
            >
          </div>
          <span>Agency / Canon</span>
        </div>
        <div hidden={mode !== 'preview'} class="preview-stage">
          <div class="preview-form"><FormView {doc} /></div>
          <p class="stage-note">
            Try an empty request, then add details.<br />The first complete attempt fails locally;
            “Try again” recovers.
          </p>
        </div>
        <div hidden={mode !== 'motion'} class="motion-stage">
          {#if mode === 'motion'}<MotionView {doc} /><HyperframesExport {doc} />{/if}
        </div>
      </section>
    </div>
    <div class="status" role="status">{notice}</div>
    {#if problem}<div role="alert" class="problem">{problem}</div>{/if}
    <footer>
      <span>Shared content. Independent camera & timing.</span><span
        >Review candidate · no approved visual baseline</span
      >
    </footer>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    background: var(--color-performance-paper);
    color: var(--color-performance-ink);
    font-family: var(--font-performance-sans);
    color-scheme: light;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(button:focus-visible),
  :global(input:focus-visible),
  :global(textarea:focus-visible),
  :global(select:focus-visible),
  :global(a:focus-visible) {
    outline: 2px solid var(--color-performance-signal);
    outline-offset: 3px;
  }
  header {
    height: 65px;
    display: flex;
    align-items: center;
    gap: 18px;
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
    padding: 0 32px;
    font-size: 14px;
  }
  header a {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
  }
  header strong {
    font-size: 18px;
    font-weight: 500;
  }
  .divider {
    height: 20px;
    width: 1px;
    background: var(--color-performance-muted);
  }
  .local {
    margin-left: auto;
    font: 10px var(--font-performance-mono);
    letter-spacing: 0.1em;
    border: 1px solid var(--color-performance-muted);
    padding: 6px 8px;
  }
  main {
    max-width: 1500px;
    margin: auto;
    padding: 38px 40px 22px;
  }
  .intro {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 34px;
    gap: 24px;
  }
  .kicker {
    font: 10px var(--font-performance-mono);
    letter-spacing: 0.12em;
    color: var(--color-performance-muted);
    margin: 0 0 16px;
  }
  h1 {
    font-size: clamp(28px, 3vw, 44px);
    letter-spacing: -0.04em;
    font-weight: 500;
    line-height: 1.08;
    margin: 0;
  }
  .intro > p {
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-performance-muted);
    margin: 0 0 3px;
  }
  .workspace {
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    border-top: 1px solid var(--color-performance-line);
    border-bottom: 1px solid var(--color-performance-line);
  }
  .inspector {
    padding: 24px 24px 24px 0;
    border-right: 1px solid var(--color-performance-line);
  }
  .section-head {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
  }
  .section-head > span {
    font: 10px var(--font-performance-mono);
    color: var(--color-performance-muted);
  }
  h2 {
    font-size: 13px;
    margin: 0;
    font-weight: 600;
  }
  .inspector form {
    display: flex;
    flex-direction: column;
  }
  .inspector label {
    font-size: 11px;
    font-weight: 500;
    margin: 0 0 7px;
  }
  .inspector input,
  .inspector textarea,
  .inspector select {
    font: 13px var(--font-performance-sans);
    border: 1px solid var(--color-performance-line);
    border-radius: 0;
    color: inherit;
    background: var(--color-performance-panel);
    padding: 10px;
    margin-bottom: 16px;
    line-height: 1.5;
    width: 100%;
    resize: vertical;
  }
  button {
    font: 12px var(--font-performance-sans);
    cursor: pointer;
    color: inherit;
  }
  .apply {
    display: flex;
    justify-content: space-between;
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
    border: 0;
    padding: 12px 14px;
  }
  .structure {
    border-top: 1px solid var(--color-performance-line);
    margin-top: 24px;
    padding-top: 24px;
    font-size: 12px;
  }
  .structure p {
    font-weight: 600;
  }
  .structure ul {
    list-style: none;
    margin: 0;
    padding-left: 12px;
    border-left: 1px solid var(--color-performance-line);
  }
  .structure li {
    padding: 6px 0 6px 4px;
  }
  .structure li > span {
    float: right;
    color: var(--color-performance-muted);
    font-size: 10px;
  }
  .structure small {
    display: block;
    margin-top: 18px;
    font-size: 10px;
    color: var(--color-performance-muted);
  }
  .file-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 22px;
  }
  .file-actions button,
  .import {
    padding: 8px;
    border: 1px solid var(--color-performance-line);
    background: transparent;
    font-size: 11px !important;
    margin: 0 !important;
  }
  .import {
    cursor: pointer;
    position: relative;
  }
  .import input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    margin: 0 !important;
  }
  .preview-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 17px 24px;
    border-bottom: 1px solid var(--color-performance-line);
    font: 10px var(--font-performance-mono);
    color: var(--color-performance-muted);
  }
  .tabs {
    display: flex;
    gap: 3px;
  }
  .tabs button {
    border: 0;
    background: transparent;
    padding: 9px 14px;
  }
  .tabs .chosen {
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .preview-stage {
    padding: 32px 26px;
  }
  .preview-form {
    max-width: 560px;
    margin: auto;
    border: 1px solid var(--color-performance-line);
  }
  .stage-note {
    max-width: 560px;
    margin: 18px auto 0;
    color: var(--color-performance-muted);
    font-size: 11px;
    line-height: 1.6;
  }
  .motion-stage {
    padding: 24px;
  }
  .status {
    font-size: 12px;
    margin: 18px 0;
    color: var(--color-performance-muted);
  }
  .problem {
    font-size: 13px;
    line-height: 1.5;
    padding: 14px;
    border-left: 3px solid var(--color-performance-risk);
    background: var(--color-performance-panel);
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 10px;
    color: var(--color-performance-muted);
    padding-top: 12px;
  }
  @media (max-width: 850px) {
    main {
      padding: 28px 20px;
    }
    .intro {
      align-items: flex-start;
      flex-direction: column;
    }
    .workspace {
      grid-template-columns: 210px minmax(0, 1fr);
    }
    .inspector {
      padding-right: 16px;
    }
    .preview-stage {
      padding: 20px 12px;
    }
    .preview-head {
      padding: 12px;
    }
    .preview-head > span {
      display: none;
    }
    .motion-stage {
      padding: 16px;
    }
  }
  @media (max-width: 620px) {
    header {
      padding: 0 20px;
    }
    .workspace {
      display: flex;
      flex-direction: column;
    }
    .inspector {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line);
      padding-right: 0;
    }
    .inspector form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 12px;
    }
    .inspector form label,
    .inspector form textarea,
    .inspector form input,
    .inspector form select,
    .apply {
      grid-column: 1/-1;
    }
    .structure {
      display: none;
    }
    .preview-stage {
      padding: 20px 0;
    }
    .preview-head {
      padding: 12px 0;
    }
    .motion-stage {
      padding: 16px 0;
    }
    footer {
      flex-direction: column;
    }
  }
</style>
