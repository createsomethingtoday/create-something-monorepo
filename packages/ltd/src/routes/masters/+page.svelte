<script lang="ts">
  import {
    CanonCollectionRail,
    CanonIndexOpening,
    type CanonCollectionItem
  } from '$lib/components';
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const masterItems = $derived(
    (data.masters ?? []).map(
      (master): CanonCollectionItem => ({
        title: master.name,
        detail: master.tagline || 'Inspect this master’s principles and the work they govern.',
        href: `/masters/${master.slug}`,
        eyebrow: master.discipline || 'Master',
        meta: master.birth_year
          ? `${master.birth_year}–${master.death_year || 'Present'}`
          : undefined
      })
    )
  );
</script>

<SEO
  title="Masters"
  description="Explore the masters who define 'less, but better' — from Dieter Rams to Mies van der Rohe."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Masters', url: 'https://createsomething.ltd/masters' }
  ]}
/>

<CanonIndexOpening
  current="masters"
  title="Masters"
  description="Choose the practitioner whose discipline is closest to your current decision, then inspect the principles behind the work."
  recommendation={{
    label: 'Begin with Dieter Rams',
    detail: 'Start with the clearest account of useful, understandable, restrained design.',
    href: '/masters/dieter-rams'
  }}
/>

<CanonCollectionRail
  id="master-collection"
  title="Choose a governing practitioner."
  description="Every destination opens the complete master record. Discipline and dates help you choose without decoding the full archive first."
  items={masterItems}
  emptyMessage="No master records are available yet. Continue with the Canon foundations while the collection is restored."
/>
