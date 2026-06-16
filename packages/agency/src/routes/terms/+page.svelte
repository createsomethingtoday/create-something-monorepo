<script lang="ts">
  import { ClearPageSection, SEO, TermsOfServiceContent } from '@create-something/canon';
</script>

<SEO
  title="Terms of Service"
  description="Terms of Service for CREATE SOMETHING AGENCY. Read our terms governing your use of our website and services."
  propertyName="agency"
  noindex={true}
/>

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Terms"
  title="Terms for using CREATE SOMETHING .agency."
  description="These terms govern use of the agency site and services. The policy language stays direct so commercial and trust boundaries remain inspectable."
>
  {#snippet after()}
    <TermsOfServiceContent
      property="agency"
      domain="createsomething.agency"
      lastUpdated="January 29, 2026"
      contactEmail="legal@createsomething.io"
    />
  {/snippet}
</ClearPageSection>
