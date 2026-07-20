<script lang="ts">
  import type { PageData } from './$types';
  import { formatDateOnly, formatTime } from '$lib/taste/insights';
  import { Sparkline } from '@create-something/tufte';
  import type { DataPoint } from '@create-something/tufte';
  import { SEO } from '@create-something/canon';

  let { data }: { data: PageData } = $props();
  let shareState = $state<'idle' | 'copying' | 'copied' | 'failed'>('idle');

  function formatChannel(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getBarWidth(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.round((value / max) * 100);
  }

  const maxChannelTime = $derived(
    Math.max(...data.channelBreakdown.map((item) => item.timeSeconds), 1)
  );
  const collectionSparklineData = $derived<DataPoint[]>(
    data.collectionGrowth.map((point) => ({ count: point.collectionCount }))
  );
  const latestCollection = $derived(data.collectionGrowth.at(-1));
  const nextStudy = $derived(
    data.stats.totalViewed === 0
      ? {
          title: 'Start with one reference',
          body: 'Choose a source, study one detail, and record why it matters.'
        }
      : data.stats.channelsExplored < data.stats.totalChannels
        ? {
            title: 'Open an unfamiliar channel',
            body: `You have explored ${data.stats.channelsExplored} of ${data.stats.totalChannels} channels. Compare a new source with one you already know.`
          }
        : {
            title: 'Revisit your strongest channel',
            body: 'Compare two references and name the principle they share.'
          }
  );

  function generateShareText(): string {
    const lines = [
      'My Taste Profile',
      '',
      `Exploration score: ${data.profile.explorationScore}/100`,
      data.profile.summary,
      '',
      `${data.stats.channelsExplored}/${data.stats.totalChannels} channels explored`,
      `${formatTime(data.stats.totalTimeSeconds)} invested`,
      `${data.stats.totalStudied} references studied`
    ];

    if (data.profile.focusAreas.length > 0) {
      lines.push('', `Focus: ${data.profile.focusAreas.join(', ')}`);
    }

    lines.push('', 'Cultivate your taste at createsomething.ltd/taste');
    return lines.join('\n');
  }

  async function shareProfile() {
    if (shareState === 'copying') return;

    shareState = 'copying';
    try {
      const text = generateShareText();
      if (navigator.share) {
        await navigator.share({ title: 'My Taste Profile', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      shareState = 'copied';
    } catch {
      shareState = 'failed';
    }
  }
</script>

<SEO
  title="Reading Insights — Taste"
  description="See what you explored, identify a pattern, and choose what to study next."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Taste', url: 'https://createsomething.ltd/taste' },
    { name: 'Insights', url: 'https://createsomething.ltd/taste/insights' }
  ]}
/>

<div class="insights-page">
  <section class="chapter intro" data-performance-chapter="task-state">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/taste">Taste</a>
      <span aria-hidden="true">/</span>
      <span>Insights</span>
    </nav>
    <p class="eyebrow">Reading record</p>
    <h1>See what you studied. Choose what comes next.</h1>
    <p class="lede">
      Use the record to find a pattern, then turn that pattern into one more deliberate study.
    </p>

    {#if data.error}
      <div class="state-card" role="status">
        <strong
          >{data.errorKind === 'signed-out'
            ? 'Your private record is locked.'
            : 'Your record did not load.'}</strong
        >
        <p>{data.error}</p>
      </div>
    {:else}
      <div class="profile-card">
        <div
          class="score"
          aria-label="Exploration score: {data.profile.explorationScore} out of 100"
        >
          <strong>{data.profile.explorationScore}</strong>
          <span>of 100</span>
        </div>
        <div>
          <p class="scope">Taste Profile · All recorded activity</p>
          <h2>{data.profile.summary}</h2>
          {#if data.profile.focusAreas.length > 0}
            <p class="focus">Current focus: {data.profile.focusAreas.join(', ')}</p>
          {/if}
        </div>
      </div>

      <div class="stats-grid" aria-label="All recorded activity">
        <div>
          <strong>{data.stats.channelsExplored}/{data.stats.totalChannels}</strong><span
            >channels explored</span
          >
        </div>
        <div>
          <strong>{formatTime(data.stats.totalTimeSeconds)}</strong><span>time invested</span>
        </div>
        <div><strong>{data.stats.totalStudied}</strong><span>references studied</span></div>
        <div><strong>{data.stats.totalViewed}</strong><span>references viewed</span></div>
      </div>
    {/if}
  </section>

  <section class="chapter" data-performance-chapter="workspace">
    {#if data.error}
      <div class="empty-workspace">
        <p class="eyebrow">What you can do</p>
        <h2>
          {data.errorKind === 'signed-out'
            ? 'Sign in to unlock your record.'
            : 'Try the request again.'}
        </h2>
        <p>
          {data.errorKind === 'signed-out'
            ? 'Insights are private. The public source library remains available while you are signed out.'
            : 'A temporary service problem should not stop your study. You can retry or continue in the public source library.'}
        </p>
      </div>
    {:else}
      <div class="workspace-heading">
        <p class="eyebrow">Evidence</p>
        <h2>Find the pattern behind the score.</h2>
        <p>
          All-time evidence shows your accumulated interests. Recent activity shows your current
          rhythm.
        </p>
      </div>

      <div class="evidence-grid">
        <div class="evidence-block channels">
          <div class="block-heading">
            <div>
              <p class="scope">All recorded activity</p>
              <h3>Time per Channel</h3>
            </div>
            <span>{data.channelBreakdown.length} active</span>
          </div>
          {#if data.channelBreakdown.length > 0}
            <div class="channel-list">
              {#each data.channelBreakdown as channel}
                <div class="channel-row">
                  <div class="channel-copy">
                    <strong>{formatChannel(channel.channel)}</strong>
                    <span>{channel.studiedCount} studied · {formatTime(channel.timeSeconds)}</span>
                  </div>
                  <div class="bar" aria-hidden="true">
                    <span style={`width: ${getBarWidth(channel.timeSeconds, maxChannelTime)}%`}
                    ></span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-copy">Study a reference to establish your first channel.</p>
          {/if}
        </div>

        <div class="evidence-block studied">
          <div class="block-heading">
            <div>
              <p class="scope">All recorded activity</p>
              <h3>Most-Studied References</h3>
            </div>
            <span>Top {data.mostStudied.length}</span>
          </div>
          {#if data.mostStudied.length > 0}
            <div class="reference-list">
              {#each data.mostStudied as reference}
                <div class="reference-card">
                  {#if reference.imageUrl}
                    <img src={reference.imageUrl} alt="" loading="lazy" />
                  {:else}
                    <span class="reference-placeholder" aria-hidden="true"
                      >{reference.type === 'example' ? 'IMG' : 'RES'}</span
                    >
                  {/if}
                  <div>
                    <strong>{reference.title}</strong>
                    <span
                      >{formatChannel(reference.channel)} · {formatTime(
                        reference.timeSeconds
                      )}</span
                    >
                    <a href="/taste#source-channels">Study this channel</a>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-copy">No reference has been studied yet.</p>
          {/if}
        </div>

        <div class="evidence-block activity">
          <div class="block-heading">
            <div>
              <p class="scope">Last 30 days</p>
              <h3>Activity (Last 30 Days)</h3>
            </div>
            <span>{data.dailyActivity.filter((day) => day.views > 0).length} active days</span>
          </div>
          {#if data.dailyActivity.length > 0}
            <div
              class="activity-list"
              role="list"
              aria-label="Daily reading activity for the last 30 days"
            >
              {#each data.dailyActivity as day}
                <span
                  class="activity-cell"
                  class:active={day.views > 0}
                  class:studied-day={day.studied > 0}
                  role="listitem"
                  aria-label="{formatDateOnly(day.date)}: {day.views} viewed, {day.studied} studied"
                ></span>
              {/each}
            </div>
            <div class="legend" aria-hidden="true">
              <span>None</span><span>Viewed</span><span>Studied</span>
            </div>
          {:else}
            <p class="empty-copy">No reading activity was recorded in the last 30 days.</p>
          {/if}
        </div>

        <div class="evidence-block growth">
          <div class="block-heading">
            <div>
              <p class="scope">All recorded activity</p>
              <h3>Collection Growth</h3>
            </div>
            <span>{latestCollection?.collectionCount ?? 0} collections</span>
          </div>
          {#if data.collectionGrowth.length > 1}
            <div class="growth-summary">
              <div><strong>{latestCollection?.itemCount ?? 0}</strong><span>saved items</span></div>
              <Sparkline
                data={collectionSparklineData}
                width={240}
                height={48}
                showFill={true}
                showReferenceLine={false}
              />
            </div>
            <p class="range">
              {formatDateOnly(data.collectionGrowth[0].date)}–{formatDateOnly(
                latestCollection?.date ?? ''
              )}
            </p>
          {:else if data.collectionGrowth.length === 1}
            <p class="empty-copy">
              Your first collection was created on {formatDateOnly(data.collectionGrowth[0].date)}.
            </p>
          {:else}
            <p class="empty-copy">
              No collections yet. Save related references when you want to compare them.
            </p>
          {/if}
        </div>
      </div>
    {/if}

    <noscript>
      <p class="notice">
        Your evidence remains readable without JavaScript. Sharing requires JavaScript, but the
        source library link still works.
      </p>
    </noscript>
  </section>

  <section class="chapter decision" data-performance-chapter="decision-receipt">
    {#if data.errorKind === 'signed-out'}
      <div>
        <p class="eyebrow">Unlock your record</p>
        <h2>Sign in, then return here.</h2>
        <p>Authentication restores your private history and returns you to insights.</p>
      </div>
      <div class="actions">
        <a class="primary" href="/login?redirect=/taste/insights">Sign in</a>
        <a href="/taste#source-channels">Use the public source library</a>
      </div>
    {:else if data.errorKind === 'unavailable'}
      <div>
        <p class="eyebrow">Recovery</p>
        <h2>Retry once or keep studying.</h2>
        <p>Your next study does not depend on this summary being available.</p>
      </div>
      <div class="actions">
        <a class="primary" href="/taste/insights">Retry insights</a>
        <a href="/taste#source-channels">Use the public source library</a>
      </div>
    {:else}
      <div>
        <p class="eyebrow">Next study</p>
        <h2>{nextStudy.title}</h2>
        <p>{nextStudy.body}</p>
      </div>
      <div class="actions">
        <a class="primary" href="/taste#source-channels">Choose a source</a>
        <button type="button" onclick={shareProfile} disabled={shareState === 'copying'}>
          {#if shareState === 'copying'}
            Preparing…
          {:else if shareState === 'copied'}
            Profile shared
          {:else if shareState === 'failed'}
            Could not share — try again
          {:else}
            Share Profile
          {/if}
        </button>
      </div>
    {/if}
  </section>
</div>

<style>
  .insights-page {
    width: min(960px, calc(100% - 2rem));
    margin: 0 auto;
    padding: clamp(2rem, 6vw, 5rem) 0;
  }

  .chapter {
    padding: clamp(2rem, 5vw, 4rem) 0;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .intro {
    padding-top: 0;
    border-top: 0;
  }

  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2.5rem;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .breadcrumb a,
  .reference-card a {
    color: var(--color-performance-fg-secondary);
  }

  .eyebrow,
  .scope {
    margin: 0 0 0.6rem;
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-performance-fg-muted);
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 16ch;
    margin-bottom: 1rem;
    font-size: clamp(2.5rem, 7vw, 5rem);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }

  h2 {
    font-size: clamp(1.5rem, 4vw, 2.75rem);
    letter-spacing: -0.035em;
  }

  h3 {
    margin-bottom: 0;
    font-size: var(--text-performance-h3);
  }

  .lede,
  .workspace-heading > p:last-child,
  .decision p,
  .empty-workspace p {
    max-width: 62ch;
    color: var(--color-performance-fg-secondary);
    line-height: 1.6;
  }

  .lede {
    font-size: var(--text-performance-body-lg);
  }

  .state-card,
  .profile-card {
    margin-top: 2rem;
    padding: clamp(1.25rem, 4vw, 2rem);
    border: 1px solid var(--color-performance-border-emphasis);
    background: var(--color-performance-bg-surface);
  }

  .state-card strong {
    display: block;
    margin-bottom: 0.4rem;
    font-size: var(--text-performance-h3);
  }

  .state-card p {
    margin-bottom: 0;
    color: var(--color-performance-fg-secondary);
  }

  .profile-card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.5rem;
    align-items: center;
  }

  .score {
    display: flex;
    width: 6rem;
    height: 6rem;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: 50%;
  }

  .score strong {
    font-size: var(--text-performance-h2);
  }

  .score span,
  .focus {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .profile-card h2 {
    margin-bottom: 0.5rem;
    font-size: var(--text-performance-h3);
    letter-spacing: -0.02em;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 1px;
    gap: 1px;
    background: var(--color-performance-border-default);
    border: 1px solid var(--color-performance-border-default);
  }

  .stats-grid > div {
    display: flex;
    min-height: 6.5rem;
    flex-direction: column;
    justify-content: center;
    padding: 1rem;
    background: var(--color-performance-bg-pure);
  }

  .stats-grid strong {
    font-size: var(--text-performance-h3);
  }

  .stats-grid span,
  .block-heading > span,
  .channel-copy span,
  .reference-card span,
  .range {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .workspace-heading {
    margin-bottom: 2rem;
  }

  .evidence-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--color-performance-border-default);
    border-left: 1px solid var(--color-performance-border-default);
  }

  .evidence-block {
    min-width: 0;
    padding: clamp(1rem, 3vw, 1.5rem);
    border-right: 1px solid var(--color-performance-border-default);
    border-bottom: 1px solid var(--color-performance-border-default);
  }

  .block-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .channel-list,
  .reference-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .channel-row {
    display: grid;
    grid-template-columns: minmax(9rem, 0.8fr) minmax(5rem, 1.2fr);
    gap: 1rem;
    align-items: center;
  }

  .channel-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.15rem;
  }

  .channel-copy strong {
    overflow: hidden;
    font-size: var(--text-performance-body-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bar {
    height: 0.45rem;
    background: var(--color-performance-bg-subtle);
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--color-performance-fg-primary);
  }

  .reference-card {
    display: grid;
    grid-template-columns: 3.5rem 1fr;
    gap: 0.75rem;
    align-items: start;
  }

  .reference-card img,
  .reference-placeholder {
    width: 3.5rem;
    height: 3.5rem;
    object-fit: cover;
  }

  .reference-placeholder {
    display: grid;
    place-items: center;
    background: var(--color-performance-bg-subtle);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .reference-card div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.25rem;
  }

  .reference-card strong {
    overflow: hidden;
    font-size: var(--text-performance-body-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reference-card a {
    margin-top: 0.2rem;
    font-size: var(--text-performance-caption);
  }

  .activity-list {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 0.3rem;
  }

  .activity-cell {
    aspect-ratio: 1;
    background: var(--color-performance-bg-subtle);
  }

  .activity-cell.active {
    background: var(--color-performance-fg-muted);
  }

  .activity-cell.studied-day {
    background: var(--color-performance-fg-primary);
  }

  .legend {
    display: flex;
    justify-content: space-between;
    margin-top: 0.6rem;
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .growth-summary {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  .growth-summary > div {
    display: flex;
    flex-direction: column;
  }

  .growth-summary strong {
    font-size: var(--text-performance-h2);
  }

  .growth-summary span {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
  }

  .empty-copy {
    color: var(--color-performance-fg-secondary);
  }

  .notice {
    margin: 1rem 0 0;
    padding: 0.75rem 1rem;
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-secondary);
  }

  .decision {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: clamp(2rem, 6vw, 5rem);
    align-items: start;
  }

  .actions {
    display: flex;
    min-width: 15rem;
    flex-direction: column;
    gap: 0.75rem;
  }

  .actions a,
  .actions button {
    box-sizing: border-box;
    width: 100%;
    padding: 0.8rem 1rem;
    border: 1px solid var(--color-performance-border-emphasis);
    background: transparent;
    color: var(--color-performance-fg-primary);
    font: inherit;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
  }

  .actions .primary {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
  }

  .actions button:disabled {
    cursor: wait;
  }

  @media (max-width: 720px) {
    .profile-card,
    .decision,
    .evidence-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .channel-row {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }

    .actions {
      min-width: 0;
    }
  }
</style>
