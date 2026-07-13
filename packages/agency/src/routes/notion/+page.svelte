<script lang="ts">
  import { Button, PerformancePageSection, SEO } from '@create-something/canon';
</script>

<SEO
  title="Stack Boundary | CREATE SOMETHING .agency"
  description="Historical Notion compatibility has moved behind the CREATE SOMETHING-owned system, with Cloudflare infrastructure and OpenAI intelligence as the primary runtime boundary."
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  layout="stack"
  titleLevel="h1"
  eyebrow="Stack update"
  title="Notion is no longer part of the CREATE SOMETHING operating stack."
  description="CREATE SOMETHING owns the system. Cloudflare provides infrastructure. OpenAI provides intelligence. Existing Notion material remains only as client compatibility or historical evidence."
>
  {#snippet actions()}
    <Button href="/stack">See the current stack</Button>
  {/snippet}
</PerformancePageSection>
