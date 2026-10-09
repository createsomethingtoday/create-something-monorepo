<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { goto, pushState } from '$app/navigation';
  import { page } from '$app/stores';
  import { UnifiedSearch } from '@create-something/canon/navigation';
  import { createSearchController, type SearchState } from './controller';
  import { searchCatalog, type SearchCategory } from './catalog';
  import { registerSearchTools, type SiteDocument } from './webmcp';

  let open = $state(false);
  let view = $state<SearchState>({ query: '', category: 'all', results: searchCatalog, selectedId: null, status: 'ready', source: 'human', revision: 0 });
  let query = $state('');
  let category = $state<SearchCategory>('all');
  let toolStatus = $state('unavailable');
  let message = $state('');
  let annotationSupported = $state(false);
  let mounted = $state(false);
  let panel: HTMLElement;
  let input: HTMLInputElement;
  let previousFocus: HTMLElement | null = null;
  let controller: ReturnType<typeof createSearchController>;
  let historyRevision = 0;
  const selected = $derived(view.results.find((entry) => entry.id === view.selectedId));
  type HistorySearch = { query: string; category: SearchCategory; selectedId: string | null; open: boolean };
  function save() {
    // State stays in session history, never the URL, referrer or analytics payload.
    const next: HistorySearch = { query: view.query, category: view.category, selectedId: view.selectedId, open };
    const current = ($page.state as Record<string, unknown>).agencySearch;
    if (JSON.stringify(current) !== JSON.stringify(next)) pushState('', { ...$page.state, agencySearch: next });
  }
  async function search(args: unknown, source: SearchState['source'], signal?: AbortSignal) {
    if (signal?.aborted) return { status: 'cancelled' };
    historyRevision++;
    open = true;
    message = '';
    const result = await controller.search(args, source, signal);
    if (result.status === 'ready' && source !== 'history') save();
    return result;
  }
  async function select(id: string, source: SearchState['source']) {
    const result = await controller.select(id, source);
    open = true;
    if (source !== 'history') save();
    return result;
  }
  function close() {
    historyRevision++;
    if (view.status === 'searching') controller.cancel();
    open = false;
    save();
    previousFocus?.focus();
  }
  async function navigate(id: string) {
    if (!view.results.some((entry) => entry.id === id)) return;
    await select(id, 'human');
    // Exact catalog path only; no arbitrary URL or private destination.
    await goto(id);
    open = false;
  }
  function ask(target: Element, title: string) {
    try {
      const result = (document as SiteDocument).oai?.annotation?.request(target, { initialComment: `Explain how this Agency page could help: ${title}`.slice(0, 240) });
      message = result?.accepted ? 'Review the annotation in your browser before sending it.' : 'Annotation unavailable right now. You can still open the page.';
    } catch { message = 'Annotation unavailable right now. You can still open the page.'; }
  }
  function keys(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      const controls = [...panel.querySelectorAll<HTMLElement>('input, select, button, a[href]')].filter((el) => !el.hasAttribute('disabled'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !(event.target instanceof HTMLSelectElement)) {
      const results = [...panel.querySelectorAll<HTMLButtonElement>('.result-title')];
      if (!results.length) return;
      event.preventDefault();
      const index = results.indexOf(document.activeElement as HTMLButtonElement);
      results[Math.max(0, Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
    }
  }
  function searchPanel(node: HTMLElement) {
    node.addEventListener('keydown', keys);
    return { destroy() {
      node.removeEventListener('keydown', keys);
    } };
  }
  $effect(() => {
    if (!mounted || !open) return;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void tick().then(() => input?.focus());
  });
  $effect(() => {
    const saved = ($page.state as Record<string, unknown>).agencySearch as HistorySearch | undefined;
    const path = $page.url.pathname;
    if (!mounted) return;
    untrack(() => {
      const version = ++historyRevision;
      if (!saved?.open) { open = false; if (view.status === 'searching') controller.cancel(); return; }
      // Ignore our own state publication, but restore actual back/forward entries.
      if (open && saved.query === view.query && saved.category === view.category && saved.selectedId === view.selectedId) return;
      open = true;
      void controller.search({ query: saved.query, category: saved.category }, 'history').then(async (result) => {
        if (version !== historyRevision || path !== $page.url.pathname || result.status !== 'ready') return;
        if (saved.selectedId && view.results.some((entry) => entry.id === saved.selectedId)) await controller.select(saved.selectedId, 'history');
      }).catch(() => { message = 'This saved search is invalid. Start a new search.'; });
    });
  });
  onMount(() => {
    controller = createSearchController((next) => { view = next; query = next.query; category = next.category; }, tick);
    const cleanup = registerSearchTools(document as SiteDocument, {
      search: (args, signal) => search(args, 'agent', signal),
      read: () => ({ ...controller.snapshot(), open, pathname: window.location.pathname }),
      select: (id) => select(id, 'agent')
    }, (value) => { toolStatus = value; });
    annotationSupported = typeof (document as SiteDocument).oai?.annotation?.request === 'function';
    mounted = true;
    return () => { historyRevision++; cleanup(); controller.dispose(); };
  });
</script>

{#snippet searchContent()}
  <div class="agency-search" data-analytics-ignore bind:this={panel} use:searchPanel role="group" aria-label="Public Agency search">
    <header><h2>Search Agency</h2><button type="button" onclick={close}>Close search</button></header>
    <form onsubmit={(event) => { event.preventDefault(); void search({ query, category }, 'human').catch((error) => { message = error.message; }); }}>
      <div class="query-field">
        <label for="agency-search-query">Search public pages</label>
        <input bind:this={input} id="agency-search-query" type="search" bind:value={query} maxlength="160" placeholder="Try MCP or workflow" data-no-track />
      </div>
      <div class="category-field">
        <label for="agency-search-category">Content type</label>
        <select id="agency-search-category" bind:value={category}><option value="all">All content</option><option value="overview">Overviews</option><option value="guides">Guides</option></select>
      </div>
      <button class="submit-search" type="submit" data-no-track>Search</button>
    </form>
    <p class="status" role="status">{view.status === 'ready' ? `${view.results.length} results` : view.status === 'cancelled' ? 'Search cancelled. Search again to continue.' : 'Searching…'}{view.source === 'agent' ? ' · Updated by your assistant' : ''}</p>
    {#if message}<p role="status">{message}</p>{/if}
    {#if view.status === 'searching'}<button onclick={() => controller.cancel()}>Cancel search</button>{/if}
    {#if selected}<aside aria-label="Selected result"><h3>{selected.title}</h3><p>{selected.excerpt}</p><a href={selected.id} data-no-track onclick={(event) => { event.preventDefault(); void navigate(selected.id); }}>Read the public page →</a></aside>{/if}
    <div {...{ 'oai-annotation-container': '' }} aria-label="Search results" aria-busy={view.status === 'searching'}>
      {#each view.results as entry (entry.id)}
        <article {...{ 'oai-annotatable': '', 'oai-annotation-metadata': JSON.stringify({ title: entry.title, url: entry.url, category: entry.category }) }}>
          <button class="result-title" data-no-track onclick={() => void select(entry.id, 'human')}>{entry.title}</button>
          <p>{entry.description}</p>
          <a href={entry.id} data-no-track onclick={(event) => { event.preventDefault(); void navigate(entry.id); }}>Open page →</a>
          {#if annotationSupported}<button class="ask" data-no-track onclick={(event) => ask(event.currentTarget.closest('article')!, entry.title)}>Ask about this result</button>{/if}
        </article>
      {/each}
      {#if view.status === 'ready' && !view.results.length}<p>No matching results. Try fewer words or choose all content.</p>{/if}
    </div>
    <footer>{toolStatus === 'available' ? 'Site tools registered' : 'Use the search controls in this browser'} · Public Agency pages only</footer>
  </div>
{/snippet}
<span hidden data-agency-search-ready={mounted}></span>
<UnifiedSearch bind:open content={searchContent} onclose={close} currentProperty="agency" enableAnalytics={false} showMobileButton={true} />

<style>
  .agency-search { padding: var(--space-performance-lg); font-family: var(--font-performance-sans); container-type: inline-size; }
  header { display: flex; gap: var(--space-performance-sm); justify-content: space-between; align-items: center; margin-bottom: var(--space-performance-md); }
  form { display: grid; grid-template-columns: minmax(0, 1fr) 10rem auto; gap: var(--space-performance-sm); align-items: end; }
  .query-field, .category-field { min-width: 0; }
  h2 { font-size: var(--text-xl); font-weight: 600; }
  label { display: block; margin-bottom: var(--space-performance-xs); font-size: var(--text-sm); color: var(--color-performance-muted); }
  input, select, button { font: inherit; }
  input, select, button:not(.result-title) { padding: var(--space-performance-sm); min-height: 44px; border: 1px solid var(--color-performance-line-strong); background: var(--color-performance-paper); color: var(--color-performance-ink); border-radius: var(--radius-performance-sm); }
  input, select { box-sizing: border-box; width: 100%; min-width: 0; }
  button.submit-search { background: var(--color-performance-ink); color: var(--color-performance-paper); font-weight: 600; }
  .agency-search header button { border-color: transparent; background: transparent; }
  .status { margin-block: var(--space-performance-md) var(--space-performance-sm); }
  button { cursor: pointer; }
  :is(input, button, select, a):focus-visible { outline: 2px solid var(--color-performance-signal); outline-offset: 2px; }
  p { color: var(--color-performance-muted); font-size: var(--text-sm); line-height: 1.5; margin-block: var(--space-performance-sm); }
  article { border-top: 1px solid var(--color-performance-line); padding-block: var(--space-performance-md); }
  .result-title { background: none; border: 0; padding: 0; color: inherit; font-weight: 600; text-align: left; }
  a { color: var(--color-performance-ink); font-size: var(--text-sm); }
  .ask { margin-left: var(--space-performance-sm); }
  aside { border: 1px solid var(--color-performance-line); padding: var(--space-performance-md); margin-block: var(--space-performance-md); }
  footer { font-size: var(--text-xs); color: var(--color-performance-muted); margin-top: var(--space-performance-md); }
  @container (max-width: 560px) { form { grid-template-columns: minmax(0, 1fr) auto; } .query-field { grid-column: 1 / -1; } }
  @media (max-width: 480px) { .agency-search { padding: var(--space-performance-md); } .ask { margin: var(--space-performance-sm) 0 0; display: block; } }
  @media (max-width: 360px) { .agency-search { padding: var(--space-performance-sm); } .agency-search header button { padding-inline: 0; white-space: nowrap; } }
</style>
