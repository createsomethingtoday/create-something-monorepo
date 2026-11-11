<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { linkParts, sourceLinks, type NpgView } from '$lib/npg/display';
  import type { PageData } from './$types';
  export let data: PageData;
  let conversations = data.conversations;
  let conversation: NpgView | null = null;
  let draft = '',
    busy = false,
    notice = '',
    needsRefresh = false;
  let composer: HTMLTextAreaElement;
  let history: HTMLDivElement;
  const endpoint = '/delivery/abundance/healthcare-analyst/api';
  const examples = [
    'Find FNP and adult-gerontology NP candidates in Springfield, MO, with a complete sourcing CSV.',
    'Find NPs within 25 miles of a clinic street address. Ask me for the address first.',
    'Show coverage freshness, taxonomy scope, and unresolved records for the nationwide snapshot.'
  ];
  async function api<T>(body?: unknown, id?: string): Promise<T> {
    const response = await fetch(
      endpoint + (id ? '?id=' + encodeURIComponent(id) : ''),
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        : { headers: { Accept: 'application/json' } }
    );
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      let message = 'Access may have expired. Refresh this page and sign in again.';
      try {
        message = ((await response.json()) as { error?: string }).error || message;
      } catch {}
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }
  async function refreshList() {
    conversations = (await api<{ conversations: PageData['conversations'] }>()).conversations;
  }
  async function open(id: string) {
    if (busy) return;
    busy = true;
    notice = '';
    try {
      conversation = await api<NpgView>(undefined, id);
      needsRefresh = conversation?.status === 'running';
      localStorage.setItem('npg-current-conversation', id);
    } catch (e) {
      notice = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function refresh() {
    if (conversation) await open(conversation.id);
  }
  async function create() {
    if (busy) return;
    busy = true;
    notice = '';
    try {
      conversation = await api<NpgView>({ type: 'create' });
      needsRefresh = false;
      localStorage.setItem('npg-current-conversation', conversation!.id);
      await refreshList();
      await tick();
      composer?.focus();
    } catch (e) {
      notice = (e as Error).message;
      needsRefresh = true;
    } finally {
      busy = false;
    }
  }
  async function send() {
    if (busy || needsRefresh || !draft.trim() || !conversation || conversation.status !== 'idle')
      return;
    const submitted = draft;
    busy = true;
    notice = '';
    // Clear only the submitted draft. Any text typed while waiting is preserved.
    draft = '';
    try {
      conversation = await api<NpgView>({
        type: 'message',
        id: conversation.id,
        version: conversation.version,
        text: submitted
      });
      await refreshList();
      await tick();
      history?.scrollIntoView({ block: 'end', behavior: 'instant' });
    } catch (e) {
      if (!draft) draft = submitted;
      notice = (e as Error).message;
      needsRefresh = true;
    } finally {
      busy = false;
    }
  }
  async function decide(type: 'approve' | 'reject') {
    if (busy || needsRefresh || !conversation?.pending) return;
    busy = true;
    notice = '';
    try {
      conversation = await api<NpgView>({
        type,
        id: conversation.id,
        version: conversation.version,
        actionId: conversation.pending.id
      });
      await refreshList();
    } catch (e) {
      notice = (e as Error).message;
      needsRefresh = true;
    } finally {
      busy = false;
    }
  }
  function example(text: string) {
    draft = text;
    composer?.focus();
  }
  onMount(() => {
    const id = localStorage.getItem('npg-current-conversation');
    if (id && conversations.some((c) => c.id === id)) void open(id);
  });
</script>

<svelte:head
  ><title>NPG Healthcare Coverage Analyst</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<main class="npg-shell">
  <header class="npg-header">
    <div>
      <p class="eyebrow">NPG · Private workspace</p>
      <h1>Healthcare Coverage Analyst</h1>
      <p class="intro">
        Find candidates, inspect source evidence, and keep the complete sourcing list.
      </p>
    </div>
    <button class="secondary" on:click={create} disabled={busy}>New conversation</button>
  </header>
  <div class="workspace">
    <aside aria-label="Your conversations">
      <h2>Your conversations</h2>
      <p class="muted">Visible only to your signed-in account.</p>
      <nav aria-label="Conversation history">
        {#each conversations as item, i}<button
            class:chosen={conversation?.id === item.id}
            aria-current={conversation?.id === item.id ? 'true' : undefined}
            on:click={() => open(item.id)}
            disabled={busy}
            >Conversation {conversations.length - i}<span
              >{new Date(item.updated_at).toLocaleDateString()} · {item.status === 'review'
                ? 'Needs review'
                : item.status === 'ambiguous'
                  ? 'Needs reconciliation'
                  : item.status === 'idle'
                    ? 'Ready'
                    : item.status}</span
            ></button
          >{/each}
      </nav>
    </aside>
    <section class="chat" aria-label="Healthcare analyst">
      {#if !conversation}
        <div class="welcome">
          <h2>Start with a sourcing question.</h2>
          <p>
            Search registry coverage and keep qualifications separate from unknowns. Paid enrichment
            and driving estimates wait for your review.
          </p>
          <button on:click={create} disabled={busy}>Start a conversation</button>
        </div>
      {:else}
        <div class="history" role="log" aria-label="Messages" aria-live="polite" aria-busy={busy}>
          {#each conversation.messages as message}<article
              class:user-message={message.role === 'user'}
            >
              <h3>{message.role === 'user' ? 'You' : 'NPG analyst'}</h3>
              <p>
                {#each linkParts(message.text) as part}{#if part.href}<a
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer">{part.text}</a
                    >{:else}{part.text}{/if}{/each}
              </p>
            </article>{/each}
          <div bind:this={history}></div>
        </div>
        {#if conversation.pending}
          <section class="review" aria-labelledby="review-title">
            <p class="eyebrow">Your decision</p>
            <h2 id="review-title">Review the exact action</h2>
            <p>
              Approval sends this one request as shown. Contact details do not establish permission
              to contact someone.
            </p>
            <p><strong>Action:</strong> <code>{conversation.pending.tool}</code></p>
            <pre aria-label="Provider, scope, and limits">{JSON.stringify(
                conversation.pending.review,
                null,
                2
              )}</pre>
            <details open>
              <summary>Exact request</summary>
              <pre>{JSON.stringify(conversation.pending.arguments, null, 2)}</pre>
            </details>
            <p class="muted">
              Review expires {new Date(conversation.pending.expiresAt).toLocaleTimeString()}. A
              later change needs a new review.
            </p>
            <div class="actions">
              <button on:click={() => decide('approve')} disabled={busy || needsRefresh}
                >Approve this action</button
              ><button
                class="secondary"
                on:click={() => decide('reject')}
                disabled={busy || needsRefresh}>Reject action</button
              >
            </div>
          </section>
        {/if}
        {#if ['interrupted', 'ambiguous', 'running'].includes(conversation.status)}<div
            class="recovery"
            role="status"
          >
            <h2>
              {conversation.status === 'ambiguous'
                ? 'Reconcile before repeating'
                : conversation.status === 'running'
                  ? 'Request still in progress'
                  : 'Request stopped'}
            </h2>
            <p>
              {conversation.status === 'ambiguous'
                ? 'A paid action may have reached the provider. Check the source evidence and ask your operator to reconcile it. This conversation cannot send another action.'
                : conversation.status === 'running'
                  ? 'Refresh the history to check the result. No action will be sent again.'
                  : 'Check the returned evidence before starting a new conversation. No automatic retry was made.'}
            </p>
            <button class="secondary" on:click={refresh} disabled={busy}>Refresh history</button>
          </div>{/if}
        {#if conversation.sources.length}<section class="sources" aria-labelledby="sources-title">
            <h2 id="sources-title">Sources & complete exports</h2>
            <p class="muted">
              Original source evidence preserves snapshot, counts, unknowns, and provider status.
              CSV downloads require NPG sign-in.
            </p>
            {#each conversation.sources as source, i}{#each sourceLinks(source.data) as href}<a
                  class="source-link"
                  {href}
                  target="_blank"
                  rel="noopener noreferrer"
                  >{href.startsWith('/delivery/') ? 'Download complete CSV' : href}</a
                >{/each}
              <details>
                <summary>Source {i + 1} · {source.tool}</summary>
                <pre>{JSON.stringify(source.data, null, 2)}</pre>
              </details>{/each}
          </section>{/if}
      {/if}
      <div class="examples" aria-label="Example sourcing questions">
        {#each examples as text}<button class="secondary" on:click={() => example(text)}
            >{text}</button
          >{/each}
      </div>
      <form on:submit|preventDefault={send}>
        <label for="question">Your question</label><textarea
          id="question"
          bind:this={composer}
          bind:value={draft}
          rows="4"
          maxlength="6000"
          placeholder="Describe the location, taxonomy scope, or candidate you need…"
          on:keydown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send();
            }
          }}
        ></textarea>
        <div class="compose-footer">
          <span class="muted">Ctrl / ⌘ + Enter to send · {draft.length}/6,000</span><button
            type="submit"
            disabled={busy || needsRefresh || !draft.trim() || conversation?.status !== 'idle'}
            >{busy ? 'Working…' : 'Send question'}</button
          >
        </div>
      </form>
      <p role="status" class="muted">
        {busy ? 'Working on your request. You can keep drafting your next question.' : ''}
      </p>
      {#if notice}<div role="alert" class="recovery">
          <p>{notice}</p>
          <button class="secondary" on:click={refresh} disabled={busy || !conversation}
            >Refresh history</button
          >
        </div>{/if}
      <noscript
        >This private analyst needs JavaScript to send questions and review actions. Your protected
        CSV links remain available.</noscript
      >
    </section>
  </div>
</main>

<style>
  .npg-shell {
    --color-fg-primary: var(--color-performance-ink);
    --color-fg-secondary: var(--color-performance-muted);
    --color-bg-base: var(--color-performance-paper);
    --color-bg-surface: var(--color-performance-panel);
    --color-bg-subtle: var(--color-performance-court);
    --color-border-default: var(--color-performance-line);
    max-width: var(--container-xl, 1280px);
    margin: 0 auto;
    padding: var(--space-xl) var(--space-md) var(--space-3xl);
    color: var(--color-fg-primary);
  }
  .npg-header {
    display: flex;
    gap: var(--space-lg);
    justify-content: space-between;
    align-items: start;
    padding: var(--space-xl) 0;
    border-bottom: 1px solid var(--color-border-default);
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-fg-secondary);
  }
  h1 {
    font-size: clamp(1.75rem, 4vw, 2.8rem);
    line-height: 1.12;
    margin: var(--space-sm) 0;
  }
  h2 {
    font-size: var(--text-lg);
    margin: 0 0 var(--space-sm);
  }
  h3 {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }
  p {
    line-height: 1.65;
    margin: 0 0 var(--space-sm);
  }
  .intro,
  .muted {
    color: var(--color-fg-secondary);
  }
  .muted {
    font-size: var(--text-sm);
  }
  .workspace {
    display: grid;
    grid-template-columns: 14rem minmax(0, 1fr);
    gap: var(--space-xl);
    padding-top: var(--space-xl);
  }
  aside {
    min-width: 0;
  }
  nav {
    display: grid;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  nav button {
    text-align: left;
    background: transparent;
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
  }
  nav span {
    display: block;
    font-size: var(--text-xs);
    color: var(--color-fg-secondary);
    margin-top: var(--space-xs);
  }
  nav .chosen {
    border-color: var(--color-fg-primary);
  }
  .chat {
    min-width: 0;
    padding: 0;
  }
  .sources {
    padding: 0;
  }
  .welcome,
  .review,
  .recovery {
    padding: var(--space-lg);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
    margin-bottom: var(--space-lg);
  }
  article {
    padding: var(--space-lg) 0;
    border-bottom: 1px solid var(--color-border-default);
  }
  article p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .user-message {
    padding-left: var(--space-md);
    border-left: 2px solid var(--color-border-default);
  }
  .history {
    margin-bottom: var(--space-lg);
  }
  .sources {
    margin: var(--space-lg) 0;
  }
  details {
    border-bottom: 1px solid var(--color-border-default);
    padding: var(--space-sm) 0;
  }
  summary {
    cursor: pointer;
    overflow-wrap: anywhere;
    min-height: 2.75rem;
    display: list-item;
    align-content: center;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 24rem;
    overflow: auto;
    font-size: var(--text-xs);
    line-height: 1.6;
    background: var(--color-bg-subtle);
    padding: var(--space-md);
  }
  code {
    overflow-wrap: anywhere;
  }
  .source-link {
    display: block;
    margin: var(--space-sm) 0;
    overflow-wrap: anywhere;
  }
  a {
    color: var(--color-fg-primary);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  button {
    min-height: 2.75rem;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-base);
    border: 1px solid var(--color-fg-primary);
    border-radius: var(--radius-sm);
    font: inherit;
    cursor: pointer;
  }
  button.secondary {
    background: transparent;
    color: var(--color-fg-primary);
    border-color: var(--color-border-default);
  }
  button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  button:focus-visible,
  a:focus-visible,
  textarea:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--color-fg-primary);
    outline-offset: 3px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .examples {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin: var(--space-lg) 0;
  }
  .examples button {
    font-size: var(--text-sm);
    text-align: left;
    flex: 1 1 12rem;
  }
  label {
    display: block;
    margin-bottom: var(--space-sm);
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    font: inherit;
    font-size: 1rem;
    line-height: 1.5;
  }
  .compose-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }
  @media (max-width: 768px) {
    .workspace {
      grid-template-columns: 1fr;
    }
    .npg-header {
      flex-direction: column;
    }
    .npg-shell {
      padding-inline: var(--space-md);
    }
    nav {
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      max-height: 12rem;
      overflow: auto;
    }
    .compose-footer {
      align-items: start;
      flex-direction: column;
    }
    .compose-footer button {
      width: 100%;
    }
  }
</style>
