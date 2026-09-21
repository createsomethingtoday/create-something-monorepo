<script lang="ts">
  import LessonProgressControls from '$lib/components/LessonProgressControls.svelte';
  import { pathBase } from '$lib/learning';
  import { lessonPath } from '$lib/lessons';
  import StateBadge from '$lib/components/StateBadge.svelte';

  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
  import Player from '$lib/components/Player.svelte';
  import LessonEditor from '$lib/components/LessonEditor.svelte';
  let { data } = $props();
  const nextLesson = $derived(
    data.learningPath?.lessons[
      (data.learningPath?.lessons.findIndex(
        (v: { id: string }) => v.id === data.lessonData?.video.id
      ) ?? -1) + 1
    ]
  );
  const content = $derived(data.lessonData);
  const material = $derived(content?.lesson);
  const slug = $derived(data.network?.slug === 'create-something' ? undefined : data.network?.slug);
  const signIn = $derived(`/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}`);
</script>

<svelte:head
  ><title>{content?.video.title || 'Lesson unavailable'} | PRIVATE</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="lesson-workspace">
  <a class="back-link" href={data.libraryPath}><Icon name="arrow-left" /> Back to sessions</a>
  {#if !content}
    <section class="empty-state">
      <p class="eyebrow">PRIVATE / LESSON</p>
      <h1>Lesson unavailable.</h1>
      <p>This session may require an invitation, or may no longer be published.</p>
      {#if !data.identity}<a class="button" href={signIn}>Sign in with your invited email</a
        >{:else}<p>
          You’re signed in. Ask the creator to check access for your invited email.
        </p>{/if}
    </section>
  {:else}
    <header>
      <p class="eyebrow">{data.network?.name || 'CREATE SOMETHING'} / {content.video.series}</p>
      <h1>{content.video.title}</h1>
      <div class="lesson-meta">
        <StateBadge
          label={content.video.access === 'public'
            ? 'Public preview'
            : content.video.access === 'members'
              ? 'Members'
              : 'Private'}
          icon={content.video.access === 'public' ? 'users' : 'lock'}
        />
        {#if content.video.duration}<span>{Math.ceil(content.video.duration / 60)} min</span>{/if}
        {#if content.video.visibility !== 'published'}
          <StateBadge
            label={content.video.visibility === 'archived' ? 'Archived' : 'Draft'}
            icon={content.video.visibility === 'archived' ? 'archive' : 'document'}
          />
          <span>Creator preview</span>
        {/if}
      </div>
      {#if content.video.description}<p class="intro">{content.video.description}</p>{/if}
    </header>
    {#if data.canEdit}{#key content.video.id}<LessonEditor
          id={content.video.id}
          {slug}
          lesson={content.lesson}
          releases={content.releaseOptions}
        />{/key}{/if}
    <div class="lesson-grid">
      <div class="lesson-main">
        <section aria-label="Walkthrough">
          {#key content.video.id}<Player
              id={content.video.id}
              title={content.video.title}
              networkSlug={slug}
              duration={content.video.duration || 0}
              initialPosition={content.progress?.position || 0}
              saveProgress={!!data.canSaveProgress}
            />{/key}
        </section>
        {#if data.canSaveProgress}{#key content.video.id}<LessonProgressControls
              id={content.video.id}
              {slug}
              progress={content.progress}
              practice={!!material?.practice}
            />{/key}{/if}
        {#if material?.outcome}<section class="material">
            <p class="eyebrow">OUTCOME</p>
            <h2>What you’ll be able to do</h2>
            <p class="plain-text">{material.outcome}</p>
          </section>{/if}
        {#if material?.transcript}<details class="transcript">
            <summary>Read the transcript</summary>
            <div class="plain-text">{material.transcript}</div>
          </details>{/if}
        {#if material?.practice}<section class="material">
            <p class="eyebrow">PUT IT INTO PRACTICE</p>
            <h2>Try it yourself</h2>
            <p class="plain-text">{material.practice}</p>
            <p class="muted">
              Watching is a starting point. Use the creator’s checks to verify your result.
            </p>
          </section>{/if}
      </div>
      <aside aria-label="Lesson context">
        {#if data.learningPath}<section>
            <p class="eyebrow">LEARNING PATH</p>
            <h2>{data.learningPath.title}</h2>
            <a href={`${pathBase(slug)}/${data.learningPath.id}`}
              >View the sequence <Icon name="arrow-right" /></a
            >
            {#if nextLesson}<p>Up next: {nextLesson.title}</p>
              <a
                class="button secondary"
                href={`${lessonPath(nextLesson.id, slug)}?path=${encodeURIComponent(data.learningPath.id)}`}
                >Next lesson <Icon name="arrow-right" /></a
              >{:else}<p>
                This is the last lesson in the sequence. Return to the path to review your practice.
              </p>{/if}
          </section>{/if}
        <section>
          <p class="eyebrow">YOUR NETWORK</p>
          <h2>{data.network?.name || 'CREATE SOMETHING'}</h2>
          <p>Teaching and resources from this private network.</p>
          <a href={data.libraryPath}>Explore its sessions <Icon name="arrow-right" /></a>
        </section>
        {#if material?.prerequisites || material?.tools}<section>
            <h2>Before you start</h2>
            {#if material?.prerequisites}<h3>Prerequisites</h3>
              <p class="plain-text">{material.prerequisites}</p>{/if}{#if material?.tools}<h3>
                Tools and versions
              </h3>
              <p class="plain-text">{material.tools}</p>{/if}
          </section>{/if}
        {#if content.release}<section>
            <p class="eyebrow">RELATED RELEASE</p>
            <h2>{content.release.title}</h2>
            <p>Version {content.release.version}</p>
            <a
              class="button secondary"
              data-impact="primary_action"
              href={`/n/${data.network?.slug}/assets/${content.release.asset_id}?release=${encodeURIComponent(content.release.id)}`}
              >View exact release <Icon name="arrow-right" /></a
            >
            <p>
              Asset access is separate from this lesson. Check acquisition and download availability
              on the release page.
            </p>
          </section>{/if}
      </aside>
    </div>
  {/if}
</main>

<style>
  .lesson-workspace {
    max-width: 1280px;
    margin: auto;
    padding: var(--space-performance-lg) 4.5vw var(--space-performance-xl);
  }
  .back-link {
    display: inline-flex;
    gap: var(--space-performance-xs);
    align-items: center;
    min-height: 44px;
    margin-bottom: var(--space-performance-md);
  }
  header {
    margin-bottom: var(--space-performance-lg);
  }
  h1 {
    font-size: clamp(32px, 4vw, 54px);
    line-height: 1.08;
    letter-spacing: -0.04em;
    max-width: 24ch;
    overflow-wrap: anywhere;
  }
  h2 {
    font-size: 23px;
    letter-spacing: -0.02em;
  }
  h3 {
    font-size: 15px;
    margin-bottom: var(--space-performance-xs);
  }
  .intro {
    max-width: 75ch;
    color: var(--muted);
  }
  .lesson-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
    color: var(--muted);
    margin-top: var(--space-performance-md);
  }
  .lesson-grid {
    display: grid;
    grid-template-columns: minmax(0, 2.3fr) minmax(240px, 1fr);
    gap: var(--space-performance-lg);
    align-items: start;
  }
  .lesson-main,
  aside {
    min-width: 0;
  }
  aside {
    border-left: 1px solid var(--line);
    padding-left: var(--space-performance-md);
  }
  aside section + section {
    border-top: 1px solid var(--line);
    padding-top: var(--space-performance-md);
    margin-top: var(--space-performance-lg);
  }
  aside p {
    color: var(--muted);
  }
  .plain-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-width: 75ch;
    line-height: 1.7;
  }
  .material,
  .transcript {
    border-top: 1px solid var(--line);
    margin-top: var(--space-performance-lg);
    padding-top: var(--space-performance-md);
  }
  summary {
    cursor: pointer;
    font-weight: 600;
    min-height: 44px;
  }
  .transcript .plain-text {
    margin-top: var(--space-performance-md);
  }
  @media (max-width: 760px) {
    .lesson-grid {
      grid-template-columns: 1fr;
    }
    aside {
      border-left: 0;
      border-top: 1px solid var(--line);
      padding: var(--space-performance-md) 0 0;
    }
  }
</style>
