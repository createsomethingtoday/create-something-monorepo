<script lang="ts">
  import { PerformancePageSection, SEO, TermsOfServiceContent } from '@create-something/canon';
</script>

<SEO
  title="Terms of Service"
  description="Terms of Service for CREATE SOMETHING AGENCY. Read our terms governing your use of our website and services."
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Terms"
  title="Terms for using CREATE SOMETHING .agency."
  description="These terms explain the conditions for using our website and services."
>
  {#snippet after()}
    <TermsOfServiceContent
      property="agency"
      domain="createsomething.agency"
      lastUpdated="January 29, 2026"
      contactEmail="legal@createsomething.io"
    />
  {/snippet}
</PerformancePageSection>
