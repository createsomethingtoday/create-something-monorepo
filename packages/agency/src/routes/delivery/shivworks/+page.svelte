<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';
  import DeliveryOutcomeStrip, {
    type DeliveryOutcomeItem
  } from '$lib/components/DeliveryOutcomeStrip.svelte';

  export let data: PageData;

  const context = data.context;
  const engagement = context.engagement;
  const privateEvidence = context.evidence.filter((item) => item.visibility !== 'public');
  const statusItems = [
    { label: 'Client', value: engagement?.client ?? 'ShivWorks' },
    { label: 'Surface', value: 'Backend handoff record' },
    { label: 'Boundary', value: 'Scoped access before transfer' },
    { label: 'Secrets', value: 'Infisical, not chat or GitHub' }
  ];
  const outcomeItems: DeliveryOutcomeItem[] = [
    {
      label: 'Before',
      title: 'Backend ownership could scatter across chat, accounts, secrets, and data.',
      detail:
        'The handoff needed to be safe for a PM to forward and precise enough for a developer to inherit.',
      tone: 'neutral'
    },
    {
      label: 'Now',
      title: 'Repo, secrets, database, app admin, and acceptance checks have named lanes.',
      detail:
        'The runbook separates GitHub, Infisical, Cloudflare, and app admin access so each grant can be approved and verified.',
      tone: 'success'
    },
    {
      label: 'Risk reduced',
      title: 'No broad credential or CREATE SOMETHING internal access is required.',
      detail:
        'Secret values stay in Infisical and Cloudflare, production data stays out of the public page, and grants remain attributable.',
      tone: 'info'
    },
    {
      label: 'Next decision',
      title: 'Name the recipient and choose scoped access or full account transfer.',
      detail:
        'The remaining work is explicit: identities, access grants, production ownership, and app admin role setup.',
      tone: 'warning'
    }
  ];
</script>

<SEO
  title="ShivWorks Delivery Runbook | CREATE SOMETHING Agency"
  description="Client-safe delivery runbook for ShivWorks Network developer access, Infisical secrets, Cloudflare D1, app admin boundaries, and backend validation commands."
  keywords="ShivWorks, Cloudflare D1, Infisical, developer runbook, CREATE SOMETHING"
  canonical="https://createsomething.agency/delivery/shivworks"
  ogImage="/og-image.svg"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">ShivWorks delivery record</span>
      <h1>A backend handoff with named access lanes.</h1>
      <p>{context.summary}</p>
      <div class="delivery-actions" aria-label="Primary ShivWorks delivery actions">
        <a class="delivery-action delivery-action--primary" href="#developer-runbook">
          Review runbook
        </a>
        <a class="delivery-action" href="#access-lanes">Review access lanes</a>
      </div>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <div class="delivery-status__heading">
        <span class="status-dot"></span>
        <strong>Handoff review</strong>
      </div>
      {#each statusItems as item}
        <p><strong>{item.label}</strong><span>{item.value}</span></p>
      {/each}
    </aside>
  </div>
</section>

<DeliveryOutcomeStrip
  eyebrow="Business outcome"
  title="The handoff is now an ownership system."
  description="The page lets a non-technical owner forward the right artifact while keeping production access and private data behind named approval lanes."
  items={outcomeItems}
/>

<section class="delivery-section" id="access-lanes">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Handoff packet</span>
      <h2>What to send and where ownership moves.</h2>
      <p>
        This is written so a non-technical PM can forward the page, while the technical recipient
        can take ownership without guessing where the repo, secrets, database, and acceptance checks
        live.
      </p>
    </div>

    <div class="package-grid">
      {#each context.handoffPackage ?? [] as item}
        <article class="product-surface package-card">
          <div>
            <span>{item.label}</span>
            <h3>{item.audience}</h3>
          </div>
          <p><strong>Deliver</strong>{item.deliverable}</p>
          <p><strong>How</strong>{item.how}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Shareable references</span>
      <h2>What the developer can open.</h2>
      <p>
        These references are safe to share. Secret values, production member data, and Cloudflare
        write permissions stay in GitHub, Infisical, Cloudflare, and the app admin workflow.
      </p>
    </div>

    <div class="artifact-grid">
      {#each context.artifacts as artifact}
        {#if artifact.href}
          <a
            class="artifact-link product-surface"
            href={artifact.href}
            target="_blank"
            rel="noreferrer"
          >
            <span>{artifact.type}</span>
            <strong>{artifact.title}</strong>
          </a>
        {:else}
          <article class="artifact-link artifact-link--static product-surface">
            <span>{artifact.type}</span>
            <strong>{artifact.title}</strong>
          </article>
        {/if}
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Database / Automation / Judgment</span>
      <h2>Map every handoff item to the operating layer.</h2>
    </div>

    <div class="layer-grid">
      {#each context.layers as layer}
        <article class="product-surface layer-card">
          <span class="layer-tier">{layer.tier}</span>
          <h3>{layer.title}</h3>
          <p class="layer-status">{layer.status}</p>
          <p>{layer.description}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section" id="developer-runbook">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Developer Runbook</span>
      <h2>Start with access, then local proof.</h2>
      <p>
        The normal path is GitHub access plus Infisical dev access. Cloudflare D1 access can be
        granted now to the named technical owner who needs direct production database operations.
      </p>
    </div>

    <div class="runbook-grid">
      {#each context.runbookCommands ?? [] as command}
        <article class="product-surface runbook-card">
          <span>{command.label}</span>
          <p>{command.description}</p>
          <pre><code>{command.command}</code></pre>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Access Lanes</span>
      <h2>Grant only the needed lane.</h2>
      <p>
        GitHub, Infisical, Cloudflare, and app-admin access solve different problems. Avoid using
        one broad credential as a shortcut for all four.
      </p>
    </div>

    <div class="access-table product-surface">
      {#each context.accessLanes ?? [] as lane}
        <article>
          <span>{lane.label}</span>
          <p><strong>Owner</strong>{lane.owner}</p>
          <p><strong>Scope</strong>{lane.scope}</p>
          <p><strong>Action</strong>{lane.action}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad evidence-layout">
    <div class="product-surface product-surface--soft evidence-panel">
      <span class="product-kicker">Private Boundary</span>
      <h2>Known but not published.</h2>
      <div class="evidence-list">
        {#each privateEvidence as item}
          <p>{item.detail}</p>
        {/each}
      </div>
    </div>

    <div class="product-surface product-surface--soft evidence-panel evidence-panel--accent">
      <span class="product-kicker">Next Review</span>
      <h2>Decisions still open.</h2>
      <div class="evidence-list">
        {#each context.decisions as decision}
          <p>{decision.title}</p>
        {/each}
      </div>
    </div>
  </div>
</section>

