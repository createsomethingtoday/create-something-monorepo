<script lang="ts">
  import { Button, PerformancePageSection, SEO } from '@create-something/canon';
</script>

<SEO
  title="Stack Boundary | CREATE SOMETHING .agency"
  description="CREATE SOMETHING uses Substrate as its owned database and operator layer, with OpenAI, Dify, and Cloudflare as the active external stack."
  propertyName="agency"
  noindex={true}
/>

<PerformancePageSection
  variant="hero"
  layout="stack"
  titleLevel="h1"
  eyebrow="Stack update"
  title="The operating layer has moved to Substrate."
  description="Substrate now holds workflow state, operator review, decisions, and evidence. The current external stack is OpenAI, Dify, and Cloudflare."
>
  {#snippet actions()}
    <Button href="/stack">See the current stack</Button>
  {/snippet}
</PerformancePageSection>
