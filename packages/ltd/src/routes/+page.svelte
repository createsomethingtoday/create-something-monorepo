<script lang="ts">
  import {
    Button,
    MeridianCardGrid,
    MeridianFeatureSplit,
    HeroArtifact,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceNarrativeStage,
    SEO,
    NewsletterSignup,
    PropertyFunnel,
    type PerformanceCardItem,
    type PerformanceCampaignProof,
    type PerformanceDecisionItem,
    type PerformanceNarrativeScene,
    type MeridianCard
  } from '@create-something/canon';

  const heroProofItems: PerformanceCampaignProof[] = [
    {
      label: 'Creation',
      value: 'Governed connectivity'
    },
    {
      label: 'Control',
      value: 'Policy + owner'
    },
    {
      label: 'Chassis',
      value: 'MCP boundary'
    },
    {
      label: 'Proof',
      value: 'Inspectable receipt'
    }
  ];

  const canonCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Creation moat',
      icon: 'check',
      title: 'Consumption is not the work.',
      detail:
        'Installing and using AI tools keeps getting easier. The scarce work is deciding what should connect, what should run, and what must stay governed.',
      points: [
        'MCP consumption is commoditized',
        'MCP creation still requires domain and protocol judgment',
        'The canon keeps that judgment reusable'
      ]
    },
    {
      eyebrow: 'Controlled delegation',
      icon: 'search',
      title: 'Connectivity comes before intelligence.',
      detail:
        'A useful agent needs a chassis: data access, authority boundaries, approvals, blocked states, and proof that the work stayed inside its lane.',
      points: [
        'Signal names what changed',
        'Decision routes what can happen next',
        'Proof records what actually happened'
      ]
    },
    {
      eyebrow: 'Canon',
      icon: 'arrow-right',
      title: 'Less, but better is an operating rule.',
      detail:
        'The design lineage matters because automation gets dangerous when every feature, prompt, and permission is allowed to sprawl.',
      points: [
        'Remove the ornamental claim',
        'Keep the useful constraint',
        'Reconnect every artifact to the system'
      ]
    }
  ];

  const patternCards: PerformanceCardItem[] = [
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

  const masterCards: PerformanceCardItem[] = [
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

  const canonEvidenceCards: PerformanceCardItem[] = [
    ...canonCards,
    ...patternCards,
    ...masterCards
  ];

  const decisionStates: PerformanceDecisionItem[] = [
    {
      label: 'Connect',
      summary: 'Chassis needed',
      title: 'Name the missing connection.',
      detail:
        'Start where a tool, record, tenant, workflow, or owner is still unreachable from the agent lane.',
      tone: 'allow',
      evidence: [
        'The system of record is clear',
        'The action boundary is specific',
        'The connection changes a real workflow'
      ],
      receipts: ['MCP contract', 'data shape', 'owner'],
      actions: [
        { label: 'Read Research', href: 'https://createsomething.io' },
        { label: 'Open Workbench', href: 'https://createsomething.space' }
      ]
    },
    {
      label: 'Govern',
      summary: 'Policy needed',
      title: 'Turn judgment into policy.',
      detail:
        'If a decision still depends on tacit taste, preference, or risk tolerance, it is not ready to be delegated.',
      tone: 'review',
      evidence: [
        'The allowed action is explicit',
        'The approval pause is named',
        'The stop condition is reviewable'
      ],
      receipts: ['policy artifact', 'standard', 'review gate'],
      actions: [
        { label: 'Open Standards', href: '/standards' },
        { label: 'Browse Patterns', href: '/patterns' }
      ]
    },
    {
      label: 'Prove',
      summary: 'Evidence needed',
      title: 'Leave proof another operator can trust.',
      detail:
        'The work is not finished when an agent acts. It is finished when the evidence, owner, outcome, and recovery path are inspectable.',
      tone: 'neutral',
      evidence: [
        'The receipt identifies source evidence',
        'The outcome maps back to policy',
        'The rollback or follow-up path is visible'
      ],
      receipts: ['proof record', 'handoff note', 'recovery path'],
      actions: [
        { label: 'Read Canon', href: '/canon' },
        { label: 'View All Masters', href: '/masters' },
        {
          label: 'Open Practice',
          href: 'https://createsomething.agency/practice?source=ltd&intent=policy-to-workflow&stage=qualify&lane=policy_os'
        }
      ]
    }
  ];

  const evidenceByScene: Record<string, PerformanceCardItem[]> = {
    connect: canonCards.slice(0, 2),
    govern: patternCards,
    prove: [canonCards[2], ...masterCards]
  };

  const ltdScenes: PerformanceNarrativeScene[] = decisionStates.map((item, index) => ({
    id: ['connect', 'govern', 'prove'][index],
    ...item
  }));

  const meridianMasterCards: MeridianCard[] = [
    {
      eyebrow: 'Industrial design',
      title: 'Dieter Rams',
      description:
        'A master reference for reducing the operating surface to what actually serves the person doing the work.',
      href: '/masters/dieter-rams',
      ctaLabel: 'Read the reference',
      kind: 'profile',
      tone: 'ink'
    },
    {
      eyebrow: 'Architecture',
      title: 'Ludwig Mies van der Rohe',
      description:
        'A master reference for structure, legibility, and the discipline of leaving only what needs to remain.',
      href: '/masters/mies-van-der-rohe',
      ctaLabel: 'Read the reference',
      kind: 'profile',
      tone: 'ink'
    },
    {
      eyebrow: 'Operating standard',
      title: 'Policy before prompt',
      description:
        'The reusable artifact is the governing rule a team can inspect—not a hidden instruction that only works once.',
      href: '/patterns/crystallization',
      ctaLabel: 'Open the pattern',
      kind: 'article',
      tone: 'court'
    }
  ];
</script>

<SEO
  title="The Philosophy of Automation Infrastructure"
  description="CREATE SOMETHING .ltd explains the creation moat: why governed connectivity, policy, trust boundaries, and proof matter more than simply consuming AI tools."
  keywords="automation infrastructure, delegated work control, MCP creation, policy artifacts, proof, AI governance, design canon"
  ogImage="/og-image.png"
  propertyName="ltd"
/>

<PerformanceCampaignOpening
  mobileSearchBoundary
  eyebrow="CREATE SOMETHING .ltd"
  propertyRole="Canon + operating standards"
  expression="editorial"
  title="The philosophy of automation infrastructure."
  lede="CREATE SOMETHING .ltd explains the creation moat: consuming AI tools is easy; building governed connectivity, policy, trust boundaries, and proof is the work."
  proof={heroProofItems}
  density="compact"
  artifactOwnsMedia
  artifactMobilePlacement="flow"
>
  {#snippet actions()}
    <Button
      href="https://createsomething.agency/practice?source=ltd&intent=canon-to-practice&stage=qualify&lane=policy_os"
    >See The Practice</Button
    >
    <Button href="/canon" variant="secondary">Read The Canon</Button>
  {/snippet}
  {#snippet artifact()}
    <HeroArtifact scene="ltd-canon-standard" embedded />
  {/snippet}
</PerformanceCampaignOpening>

<MeridianFeatureSplit
  eyebrow="Canon as a working field"
  title="A standard should make delegation easier to review."
  description="The philosophy becomes useful only when it changes an actual action boundary: what can connect, what needs approval, and what proof another operator can inspect."
  primaryLabel="Read the canon"
  primaryHref="/canon"
  secondaryLabel="Browse standards"
  secondaryHref="/standards"
  tags={['Connect', 'Govern', 'Prove']}
  visualLabel="Canon field"
/>

<PerformanceNarrativeStage
  id="canon-operating-story"
  expression="editorial"
  eyebrow="Delegation canon"
  title="Build, govern, prove."
  description="MCP consumption is commoditized. MCP creation is not. Each operating decision now carries its governing canon and evidence in the same focused surface."
  scenes={ltdScenes}
  ariaLabel="Delegated work control decision path"
>
  {#snippet artifact(scene: PerformanceNarrativeScene)}
    <PerformanceCardGrid
      items={evidenceByScene[scene.id] ?? canonEvidenceCards}
      columns={scene.id === 'prove' ? 3 : 2}
      ariaLabel={`${scene.label} canon and evidence`}
    />
  {/snippet}
</PerformanceNarrativeStage>

<MeridianCardGrid
  eyebrow="Sources and patterns"
  title="The people and standards behind the operating language."
  description="The licensed profile and article card treatments now point to the real references that shape CREATE SOMETHING’s canon."
  cards={meridianMasterCards}
  ariaLabel="Canon sources and operating patterns"
/>

<section class="ltd-continuation" aria-label="Canon continuation">
  <PropertyFunnel
    current="ltd"
    heading="Turn the canon into the next operating decision."
    description="The philosophy has to return to the work: .ltd names the standard, .io publishes research with receipts, .space tests runtime practice, and .agency turns a named workflow into governed delivery."
    density="compact"
  />

  <NewsletterSignup
    eyebrow="Canon letter"
    headline="Keep the canon close to the work."
    description="A quiet note when a new master, standard, or operating pattern is worth carrying into the next decision."
    actionLabel="Get the next canon note."
    submitLabel="Get the note"
    note="No noise. Just the principles, language, and artifacts that make the work easier to defend."
    source="ltd-homepage"
  />
</section>

<style>
  .ltd-continuation {
    background: var(--color-performance-panel, #ffffff);
  }

  .ltd-continuation :global(.newsletter-section) {
    padding-block: clamp(2.75rem, 5vw, 4rem);
  }
</style>
