<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    SEO,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
  import { paperAttachedReceiptMedia } from '$lib/data/performanceMedia';

  const deliveryRecords: PerformanceEvidenceItem[] = [
    {
      id: '#DEL-ABUNDANCE',
      kind: 'Nurse intake experience',
      title: 'Review the Concierge pilot and the decisions that still need an owner.',
      detail:
        'A client-safe record of nurse-facing intake, public job discovery, recruiter gates, validation, and remaining decisions.',
      state: 'review',
      date: 'Pilot review',
      href: '/delivery/abundance'
    }
  ];
</script>

<SEO
  title="Delivery Records | CREATE SOMETHING .agency"
  description="Public project updates showing what was delivered, what was tested, and what still needs a decision."
  keywords="CREATE SOMETHING delivery records, workflow proof, client-safe delivery pages"
  canonical="https://createsomething.agency/delivery"
  ogImage="/og-image.png"
  propertyName="agency"
  noindex={true}
/>

<PerformanceCampaignOpening
  eyebrow="Delivery records"
  expression="editorial"
  title="Published work lives here."
  lede="Read what changed, what is blocked, and who decides next. Private client information is kept out of these public records."
  density="compact"
  media={paperAttachedReceiptMedia}
  proof={[
    { label: 'Records', value: String(deliveryRecords.length).padStart(2, '0') },
    { label: 'Boundary', value: 'Client-safe only' },
    { label: 'Private data', value: 'Outside' }
  ]}
>
  {#snippet actions()}
    <Button href="#delivery-records">Choose a record</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceEvidenceIndex
  id="delivery-records"
  eyebrow="Published records"
  title="Read a project update."
  description="Each update shows the intended result, checks completed, limits, and decisions still needed."
  items={deliveryRecords}
  ariaLabel="Published client-safe delivery records"
/>

<PerformanceConversionHandoff
  expression="editorial"
  eyebrow="No record yet"
  title="A delivery record is published only when it is safe to read."
  description="A new delivery record should appear only after its boundary, owner decisions, and validation evidence are safe and clear."
  handoff={{
    owner: 'Workflow owner',
    authority: 'Human approval',
    proof: 'Map + validation + boundary',
    state: 'ready'
  }}
>
  {#snippet actions()}
    <Button href="/map">Map your workflow</Button>
  {/snippet}
</PerformanceConversionHandoff>
