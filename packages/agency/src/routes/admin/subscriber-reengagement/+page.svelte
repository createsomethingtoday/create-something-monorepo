<script lang="ts">
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Subscriber re-engagement | Operator</title></svelte:head>

<main>
  <header>
    <p class="eyebrow">CRE-1713 / OPERATOR APPROVAL</p>
    <h1>Subscriber re-engagement</h1>
    <p>One reviewed message, one reviewed signup audience, and a receipt for every decision.</p>
  </header>

  {#if data.error || form?.error}<p class="notice error" role="alert">
      {form?.error ?? data.error}
    </p>{/if}
  {#if data.result}<p class="notice" role="status">Action receipt: {data.result}</p>{/if}

  {#if data.audience}
    <section aria-labelledby="audience-title">
      <h2 id="audience-title">Audience receipt</h2>
      <dl class="metrics">
        <div>
          <dt>Eligible</dt>
          <dd>{data.audience.eligible}</dd>
        </div>
        <div>
          <dt>Excluded</dt>
          <dd>{data.audience.excluded}</dd>
        </div>
        <div>
          <dt>Total records</dt>
          <dd>{data.audience.total}</dd>
        </div>
      </dl>
      <dl class="exclusions">
        <div>
          <dt>Direct confirmed</dt>
          <dd>{data.audience.directConfirmed}</dd>
        </div>
        <div>
          <dt>Legacy single opt-in</dt>
          <dd>{data.audience.legacySingleOptIn}</dd>
        </div>
      </dl>
      <dl class="exclusions">
        <div>
          <dt>Unconfirmed</dt>
          <dd>{data.audience.unconfirmed}</dd>
        </div>
        <div>
          <dt>Consent not proved</dt>
          <dd>{data.audience.consentUnproved}</dd>
        </div>
        <div>
          <dt>Not audience-reviewed</dt>
          <dd>{data.audience.audienceUnreviewed}</dd>
        </div>
        <div>
          <dt>Suppressed</dt>
          <dd>{data.audience.suppressed}</dd>
        </div>
      </dl>
      <p class="boundary">
        No addresses are rendered here. Eligibility is limited to direct confirmations and the
        separately reviewed legacy signup lane. Customers, contacts, internal/test records,
        migration-only rows, and suppression states are ineligible.
      </p>
      <form method="POST" action="?/prepare">
        <button type="submit">Prepare locked draft</button>
      </form>
    </section>
  {/if}

  {#if data.campaign}
    <section aria-labelledby="message-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">STATUS / {data.campaign.status}</p>
          <h2 id="message-title">Exact message</h2>
        </div>
        <code>{data.campaign.contentHash}</code>
      </div>
      <dl class="facts">
        <div>
          <dt>Subject</dt>
          <dd>{data.campaign.subject}</dd>
        </div>
        <div>
          <dt>Preheader</dt>
          <dd>{data.campaign.preheader}</dd>
        </div>
        <div>
          <dt>Reply-to</dt>
          <dd>{data.campaign.replyTo}</dd>
        </div>
        <div>
          <dt>Eligible / excluded</dt>
          <dd>{data.campaign.eligibleCount} / {data.campaign.excludedCount}</dd>
        </div>
      </dl>
      <div class="previews">
        <div>
          <h3>HTML</h3>
          <iframe title="Exact subscriber email preview" srcdoc={data.campaign.htmlSnapshot}
          ></iframe>
        </div>
        <div>
          <h3>Plain text</h3>
          <pre>{data.campaign.textSnapshot}</pre>
        </div>
      </div>
    </section>

    <section aria-labelledby="gates-title">
      <h2 id="gates-title">Gates and receipts</h2>
      <div class="actions">
        <form method="POST" action="?/seed">
          <p>
            Send a tagged seed to the authenticated operator. Preview links cannot change subscriber
            state.
          </p>
          <button type="submit">Send operator seed</button>
        </form>
        <form method="POST" action="?/approve">
          <label for="approval_phrase">Type the exact phrase</label>
          <code>{data.campaign.approvalPhrase}</code>
          <input id="approval_phrase" name="approval_phrase" autocomplete="off" required />
          <button type="submit">Record exact approval</button>
        </form>
        <form method="POST" action="?/send">
          <p>
            Runs only from an approved content hash and unchanged audience. Each recipient has an
            idempotent delivery receipt.
          </p>
          <button
            type="submit"
            disabled={data.campaign.status !== 'approved' && data.campaign.status !== 'sending'}
            >Send approved cohort</button
          >
        </form>
        <form method="POST" action="?/stop">
          <p>
            Stops the campaign and revokes every check-in token. Preparing again requires a fresh
            approval.
          </p>
          <button class="secondary" type="submit">Stop and revoke</button>
        </form>
        <form method="POST" action="?/sync">
          <p>
            Read the latest provider status for seed and cohort message IDs. No open or click data
            is requested or stored.
          </p>
          <button class="secondary" type="submit">Sync delivery receipts</button>
        </form>
      </div>
      <dl class="facts">
        <div>
          <dt>Seed status</dt>
          <dd>{data.campaign.seedStatus ?? 'not sent'}</dd>
        </div>
        <div>
          <dt>Seed receipt</dt>
          <dd>{data.campaign.seedEmailId ?? 'none'}</dd>
        </div>
        <div>
          <dt>Approved at</dt>
          <dd>{data.campaign.approvedAt ?? 'not approved'}</dd>
        </div>
        <div>
          <dt>Approved by</dt>
          <dd>{data.campaign.approvedBy ?? 'not approved'}</dd>
        </div>
      </dl>
      {#if data.deliveries.length}
        <h3>Delivery state</h3>
        <ul>
          {#each data.deliveries as receipt}<li>{receipt.status}: {receipt.count}</li>{/each}
        </ul>
      {/if}
    </section>

    <section aria-labelledby="responses-title">
      <h2 id="responses-title">Subscriber responses</h2>
      <p>
        {data.responses.length} retained response{data.responses.length === 1 ? '' : 's'}.
        Addresses and subscriber IDs are not included.
      </p>
      {#if data.responses.length}
        <div class="response-list">
          {#each data.responses as response}
            <article>
              <p class="eyebrow">
                {response.responded_at} / INTEREST {response.still_interested} / UPDATES {response.updates_seen}
              </p>
              <p class="eyebrow">
                NOTIFICATION {response.notification_status} / WARM LEAD {response.warm_lead_status}
              </p>
              <dl>
                <div>
                  <dt>Why they joined</dt>
                  <dd>{response.original_reason ?? 'No answer'}</dd>
                </div>
                <div>
                  <dt>What they want next</dt>
                  <dd>{response.wanted_next ?? 'No answer'}</dd>
                </div>
              </dl>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f3f3f0;
    color: #111;
    font-family: Inter, system-ui, sans-serif;
  }
  main {
    width: min(78rem, calc(100% - 2rem));
    margin: 0 auto;
    padding: 7rem 0 4rem;
  }
  header {
    max-width: 52rem;
    margin-bottom: 2rem;
  }
  h1 {
    margin: 0.35rem 0 1rem;
    font-size: clamp(3rem, 7vw, 6rem);
    line-height: 0.94;
    letter-spacing: -0.05em;
  }
  h2 {
    margin: 0;
    font-size: clamp(1.8rem, 4vw, 3.2rem);
  }
  h3 {
    margin: 0 0 0.75rem;
  }
  p {
    line-height: 1.6;
  }
  .eyebrow,
  dt,
  code {
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  section {
    margin-top: 1rem;
    padding: clamp(1.25rem, 4vw, 3rem);
    border: 1px solid #d1d1cb;
    background: #fff;
  }
  .metrics,
  .exclusions,
  .facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    margin: 1.5rem 0;
    background: #d1d1cb;
    border: 1px solid #d1d1cb;
  }
  .exclusions,
  .facts {
    grid-template-columns: repeat(4, 1fr);
  }
  dl div {
    min-width: 0;
    padding: 1rem;
    background: #fff;
  }
  dd {
    margin: 0.45rem 0 0;
    overflow-wrap: anywhere;
  }
  .metrics dd {
    font-size: 2.5rem;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: end;
  }
  .section-heading code {
    max-width: 28rem;
    overflow-wrap: anywhere;
    text-align: right;
  }
  .previews {
    display: grid;
    grid-template-columns: 1.35fr 0.65fr;
    gap: 1rem;
  }
  iframe,
  pre {
    width: 100%;
    min-height: 44rem;
    box-sizing: border-box;
    border: 1px solid #d1d1cb;
    background: #fff;
  }
  pre {
    margin: 0;
    padding: 1rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font:
      0.85rem/1.55 ui-monospace,
      monospace;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .actions form {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid #d1d1cb;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.8rem;
    font: inherit;
  }
  button {
    width: fit-content;
    padding: 0.8rem 1rem;
    border: 1px solid #111;
    background: #111;
    color: #fff;
    font-weight: 650;
    cursor: pointer;
  }
  button.secondary {
    background: #fff;
    color: #111;
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .notice {
    padding: 1rem;
    border: 1px solid #111;
    background: #fff;
  }
  .notice.error {
    border-color: #a52222;
    color: #7a1717;
  }
  .boundary {
    max-width: 62rem;
  }
  .response-list {
    display: grid;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .response-list article {
    padding: 1rem;
    border: 1px solid #d1d1cb;
  }
  .response-list dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .response-list dl div {
    padding: 0;
  }
  @media (max-width: 760px) {
    main {
      padding-top: 5rem;
    }
    .metrics,
    .exclusions,
    .facts,
    .actions,
    .previews,
    .response-list dl {
      grid-template-columns: 1fr;
    }
    .section-heading {
      display: block;
    }
    .section-heading code {
      display: block;
      margin-top: 1rem;
      text-align: left;
    }
    iframe {
      min-height: 38rem;
    }
  }
</style>
