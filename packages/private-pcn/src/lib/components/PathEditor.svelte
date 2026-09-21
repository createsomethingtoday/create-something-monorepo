<script lang="ts">
  import { untrack } from 'svelte';
  import { api, type CatalogVideo } from '$lib/client';
  import { goto, invalidateAll } from '$app/navigation';
  import { pathBase, type PathView } from '$lib/learning';
  import StatusNotice from './StatusNotice.svelte';
  let { path, videos, slug }: { path?: PathView | null; videos: CatalogVideo[]; slug?: string } =
    $props();
  let title = $state(untrack(() => path?.title || ''));
  let outcome = $state(untrack(() => path?.outcome || ''));
  let prerequisites = $state(untrack(() => path?.prerequisites || ''));
  let minutes = $state(untrack(() => path?.estimated_minutes || 20));
  let visibility = $state(untrack(() => path?.visibility || 'draft'));
  let lessons = $state(untrack(() => [...(path?.lesson_ids || [''])]));
  let busy = $state(false);
  let failure = $state('');
  let saved = $state(false);
  function move(index: number, direction: number) {
    const copy = [...lessons];
    [copy[index], copy[index + direction]] = [copy[index + direction], copy[index]];
    lessons = copy;
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    failure = '';
    saved = false;
    try {
      const result = await api(
        'learning/paths/save',
        {
          id: path?.id,
          revision: path?.revision,
          title,
          outcome,
          prerequisites,
          estimated_minutes: minutes,
          lesson_ids: lessons,
          visibility
        },
        slug
      );
      await invalidateAll();
      saved = true;
      if (!path) await goto(`${pathBase(slug)}/${result.id}`);
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<details class="path-editor">
  <summary>{path ? 'Edit this path' : 'Create a learning path'}</summary>
  <form onsubmit={save}>
    <p>
      Build a sequence around a concrete result. Publishing requires every lesson to be published
      and ready.
    </p>
    <fieldset disabled={busy}>
      <label>Path title<input required maxlength="120" bind:value={title} /></label>
      <label
        >What members will be able to do<textarea required maxlength="1000" bind:value={outcome}
        ></textarea></label
      >
      <label>Prerequisites<textarea maxlength="2000" bind:value={prerequisites}></textarea></label>
      <div class="pair">
        <label
          >Estimated effort (minutes)<input
            type="number"
            min="1"
            max="10000"
            required
            bind:value={minutes}
          /></label
        >
        <label
          >Visibility<select bind:value={visibility}
            ><option value="draft">Draft</option><option value="published">Published</option><option
              value="archived">Archived</option
            ></select
          ></label
        >
      </div>
      <h3>Lesson order</h3>
      <ol>
        {#each lessons as id, index}<li>
            <label
              >Lesson {index + 1}<select bind:value={lessons[index]} required
                ><option value="">Choose a lesson</option>{#each videos as video}<option
                    value={video.id}>{video.title} · {video.visibility}</option
                  >{/each}</select
              ></label
            >
            <div class="order-actions">
              <button
                type="button"
                class="button secondary"
                disabled={index === 0}
                aria-label={`Move lesson ${index + 1} up`}
                onclick={() => move(index, -1)}>Move up</button
              ><button
                type="button"
                class="button secondary"
                disabled={index === lessons.length - 1}
                aria-label={`Move lesson ${index + 1} down`}
                onclick={() => move(index, 1)}>Move down</button
              ><button
                type="button"
                class="text-button"
                disabled={lessons.length === 1}
                aria-label={`Remove lesson ${index + 1}`}
                onclick={() => (lessons = lessons.filter((_, i) => i !== index))}>Remove</button
              >
            </div>
          </li>{/each}
      </ol>
      <button
        type="button"
        class="button secondary"
        disabled={lessons.length >= 30}
        onclick={() => (lessons = [...lessons, ''])}>Add lesson</button
      >
      <button type="submit" class="button">{busy ? 'Saving…' : 'Save path'}</button>
    </fieldset>
    {#if failure}<StatusNotice tone="error" message={failure} />{:else if saved}<StatusNotice
        tone="success"
        message="Path saved."
      />{/if}
  </form>
</details>

<style>
  .path-editor {
    border: 1px solid var(--line);
    padding: var(--space-performance-md);
    margin-block: var(--space-performance-md);
  }
  summary {
    min-height: 44px;
    cursor: pointer;
    font-weight: 600;
  }
  fieldset {
    border: 0;
    padding: 0;
    display: grid;
    gap: var(--space-performance-sm);
    min-width: 0;
  }
  label {
    display: grid;
    gap: 8px;
  }
  form {
    max-width: 760px;
  }
  ol {
    padding-left: 24px;
  }
  li {
    padding-block: 12px;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .order-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
  }
  .order-actions button {
    font-size: 13px;
    min-height: 44px;
    padding: 8px 12px;
  }
  textarea {
    min-height: 90px;
  }
  p {
    color: var(--muted);
  }
  @media (max-width: 600px) {
    .pair {
      grid-template-columns: 1fr;
    }
  }
</style>
