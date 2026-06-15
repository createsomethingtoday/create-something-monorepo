<script lang="ts">
  import { ClearPageSection, PrivacyPolicyContent, SEO } from '@create-something/canon';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data."
  propertyName="agency"
  noindex={true}
/>

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Privacy"
  title="First-party analytics, no ad pixels."
  description="CREATE SOMETHING uses privacy-conscious measurement to understand site performance and lead quality without selling behavior or installing ad-network trackers."
>
  {#snippet after()}
    <PrivacyPolicyContent
      property="agency"
      domain="createsomething.agency"
      lastUpdated="January 29, 2026"
    />
  {/snippet}
</ClearPageSection>
