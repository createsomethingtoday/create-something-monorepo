<script lang="ts">
  /**
   * Marketplace storefront editor (feature-gated; rendered only when
   * GET /api/storefront?probe=1 reports enabled). Name, avatar, bio and
   * website stay in the Profile tab; this edits only storefront fields.
   */
  import { Button, Input, Label, Textarea } from './ui';
  import ImageUploader from './ImageUploader.svelte';

  interface Props {
    /** Lets the Settings modal block close/Escape while edits are unsaved or a write is running. */
    onstatechange?: (state: { dirty: boolean; busy: boolean }) => void;
  }

  let { onstatechange }: Props = $props();

  interface Fields {
    positioning: string;
    coverUrl: string | null;
    coverAlt: string;
    portfolioUrl: string;
    supportText: string;
    supportUrl: string;
  }
  interface Selection {
    assetId: string;
    note: string;
  }
  interface Candidate {
    assetId: string;
    name: string;
    templateSlug: string | null;
  }
  interface Receipt {
    publicationRevision: number;
    op: string;
    status: string;
    publishedDraftVersion: number | null;
    publishedAt: string | null;
    readModel: string;
    state: 'live' | 'removed' | 'propagating' | 'superseded' | 'unchanged';
  }
  interface Preview {
    storefront: {
      positioning?: string | null;
      cover?: { url: string; alt: string } | null;
      links: Array<{ href: string; label: string }>;
      support?: { text: string; href: string } | null;
      selections: Array<{ templateSlug: string; note: string | null }>;
    };
    issues: Array<{ assetId: string; reason: string }>;
    blockers: string[];
  }

  const LIMITS = { positioning: 120, coverAlt: 160, supportText: 400, note: 240, selections: 3 };
  const EMPTY: Fields = { positioning: '', coverUrl: null, coverAlt: '', portfolioUrl: '', supportText: '', supportUrl: '' };

  let isLoading = $state(true);
  let isBusy = $state(false);
  let loadError = $state<string | null>(null);
  let message = $state<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  let conflict = $state(false);

  let exists = $state(false);
  let draftVersion = $state(0);
  let status = $state('Never published');
  let publishedDraftVersion = $state<number | null>(null);
  let pending = $state(false);
  let receipt = $state<Receipt | null>(null);
  let candidates = $state<Candidate[]>([]);

  let fields = $state<Fields>({ ...EMPTY });
  let savedFields = $state<Fields>({ ...EMPTY });
  let selections = $state<Selection[]>([]);
  let savedSelections = $state<Selection[]>([]);
  let addAssetId = $state('');
  let preview = $state<Preview | null>(null);

  /** Keys survive a failed attempt, so "Try again" replays the same request. */
  let retryKeys = new Map<string, string>();

  const fieldsDirty = $derived(JSON.stringify(fields) !== JSON.stringify(savedFields));
  const selectionsDirty = $derived(JSON.stringify(selections) !== JSON.stringify(savedSelections));
  const dirty = $derived(fieldsDirty || selectionsDirty);
  const draftAhead = $derived(publishedDraftVersion !== null && draftVersion > publishedDraftVersion);
  const available = $derived(candidates.filter((c) => !selections.some((s) => s.assetId === c.assetId)));
  const canPublish = $derived(
    exists && draftVersion > 0 && !dirty && !pending && !conflict && !isBusy && status !== 'Suspended'
  );

  $effect(() => {
    onstatechange?.({ dirty, busy: isBusy });
  });

  const nameOf = (assetId: string) => candidates.find((c) => c.assetId === assetId)?.name ?? 'Unavailable template';

  $effect(() => {
    load();
  });

  function toFields(raw: Record<string, string | null | undefined> = {}): Fields {
    return {
      positioning: raw.positioning ?? '',
      coverUrl: raw.coverUrl ?? null,
      coverAlt: raw.coverAlt ?? '',
      portfolioUrl: raw.portfolioUrl ?? '',
      supportText: raw.supportText ?? '',
      supportUrl: raw.supportUrl ?? ''
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyView(view: any) {
    exists = view.draft?.exists === true;
    draftVersion = view.draft?.draftVersion ?? 0;
    status = view.draft?.status ?? 'Never published';
    publishedDraftVersion = view.draft?.publishedDraftVersion ?? null;
    pending = view.pending === true;
    receipt = view.lastReceipt ?? null;
    candidates = view.candidates ?? [];
    fields = toFields(view.draft?.fields);
    savedFields = { ...fields };
    selections = (view.draft?.selections ?? []).map((s: { assetId: string; note: string | null }) => ({
      assetId: s.assetId,
      note: s.note ?? ''
    }));
    savedSelections = selections.map((s) => ({ ...s }));
  }

  async function load() {
    isLoading = true;
    loadError = null;
    conflict = false;
    try {
      const response = await fetch('/api/storefront');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(describe(body, response.status));
      applyView(body);
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Could not load your storefront';
    } finally {
      isLoading = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function describe(body: any, status: number): string {
    switch (body?.error) {
      case 'ambiguous_creator':
        return 'More than one creator account matches your login. Contact Marketplace support to fix this before editing.';
      case 'creator_not_found':
        return 'No creator account matches your login.';
      case 'validation_failed': {
        const issues = (body.details?.issues ?? []) as Array<{ field: string; issue: string }>;
        return issues.length
          ? `Please fix: ${issues.map((i) => `${i.field} (${i.issue.replace(/_/g, ' ')})`).join(', ')}`
          : body.message;
      }
      case 'ineligible_selection': {
        const issues = (body.details?.issues ?? []) as Array<{ assetId: string; reason: string }>;
        return `Some templates can't be featured: ${issues
          .map((i) => `${nameOf(i.assetId)} (${i.reason.replace(/_/g, ' ')})`)
          .join(', ')}`;
      }
      case 'suspended':
        return 'Marketplace staff have suspended this storefront. Contact support to restore it.';
      case 'intent_pending':
        return 'A previous change is still being applied. Try again in a moment.';
      case 'upstream_unavailable':
      case 'service_unavailable':
        return 'The storefront service is temporarily unavailable. Your change was not confirmed; try again.';
      default:
        return body?.message ?? `Request failed (${status})`;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function post(action: string, payload: Record<string, unknown>, retryScope: string): Promise<any> {
    const key = retryKeys.get(retryScope) ?? crypto.randomUUID();
    retryKeys.set(retryScope, key);
    const response = await fetch('/api/storefront', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ action, ...payload })
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await response.json().catch(() => ({}));
    if (body?.error === 'version_conflict') {
      conflict = true;
      retryKeys.delete(retryScope);
      throw new Error('This storefront changed somewhere else (another tab or device). Reload to see the latest draft.');
    }
    if (!response.ok) {
      // Validation-style failures committed nothing: the next attempt gets a new key.
      if (response.status < 500 && response.status !== 409) retryKeys.delete(retryScope);
      throw new Error(describe(body, response.status));
    }
    retryKeys.delete(retryScope);
    return body;
  }

  async function saveDraft() {
    isBusy = true;
    message = null;
    preview = null;
    // Captured first: applying the fields response resets local selections.
    const wantSelections = selectionsDirty;
    const pendingSelections = selections.map((s) => ({ ...s }));
    try {
      if (fieldsDirty) {
        applyView(
          await post(
            'save',
            { expectedDraftVersion: draftVersion, fields: { ...fields, coverUrl: fields.coverUrl ?? '' } },
            `save:${draftVersion}`
          )
        );
      }
      if (wantSelections) {
        selections = pendingSelections;
        applyView(
          await post(
            'selections',
            {
              expectedDraftVersion: draftVersion,
              selections: pendingSelections.map((s) => ({ assetId: s.assetId, note: s.note }))
            },
            `selections:${draftVersion}`
          )
        );
      }
      message = { tone: 'success', text: 'Draft saved. Your public storefront has not changed.' };
    } catch (err) {
      if (wantSelections) selections = pendingSelections;
      message = { tone: 'error', text: err instanceof Error ? err.message : 'Could not save' };
    } finally {
      isBusy = false;
    }
  }

  async function loadPreview() {
    isBusy = true;
    message = null;
    try {
      const response = await fetch('/api/storefront?preview=1');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(describe(body, response.status));
      preview = body as Preview;
    } catch (err) {
      message = { tone: 'error', text: err instanceof Error ? err.message : 'Could not build preview' };
    } finally {
      isBusy = false;
    }
  }

  function receiptMessage(r: Receipt): { tone: 'success' | 'info' | 'error'; text: string } {
    switch (r.state) {
      // The Marketplace page does not read storefronts yet (CRE-2282), so say what changed, not where it shows.
      case 'live':
        return {
          tone: 'success',
          text: `Storefront customization published (version ${r.publicationRevision}). It is not shown on the Marketplace yet; it will appear when storefronts launch.`
        };
      case 'removed':
        return {
          tone: 'success',
          text: 'Storefront customization unpublished. Your creator profile and templates are unchanged.'
        };
      case 'propagating':
        return {
          tone: 'info',
          text: 'Recorded, but the published storefront data has not finished updating. It retries automatically; check back in a few minutes.'
        };
      case 'superseded':
        return { tone: 'info', text: 'A newer change replaced this one. Reload to see the current state.' };
      default:
        return { tone: 'info', text: 'Nothing changed.' };
    }
  }

  async function publish() {
    isBusy = true;
    message = null;
    try {
      const body = await post('publish', { expectedDraftVersion: draftVersion }, `publish:${draftVersion}`);
      message = receiptMessage(body.receipt as Receipt);
      await load();
      message = receiptMessage(body.receipt as Receipt);
    } catch (err) {
      message = { tone: 'error', text: err instanceof Error ? err.message : 'Could not publish' };
    } finally {
      isBusy = false;
    }
  }

  async function unpublish() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Unpublish your storefront customization? Your draft, creator profile and templates are kept.')
    )
      return;
    isBusy = true;
    message = null;
    try {
      const body = await post('unpublish', {}, 'unpublish');
      await load();
      message = receiptMessage(body.receipt as Receipt);
    } catch (err) {
      message = { tone: 'error', text: err instanceof Error ? err.message : 'Could not unpublish' };
    } finally {
      isBusy = false;
    }
  }

  function addSelection() {
    if (!addAssetId || selections.length >= LIMITS.selections) return;
    selections = [...selections, { assetId: addAssetId, note: '' }];
    addAssetId = '';
  }

  function move(index: number, delta: number) {
    const next = [...selections];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    selections = next;
  }

  function remove(index: number) {
    selections = selections.filter((_, i) => i !== index);
  }
</script>

<div class="storefront" data-testid="storefront-editor">
  {#if isLoading}
    <p class="muted">Loading storefront…</p>
  {:else if loadError}
    <div class="notice error" role="alert">{loadError}</div>
    <Button variant="secondary" onclick={load}>Try again</Button>
  {:else}
    <div class="status" data-testid="storefront-status">
      <span class="badge" data-status={status}>{status}</span>
      {#if draftAhead && status === 'Published'}
        <span class="muted">Your draft has changes that are not published yet.</span>
      {/if}
      {#if receipt && receipt.state === 'propagating'}
        <span class="muted">Last {receipt.op.replace('_', ' ')} is still updating the public page.</span>
      {/if}
    </div>

    {#if pending}
      <div class="notice info" role="status">A previous change is still being applied. Editing is paused until it finishes.</div>
    {/if}
    {#if message}
      <div class="notice {message.tone}" role={message.tone === 'error' ? 'alert' : 'status'} data-testid="storefront-message">
        {message.text}
      </div>
    {/if}
    {#if conflict}
      <Button variant="secondary" onclick={load}>Reload latest draft</Button>
    {/if}

    <p class="muted">
      Your name, profile image, bio and website come from the Profile tab. Changes here are a draft until you publish.
    </p>

    <fieldset disabled={isBusy || pending || status === 'Suspended'}>
      <div class="form-field">
        <Label for="sf-positioning">Positioning line</Label>
        <Input id="sf-positioning" bind:value={fields.positioning} maxlength={LIMITS.positioning} placeholder="What you design, in one line" />
        <span class="count">{fields.positioning.length}/{LIMITS.positioning}</span>
      </div>

      <div class="form-field">
        <ImageUploader
          value={fields.coverUrl}
          onchange={(url) => (fields.coverUrl = url)}
          label="Cover image"
          description="WebP only. Shown at the top of your storefront."
          disabled={isBusy || pending}
        />
      </div>
      {#if fields.coverUrl}
        <div class="form-field">
          <Label for="sf-cover-alt">Cover image description</Label>
          <Input id="sf-cover-alt" bind:value={fields.coverAlt} maxlength={LIMITS.coverAlt} placeholder="Describe the image for screen readers" />
        </div>
      {/if}

      <div class="form-field">
        <Label for="sf-portfolio">Portfolio link</Label>
        <Input id="sf-portfolio" type="url" bind:value={fields.portfolioUrl} placeholder="https://dribbble.com/you" />
      </div>

      <div class="form-field">
        <Label for="sf-support">Support note</Label>
        <Textarea id="sf-support" bind:value={fields.supportText} maxlength={LIMITS.supportText} rows={3} placeholder="How buyers can get help" />
        <span class="count">{fields.supportText.length}/{LIMITS.supportText}</span>
      </div>
      <div class="form-field">
        <Label for="sf-support-url">Support link</Label>
        <Input id="sf-support-url" bind:value={fields.supportUrl} placeholder="https://… or mailto:you@example.com" />
      </div>

      <div class="form-field">
        <Label for="sf-add">Featured templates ({selections.length}/{LIMITS.selections})</Label>
        <ol class="picks" data-testid="storefront-selections">
          {#each selections as selection, index (selection.assetId)}
            <li>
              <div class="pick-head">
                <strong>{nameOf(selection.assetId)}</strong>
                <span class="pick-actions">
                  <Button variant="secondary" size="sm" onclick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</Button>
                  <Button variant="secondary" size="sm" onclick={() => move(index, 1)} disabled={index === selections.length - 1} aria-label="Move down">↓</Button>
                  <Button variant="secondary" size="sm" onclick={() => remove(index)} aria-label="Remove">Remove</Button>
                </span>
              </div>
              <Input bind:value={selection.note} maxlength={LIMITS.note} placeholder="Optional note for buyers" aria-label="Note for {nameOf(selection.assetId)}" />
            </li>
          {/each}
        </ol>
        {#if selections.length < LIMITS.selections}
          <div class="add-row">
            <select id="sf-add" class="form-control" bind:value={addAssetId}>
              <option value="">Choose a published template…</option>
              {#each available as candidate (candidate.assetId)}
                <option value={candidate.assetId}>{candidate.name}</option>
              {/each}
            </select>
            <Button variant="secondary" onclick={addSelection} disabled={!addAssetId}>Add</Button>
          </div>
        {/if}
        {#if !candidates.length}
          <span class="muted">Only your published templates can be featured.</span>
        {/if}
      </div>
    </fieldset>

    <div class="form-actions">
      <Button variant="secondary" onclick={loadPreview} disabled={isBusy || dirty}>Preview</Button>
      <Button variant="secondary" onclick={saveDraft} disabled={isBusy || pending || !dirty}>
        {isBusy ? 'Working…' : 'Save draft'}
      </Button>
      {#if status === 'Published'}
        <Button variant="secondary" onclick={unpublish} disabled={isBusy || pending}>Unpublish</Button>
      {/if}
      <Button variant="default" onclick={publish} disabled={!canPublish}>Publish</Button>
    </div>
    {#if dirty}
      <p class="muted">Save your draft before previewing or publishing.</p>
    {:else if !exists}
      <p class="muted">Save a draft to start your storefront.</p>
    {/if}

    {#if preview}
      <section class="preview" aria-label="Storefront preview" data-testid="storefront-preview">
        <h4>Preview (not public)</h4>
        {#if preview.blockers.length}
          <div class="notice error">Can't publish yet: {preview.blockers.map((b) => b.replace(/_/g, ' ')).join(', ')}</div>
        {/if}
        {#if preview.storefront.cover}
          <img src={preview.storefront.cover.url} alt={preview.storefront.cover.alt} />
        {/if}
        {#if preview.storefront.positioning}<p class="lead">{preview.storefront.positioning}</p>{/if}
        {#each preview.storefront.links as link}
          <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
        {/each}
        <ol>
          {#each preview.storefront.selections as pick}
            <li>{pick.templateSlug}{pick.note ? ` — ${pick.note}` : ''}</li>
          {/each}
        </ol>
        {#if preview.storefront.support}
          <p>{preview.storefront.support.text} <a href={preview.storefront.support.href}>Contact</a></p>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<style>
  .storefront,
  fieldset {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .count,
  .muted {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }
  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }
  .badge {
    padding: 2px var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
  }
  .badge[data-status='Published'] {
    color: var(--color-success-ink);
    border-color: var(--color-success-border);
  }
  .badge[data-status='Suspended'] {
    color: var(--color-error-ink);
    border-color: var(--color-error-border);
  }
  .notice {
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    border: 1px solid var(--color-border-default);
  }
  .notice.error {
    background: var(--color-error-muted);
    border-color: var(--color-error-border);
    color: var(--color-error-ink);
  }
  .notice.success {
    background: var(--color-success-muted);
    border-color: var(--color-success-border);
    color: var(--color-success-ink);
  }
  .picks {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin: 0;
    padding-left: var(--space-lg);
  }
  .pick-head,
  .add-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }
  .pick-actions {
    display: flex;
    gap: var(--space-xs);
  }
  .form-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }
  .preview {
    border: 1px dashed var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-md);
  }
  .preview img {
    max-width: 100%;
    border-radius: var(--radius-md);
  }
  .lead {
    font-size: var(--text-body-lg, 1.125rem);
  }
</style>
