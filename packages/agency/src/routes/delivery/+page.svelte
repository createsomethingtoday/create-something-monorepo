<script lang="ts">
  import { SEO } from '@create-something/canon';
  import DeliveryOutcomeStrip, {
    type DeliveryOutcomeItem
  } from '$lib/components/DeliveryOutcomeStrip.svelte';

  const deliveryRecords = [
    {
      label: 'Abundance',
      title: 'Nurse intake experience',
      href: '/delivery/abundance',
      detail:
        'A client-safe record of the nurse-facing Concierge pilot, public job discovery, recruiter gates, and remaining owner decisions.',
      status: 'Pilot review'
    },
    {
      label: 'ShivWorks',
      title: 'Backend handoff',
      href: '/delivery/shivworks',
      detail:
        'A forwardable runbook for repo, secrets, database, app admin, acceptance checks, and ownership-transfer choices.',
      status: 'Handoff review'
    }
  ];

  const routeItems = [
    {
      step: '01',
      title: 'Public pages stay client-safe',
      detail:
        'Delivery records explain the work without exposing secrets, private rows, or token-bearing URLs.'
    },
    {
      step: '02',
      title: 'Evidence stays attached',
      detail:
        'Each record keeps business outcome, operating boundary, validation, and remaining decisions in one place.'
    },
    {
      step: '03',
      title: 'Next action is explicit',
      detail:
        'Readers can see whether the work needs review, access, approval, or a workflow map before it expands.'
    }
  ];

  const outcomeItems: DeliveryOutcomeItem[] = [
    {
      label: 'Before',
      title: 'Delivery links were only useful when someone already had the exact URL.',
      detail:
        'A shortened or mistyped delivery path could fall through to the generic 404 instead of explaining where the records live.',
      tone: 'neutral'
    },
    {
      label: 'Now',
      title: 'The delivery directory gives every record a visible front door.',
      detail:
        'Visitors who land on /delivery can choose the right client-safe record without needing private context.',
      tone: 'success'
    },
    {
      label: 'Boundary',
      title: 'The page routes to records, not private evidence.',
      detail:
        'Private materials remain outside the public surface; the index only links to already-published delivery pages.',
      tone: 'info'
    },
    {
      label: 'Next',
      title: 'New delivery records can join this index when they are safe to share.',
      detail:
        'The directory remains a concise delivery record rather than a broad portfolio or internal archive.',
      tone: 'warning'
    }
  ];
</script>

<SEO
  title="Delivery Records | CREATE SOMETHING .agency"
  description="Client-safe CREATE SOMETHING delivery records for active workflow pilots, handoffs, proof pages, and owner decisions."
  keywords="CREATE SOMETHING delivery records, workflow proof, client-safe delivery pages"
  canonical="https://createsomething.agency/delivery"
  ogImage="/og-image.png"
  propertyName="agency"
  noindex={true}
/>

<section class="delivery-hero">
  <div class="shell-inner-pad delivery-hero__inner">
    <div class="delivery-copy">
      <span class="product-kicker">Delivery records</span>
      <h1>Published work lives here.</h1>
      <p>
        Delivery records are client-safe surfaces for work that has moved beyond chat: what changed,
        what remains private, what is blocked, and who decides the next step.
      </p>
      <div class="delivery-actions" aria-label="Delivery index actions">
        <a class="delivery-action delivery-action--primary" href="/delivery/abundance">
          Review Abundance
        </a>
        <a class="delivery-action" href="/delivery/shivworks">Review ShivWorks</a>
      </div>
    </div>

    <aside class="delivery-status product-surface product-surface--soft">
      <div class="delivery-status__heading">
        <span class="status-dot"></span>
        <strong>Directory</strong>
      </div>
      <p><strong>Property</strong><span>.agency</span></p>
      <p><strong>Records</strong><span>{deliveryRecords.length} published</span></p>
      <p><strong>Boundary</strong><span>Client-safe only</span></p>
      <p><strong>Private data</strong><span>Kept outside this page</span></p>
    </aside>
  </div>

  <div class="shell-inner-pad">
    <div class="intake-path" aria-label="Delivery route behavior">
      {#each routeItems as item}
        <article>
          <span>{item.step}</span>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<DeliveryOutcomeStrip
  eyebrow="Route behavior"
  title="The delivery path now has a clear landing point."
  description="A generic delivery URL should orient the reader first, then send them to the specific record that owns the proof."
  items={outcomeItems}
  ariaLabel="Delivery index route behavior"
/>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Published records</span>
      <h2>Choose the delivery record to review.</h2>
      <p>
        Each page is written for external review. It names the business outcome, the operating
        boundary, the evidence path, and the decisions that still need an owner.
      </p>
    </div>

    <div class="package-grid" aria-label="Published delivery records">
      {#each deliveryRecords as record}
        <a class="product-surface package-card delivery-record-card" href={record.href}>
          <div>
            <span>{record.label}</span>
            <h3>{record.title}</h3>
          </div>
          <p><strong>Status</strong>{record.status}</p>
          <p>{record.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="delivery-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <span class="product-kicker">Start here</span>
      <h2>Need a new delivery record?</h2>
      <p>
        Start with the workflow map when the work is not yet ready for a client-safe proof page.
        Delivery records should publish only after the boundary, owner decisions, and validation
        evidence are clear.
      </p>
      <div class="delivery-actions">
        <a class="delivery-action delivery-action--primary" href="/contact?intent=workflow-map">
          Map one workflow
        </a>
      </div>
    </div>
  </div>
</section>

<style>
  .delivery-record-card {
    color: inherit;
    text-decoration: none;
  }

  .delivery-record-card p strong {
    margin-right: 0.45rem;
    color: var(--color-performance-ink, #090909);
    font-weight: var(--font-medium);
  }
</style>
