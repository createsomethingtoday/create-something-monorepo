<script lang="ts">
  import {
    Button,
    MeridianAccordion,
    MeridianEvidenceCarousel,
    MeridianMetrics,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type MeridianEvidence,
    type PerformanceCampaignProof,
    type PerformanceFieldStudyMetric,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import type { MotionIntent } from '@create-something/canon/motion';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import AdoptionPathChooser from '$lib/components/AdoptionPathChooser.svelte';
  import IntegrationCompatibilityRail from '$lib/components/IntegrationCompatibilityRail.svelte';
  import PublicSubstrateCanvas from '$lib/components/PublicSubstrateCanvas.svelte';
  import { templateReviewFieldReport } from '$lib/data/fieldReports';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia, playbookHomeHeroMedia } from '$lib/data/playbookHeroMedia';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const services = [
    {
      name: 'Map',
      description:
        'A fixed first map of the workflow, systems, AI tasks, approval path, and first controlled pilot.',
      type: 'First workflow map',
      price: PUBLIC_PRICING.map.publicStarterLabel,
      priceDescription: PUBLIC_PRICING.map.workspaceLabel
    },
    {
      name: 'Build',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing care for live AI-assisted work: approvals, release checks, blocked states, recovery notes, and review rhythm.',
      type: 'Operating Plan',
      price: PUBLIC_PRICING.managedControl.label,
      priceDescription: 'Managed Control after launch'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Cross-system control for regulated, high-volume, or multi-team workflows where auditability and recovery matter.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const faqItems = [
    {
      question: 'What does CREATE SOMETHING build?',
      answer:
        'CREATE SOMETHING builds operating systems for AI work in business operations. Each system makes one business workflow safe to delegate. Signals show what changed. Decisions reach the right person or agent. Proof records what happened.'
    },
    {
      question: 'What makes a workflow reliable?',
      answer:
        'A workflow becomes reliable when the team can see which signals matter, who decides, what can run, what must stop, and what proof stays visible.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'The work starts with one messy handoff your team wants to delegate, then maps the first controlled pilot before expanding automation.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'Clients leave with a visible workflow map, connected-system plan, approval path, run/wait/stop states, and an audit trail the team can inspect.'
    }
  ];

  const operatorEvidence: MeridianEvidence[] = [
    {
      eyebrow: 'Upstream contribution',
      title: 'We improve the infrastructure we rely on.',
      detail:
        'A reliability fix merged into CTX. Credited security work merged into OpenAI Codex Security and shipped in version 0.1.9.',
      source: 'Inspect the contribution receipts',
      href: '/field-reports/upstream-contributions'
    },
    {
      eyebrow: 'Field report',
      title: 'A workflow map makes the decision boundary visible before automation begins.',
      detail:
        'The field report keeps the working constraint, the approval path, and the evidence trail together so the next operator can understand what advanced and what stayed blocked.',
      source: 'Read the Marketplace workflow',
      href: '/proof/marketplace-workflow'
    },
    {
      eyebrow: 'Control record',
      title: 'One named owner is more useful than another implicit handoff.',
      detail:
        'A shared Playbook makes the route, decision gate, and recovery note explicit instead of asking an operator to reconstruct context from scattered tools.',
      source: 'See the delivery path',
      href: '/services'
    },
    {
      eyebrow: 'System boundary',
      title: 'The result is an operating artifact, not a dependency on our team.',
      detail:
        'The map, rules, runbook, history, and recovery plan remain with the client so an AI or infrastructure change does not erase the operating knowledge.',
      source: 'Inspect the ownership model',
      href: '/stack'
    }
  ];

  const heroProofItems: PerformanceCampaignProof[] = [
    {
      label: 'Signal',
      value: 'One queue'
    },
    {
      label: 'Decision',
      value: 'Named owner'
    },
    {
      label: 'Control',
      value: 'Run / Wait / Stop'
    },
    {
      label: 'Proof',
      value: 'Attached receipt'
    }
  ];

  const serviceFlowSteps = [
    {
      id: 'signal',
      eyebrow: '01 Offense',
      title: 'Advance approved work',
      detail:
        'Known signals move through the route your team approved, so routine work does not wait for manual follow-up.',
      proof: 'approved signal · allowed action · named route'
    },
    {
      id: 'decision',
      eyebrow: '02 Defense',
      title: 'Protect the decision',
      detail:
        'Ambiguity, AI limits, and untrusted automation reach a named owner or stop with a reason.',
      proof: 'owner · gate · stop reason · recovery path'
    },
    {
      id: 'proof',
      eyebrow: '03 Proof',
      title: 'Review the receipt',
      detail:
        'Every important run keeps its source, rule, decision, result, and recovery record together.',
      proof: 'source · rule · decision · result · recovery'
    }
  ] as const;

  const flowStudyMetrics: PerformanceFieldStudyMetric[] = [
    {
      label: 'Shared Playbook',
      value: '1 owned system',
      detail: 'Map one workflow first, then keep its rules and runbook together.'
    },
    {
      label: 'Offense',
      value: 'Approved work advances',
      detail: 'Known signals use a route your team accepted.'
    },
    {
      label: 'Defense',
      value: 'Owner / gate / stop',
      detail: 'Your team decides what can run, what needs approval, and what must stop.'
    }
  ];

  const flowStudyReceipt = {
    id: 'PB-02 / HANDOFF',
    owner: 'Client team',
    state: 'CLIENT-OWNED',
    evidence: 'Owner + gate + receipt'
  };

  const operatorOutcomes = [
    {
      state: 'Before',
      title: 'Every AI handoff becomes a new exception.',
      detail: 'Routine work waits across tools, and a person has to rebuild missing context.'
    },
    {
      state: 'After',
      title: 'Your team runs a client-owned Playbook.',
      detail:
        'Approved work advances. Exceptions reach a named owner. Every action leaves a record your team can review.'
    }
  ] as const;

  const agencyScenes: PerformanceNarrativeScene[] = [
    {
      id: 'map',
      label: 'Map',
      summary: 'The play is named',
      title: 'Map the play before AI runs it.',
      detail:
        'Map shows where work starts, what the agent may do, and where a person must approve. It also names the owner, source, decision gate, and proof required before AI gets access.',
      tone: 'review',
      actions: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      id: 'build',
      label: 'Build',
      summary: 'The route is installed',
      title: 'Build the operating path your team approves.',
      detail:
        'We connect the tools, agent, and rules that serve the play. Unapproved access stays out of the route.',
      tone: 'allow',
      evidence: [
        'One view shows systems, owners, and allowed actions',
        'Agent tasks and human approvals have clear limits',
        'Your team inspects the first test before a live run'
      ],
      receipts: ['workflow map', 'approved route', 'runbook'],
      actions: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      id: 'control',
      label: 'Control',
      summary: 'Offense + defense',
      title: 'Advance approved work. Protect every decision.',
      detail:
        'Offense moves known work. Defense routes ambiguity to a person, stops unsafe action, and keeps proof attached.',
      tone: 'neutral',
      evidence: [
        'Each request stays connected to its decision and receipt',
        'The system cannot make the final decision; the field report names what passed and stayed blocked',
        'Your team keeps the data, rules, tests, history, and recovery path'
      ],
      receipts: ['workflow map', templateReviewFieldReport.id, 'recovery path']
    }
  ];

  const agencyOperatingStoryMotion: MotionIntent = {
    version: 1,
    id: 'agency-operating-story-v1',
    event: 'agency.operating-story.scene.selected',
    interruption: 'replace',
    reducedMotion: 'settle-immediately',
    stages: [
      {
        id: 'map-boundary-visible',
        label: 'Map',
        intent: 'apply',
        target: 'agency-operating-story.map',
        durationMs: 220,
        channels: ['opacity', 'transform'],
        colorRole: 'performance.signal',
        announce: 'Map boundary selected.'
      },
      {
        id: 'build-route-installed',
        label: 'Build',
        intent: 'update',
        target: 'agency-operating-story.build',
        durationMs: 260,
        channels: ['opacity', 'transform'],
        colorRole: 'performance.growth',
        announce: 'Build route selected.'
      },
      {
        id: 'control-receipt-settled',
        label: 'Control',
        intent: 'settle',
        target: 'agency-operating-story.control',
        durationMs: 300,
        channels: ['opacity', 'transform'],
        colorRole: 'performance.gold',
        announce: 'Control record selected.'
      }
    ]
  };
</script>

<SEO
  title="AI Operating Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING maps one business workflow, marks what can run, names where people decide, and attaches proof to every important action."
  keywords="AI operating systems, AI workflow systems, workflow automation consultant, governed AI workflows, workflow control layer, workflow mapping, workflow pilot, production automation, technical operators"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING .agency"
    propertyRole="Embedded AI operating partner"
    expression="editorial"
    title="Your people and AI need the same playbook."
    lede="We embed with operators to map one workflow, install its AI infrastructure, and hand back a client-owned Playbook. Offense advances approved work. Defense protects decisions, proof, and recovery. The opposition is ambiguity, AI out of reach, and untrusted automation."
    media={playbookHomeHeroMedia}
    proof={heroProofItems}
    density="compact"
    mediaMobilePlacement="background"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary"
        >See the Marketplace workflow</Button
      >
    {/snippet}
  </PerformanceCampaignOpening>

  <AgencyPerformanceReadback />

  <MeridianMetrics
    eyebrow="Scoreboard"
    title="A shared play is a control surface."
    metrics={[
      { value: '1', label: 'workflow first', detail: 'Start with the handoff that matters.' },
      { value: '3', label: 'run states', detail: 'Every run, wait, or stop stays explicit.' },
      { value: '1', label: 'owned Playbook', detail: 'Your team keeps the working system.' }
    ]}
  />

  <PerformanceNarrativeStage
    id="agency-operating-story"
    expression="editorial"
    eyebrow="One shared Playbook"
    title="Map the play. Build the system. Keep control."
    description="We work beside an operator to map one workflow and install its AI infrastructure. Your team decides what can run, what needs approval, and what must stop. Your team keeps a Playbook it can inspect, run, stop, recover, and review with proof."
    scenes={agencyScenes}
    motionIntent={agencyOperatingStoryMotion}
    ariaLabel="Shared Playbook delivery story"
    density="compact"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'map'}
        <article class="boundary-study" aria-label="Shared Playbook: Map, Build, Control">
          <div class="boundary-study__field boundary-study__field--media">
            <picture class="boundary-study__media">
              {#if playbookHeroMedia.map.mobileSrc}
                <source media="(max-width: 47.99rem)" srcset={playbookHeroMedia.map.mobileSrc} />
              {/if}
              <img
                src={playbookHeroMedia.map.src}
                alt={playbookHeroMedia.map.alt}
                width={playbookHeroMedia.map.width}
                height={playbookHeroMedia.map.height}
                loading="lazy"
                decoding="async"
                data-campaign-media="home-map-narrative"
              />
            </picture>
          </div>
          <div class="boundary-study__body">
            <div
              class="boundary-study__outcomes"
              aria-label="Workflow before and after controlled delegation"
            >
              {#each operatorOutcomes as outcome}
                <article class="operator-outcome operator-outcome--{outcome.state.toLowerCase()}">
                  <span>{outcome.state}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.detail}</p>
                </article>
              {/each}
            </div>
            <dl class="boundary-study__metrics">
              {#each flowStudyMetrics as metric}
                <div>
                  <dt>{metric.label}</dt>
                  <dd><strong>{metric.value}</strong><span>{metric.detail}</span></dd>
                </div>
              {/each}
            </dl>
            <dl class="boundary-study__receipt" aria-label="Boundary study receipt">
              <div>
                <dt>Receipt</dt>
                <dd>{flowStudyReceipt.id}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{flowStudyReceipt.owner}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{flowStudyReceipt.state}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{flowStudyReceipt.evidence}</dd>
              </div>
            </dl>
          </div>
        </article>
      {:else if scene.id === 'build'}
        <div class="agency-stage-map" aria-label="Build the workflow system">
          <PublicSubstrateCanvas />
        </div>
      {:else}
        <div class="service-flow-artifacts" aria-label="CREATE SOMETHING service flow">
          {#each serviceFlowSteps as step}
            <article class="service-flow-artifact service-flow-artifact--{step.id}">
              <div class="service-flow-artifact__visual">
                <PerformanceWorkflowMiniArtifact kind={step.id} />
              </div>
              <div class="service-flow-artifact__copy">
                <span>{step.eyebrow}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                <small>{step.proof}</small>
              </div>
            </article>
          {/each}
        </div>
        <div class="service-flow-action">
          <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
          <p>
            See the <a href="/services">service path</a>, the <a href="/partners">tools we use</a>,
            the <a href="/products">product surfaces</a>, or the
            <a href="/field-reports/template-review">Marketplace field report</a>.
          </p>
        </div>
        <aside class="ownership-callout">
          <span>How we build</span>
          <h3>Built with OpenAI and Cloudflare. Designed to remain yours.</h3>
          <p>
            CREATE SOMETHING owns the system. OpenAI provides intelligence. Cloudflare provides
            infrastructure. We use OpenAI Codex to map, build, and maintain the workflow. Your team
            keeps the map, rules, history, and recovery path. If the model or agent environment
            changes, the system does not have to start over.
          </p>
          <div>
            <a href="/stack">See what you keep</a>
            <a href="https://createsomething.ltd/canon/concepts/conviction-without-dependence"
              >Why we build this way</a
            >
          </div>
        </aside>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <details class="home-mobile-supporting-record">
    <summary>
      <span>Supporting record</span>
      <strong>Inspect the supporting record</strong>
      <small>Delivery paths, proof, ownership, and tools</small>
    </summary>
    <div class="home-mobile-supporting-record__body">
      <p>
        The first choice does not need every detail. Use the record when you want to inspect the
        delivery path, proof, or system boundary before you start a map.
      </p>
      <div class="home-mobile-supporting-record__links">
        <a href="/proof/marketplace-workflow">
          <span>Proof</span><strong>Marketplace field report</strong><small
            >See the measured result</small
          >
        </a>
        <a href="/services">
          <span>Method</span><strong>Delivery path</strong><small
            >See how Map, Build, and Control work</small
          >
        </a>
        <a href="/stack">
          <span>Boundary</span><strong>Ownership boundary</strong><small
            >See what your team keeps</small
          >
        </a>
        <a href="/partners">
          <span>Tools</span><strong>Tool directory</strong><small
            >Inspect the available connector paths</small
          >
        </a>
      </div>
    </div>
  </details>

  <div class="home-supporting-record__deferred home-supporting-record__deferred--early">
    <MeridianEvidenceCarousel
      eyebrow="Operator proof"
      title="Evidence replaces borrowed testimonials."
      description="The licensed testimonial treatment now carries inspectable operating evidence rather than made-up praise."
      itemsPerView={2}
      items={operatorEvidence}
    />
  </div>

  <AdoptionPathChooser />

  <div class="home-supporting-record__deferred home-supporting-record__deferred--late">
    <IntegrationCompatibilityRail surface="homepage" />

    <MeridianAccordion
      eyebrow="Playbook questions"
      title="What the first workflow changes."
      description="A direct answer before a mapping session is more useful than a vague assurance."
      items={faqItems}
      openFirst={true}
    />
  </div>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a workflow map and proof plan. If the map does not show a useful controlled pilot, the work stops there; if it does, the first build has a clear delegation boundary."
    handoff={{
      owner: 'CREATE SOMETHING',
      authority: 'Operator approval',
      proof: 'Workflow map + proof plan',
      state: 'ready'
    }}
    artifactPlacement="sidecar"
    density="concise"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
    {#snippet aside()}<HeroTrustArtifact />{/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .home-pilot {
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .home-mobile-supporting-record {
    display: none;
  }

  .boundary-study {
    display: grid;
    grid-template-columns: minmax(18rem, 0.86fr) minmax(0, 1.14fr);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .boundary-study__field {
    display: grid;
    align-content: center;
    margin: 0;
    min-width: 0;
    padding: 1rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-ink, #090909);
  }

  .boundary-study__field--media {
    display: flex;
    padding: 0;
    overflow: hidden;
  }

  .boundary-study__media {
    display: block;
    flex: 1;
    min-width: 0;
  }

  .boundary-study__media img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 82% center;
  }

  .boundary-study__body {
    display: grid;
    align-content: start;
    min-width: 0;
  }

  .boundary-study__outcomes,
  .boundary-study__metrics,
  .boundary-study__receipt {
    margin: 0;
  }

  .boundary-study :is(dt, small) {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .ownership-callout :is(h3, p) {
    margin: 0;
  }

  .boundary-study__metrics span {
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.45;
  }

  .boundary-study__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__metrics > div {
    display: grid;
    gap: 0.4rem;
    padding: 0.85rem;
  }

  .boundary-study__metrics > div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__metrics dd {
    display: grid;
    gap: 0.25rem;
    margin: 0;
  }

  .boundary-study__receipt {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__receipt div {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem 0.85rem;
  }

  .boundary-study__receipt div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__receipt dd {
    margin: 0;
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }

  .boundary-study__outcomes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operator-outcome {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 0.9rem;
  }

  .operator-outcome + .operator-outcome {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .operator-outcome span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  .operator-outcome h3,
  .operator-outcome p {
    margin: 0;
  }

  .operator-outcome h3 {
    max-width: 22ch;
    font-size: clamp(1.05rem, 1.8vw, 1.35rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.1;
  }

  .operator-outcome p {
    max-width: 34rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.82rem;
    line-height: 1.42;
  }

  .service-flow-artifacts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact {
    display: grid;
    grid-template-rows: 5.5rem minmax(0, 1fr);
    gap: 0.9rem;
    min-height: 17rem;
    padding: 1rem;
  }

  .service-flow-artifact + .service-flow-artifact {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact__visual {
    display: grid;
    align-items: center;
    justify-items: center;
    min-width: 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact__copy {
    display: grid;
    align-content: start;
    gap: 0.58rem;
    max-width: 31rem;
  }

  .service-flow-artifact__copy span,
  .service-flow-artifact__copy small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.32;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .service-flow-artifact__copy h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: 1.12rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.18;
  }

  .service-flow-artifact__copy p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .service-flow-artifact__copy small {
    display: block;
    margin-top: 0.32rem;
    color: var(--color-performance-ink, #090909);
    text-transform: none;
  }

  .service-flow-action {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem 1.1rem;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.4rem;
    padding-top: 1.2rem;
  }

  .service-flow-action p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .service-flow-action a {
    color: var(--color-performance-ink, #090909);
    text-underline-offset: 0.18em;
  }

  .ownership-callout {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    margin-top: 1.25rem;
    padding: 1.25rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
  }

  .ownership-callout > span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .ownership-callout h3 {
    font-size: 1.2rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.15;
  }

  .ownership-callout p {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .ownership-callout div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .ownership-callout a {
    color: var(--color-performance-ink, #090909);
    font-size: 0.88rem;
    font-weight: var(--font-performance-semibold);
    text-underline-offset: 0.18em;
  }

  @media (min-width: 640.01px) {
    .home-supporting-record__deferred {
      display: contents;
    }
  }

  @media (max-width: 980px) {
    .boundary-study {
      grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.2fr);
    }

    .boundary-study__field {
      padding: 0.8rem;
    }

    .boundary-study__field--media {
      padding: 0;
    }

    .boundary-study__media img {
      object-position: 60% center;
    }
  }

  @media (max-width: 640px) {
    .home-supporting-record__deferred {
      display: none;
    }

    .home-mobile-supporting-record {
      display: grid;
      margin: 1.25rem var(--space-performance-page-gutter, 1rem);
      border: 1px solid var(--color-performance-line, #d7d7d2);
      background: var(--color-performance-paper, #f3f3f0);
    }

    .home-mobile-supporting-record summary {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.3rem 1rem;
      align-items: center;
      min-height: var(--height-performance-control-min, 2.75rem);
      padding: 0.9rem;
      color: var(--color-performance-ink, #090909);
      cursor: pointer;
      list-style: none;
    }

    .home-mobile-supporting-record summary::-webkit-details-marker {
      display: none;
    }

    .home-mobile-supporting-record summary::after {
      grid-column: 2;
      grid-row: 1 / span 3;
      color: var(--color-performance-muted, #5e6268);
      content: '+';
      font-family: var(--font-performance-mono);
      font-size: 1.2rem;
    }

    .home-mobile-supporting-record[open] summary::after {
      content: '−';
    }

    .home-mobile-supporting-record summary > span,
    .home-mobile-supporting-record__links span {
      color: var(--color-performance-muted, #5e6268);
      font-family: var(--font-performance-mono);
      font-size: 0.68rem;
      font-weight: var(--font-performance-semibold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .home-mobile-supporting-record summary strong {
      grid-column: 1;
      font-size: 1.05rem;
      font-weight: var(--font-performance-medium);
      line-height: 1.15;
    }

    .home-mobile-supporting-record summary small {
      grid-column: 1;
      color: var(--color-performance-muted, #5e6268);
      font-size: 0.8rem;
      line-height: 1.35;
    }

    .home-mobile-supporting-record__body {
      display: grid;
      gap: 0.9rem;
      padding: 0 0.9rem 0.9rem;
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .home-mobile-supporting-record__body > p {
      margin: 0;
      color: var(--color-performance-muted, #5e6268);
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .home-mobile-supporting-record__links {
      display: grid;
      border: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .home-mobile-supporting-record__links a {
      display: grid;
      gap: 0.2rem;
      min-height: var(--height-performance-control-min, 2.75rem);
      padding: 0.75rem;
      color: var(--color-performance-ink, #090909);
      text-decoration: none;
    }

    .home-mobile-supporting-record__links a + a {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .home-mobile-supporting-record__links strong {
      font-size: 0.98rem;
      font-weight: var(--font-performance-medium);
      line-height: 1.2;
    }

    .home-mobile-supporting-record__links small {
      color: var(--color-performance-muted, #5e6268);
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .boundary-study__outcomes {
      grid-template-columns: 1fr;
    }

    .operator-outcome + .operator-outcome {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .operator-outcome {
      min-height: 0;
    }

    .boundary-study {
      grid-template-columns: 1fr;
    }

    .boundary-study__field {
      display: block;
      grid-row: auto;
      min-height: 0;
      padding: 0.65rem;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .boundary-study__field--media {
      display: block;
      padding: 0;
    }

    .boundary-study__media {
      aspect-ratio: 3 / 2;
    }

    .boundary-study__media img {
      object-position: center;
    }

    .boundary-study__metrics {
      grid-template-columns: 1fr;
    }

    .boundary-study__metrics > div + div {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .boundary-study__metrics > div {
      grid-template-columns: 6.5rem minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
    }

    .boundary-study__receipt {
      grid-template-columns: 1fr 1fr;
    }

    .boundary-study__receipt div:nth-child(3) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .boundary-study__receipt div:nth-child(4) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .service-flow-artifacts {
      grid-template-columns: 1fr;
      border-bottom: 0;
    }

    .service-flow-artifact {
      grid-template-columns: 1fr;
      grid-template-rows: none;
      gap: 0;
      min-height: 0;
      padding: 1rem 0;
    }

    .service-flow-artifact__visual {
      display: none;
    }

    .service-flow-artifact + .service-flow-artifact {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .service-flow-action {
      align-items: stretch;
    }

    .service-flow-action :global(.btn) {
      width: 100%;
      justify-content: center;
    }
  }
</style>
