<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    actionLabel,
    linkParts,
    reviewFields,
    readDrafts,
    sourceArtifact,
    conversationStatus,
    type NpgView
  } from '$lib/npg/display';
  import type { PageData } from './$types';
  export let data: PageData;
  let conversations = data.conversations;
  let conversation: NpgView | null = null;
  let draft = '',
    busy = false,
    notice = '',
    needsRefresh = false;
  let composer: HTMLTextAreaElement;
  let thread: HTMLDivElement;
  let historyOpen = false,
    resultsOpen = false;
  let operation = '',
    submittedMessage = '';
  let clock = Date.now();
  let drafts: Record<string, string> = {},
    storageReady = false;
  const draftStorageKey = 'npg-drafts:' + (data.user?.id ?? 'fixture');
  $: draftKey = conversation?.id ?? 'new';
  $: expired = !!conversation?.pending && conversation.pending.expiresAt <= clock;
  $: activeTitle =
    conversations.find((item) => item.id === conversation?.id)?.title ?? 'New conversation';
  $: statusText = busy
    ? operation
    : needsRefresh
      ? 'Readback required'
      : conversation
        ? conversationStatus(conversation.status)
        : 'Ready';
  $: if (storageReady) {
    drafts[draftKey] = draft;
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(drafts));
    } catch {
      /* Draft remains in this tab. */
    }
  }
  function rememberDraft() {
    drafts[draftKey] = draft;
  }
  function restoreDraft() {
    draft = drafts[conversation?.id ?? 'new'] ?? '';
  }
  function rememberCurrent(id: string) {
    try {
      localStorage.setItem('npg-current-conversation', id);
    } catch {
      /* History is still server-owned. */
    }
  }

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
  async function open(id: string, moveFocus = false) {
    if (busy) return;
    rememberDraft();
    busy = true;
    operation = 'Loading conversation';
    notice = '';
    try {
      conversation = await api<NpgView>(undefined, id);
      restoreDraft();
      historyOpen = false;
      needsRefresh = conversation?.status === 'running';
      rememberCurrent(id);
      await tick();
      thread?.scrollTo({ top: thread.scrollHeight, behavior: 'instant' });
      if (moveFocus) {
        composer?.focus();
      }
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
    rememberDraft();
    busy = true;
    operation = 'Creating conversation';
    notice = '';
    try {
      conversation = await api<NpgView>({ type: 'create' });
      restoreDraft();
      historyOpen = false;
      needsRefresh = false;
      rememberCurrent(conversation!.id);
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
    if (busy || needsRefresh || !draft.trim() || (conversation && conversation.status !== 'idle'))
      return;
    const submitted = draft;
    if (!conversation) {
      await create();
      if (!conversation || needsRefresh) {
        draft = submitted;
        return;
      }
    }
    submittedMessage = submitted;
    operation = 'Working on your question';
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
      thread?.scrollTo({ top: thread.scrollHeight, behavior: 'instant' });
    } catch (e) {
      if (!draft) draft = submitted;
      notice = (e as Error).message;
      needsRefresh = true;
    } finally {
      busy = false;
      submittedMessage = '';
    }
  }
  async function decide(type: 'approve' | 'reject') {
    if (busy || needsRefresh || !conversation?.pending || (type === 'approve' && expired)) return;
    operation = type === 'reject' ? 'Recording rejection' : 'Submitting approved request';
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
    try {
      drafts = readDrafts(sessionStorage.getItem(draftStorageKey));
    } catch {
      drafts = {};
    }
    restoreDraft();
    storageReady = true;
    let id: string | null = null;
    try {
      id = localStorage.getItem('npg-current-conversation');
    } catch {}
    if (id && conversations.some((c) => c.id === id)) void open(id);
    const timer = setInterval(() => {
      clock = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>NPG Healthcare Coverage Analyst</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>
<main id="main-content" tabindex="-1" class="npg-shell">
  <header class="npg-header">
    <div class="identity">
      <span class="npg-mark" aria-hidden="true">NPG</span>
      <div>
        <p class="eyebrow">Private workspace</p>
        <h1>Healthcare analyst</h1>
      </div>
    </div>
    <div class="header-actions">
      <span class="private-label">Your account only</span><a href="/account">Account</a>
    </div>
  </header>
  <div class="workspace">
    <aside class="history-panel" class:expanded={historyOpen} aria-label="Your conversations">
      <button
        class="panel-toggle secondary"
        aria-expanded={historyOpen}
        aria-controls="conversation-rail"
        on:click={() => {
          historyOpen = !historyOpen;
          if (historyOpen) resultsOpen = false;
        }}>History <span aria-hidden="true">{historyOpen ? '−' : '+'}</span></button
      >
      <div class="rail-body" id="conversation-rail">
        <div class="rail-heading">
          <h2>Conversations</h2>
          <button class="new-chat" on:click={create} disabled={busy}>+ New chat</button>
        </div>
        <nav aria-label="Conversation history">
          {#each conversations as item}
            <button
              class="history-item"
              class:chosen={conversation?.id === item.id}
              aria-current={conversation?.id === item.id ? 'true' : undefined}
              on:click={() => open(item.id, true)}
              disabled={busy}
            >
              <span class="history-title">{item.title}</span><span class="history-meta"
                >{new Date(item.updated_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })} · {conversationStatus(item.status)}</span
              >
            </button>
          {:else}<p class="muted history-empty">
              Your conversations will stay here. Only your signed-in account can open them.
            </p>{/each}
        </nav>
        <p class="rail-note muted">Registry evidence first.<br />Paid actions need your review.</p>
      </div>
    </aside>
    <section class="chat" aria-label="Healthcare analyst">
      <header class="thread-header">
        <h2>{activeTitle}</h2>
        <span
          class="state"
          data-state={busy
            ? 'running'
            : needsRefresh
              ? 'interrupted'
              : (conversation?.status ?? 'idle')}
          role="status">{statusText}</span
        >
      </header>
      <div
        class="thread"
        bind:this={thread}
        role="region"
        aria-label="Conversation and action reviews"
      >
        {#if (!conversation || !conversation.messages.length) && !submittedMessage}
          <div class="welcome">
            <p class="eyebrow">Source → inspect → decide</p>
            <h2>Start with the people<br />you need to find.</h2>
            <p>
              Ask about a location, taxonomy, or candidate. Keep the complete sourcing list and
              inspect what the registry can—and cannot—tell you.
            </p>
            <div class="examples" aria-label="Example sourcing questions">
              {#each examples as text}<button class="secondary" on:click={() => example(text)}
                  >{text}<span aria-hidden="true">↗</span></button
                >{/each}
            </div>
          </div>
        {/if}
        {#if conversation}
          <div
            class="messages"
            role="log"
            aria-label="Messages"
            aria-live="polite"
            aria-busy={busy}
          >
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
            {#if busy && submittedMessage}<article class="user-message submitted">
                <h3>You · submitted</h3>
                <p>{submittedMessage}</p>
              </article>{/if}
          </div>
          {#if conversation.pending}
            <section class="review" aria-labelledby="review-title">
              <p class="eyebrow">One request · Your decision</p>
              <h2 id="review-title">Review the exact action</h2>
              <p>
                Approval sends this one request as shown. Contact details do not establish
                permission to contact someone.
              </p>
              <h3>{actionLabel(conversation.pending.tool)}</h3>
              <dl class="review-fields" aria-label="Provider, scope, and limits">
                {#each reviewFields(conversation.pending.review) as field}<div>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>{/each}
              </dl>
              <dl class="review-fields" aria-label="Request to approve">
                {#each reviewFields(conversation.pending.arguments) as field}<div>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>{/each}
              </dl>
              <details>
                <summary>Inspect exact request</summary>
                <pre>{JSON.stringify(conversation.pending.arguments, null, 2)}</pre>
              </details>
              <p class="muted expiry" role="status">
                {expired
                  ? 'This review has expired. Approval is unavailable.'
                  : 'Review expires ' +
                    new Date(conversation.pending.expiresAt).toLocaleTimeString() +
                    '. A later change needs a new review.'}
              </p>
              <div class="actions">
                <button
                  on:click={() => decide('approve')}
                  disabled={busy || needsRefresh || expired}>Approve this action</button
                ><button
                  class="secondary"
                  on:click={() => decide('reject')}
                  disabled={busy || needsRefresh}>Reject action</button
                >
              </div>
            </section>
          {/if}
          {#if ['interrupted', 'ambiguous', 'running'].includes(conversation.status)}
            <div class="recovery" role="status">
              <h2>
                {conversation.status === 'ambiguous'
                  ? 'Reconcile before repeating'
                  : conversation.status === 'running'
                    ? 'Request still in progress'
                    : 'Request interrupted'}
              </h2>
              <p>
                {conversation.status === 'ambiguous'
                  ? 'A paid action may have reached the provider. Check the source evidence and ask your operator to reconcile it. This conversation cannot send another action.'
                  : conversation.status === 'running'
                    ? 'Refresh history to check the result. No action will be sent again.'
                    : 'Check the returned evidence before starting a new conversation. No automatic retry was made.'}
              </p>
              <button class="secondary" on:click={refresh} disabled={busy}>Refresh history</button>
            </div>
          {/if}
        {/if}
      </div>
      <div class="composer-area">
        {#if notice}<div role="alert" class="error-notice">
            <p>{notice}</p>
            <button class="secondary" on:click={refresh} disabled={busy || !conversation}
              >Refresh history</button
            >
          </div>{/if}
        <p class="request-status" role="status">
          {busy
            ? operation + '. The response arrives together; you can keep drafting.'
            : needsRefresh
              ? 'Refresh history before sending again. Your draft is kept.'
              : conversation?.pending
                ? 'Review or reject the action above before sending another question.'
                : conversation &&
                    ['ambiguous', 'interrupted', 'running'].includes(conversation.status)
                  ? 'Sending is paused. Read the recovery instructions above.'
                  : conversation?.messages.length
                    ? 'Response complete. Source evidence stays in Results.'
                    : 'Paid enrichment and driving estimates wait for your review.'}
        </p>
        <form on:submit|preventDefault={send}>
          <label for="question">Your question</label>
          <textarea
            id="question"
            bind:this={composer}
            bind:value={draft}
            rows="2"
            maxlength="6000"
            placeholder="Describe the location, scope, or candidate…"
            on:keydown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
                event.preventDefault();
                void send();
              }
            }}
          ></textarea>
          <div class="compose-footer">
            <span class="muted"
              >Ctrl / ⌘ + Enter <span class="character-count">· {draft.length}/6,000</span></span
            ><button
              type="submit"
              disabled={busy ||
                needsRefresh ||
                !draft.trim() ||
                (conversation !== null && conversation.status !== 'idle')}
              >{busy && submittedMessage ? 'Working…' : 'Send question'}</button
            >
          </div>
        </form>
        <noscript
          >This private analyst needs JavaScript to send questions and review actions. Existing CSV
          URLs still require NPG sign-in.</noscript
        >
      </div>
    </section>
    <aside class="results-panel" class:expanded={resultsOpen} aria-label="Results and evidence">
      <button
        class="panel-toggle secondary"
        aria-expanded={resultsOpen}
        aria-controls="results-body"
        on:click={() => {
          resultsOpen = !resultsOpen;
          if (resultsOpen) historyOpen = false;
        }}
        >Results & evidence ({conversation?.sources.length ?? 0})<span aria-hidden="true"
          >{resultsOpen ? '−' : '+'}</span
        ></button
      >
      <div class="results-body" id="results-body">
        <header class="results-heading">
          <p class="eyebrow">Keep the evidence</p>
          <h2>Results & exports</h2>
          <p class="muted">Saved with this conversation. CSV downloads require NPG sign-in.</p>
        </header>
        {#each conversation?.sources ?? [] as source, i}
          {@const artifact = sourceArtifact(source.data)}
          <section class="source-artifact" aria-labelledby={'source-' + i}>
            <p class="eyebrow">Source {i + 1}</p>
            <h3 id={'source-' + i}>{actionLabel(source.tool)}</h3>
            {#if artifact.total !== null || artifact.shown !== null}<p class="source-count">
                <strong
                  >{artifact.total === null
                    ? 'Total not supplied'
                    : artifact.total.toLocaleString() + ' total'}</strong
                ><span
                  >{artifact.shown === null
                    ? 'Shown count not supplied'
                    : artifact.shown.toLocaleString() + ' shown in response'}</span
                >
              </p>{/if}
            {#each artifact.links as href}<a
                class="source-link"
                {href}
                target="_blank"
                rel="noopener noreferrer"
                ><strong
                  >{href.startsWith('/delivery/')
                    ? 'Download complete CSV ↗'
                    : 'Open source ↗'}</strong
                ><span>{href}</span></a
              >{/each}
            <dl class="source-fields">
              {#each artifact.fields as field}<div>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>{/each}
            </dl>
            {#each artifact.sections as section}<details>
                <summary>{section.title}</summary>
                <dl class="source-fields">
                  {#each section.fields as field}<div>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>{/each}
                </dl>
              </details>{/each}
            {#if artifact.records.length}<details>
                <summary
                  >Returned records · preview {artifact.previewCount} of {artifact.shown ??
                    'unknown'}</summary
                >{#each artifact.records as fields, index}<div class="record-preview">
                    <h3>Record {index + 1}</h3>
                    <dl>
                      {#each fields as field}<div>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>{/each}
                    </dl>
                  </div>{/each}
                <p class="muted">
                  The complete CSV retains every exported match. This preview uses returned source
                  records.
                </p>
              </details>{/if}
            {#if !artifact.fields.length && !artifact.links.length && !artifact.sections.length}<p
                class="muted"
              >
                This response has no recognized summary fields. Inspect the original evidence below.
              </p>{/if}
            <details>
              <summary>Original source data</summary>
              <pre>{JSON.stringify(source.data, null, 2)}</pre>
            </details>
          </section>
        {:else}<div class="empty-results">
            <span class="artifact-symbol" aria-hidden="true">↗</span>
            <h3>A place for the full picture.</h3>
            <p class="muted">
              Source snapshots, matching totals, limits, and complete CSVs will appear here when
              returned.
            </p>
            <p class="muted">
              Registry fields do not establish certification, experience, availability, or
              permission for outreach.
            </p>
          </div>{/each}
      </div>
    </aside>
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
    height: 100dvh;
    min-height: 32rem;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-base);
    color: var(--color-fg-primary);
    font-family: var(--font-performance-sans);
    font-size: 0.9375rem;
    scrollbar-color: var(--color-performance-line-strong) var(--color-bg-base);
  }
  .npg-shell:focus {
    outline: none;
  }
  .npg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-performance-md);
    padding: var(--space-performance-md) var(--space-performance-lg);
    border-bottom: 1px solid var(--color-border-default);
    flex-shrink: 0;
  }
  .identity,
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-performance-md);
  }
  .identity {
    min-width: 0;
  }
  .header-actions {
    flex-shrink: 0;
    white-space: nowrap;
  }
  .npg-mark {
    font-family: var(--font-performance-mono);
    font-weight: 700;
    font-size: 1rem;
    border: 1px solid var(--color-fg-primary);
    padding: 0.65rem 0.5rem;
  }
  .eyebrow {
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-performance-xs);
  }
  h1 {
    font-size: 1.05rem;
    line-height: 1.3;
    font-weight: 600;
    margin: 0;
  }
  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
  }
  h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    margin: 0 0 var(--space-performance-sm);
    line-height: 1.5;
  }
  p {
    line-height: 1.6;
    margin: 0 0 var(--space-performance-sm);
  }
  .muted,
  .private-label {
    color: var(--color-fg-secondary);
    font-size: 0.75rem;
  }
  .workspace {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 14rem minmax(0, 1fr) 20rem;
  }
  .history-panel {
    border-right: 1px solid var(--color-border-default);
    background: var(--color-bg-subtle);
    min-width: 0;
    overflow: auto;
  }
  .rail-body {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding: var(--space-performance-md);
  }
  .rail-heading {
    display: grid;
    gap: var(--space-performance-md);
    margin-bottom: var(--space-performance-lg);
  }
  .rail-heading h2 {
    font-size: 0.75rem;
    color: var(--color-fg-secondary);
  }
  nav {
    display: grid;
    gap: var(--space-performance-xs);
  }
  button.history-item {
    display: block;
    padding: var(--space-performance-sm);
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-fg-primary);
    min-width: 0;
  }
  button.history-item.chosen {
    background: var(--color-bg-surface);
    border-color: var(--color-border-default);
    box-shadow: inset 2px 0 var(--color-fg-primary);
  }
  .history-title {
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .history-meta {
    display: block;
    margin-top: var(--space-performance-xs);
    font-size: 0.65rem;
    color: var(--color-fg-secondary);
  }
  .history-empty {
    margin: 0;
  }
  .rail-note {
    margin: auto 0 0;
    padding-top: var(--space-performance-xl);
  }
  .chat {
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
  .thread-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: var(--space-performance-md);
    border-bottom: 1px solid var(--color-border-default);
    padding: var(--space-performance-md) var(--space-performance-lg);
  }
  .thread-header h2 {
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .state {
    flex-shrink: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    line-height: 1.6;
    color: var(--color-performance-growth);
  }
  .state[data-state='review'] {
    color: var(--color-performance-review);
  }
  .state[data-state='running'] {
    color: var(--color-performance-signal);
  }
  .state[data-state='ambiguous'],
  .state[data-state='interrupted'] {
    color: var(--color-performance-risk);
  }
  .thread {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--space-performance-lg) clamp(1rem, 3vw, 3rem);
    scroll-padding: var(--space-performance-lg);
  }
  .welcome {
    max-width: 37rem;
    margin: clamp(1rem, 6vh, 4rem) auto;
  }
  .welcome h2 {
    font-size: clamp(1.5rem, 2.4vw, 2.25rem);
    line-height: 1.2;
    margin: var(--space-performance-md) 0;
    letter-spacing: -0.035em;
  }
  .welcome > p:not(.eyebrow) {
    color: var(--color-fg-secondary);
    font-size: 0.875rem;
  }
  .examples {
    display: grid;
    margin-top: var(--space-performance-lg);
    border-top: 1px solid var(--color-border-default);
  }
  .examples button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-md);
    text-align: left;
    font-size: 0.8125rem;
    border: 0;
    border-bottom: 1px solid var(--color-border-default);
    padding: var(--space-performance-md) 0;
    line-height: 1.5;
  }
  article {
    padding: var(--space-performance-lg) 0;
  }
  article h3 {
    font-family: var(--font-performance-mono);
    text-transform: uppercase;
    font-size: 0.65rem;
    color: var(--color-fg-secondary);
  }
  article p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .user-message {
    padding: var(--space-performance-md);
    margin-block: var(--space-performance-sm);
    background: var(--color-bg-subtle);
    border-left: 2px solid var(--color-border-default);
  }
  .review,
  .recovery {
    border: 1px solid var(--color-border-default);
    border-left: 3px solid var(--color-performance-review);
    background: var(--color-bg-surface);
    padding: var(--space-performance-lg);
    margin-block: var(--space-performance-lg);
  }
  .review > h2,
  .recovery h2 {
    margin-bottom: var(--space-performance-sm);
  }
  .review > h3 {
    margin-top: var(--space-performance-lg);
  }
  .review p,
  .recovery p {
    font-size: 0.8125rem;
  }
  .recovery {
    border-left-color: var(--color-performance-risk);
  }
  dl {
    margin: var(--space-performance-md) 0;
  }
  dl > div {
    border-bottom: 1px solid var(--color-border-default);
    padding-block: var(--space-performance-sm);
  }
  dt {
    color: var(--color-fg-secondary);
    font-size: 0.7rem;
    line-height: 1.5;
  }
  dd {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.5;
  }
  .review-fields > div {
    display: grid;
    grid-template-columns: minmax(6rem, 1fr) minmax(0, 2fr);
    gap: var(--space-performance-sm);
  }
  .review-fields dd {
    margin: 0;
  }
  .expiry {
    margin-top: var(--space-performance-md);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }
  details {
    border-bottom: 1px solid var(--color-border-default);
  }
  summary {
    min-height: 2.75rem;
    align-content: center;
    cursor: pointer;
    font-size: 0.75rem;
    overflow-wrap: anywhere;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 24rem;
    overflow: auto;
    font-size: 0.7rem;
    line-height: 1.6;
    background: var(--color-bg-subtle);
    padding: var(--space-performance-sm);
  }
  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    overflow-wrap: anywhere;
  }
  .header-actions a {
    font-size: 0.75rem;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
  }
  button {
    min-height: 2.75rem;
    padding: 0.65rem var(--space-performance-md);
    border: 1px solid var(--color-fg-primary);
    background: var(--color-fg-primary);
    color: var(--color-bg-base);
    border-radius: var(--radius-performance-sm);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    line-height: 1.4;
  }
  button.secondary {
    background: transparent;
    color: var(--color-fg-primary);
    border-color: var(--color-border-default);
  }
  button:hover:not(:disabled) {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button:focus-visible,
  a:focus-visible,
  textarea:focus-visible,
  summary:focus-visible,
  .thread:focus-visible {
    outline: 2px solid var(--color-performance-signal);
    outline-offset: 2px;
  }
  .composer-area {
    border-top: 1px solid var(--color-border-default);
    padding: var(--space-performance-sm) var(--space-performance-lg) var(--space-performance-md);
    background: var(--color-bg-surface);
  }
  .request-status {
    font-size: 0.7rem;
    color: var(--color-fg-secondary);
  }
  form {
    border: 1px solid var(--color-performance-line-strong);
    padding: var(--space-performance-sm);
  }
  label {
    font-size: 0.7rem;
    color: var(--color-fg-secondary);
  }
  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 3rem;
    max-height: 8rem;
    background: transparent;
    color: var(--color-fg-primary);
    border: 0;
    padding: var(--space-performance-xs) 0;
    font: inherit;
    font-size: 1rem;
    line-height: 1.5;
  }
  .compose-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-performance-sm);
  }
  .compose-footer .muted {
    font-size: 0.65rem;
  }
  .error-notice {
    border-left: 3px solid var(--color-performance-risk);
    padding: var(--space-performance-sm);
    margin-bottom: var(--space-performance-sm);
    max-height: 8rem;
    overflow: auto;
  }
  .error-notice p {
    font-size: 0.8125rem;
  }
  .results-panel {
    border-left: 1px solid var(--color-border-default);
    min-width: 0;
    overflow: auto;
    background: var(--color-bg-subtle);
  }
  .results-body {
    padding: var(--space-performance-lg);
  }
  .results-heading h2 {
    margin-bottom: var(--space-performance-sm);
  }
  .source-artifact {
    padding: var(--space-performance-lg) 0;
    border-top: 1px solid var(--color-border-default);
  }
  .record-preview {
    padding: var(--space-performance-sm);
    border: 1px solid var(--color-border-default);
    margin-bottom: var(--space-performance-sm);
  }
  .source-count {
    display: grid;
    margin-block: var(--space-performance-md);
  }
  .source-count strong {
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: -0.035em;
  }
  .source-count span {
    font-size: 0.75rem;
    color: var(--color-fg-secondary);
  }
  .source-link {
    display: block;
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-surface);
    padding: var(--space-performance-sm);
    margin-block: var(--space-performance-sm);
    text-decoration: none;
  }
  .source-link strong {
    display: block;
    font-size: 0.8125rem;
    text-decoration: underline;
  }
  .source-link span {
    display: block;
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    color: var(--color-fg-secondary);
    margin-top: var(--space-performance-sm);
  }
  .empty-results {
    margin-top: var(--space-performance-xl);
  }
  .artifact-symbol {
    display: block;
    font-size: 2rem;
    margin-bottom: var(--space-performance-md);
    color: var(--color-fg-secondary);
  }
  .panel-toggle {
    display: none;
  }
  @media (min-width: 768px) {
    .history-panel .panel-toggle {
      display: none;
    }
  }
  @media (max-width: 1200px) and (min-width: 1025px) {
    .workspace {
      grid-template-columns: 12rem minmax(0, 1fr) 17rem;
    }
    .thread {
      padding-inline: var(--space-performance-md);
    }
    .results-body {
      padding: var(--space-performance-md);
    }
  }
  @media (max-width: 1024px) {
    .workspace {
      grid-template-columns: 12rem minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto;
    }
    .history-panel {
      grid-row: 1 / 3;
    }
    .results-panel {
      grid-column: 2;
      border-top: 1px solid var(--color-border-default);
      border-left: 0;
      max-height: 35dvh;
    }
    .panel-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border: 0;
      border-radius: 0;
    }
    .results-body {
      display: none;
    }
    .results-panel.expanded .results-body {
      display: block;
    }
    .results-heading {
      display: none;
    }
    .source-artifact {
      padding-top: var(--space-performance-sm);
    }
  }
  @media (max-width: 767px) {
    .npg-shell {
      min-height: 28rem;
    }
    .npg-header {
      padding: var(--space-performance-sm) var(--space-performance-md);
    }
    .private-label {
      display: none;
    }
    .workspace {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr) auto;
    }
    .history-panel {
      grid-column: 1;
      grid-row: 1;
      border-right: 0;
      border-bottom: 1px solid var(--color-border-default);
      max-height: 30dvh;
    }
    .rail-body {
      display: none;
      min-height: 0;
    }
    .history-panel.expanded .rail-body {
      display: flex;
    }
    .rail-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-performance-sm);
    }
    .rail-note {
      display: none;
    }
    .results-panel {
      grid-column: 1;
      grid-row: 3;
      max-height: 30dvh;
    }
    .thread-header {
      padding: var(--space-performance-sm) var(--space-performance-md);
      gap: var(--space-performance-sm);
    }
    .thread-header h2 {
      font-size: 0.75rem;
    }
    .state {
      max-width: 8rem;
      flex-shrink: 1;
      font-size: 0.6rem;
    }
    .thread {
      padding: var(--space-performance-md);
    }
    .welcome {
      margin: var(--space-performance-md) 0;
    }
    .welcome h2 {
      font-size: 1.75rem;
    }
    .composer-area {
      padding: var(--space-performance-sm) var(--space-performance-md);
    }
    .review {
      padding: var(--space-performance-md);
    }
    .review-fields > div {
      grid-template-columns: 1fr;
    }
    .character-count {
      display: none;
    }
    .request-status {
      font-size: 0.65rem;
    }
    .actions button {
      flex: 1 1 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .npg-shell,
    .thread {
      scroll-behavior: auto;
    }
  }
</style>
