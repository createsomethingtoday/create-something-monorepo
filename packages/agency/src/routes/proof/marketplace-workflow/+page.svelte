<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceProofStrip,
    SEO,
    type PerformanceCardItem,
    type PerformanceProofItem
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const beforeAfter: PerformanceCardItem[] = [
    {
      eyebrow: 'Before',
      icon: 'warning',
      title: 'Review logic lived across people and tools.',
      detail:
        'Submission, validation, review, approval, publishing, and monitoring each had different evidence and authority requirements.'
    },
    {
      eyebrow: 'Failure mode',
      icon: 'user',
      title: 'Operators had to reconstruct context.',
      detail:
        'A missing approval, unsupported claim, or unknown action could not safely inherit authority from the surrounding process.'
    },
    {
      eyebrow: 'After',
      icon: 'check',
      title: 'One versioned workflow becomes a testable bundle.',
      detail:
        'The compiler validates the boundary, generates linked operating artifacts, replays representative cases, and fails closed.'
    }
  ];

  const systemPath: PerformanceCardItem[] = [
    {
      eyebrow: '01 · Describe',
      icon: 'document',
      title: 'Version the workflow',
      detail: 'Name objects, events, states, owners, evidence requirements, and runtime targets.'
    },
    {
      eyebrow: '02 · Map',
      icon: 'search',
      title: 'Make authority visible',
      detail: 'Atlas-shaped contracts show which work can pass, wait for approval, or stop.'
    },
    {
      eyebrow: '03 · Compile',
      icon: 'settings',
      title: 'Generate the control package',
      detail:
        'Produce schemas, tool and agent contracts, approval surfaces, evals, receipts, and a read-only console.'
    },
    {
      eyebrow: '04 · Simulate',
      icon: 'check',
      title: 'Replay the pressure cases',
      detail:
        'Exercise passing, approval-required, blocked, insufficient-evidence, and unknown-action outcomes.'
    },
    {
      eyebrow: '05 · Pilot',
      icon: 'user',
      title: 'Keep production authority separate',
      detail:
        'The current prototype stops before deployment, external writes, approvals, publishing, or credential changes.'
    }
  ];

  const acceptanceProof: PerformanceProofItem[] = [
    { value: '15', label: 'Content-hashed generated artifacts' },
    { value: '5', label: 'Representative workflow cases' },
    { value: '3', label: 'Pass, approval-required, and blocked outcome classes' },
    { value: '2×', label: 'Clean compilations compared byte for byte' }
  ];

  const artifactGroups: PerformanceCardItem[] = [
    {
      eyebrow: 'Database',
      icon: 'folder',
      title: 'State and evidence contracts',
      detail:
        'Compiled workflow, object and event schemas, workflow map, evidence ledger, and content-hashed manifest.'
    },
    {
      eyebrow: 'Automation',
      icon: 'settings',
      title: 'Runtime and replay contracts',
      detail:
        'Runtime inventory, tool and agent contracts, transition replay, evaluation manifest, and operator console.'
    },
    {
      eyebrow: 'Judgment',
      icon: 'user',
      title: 'Authority and stop conditions',
      detail:
        'Decision inventory, autonomy classes, approval surfaces, insufficient-evidence handling, and unknown-action refusal.'
    }
  ];
</script>

<SEO
  title="Marketplace Workflow Compiler Proof | CREATE SOMETHING .agency"
  description="A complete, explicitly shadow-only Marketplace workflow example: from a versioned workflow map to compiled contracts, representative replay cases, and deterministic proof."
  keywords="workflow compiler, Marketplace workflow, Atlas workflow map, governed AI workflow, workflow proof, approval routing, deterministic replay"
  canonical="https://createsomething.agency/proof/marketplace-workflow"
  ogType="article"
  ogImage="/og-image.png"
  publishedTime="2026-07-11"
  modifiedTime="2026-07-11"
  articleSection="Workflow Proof"
  articleTags={['Workflow Compiler', 'Atlas', 'Marketplace', 'Signal Decision Proof']}
  propertyName="agency"
/>

<div class="marketplace-workflow property-performance">
  <PerformanceCampaignOpening
    eyebrow="Complete workflow · Active development"
    title="Turn a watched review queue into a testable workflow."
    lede="This worked example maps the Marketplace template lifecycle from submission through monitoring, then tests it with representative local fixtures. It runs in shadow mode only: no production writes, approvals, rejections, publishing, or credential changes."
    media={{
      src: '/images/performance-lab/trace-wake-natural.webp',
      mobileSrc: '/images/performance-lab/trace-wake-natural-mobile.webp',
      alt: 'Aerial black-and-white view of a controlled wake tracing a path through water'
    }}
    proof={[
      { label: 'Status', value: 'Prototype' },
      { label: 'Mode', value: 'Shadow only' },
      { label: 'Cases', value: '5 replayed' },
      { label: 'Writes', value: 'None' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href="/products" variant="secondary">See the product system</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformancePageSection
    variant="white"
    eyebrow="Operational change"
    title="Spend less time rebuilding context."
    description="The prototype turns a known operating path into explicit contracts and replayable decisions. These are prototype measurements, not customer ROI claims."
  >
    {#snippet after()}
      <PerformanceCardGrid
        items={beforeAfter}
        columns={3}
        ariaLabel="Marketplace workflow before and after"
      />
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="soft"
    eyebrow="System path"
    title="Describe. Map. Compile. Simulate. Pilot."
    description="Each stage narrows uncertainty without silently expanding authority. Operate begins only after a separate live-runtime, approval, rollback, and retention decision."
  >
    {#snippet after()}
      <PerformanceCardGrid
        items={systemPath}
        columns={4}
        ariaLabel="Marketplace workflow system path"
      />
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="white"
    eyebrow="Compiled package"
    title="The map produces artifacts for all three tiers."
    description="The package points to the existing systems that own live state and execution. It does not replace submission, validation, review, Policy OS, Substrate, or Atlas."
  >
    {#snippet after()}
      <PerformanceCardGrid
        items={artifactGroups}
        columns={3}
        ariaLabel="Compiled workflow artifacts"
      />
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="soft"
    eyebrow="Acceptance receipt"
    title="The same input produced the same governed bundle twice."
    description="The verifier compiles from clean directories, compares every generated file byte for byte, checks content hashes, and requires explicit outcome coverage."
  >
    {#snippet after()}
      <PerformanceProofStrip
        items={acceptanceProof}
        ariaLabel="Workflow compiler acceptance evidence"
      />
      <div class="acceptance-receipt" aria-label="Workflow compiler receipt">
        <span>CRE-1191 · workflow compiler</span>
        <strong>ok: true · deterministic: true</strong>
        <p>Pass: 1 · Approval required: 1 · Blocked: 3 · Governance complete: true</p>
        <small
          >Representative fixture evidence. No client outcome or production execution is claimed.</small
        >
      </div>
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
    eyebrow="Apply the method"
    title="Bring the handoff your team still watches by hand."
    description="Atlas can map the systems, owners, decisions, failure points, and proof requirements first. A pilot follows only when the controlled lane is clear enough to test."
    handoff={{
      owner: 'Workflow owner',
      authority: 'Separate pilot approval',
      proof: 'Map + compiled candidate + replay plan',
      state: 'review'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .acceptance-receipt {
    display: grid;
    gap: 0.62rem;
    margin-top: 1.5rem;
    padding: clamp(1.2rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
  }

  .acceptance-receipt span,
  .acceptance-receipt small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .acceptance-receipt span {
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  .acceptance-receipt strong {
    font-family: var(--font-performance-mono);
    font-size: clamp(1rem, 2vw, 1.35rem);
    font-weight: var(--font-performance-medium);
  }

  .acceptance-receipt p {
    margin: 0;
    line-height: 1.5;
  }
</style>
