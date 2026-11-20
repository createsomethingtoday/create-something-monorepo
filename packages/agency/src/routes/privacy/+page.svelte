<script lang="ts">
  import AgencyHeroFrame from '$lib/components/AgencyHeroFrame.svelte';
  import AgencyLegalContent from '$lib/components/AgencyLegalContent.svelte';
  import AgencyLegalPage from '$lib/components/AgencyLegalPage.svelte';
  import { PerformancePageSection, PrivacyPolicyContent, SEO } from '@create-something/canon';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING Agency uses first-party analytics and optional Meta marketing. Choose each separately and change your preferences at any time."
  propertyName="agency"
  noindex={true}
/>

<AgencyLegalPage>
<AgencyHeroFrame compact={true}>
<PerformancePageSection
  variant="hero"
  expression="editorial"
  titleLevel="h1"
  eyebrow="Privacy"
  title="Your data. Your privacy choices."
  description="First-party analytics and Meta marketing are separate choices. Meta marketing stays off unless you allow it. You can change either choice at any time."
/>
</AgencyHeroFrame>
<AgencyLegalContent sectionNavigation>
      <PrivacyPolicyContent
        property="agency"
        domain="createsomething.agency"
        lastUpdated="November 5, 2026"
      />
</AgencyLegalContent>

</AgencyLegalPage>
