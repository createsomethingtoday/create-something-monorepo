<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type CatalogVideo } from '$lib/client';
  import { timestamp, pathBase, type LessonProgress } from '$lib/learning';
  import { lessonPath } from '$lib/lessons';
  import Icon from './Icon.svelte';
  let { slug }: { slug?: string } = $props();
  let continued = $state<(CatalogVideo & LessonProgress)[]>([]);
  let failure = $state(false);
  onMount(() => {
    void api('learning/continue', undefined, slug)
      .then((r) => (continued = r.lessons))
      .catch(() => (failure = true));
  });
</script>

<section class="learning-overview" aria-label="Your learning">
  <div class="heading">
    <h2>{continued.length ? 'Continue learning' : 'Learn in sequence'}</h2>
    <a href={pathBase(slug)}>Learning paths <Icon name="arrow-right" /></a>
  </div>
  {#if continued.length}<div class="resumes">
      {#each continued as lesson}<a href={lessonPath(lesson.id, slug)}
          ><strong>{lesson.title}</strong><span
            >{lesson.watched_at
              ? 'Marked watched'
              : `Resume at ${timestamp(lesson.position)}`}{lesson.practice_started_at
              ? ' · Practice started'
              : ''}</span
          ></a
        >{/each}
    </div>{:else}<p>
      {failure
        ? 'Saved progress is temporarily unavailable. You can still open a lesson.'
        : 'Follow a creator’s learning path or choose a session below. Your playback position will be saved to your account.'}
    </p>{/if}
</section>

<style>
  .learning-overview {
    padding-block: 24px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 24px;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .heading h2 {
    font-size: 23px;
    margin: 0;
  }
  .heading a {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
  }
  .resumes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .resumes a {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-left: 2px solid var(--state-info);
    padding: 16px;
    text-decoration: none;
    background: color-mix(in srgb, var(--state-info) 5%, transparent);
  }
  .resumes span,
  p {
    color: var(--muted);
    font-size: 14px;
  }
</style>
