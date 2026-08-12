<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import PlaybookField from '$lib/components/PlaybookField.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const auditScenes: PerformanceNarrativeScene[] = [
    {
      id: 'questions',
      label: 'Ask',
      summary: '25 buyer questions',
      title: 'Test the questions people ask before they contact you.',
      detail:
        'We run 25 high-intent buyer questions across major AI answer surfaces and preserve the model, surface, retrieval context, and time of every response.',
      tone: 'review',
      receipts: ['one brand', 'one market', 'timestamped answers']
    },
    {
      id: 'comparison',
      label: 'Compare',
      summary: 'Your answer set in context',
      title: 'See where competitors are easier to understand.',
      detail:
        'We compare your answer set with up to three competitors and inspect whether agents can find usable pricing, proof, documentation, policies, and implementation details.',
      tone: 'neutral',
      receipts: ['answer comparison', 'source coverage', 'unsupported claims']
    },
    {
      id: 'plan',
      label: 'Prove',
      summary: 'Evidence before implementation',
      title: 'Turn the gaps into a bounded 30-day plan.',
      detail:
        'You receive cited sources, the evidence behind each gap, and a prioritized 30-day plan. The audit diagnoses the problem; it does not include implementation.',
      tone: 'allow',
      evidence: ['cited sources', 'priority and owner', '30-day sequence'],
      actions: [
        { label: 'See the service path', href: '/services' },
        { label: 'See ongoing Control', href: '/control' }
      ]
    }
  ];
</script>

<SEO
  title="AI Buyer Readiness Audit | CREATE SOMETHING"
  description="See what AI buyers understand and get wrong about your business with 25 buyer questions, cited sources, competitive context, and a prioritized 30-day plan."
  keywords="AI buyer readiness audit, AI visibility audit, answer engine readiness, cited AI answers, AI buyer questions"
  propertyName="agency"
/>

<main class="agent-readiness-page">
  <PerformanceCampaignOpening
    eyebrow="AI Buyer Readiness Audit"
    expression="editorial"
    title="See what AI buyers understand—and get wrong—about your business."
    lede="We test 25 high-intent buyer questions across major AI answer surfaces, compare the answers with up to three competitors, and inspect whether agents can find your pricing, proof, documentation, policies, and implementation details."
    density="compact"
    artifactOwnsMedia
    artifactMobilePlacement="flow"
    proof={[
      { label: 'Price', value: '$3,000 one-time' },
      { label: 'Scope', value: 'One brand · one market' },
      { label: 'Delivery', value: '7 business days' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentReadinessAuditBookingHref}>
        Book the audit
      </Button>
    {/snippet}
    {#snippet artifact()}
      <PlaybookField variant="agent-readiness" />
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="agent-readiness-audit-story"
    eyebrow="The diagnostic"
    title="Ask, compare, and prove before you rebuild anything."
    description="The audit separates answer-surface symptoms from missing business evidence, then gives each recommended change a source, priority, and owner."
    scenes={auditScenes}
    ariaLabel="AI Buyer Readiness Audit process"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <aside class="audit-record" aria-label={`${scene.label} audit record`}>
        <span>{scene.label}</span>
        <strong>{scene.summary}</strong>
        <p>{scene.detail}</p>
      </aside>
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="The boundary"
    title="Start with evidence before changing the site."
    description="The $3,000 audit diagnoses the problem; it does not include implementation. If the evidence justifies action, CREATE SOMETHING proposes a separately scoped Build. Control from $900/month after launch is available for ongoing Managed AI Operations. No guaranteed rankings, citations, or recommendations."
    handoff={{
      owner: 'Business owner',
      authority: 'Approve the 30-day plan',
      proof: 'Answers + sources + priorities',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentReadinessAuditBookingHref}>
        Book the audit
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .audit-record {
    display: grid;
    gap: 0.75rem;
    min-height: 16rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #fff);
  }

  .audit-record span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .audit-record strong {
    max-width: 24ch;
    font-size: clamp(1.35rem, 3vw, 2.1rem);
    line-height: 1.05;
  }

  .audit-record p {
    max-width: 54ch;
    margin: auto 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.6;
  }
</style>
