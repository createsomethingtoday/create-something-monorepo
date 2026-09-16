<script lang="ts">
  import { PerformancePageSection, PrivacyPolicyContent, SEO } from '@create-something/canon';
</script>

<SEO
  title="Privacy Policy"
  description="How CREATE SOMETHING collects, uses, and protects your data. We use Cloudflare only—no Google, no Meta. Session data: 7 days. Analytics: 90 days. Full control over your data."
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Privacy"
  title="First-party analytics, no ad pixels."
  description="We measure how the site works and how people find our services. We do not sell browsing behavior or install ad-network trackers."
>
  {#snippet after()}
    <PrivacyPolicyContent
      property="agency"
      domain="createsomething.agency"
      lastUpdated="January 29, 2026"
    />
  {/snippet}
</PerformancePageSection>
