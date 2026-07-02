<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearDecisionPanel,
    ClearPageSection,
    ClearPlatformHero,
    ClearStateRows,
    SEO,
    NewsletterSignup,
    PropertyFunnel,
    type ClearCardItem,
    type ClearDecisionItem,
    type ClearPlatformHeroMeta,
    type ClearPlatformHeroProof,
    type ClearWorkflowState
  } from '@create-something/canon';

  const heroProofItems: ClearPlatformHeroProof[] = [
    {
      value: 'Creation',
      label: 'The moat is building governed connectivity, not consuming AI tools.'
    },
    {
      value: 'Control',
      label: 'Delegated work needs owners, approvals, stop points, and policy.'
    },
    {
      value: 'Chassis',
      label: 'MCP gives agents a controlled frame for touching real systems.'
    },
    {
      value: 'Proof',
      label: 'Every useful action leaves evidence another operator can inspect.'
    }
  ];

  const heroMetaItems: ClearPlatformHeroMeta[] = [
    { label: 'Property role', value: 'Philosophy layer' },
    { label: 'Category', value: 'Delegated Work Control' },
    { label: 'Method', value: 'Less, but better' }
  ];

  const creationStates: ClearWorkflowState[] = [
    {
      tone: 'run',
      state: 'Build',
      label: 'Create the connection',
      detail: 'Name the tool boundary, system owner, data shape, and action that should exist.'
    },
    {
      tone: 'wait',
      state: 'Govern',
      label: 'Encode the judgment',
      detail: 'Turn taste, risk, and approval rules into policy artifacts an agent can follow.'
    },
    {
      tone: 'stop',
      state: 'Prove',
      label: 'Leave the receipt',
      detail: 'Keep the evidence, owner, outcome, and recovery path visible after the work runs.'
    }
  ];

  const canonCards: ClearCardItem[] = [
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

  const decisionStates: ClearDecisionItem[] = [
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
        { label: 'Map Workflow', href: 'https://createsomething.agency/book?source=ltd&intent=policy-to-workflow&lane=policy_os' }
      ]
    }
  ];
</script>

<SEO
  title="The Philosophy of Automation Infrastructure"
  description="CREATE SOMETHING .ltd explains the creation moat: why governed connectivity, policy, trust boundaries, and proof matter more than simply consuming AI tools."
  keywords="automation infrastructure, delegated work control, MCP creation, policy artifacts, proof, AI governance, design canon"
  ogImage="/og-image.svg"
  propertyName="ltd"
/>

<ClearPlatformHero
  eyebrow="CREATE SOMETHING .ltd"
  title="The philosophy of automation infrastructure."
  description="CREATE SOMETHING .ltd explains the creation moat: consuming AI tools is easy; building governed connectivity, policy, trust boundaries, and proof is the work."
  proofItems={heroProofItems}
  metaItems={heroMetaItems}
  ariaLabel="CREATE SOMETHING .ltd philosophy overview"
>
  {#snippet actions()}
    <Button href="/canon">Read The Canon</Button>
    <Button href="/standards" variant="secondary">Open Standards</Button>
  {/snippet}

  {#snippet aside()}
    <ClearStateRows
      eyebrow="Creation loop"
      title="Build, govern, prove"
      states={creationStates}
      receiptLabel="Operating receipts"
      receipts={['MCP boundary', 'policy artifact', 'proof trail']}
      ariaLabel="Automation infrastructure creation loop"
    />
  {/snippet}
</ClearPlatformHero>

<ClearDecisionPanel
  id="canon-decision"
  eyebrow="Delegation canon"
  title="Creation starts where consumption stops."
  description="The canon helps decide whether the next useful move is a connection, a policy, or proof that the delegated work stayed inside its lane."
  items={decisionStates}
  ariaLabel="Delegated work control decision path"
/>

<ClearPageSection
  variant="white"
  eyebrow="Operating thesis"
  title="MCP consumption is commoditized. MCP creation is not."
  description="The entry point to automation is connectivity, not intelligence. The canon names the discipline required to build that connectivity without losing control."
>
  {#snippet after()}
    <ClearCardGrid items={canonCards} columns={3} ariaLabel="Automation infrastructure principles" />
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
  title="Reference points for restraint."
  description="Rams, Mies, and the canon matter because governed automation needs fewer vague affordances and more decisions that earn their place."
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
  eyebrow="Property loop"
  title="The philosophy has to return to the work."
  description=".ltd names the standard, .io documents the evidence, .space tests the runtime, and .agency turns the fit into governed workflow delivery."
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
  description="Start with the philosophy, read the research when the claim needs evidence, use the workbench when it needs runtime proof, and book a mapping session when it belongs in the business."
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
