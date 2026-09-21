<script lang="ts">
  import { page } from '$app/state';
  import { pathBase, timestamp, type PathView } from '$lib/learning';
  import { lessonPath } from '$lib/lessons';
  import type { CatalogVideo } from '$lib/client';
  import PathEditor from './PathEditor.svelte';
  import StateBadge from './StateBadge.svelte';
  import Icon from './Icon.svelte';
  let {
    data
  }: {
    data: {
      path: PathView | null;
      paths: PathView[];
      videos: CatalogVideo[];
      canEdit: boolean;
      network?: { slug: string; name: string } | null;
      identity?: unknown;
    };
  } = $props();
  const slug = $derived(data.network?.slug === 'create-something' ? undefined : data.network?.slug);
  const base = $derived(pathBase(slug));
  const detail = $derived(!!page.params.id);
  const next = $derived(data.path?.lessons.find((v) => !v.progress?.watched_at));
  const link = (id: string) => `${lessonPath(id, slug)}?path=${encodeURIComponent(data.path!.id)}`;
</script>

<svelte:head
  ><title>{data.path?.title || 'Learning paths'} | PRIVATE</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="paths-workspace">
  <a class="back-link" href={detail ? base : slug ? `/n/${slug}` : '/library'}
    ><Icon name="arrow-left" /> {detail ? 'All learning paths' : 'Back to sessions'}</a
  >
  {#if detail && !data.path}<section class="empty-state">
      <h1>Learning path unavailable.</h1>
      <p>
        Ask the creator to check your access. Paths appear when their lessons are available to you.
      </p>
      {#if !data.identity}<a
          class="button"
          href={`/login?next=${encodeURIComponent(page.url.pathname)}`}>Sign in</a
        >{/if}
    </section>
  {:else if data.path}
    <header>
      <p class="eyebrow">{data.network?.name || 'CREATE SOMETHING'} / LEARNING PATH</p>
      <h1>{data.path.title}</h1>
      <p class="outcome">{data.path.outcome}</p>
      <div class="meta">
        <span
          >{data.path.lessons.length} {data.path.lessons.length === 1 ? 'lesson' : 'lessons'}</span
        ><span>About {data.path.estimated_minutes} min including practice</span
        >{#if data.path.visibility !== 'published'}<StateBadge
            label={data.path.visibility === 'draft' ? 'Draft' : 'Archived'}
            icon="document"
          />{/if}
      </div>
    </header>
    {#if data.canEdit}{#key data.path.id}<PathEditor
          path={data.path}
          videos={data.videos}
          {slug}
        />{/key}{/if}
    <div class="path-grid">
      <section aria-label="Lesson sequence">
        <h2>Your next step</h2>
        {#if next}<a class="button" href={link(next.id)}
            >{next.progress?.position ? 'Continue learning' : 'Start next lesson'}
            <Icon name="arrow-right" /></a
          >{:else}<p>
            You’ve marked every lesson watched. Revisit the practice tasks to check your work.
          </p>{/if}
        <ol class="sequence">
          {#each data.path.lessons as lesson, index}<li>
              <a href={link(lesson.id)}
                ><span class="number">{String(index + 1).padStart(2, '0')}</span><span
                  ><h3>{lesson.title}</h3>
                  <div class="meta">
                    {#if lesson.progress?.watched_at}<StateBadge
                        label="Marked watched"
                        tone="success"
                        icon="check"
                      />{:else if lesson.progress?.position}<StateBadge
                        label={`Resume at ${timestamp(lesson.progress.position)}`}
                        tone="info"
                        icon="refresh"
                      />{:else}<span>Ready to start</span
                      >{/if}{#if lesson.progress?.practice_started_at}<StateBadge
                        label="Practice started"
                        tone="info"
                        icon="info"
                      />{/if}
                  </div></span
                ><Icon name="arrow-right" /></a
              >
            </li>{/each}
        </ol>
      </section>
      <aside>
        <h2>Before you begin</h2>
        <p class="plain-text">
          {data.path.prerequisites ||
            'No prerequisites listed. Review each lesson’s tools before you start.'}
        </p>
        <h3>Progress belongs to you</h3>
        <p>
          Playback position and the steps you mark are saved to your account. They are personal
          notes, not evidence of reviewed competence.
        </p>
      </aside>
    </div>
  {:else}
    <header>
      <p class="eyebrow">PRIVATE / LEARN BY BUILDING</p>
      <h1>Learning paths.</h1>
      <p class="outcome">
        A deliberate sequence from a technique to something you can put into practice.
      </p>
    </header>
    {#if data.canEdit}<PathEditor videos={data.videos} {slug} />{/if}
    {#if !data.paths.length}<section class="empty-state">
        <h2>No paths available yet.</h2>
        <p>
          {data.canEdit
            ? 'Create a path from your lessons, then publish it when the sequence is ready.'
            : 'The creator’s published learning paths will appear here when you have access.'}
        </p>
      </section>{:else}<div class="path-cards">
        {#each data.paths as path}<a class="path-card" href={`${base}/${path.id}`}
            ><span class="eyebrow"
              >{path.lessons.length} LESSONS / ABOUT {path.estimated_minutes} MIN</span
            >
            <h2>{path.title}</h2>
            <p>{path.outcome}</p>
            {#if path.visibility !== 'published'}<StateBadge
                label={path.visibility === 'draft' ? 'Draft' : 'Archived'}
                icon="document"
              />{/if}<span class="open">View path <Icon name="arrow-right" /></span></a
          >{/each}
      </div>{/if}
  {/if}
</main>

<style>
  .paths-workspace {
    max-width: 1280px;
    margin: auto;
    padding: var(--space-performance-lg) 4.5vw var(--space-performance-xl);
  }
  .back-link {
    display: inline-flex;
    gap: 12px;
    align-items: center;
    min-height: 44px;
    margin-bottom: 32px;
  }
  header {
    max-width: 900px;
    margin-bottom: 32px;
  }
  h1 {
    font-size: clamp(36px, 4vw, 56px);
    line-height: 1.08;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
  .outcome {
    font-size: 20px;
    line-height: 1.6;
    max-width: 65ch;
    color: var(--muted);
  }
  .meta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: center;
    color: var(--muted);
    font-size: 14px;
  }
  .path-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
    gap: 48px;
  }
  .sequence {
    padding: 0;
    list-style: none;
    margin-top: 32px;
  }
  .sequence li {
    border-top: 1px solid var(--line);
  }
  .sequence a {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 20px;
    text-decoration: none;
    padding: 24px 0;
  }
  .number {
    font: 14px monospace;
    color: var(--muted);
  }
  h3 {
    margin: 0 0 12px;
    font-size: 18px;
  }
  .sequence a:hover h3 {
    color: var(--state-info);
  }
  aside {
    border-left: 1px solid var(--line);
    padding-left: 24px;
    color: var(--muted);
  }
  .plain-text {
    white-space: pre-wrap;
  }
  .path-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 24px;
  }
  .path-card {
    padding: 24px;
    border: 1px solid var(--line);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .path-card:hover {
    border-color: var(--state-info);
  }
  .path-card h2,
  .path-card p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .path-card p {
    color: var(--muted);
  }
  .open {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: auto;
    min-height: 44px;
  }
  @media (max-width: 760px) {
    .path-grid {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    aside {
      border-left: 0;
      border-top: 1px solid var(--line);
      padding: 24px 0;
    }
    .sequence a {
      gap: 12px;
    }
  }
</style>
