<script lang="ts">
  import HyperframesExport from '$lib/composition/HyperframesExport.svelte';
  import { onMount, tick } from 'svelte';
  import { RECOVERY_KEY, parseRecovery, serializeRecovery, recoveryMatchesSaved, type Recovery } from '$lib/composition/recovery';
  import { beforeNavigate } from '$app/navigation';
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
    editing = $state(false),
    notice = $state(''),
    problem = $state('');
  let title = $state(initial.content.title),
    description = $state(initial.content.description),
    buttonLabel = $state(initial.content.buttonLabel),
    variant = $state<'primary' | 'secondary'>(initial.content.variant);
  let saved = $state(serialize(initial)),
    hasSaved = $state(false);
  let importAttempt = 0;
  const pending = $derived(
    title !== doc.content.title ||
      description !== doc.content.description ||
      buttonLabel !== doc.content.buttonLabel ||
      variant !== doc.content.variant
  );
  const dirty = $derived(pending || serialize(doc) !== saved);
  const saveState = $derived(
    pending
      ? 'Unapplied changes · not saved.'
      : dirty
        ? 'Unsaved changes.'
        : hasSaved
          ? 'Saved on this device.'
          : 'Not saved on this device.'
  );
  const draftKey = () => JSON.stringify({ doc, title, description, buttonLabel, variant });
  function candidate() {
    return pending ? updateContent(doc, { title, description, buttonLabel, variant }) : doc;
  }
  beforeNavigate((navigation) => {
    if (!dirty || leaving) return;
    if (navigation.willUnload) navigation.cancel();
    else if (!window.confirm('Leave without saving your composition changes?')) navigation.cancel();
  });
  let canvasHref = $state('/');
  let loaded = $state(false), leaving = $state(false), recoveryError = $state(false);
  let recovery = $state<Recovery | null>(null);
  let leaveDialog: HTMLDialogElement, returnLink: HTMLAnchorElement;
  $effect(() => {
    if (!loaded || leaving || recovery || recoveryError) return;
    try {
      if (dirty) localStorage.setItem(RECOVERY_KEY, serializeRecovery(doc, { title, description, buttonLabel, variant }, saved));
      else localStorage.removeItem(RECOVERY_KEY);
    } catch { problem = dirty ? 'Draft recovery is unavailable. Save or export before closing Compose.' : 'Saved content is safe, but draft recovery could not be cleared.'; }
  });
  function clearRecovery() {
    try { localStorage.removeItem(RECOVERY_KEY); recovery = null; recoveryError = false; return true; }
    catch { problem = 'Could not clear draft recovery. Your saved composition is unchanged.'; return false; }
  }
  function restoreDraft() {
    if (!recovery) return;
    const draft = recovery;
    doc = draft.document;
    ({ title, description, buttonLabel, variant } = draft.fields);
    recovery = null;
    notice = 'Unsaved draft restored. Review it, then save to keep it on this device.';
    problem = '';
    editing = matchMedia('(max-width: 620px)').matches;
    void tick().then(() => window.document.getElementById('title')?.focus());
  }
  function discardDraft() {
    if (!clearRecovery()) return;
    notice = 'Draft discarded. The saved composition is unchanged.';
    problem = '';
    editing = matchMedia('(max-width: 620px)').matches;
    void tick().then(() => window.document.getElementById('title')?.focus());
  }
  function requestReturn(event: MouseEvent) {
    if (!dirty || leaving) return;
    event.preventDefault();
    leaveDialog.showModal();
  }
  function keepEditing() { leaveDialog.close(); returnLink.focus(); }
  function returnToCanvas(saveFirst: boolean) {
    if (saveFirst ? !save() : !clearRecovery()) { keepEditing(); return; }
    leaving = true;
    leaveDialog.close();
    location.href = canvasHref;
  }
  function sync() {
    title = doc.content.title;
    description = doc.content.description;
    buttonLabel = doc.content.buttonLabel;
    variant = doc.content.variant;
  }
  onMount(() => {
    const project = new URL(location.href).searchParams.get('project');
    if (project) canvasHref = `/?project=${encodeURIComponent(project)}`;
    const phone = matchMedia('(max-width: 620px)');
    const updateLayout = () => {
      if (!phone.matches) editing = false;
    };
    phone.addEventListener('change', updateLayout);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        doc = parseDocument(stored);
        sync();
        saved = serialize(doc);
        hasSaved = true;
        notice = '';
      }
    } catch {
      problem =
        'Could not restore the saved composition. The default is available; your saved bytes have not been overwritten.';
    }
    try {
      const draft = localStorage.getItem(RECOVERY_KEY);
      if (draft) { const candidate = parseRecovery(draft); if (!recoveryMatchesSaved(candidate, saved)) recovery = candidate; }
    } catch {
      recoveryError = true;
      problem = 'Could not read draft recovery. Your saved composition and recovery bytes have not been changed.';
    }
    loaded = true;
    return () => phone.removeEventListener('change', updateLayout);
  });
  function apply() {
    try {
      doc = candidate();
      problem = '';
      notice = 'Preview updated. Save locally to keep these changes.';
    } catch {
      notice = '';
      problem = 'Complete the heading, supporting copy and action label before applying.';
    }
  }
  function cancelEdits() {
    sync();
    problem = '';
    notice = 'Unapplied edits canceled. The preview is unchanged.';
  }
  function save() {
    try {
      // Save the visible editor in one transaction. Failed validation or storage
      // must leave both the previous preview and the user's draft intact.
      const next = candidate();
      const text = serialize(next);
      localStorage.setItem(STORAGE_KEY, text);
      doc = next;
      saved = text;
      hasSaved = true;
      notice = '';
      problem = '';
    } catch {
      notice = '';
      problem =
        'Could not save. Check the required fields and try again, or export JSON to keep a copy.';
      return false;
    }
    try { localStorage.removeItem(RECOVERY_KEY); }
    catch { problem = 'Saved content is safe, but draft recovery could not be cleared.'; }
    return true;
  }
  function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportJson() {
    try {
      download(serialize(candidate()), 'draw-composition.json');
      problem = '';
      notice =
        'Composition JSON exported, including visible edits. Your local saved copy is unchanged.';
    } catch {
      notice = '';
      problem = 'Complete the required content before exporting. Your edits are still here.';
    }
  }
  async function exportRender() {
    const before = draftKey();
    try {
      const h = await handoff(candidate());
      await parseHandoff(JSON.stringify(h));
      if (before !== draftKey()) throw Error('Composition changed during export. Try again.');
      download(JSON.stringify(h, null, 2), 'draw-render-handoff.json');
      problem = '';
      notice =
        'Render handoff JSON exported. Open the render view and choose this file to export offline HTML ZIPs.';
    } catch (e) {
      notice = '';
      problem = (e as Error).message;
    }
  }
  function cancelImport() {
    importAttempt++;
    problem = '';
    notice = 'Import canceled. Current composition unchanged.';
  }
  async function importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      cancelImport();
      return;
    }
    const attempt = ++importAttempt;
    const before = draftKey();
    try {
      if (file.size > 40000) throw Error('Composition is too large.');
      const candidate = parseDocument(await file.text());
      if (attempt !== importAttempt) return;
      if (before !== draftKey()) {
        problem =
          'Your composition changed while the file was opening. Choose the file again. Your edits are still here.';
        notice = '';
        return;
      }
      if (dirty && !window.confirm('Replace your unsaved composition changes with this file?')) {
        cancelImport();
        return;
      }
      doc = candidate;
      sync();
      problem = '';
      notice = 'Composition imported. Save to keep it on this device.';
    } catch {
      if (attempt !== importAttempt) return;
      notice = '';
      problem =
        'Choose a valid Draw composition JSON file. Your current composition and edits are unchanged.';
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:window onbeforeunload={(event) => { if (dirty && !leaving) { event.preventDefault(); event.returnValue = ''; } }} />

<svelte:head
  ><title>Compose a form · Draw</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<dialog bind:this={leaveDialog} aria-labelledby="leave-title" oncancel={() => returnLink.focus()}>
  <h2 id="leave-title">Save changes before returning to Draw?</h2>
  <p>Your latest edits have not been saved on this device.</p>
  <button onclick={() => returnToCanvas(true)}>Save and return</button>
  <button onclick={() => returnToCanvas(false)}>Leave without saving</button>
  <button autofocus onclick={keepEditing}>Keep editing</button>
</dialog>
<div class="app">
  <header>
    <a bind:this={returnLink} href={canvasHref} onclick={requestReturn} data-sveltekit-reload aria-label="Draw canvas"
      ><img src="/brand/draw-dark.svg" width="28" height="28" alt="" /><strong>Draw</strong></a
    ><span class="divider"></span><span>Compose</span><span class="local">DEVICE LOCAL</span>
  </header>
  <main>
    <section class="intro">
      <div>
        <p class="kicker">CANON FORM TEMPLATE</p>
        <h1>Compose a form.<br />Show how it works.</h1>
      </div>
      <p>
        Edit this four-component form and its teaching sequences.<br />This composition saves
        separately from your Draw canvas.
      </p>
    </section>
    {#if recovery || recoveryError}
      <section class="recovery" aria-label="Unsaved draft recovery">
        <h2>Unsaved draft available</h2>
        <p>{recoveryError ? 'Recovery could not be read. The saved composition is still available.' : recovery?.baseline !== saved ? 'The saved composition has changed since this draft. Restoring keeps saved content intact until you choose Save.' : 'Restore your previous edits, or discard the draft and keep the saved composition.'}</p>
        {#if recovery}<button onclick={restoreDraft}>Restore draft</button>{/if}
        <button onclick={discardDraft}>Discard draft</button>
      </section>
    {/if}
    <div class="workspace-tools" inert={Boolean(recovery || recoveryError)}>
      <div class="tabs" aria-label="Composition views">
        <button
          class="edit-tab"
          class:chosen={editing}
          aria-pressed={editing}
          onclick={() => (editing = true)}>Edit</button
        >
        <button
          class:chosen={!editing && mode === 'preview'}
          aria-pressed={!editing && mode === 'preview'}
          onclick={() => {
            editing = false;
            mode = 'preview';
          }}>Preview</button
        >
        <button
          class:chosen={!editing && mode === 'motion'}
          aria-pressed={!editing && mode === 'motion'}
          onclick={() => {
            editing = false;
            mode = 'motion';
          }}>Motion</button
        >
      </div>
      <div class="save-actions">
        <button class="save" onclick={save}>Save locally</button><span
          class="save-state"
          role="status">{saveState}</span
        >
      </div>
    </div>
    {#if notice}<div class="status" role="status">{notice}</div>{/if}
    {#if problem}<div role="alert" class="problem">{problem}</div>{/if}
    <div class="workspace" class:editing inert={Boolean(recovery || recoveryError)}>
      <aside class="inspector" aria-label="Composition editor">
        <div class="section-head">
          <span>01</span>
          <h2>Edit form content</h2>
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
          <label for="variant">Button style</label><select id="variant" bind:value={variant}
            ><option value="primary">Primary</option><option value="secondary">Secondary</option
            ></select
          >
          <button class="apply" type="submit">Apply changes <span>↗</span></button>
          <button class="cancel-edits" type="button" disabled={!pending} onclick={cancelEdits}
            >Cancel edits</button
          >
        </form>
        <details class="structure">
          <summary>Structure · 4 Canon components</summary>
          <div class="section-head">
            <span>02</span>
            <h2>Structure</h2>
          </div>
          <p>Request form</p>
          <p class="scope-note">Fixed template · edit the content and button style above.</p>
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
        </details>
        <div class="file-actions">
          <button onclick={exportJson}>Export JSON</button><label class="import"
            >Import JSON<input
              aria-label="Import composition JSON"
              type="file"
              accept="application/json,.json"
              onchange={importFile}
              oncancel={cancelImport}
            /></label
          ><button onclick={exportRender}>Export render handoff</button>
        </div>
        <a class="render-link" href="/compose/render" target="_blank" rel="noopener"
          >Open render view <span aria-hidden="true">↗</span><span class="sr-only">
            (new tab)</span
          ></a
        >
        <p class="scope-note">
          JSON keeps the editable composition. Render handoff JSON opens in the render view. Motion
          exports an offline HTML ZIP, not a video.
        </p>
      </aside>
      <section class="preview-area" aria-label="Composition workspace">
        <div hidden={mode !== 'preview'} class="preview-stage">
          <div class="preview-form"><FormView {doc} /></div>
          <p class="stage-note">
            Try an empty request, then add details.<br />The first complete attempt fails locally;
            “Try again” recovers.
          </p>
        </div>
        <div hidden={mode !== 'motion'} class="motion-stage">
          {#if mode === 'motion'}<MotionView {doc} /><HyperframesExport
              {doc}
              disabled={pending}
            />{/if}
        </div>
      </section>
    </div>
    <footer>
      <span>One form. Two teaching sequences.</span><span
        >Device-local composition · export JSON to keep a copy</span
      >
    </footer>
  </main>
</div>

<style>
  dialog,.recovery{background:var(--color-performance-panel);color:var(--color-performance-ink);border:1px solid var(--color-performance-line);padding:24px;max-width:560px}dialog::backdrop{background:#0008}dialog button,.recovery button{font:inherit;padding:10px;margin:8px 8px 0 0}dialog p,.recovery p{line-height:1.6}.recovery{margin-bottom:24px}

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
  .workspace-tools,
  .save-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .workspace-tools {
    padding: 12px 0;
    border-top: 1px solid var(--color-performance-line);
  }
  .save-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .save-state {
    font-size: 12px;
    color: var(--color-performance-muted);
  }
  .save,
  .cancel-edits {
    min-height: 44px;
    padding: 10px 14px;
    border: 1px solid var(--color-performance-line);
    background: transparent;
  }
  .save {
    background: var(--color-performance-ink);
    color: var(--color-performance-paper);
  }
  .cancel-edits {
    margin-top: 8px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .render-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: inherit;
    font-size: 13px;
  }
  .scope-note {
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-performance-muted);
    font-weight: 400 !important;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
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
  .structure summary {
    min-height: 44px;
    cursor: pointer;
    padding: 12px 0;
  }
  .structure[open] summary {
    margin-bottom: 12px;
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
    min-height: 44px;
    padding: 8px;
    border: 1px solid var(--color-performance-line);
    background: transparent;
    font-size: 11px !important;
    margin: 0 !important;
  }
  .import {
    cursor: pointer;
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .import:focus-within {
    outline: 2px solid var(--color-performance-signal);
    outline-offset: 3px;
  }
  .import input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    margin: 0 !important;
  }
  .tabs {
    display: flex;
    gap: 3px;
  }
  .tabs button {
    min-height: 44px;
    border: 0;
    background: transparent;
    padding: 9px 14px;
  }
  .tabs .edit-tab {
    display: none;
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
    .motion-stage {
      padding: 16px;
    }
  }
  @media (max-width: 620px) {
    main {
      padding-top: 20px;
    }
    .intro {
      gap: 10px;
      margin-bottom: 18px;
    }
    .kicker {
      margin-bottom: 8px;
    }
    .intro h1 {
      font-size: 28px;
    }
    .intro > p {
      font-size: 12px;
    }
    .workspace-tools {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--color-performance-paper);
      flex-wrap: wrap;
    }
    .tabs {
      width: 100%;
    }
    .tabs button {
      flex: 1;
    }
    .tabs .edit-tab {
      display: block;
    }
    .save-actions {
      width: 100%;
      justify-content: flex-start;
    }
    header {
      padding: 0 20px;
    }
    .workspace {
      display: flex;
      flex-direction: column;
    }
    .inspector {
      display: none;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line);
      padding-right: 0;
    }
    .editing .inspector {
      display: block;
    }
    .editing .preview-area {
      display: none;
    }
    .inspector input,
    .inspector textarea,
    .inspector select {
      font-size: 16px;
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
    .apply,
    .cancel-edits {
      grid-column: 1/-1;
    }
    .structure {
      display: none;
    }
    .preview-stage {
      padding: 20px 0;
    }
    .motion-stage {
      padding: 16px 0;
    }
    footer {
      flex-direction: column;
    }
  }
</style>
