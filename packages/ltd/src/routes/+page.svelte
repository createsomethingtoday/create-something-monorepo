<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearPageSection,
    ClearProofStrip,
    SEO,
    NewsletterSignup,
    PropertyFunnel,
    type ClearCardItem
  } from '@create-something/canon';

  const proofMetrics = [
    { value: 'Canon', label: 'principles that guide judgment' },
    { value: 'Masters', label: 'reference points for quality' },
    { value: 'Standards', label: 'operating rules for the work' },
    { value: 'Voice', label: 'language that keeps decisions clear' }
  ];

  const heroSignals: ClearCardItem[] = [
    {
      eyebrow: 'Principle',
      icon: 'check',
      title: 'Less, but better',
      detail: 'The canon turns taste into constraints a team can reuse.'
    },
    {
      eyebrow: 'Standard',
      icon: 'document',
      title: 'Rules before ornament',
      detail: 'Decisions should leave behind language, standards, and examples.'
    },
    {
      eyebrow: 'Handoff',
      icon: 'arrow-right',
      title: 'Philosophy into work',
      detail: 'Principles connect back into research, runtime practice, and delivery.'
    }
  ];

  const canonCards: ClearCardItem[] = [
    {
      eyebrow: 'Principle',
      icon: 'check',
      title: 'Less, but better.',
      detail:
        'Not minimalism for its own sake. When you remove the unnecessary, what remains gets stronger.',
      points: [
        'Every feature, word, and decision has to earn its place',
        'Simple takes more effort than leaving the work complicated',
        'The canon makes that effort repeatable'
      ]
    },
    {
      eyebrow: 'Question',
      icon: 'search',
      title: 'Does this belong?',
      detail:
        'Before adding another surface, pattern, or claim, the property asks whether it helps the next decision.',
      points: [
        'Reduce until the operating intent is legible',
        'Keep the useful constraint and remove the ornamental one',
        'Make judgment visible enough for another team to reuse'
      ]
    },
    {
      eyebrow: 'Application',
      icon: 'arrow-right',
      title: 'Philosophy into work',
      detail:
        'The standard only matters if it moves into research, runtime practice, and scoped delivery.',
      points: [
        'Research uses the canon to decide what evidence matters',
        'The workbench tests whether the principle survives runtime',
        'Delivery turns the decision into a controlled workflow'
      ]
    }
  ];

  const patternCards: ClearCardItem[] = [
    {
      eyebrow: 'Featured pattern',
      icon: 'settings',
      title: 'Crystallization',
      detail: 'Encode human expertise into configurable constraints that AI agents execute within.',
      points: [
        'Model routing, quality gates, and review pipelines become policy',
        'Human judgment shapes every decision without requiring constant presence',
        'The artifact is specific enough to run and clear enough to review'
      ],
      href: '/patterns/crystallization'
    },
    {
      eyebrow: 'Artifact',
      icon: 'document',
      title: 'Policy before prompt',
      detail:
        'The useful output is a reusable operating document, not another one-off instruction.',
      points: [
        'Constraints should be versioned, inspectable, and explainable',
        'Prompt language follows the policy instead of replacing it',
        'Reviewers can see what judgment was encoded'
      ]
    }
  ];

  const masterCards: ClearCardItem[] = [
    {
      eyebrow: 'Industrial design',
      icon: 'user',
      title: 'Dieter Rams',
      detail: 'Ten principles for reducing products to what serves the user and the work.',
      href: '/masters/dieter-rams'
    },
    {
      eyebrow: 'Architecture',
      icon: 'user',
      title: 'Ludwig Mies van der Rohe',
      detail: 'Less is more, applied as spatial discipline and structural clarity.',
      href: '/masters/mies-van-der-rohe'
    }
  ];

  const ecosystemCards: ClearCardItem[] = [
    {
      eyebrow: '.io',
      icon: 'document',
      title: 'Research with receipts',
      detail:
        'Reference implementations and operating notes that make a claim defensible before it becomes delivery.',
      href: 'https://createsomething.io'
    },
    {
      eyebrow: '.space',
      icon: 'settings',
      title: 'Runtime practice',
      detail:
        'Integration experiments and pattern validation before the idea becomes a documented operating rule.',
      href: 'https://createsomething.space'
    },
    {
      eyebrow: '.agency',
      icon: 'arrow-right',
      title: 'Governed workflow delivery',
      detail:
        'Custom MCP and automation work shaped by policy, controls, owners, and handoff evidence.',
      href: 'https://createsomething.agency'
    }
  ];
</script>

<SEO
  title="The Canon for Less, But Better"
  description="The philosophical foundation for Create Something. Curated wisdom from masters who embody 'less, but better.' Dieter Rams, Mies van der Rohe, and more."
  keywords="design principles, less but better, Dieter Rams, minimalism, good design, design philosophy, systems thinking"
  ogImage="/og-image.svg"
  propertyName="ltd"
/>

<ClearPageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow="CREATE SOMETHING .ltd"
  title="A canon for decisions that earn their place."
  description="CREATE SOMETHING .ltd turns philosophy, standards, voice, and patterns into practical judgment for building less, but better."
>
  {#snippet actions()}
    <Button href="/masters">Meet The Masters</Button>
    <Button href="/ethos" variant="secondary">Read The Ethos</Button>
  {/snippet}

  <p class="clear-note">Principles, standards, and language for work that has to hold up.</p>

  {#snippet aside()}
    <ClearCardGrid
      items={heroSignals}
      columns={1}
      density="compact"
      ariaLabel="Canon operating signals"
    />
  {/snippet}

  {#snippet after()}
    <ClearProofStrip items={proofMetrics} ariaLabel="Canon proof artifacts" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Operating canon"
  title="Weniger, aber besser."
  description="Less, but better is the rule for how CREATE SOMETHING evaluates research, design experiments, and delivery work. The canon exists so that judgment can travel."
>
  {#snippet after()}
    <ClearCardGrid items={canonCards} columns={3} ariaLabel="Canon operating principles" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Featured pattern"
  title="Crystallization turns judgment into an operating artifact."
  description="The strongest ideas in the canon are not decorative. They become constraints, quality gates, routing decisions, and review paths."
>
  {#snippet after()}
    <ClearCardGrid items={patternCards} columns={2} ariaLabel="Crystallization pattern details" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Featured masters"
  title="Reference points for quality."
  description="The masters are not there for nostalgia. They give the work a higher bar for restraint, legibility, and usefulness."
>
  {#snippet actions()}
    <Button href="/masters" variant="secondary">View All Masters</Button>
  {/snippet}

  {#snippet after()}
    <ClearCardGrid items={masterCards} columns={2} ariaLabel="Featured masters" />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Creation moat"
  title="MCP consumption is commoditized. MCP creation is not."
  description="The canon names the standard, the research documents the evidence, the workbench tests the runtime, and the agency turns the fit into governed workflow delivery."
>
  {#snippet after()}
    <ClearCardGrid
      items={ecosystemCards}
      columns={3}
      ariaLabel="CREATE SOMETHING property system"
    />
  {/snippet}
</ClearPageSection>

<PropertyFunnel
  current="ltd"
  heading="Turn the canon into the next operating decision."
  description="Start with the principles, read the research when the claim needs evidence, use the workbench when it needs runtime proof, and book a mapping session when it belongs in the business."
/>

<!-- Newsletter CTA -->
<NewsletterSignup
  eyebrow="Canon letter"
  headline="Keep the canon close to the work."
  description="A quiet note when a new master, standard, or operating pattern is worth carrying into the next decision."
  actionLabel="Get the next canon note."
  submitLabel="Get the note"
  note="No noise. Just the principles, language, and artifacts that make the work easier to defend."
  source="ltd-homepage"
/>

<style>
  .clear-note {
    margin: 0;
    max-width: 36rem;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.55;
  }
</style>
