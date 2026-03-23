<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    AnimatedGridPattern,
    BlurFade,
    ShimmerButton
  } from '@create-something/canon/magicui';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  // Structured data for SEO/AEO
  const services = [
    {
      name: 'Workflow Mapping Session',
      description:
        'A diagnostic session that maps handoffs, approval boundaries, failure modes, and the right implementation path.',
      type: 'Diagnostic Session',
      price: 'Scoped',
      priceDescription: 'Booked directly'
    },
    {
      name: 'Qualified MCP Hub Pilot',
      description:
        'A constrained pilot for one narrow workflow with clear ownership, manageable risk, and a defined checkpoint.',
      type: 'Qualified Pilot',
      price: 'Qualified',
      priceDescription: 'Review required'
    },
    {
      name: 'Policy OS',
      description:
        'The governed execution layer: approvals, blocked states, release checks, and incident loops once the workflow touches revenue, trust, or compliance.',
      type: 'Governed Execution Retainer',
      price: 'Custom',
      priceDescription: 'Monthly governed execution layer'
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

  const heroSignals = [
    {
      step: '01',
      title: 'Trusted Connectivity',
      copy: 'Custom MCP servers keep your data secure and control exactly what AI can see or touch.'
    },
    {
      step: '02',
      title: 'Governed Execution',
      copy: 'Agent skills that follow strict runbooks. Safe actions clear automatically; high-risk edge cases wait for your approval.'
    },
    {
      step: '03',
      title: 'Guaranteed Outcomes',
      copy: 'Production-grade infrastructure anchored by regression checks and monthly tuning.'
    }
  ];

</script>

<!-- SVG Icon Snippets -->
{#snippet createSomethingLogo()}
  <svg viewBox="0 0 32 32" fill="none">
    <path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" fill="currentColor" fill-opacity="1" />
    <path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" fill="currentColor" fill-opacity="0.6" />
    <path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" fill="currentColor" fill-opacity="0.3" />
  </svg>
{/snippet}

{#snippet salesforceIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 4C8.5 4 5.4 6.1 4.1 9.1c-2.1.5-3.6 2.4-3.6 4.6 0 2.6 2.1 4.8 4.8 4.8h13.4c2.1 0 3.8-1.7 3.8-3.8 0-1.9-1.4-3.5-3.2-3.8C18.8 7.1 15.7 4 12 4z"
    />
  </svg>
{/snippet}

{#snippet aiIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
  </svg>
{/snippet}

{#snippet slackIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zM7 15a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zM9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zM9 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zM18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9zM17 9a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zM15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zM15 17a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"
    />
  </svg>
{/snippet}

{#snippet notionIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.718 1.321l13.496-.933c1.635-.14 2.055-.047 3.08.7l4.296 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.127-4.06c-.56-.746-.793-1.306-.793-1.958V2.948c0-.84.373-1.54 1.215-1.627z"
    />
  </svg>
{/snippet}

{#snippet githubIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
    />
  </svg>
{/snippet}

{#snippet hubspotIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978V3.07A2.182 2.182 0 0017.25.89h-.036a2.182 2.182 0 00-2.181 2.18v.036c0 .859.503 1.598 1.227 1.955v2.868a5.637 5.637 0 00-2.465 1.168l-6.57-5.084a2.489 2.489 0 00.07-.576 2.478 2.478 0 10-2.477 2.478c.391 0 .756-.102 1.082-.27l6.427 4.974a5.635 5.635 0 00-.636 2.598c0 .974.253 1.888.69 2.69l-2.076 2.077a1.927 1.927 0 00-.593-.102 1.96 1.96 0 101.96 1.96c0-.21-.04-.408-.103-.593l2.026-2.026a5.668 5.668 0 103.569-10.313zm-.95 8.477a2.92 2.92 0 110-5.84 2.92 2.92 0 010 5.84z"
    />
  </svg>
{/snippet}

{#snippet zapierIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M15.477 12.89l2.648-4.588a.691.691 0 00-.598-1.036h-5.296a.691.691 0 00-.598 1.036l2.648 4.588-2.648 4.588a.691.691 0 00.598 1.036h5.296a.691.691 0 00.598-1.036l-2.648-4.588zM8.523 12.89l2.648-4.588a.691.691 0 00-.598-1.036H5.277a.691.691 0 00-.598 1.036L7.327 12.89l-2.648 4.588a.691.691 0 00.598 1.036h5.296a.691.691 0 00.598-1.036L8.523 12.89z"
    />
  </svg>
{/snippet}

{#snippet googleIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
{/snippet}

{#snippet figmaIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zM8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.49c0 2.476-2.014 4.49-4.588 4.49zm0-7.51h3.117v3.019c0 1.665-1.355 3.019-3.019 3.019s-3.019-1.355-3.019-3.019 1.354-3.019 3.019-3.019h-.098zM8.148 8.981c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981H8.148zm0-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V1.471H8.148zM8.148 15.02c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.981H8.148v-.001zm0-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V7.51H8.148zM15.852 15.02h-4.588V6.039h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zm-3.117-1.471h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117v6.038z"
    />
  </svg>
{/snippet}

{#snippet stripeIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
    />
  </svg>
{/snippet}

{#snippet dropboxIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 18l6-4 6 4-6 4-6-4z"
    />
  </svg>
{/snippet}

{#snippet airtableIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M11.992 1.966L2.292 5.633c-.27.1-.27.467 0 .567l9.7 3.667c.27.1.567.1.833 0l9.7-3.667c.27-.1.27-.467 0-.567l-9.7-3.667c-.266-.1-.566-.1-.833 0zM2 8.667v7.4c0 .3.2.567.5.633l9 3.333c.167.067.333.067.5 0l9-3.333c.3-.067.5-.333.5-.633v-7.4l-9.5 3.567c-.333.133-.667.133-1 0L2 8.667z"
    />
  </svg>
{/snippet}

<SEO
  title="Workflow Infrastructure for Ops and RevOps | CREATE SOMETHING .agency"
  description="CREATE SOMETHING .agency helps Ops and RevOps teams fix the workflow they still protect by hand, qualify low-risk pilots, and add Policy OS when approvals and auditability matter."
  keywords="ops workflow infrastructure, revops automation, policy os, workflow mapping session, governed execution, custom mcp"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<!-- Hero -->
<section class="hero">
  <div class="hero-grid-container">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="hero-animated-grid"
    />
  </div>
  <div class="hero-container">
    <div class="hero-content">
      <BlurFade delay={0}>
        <p class="hero-eyebrow">Workflow Infrastructure for Ops and RevOps</p>
      </BlurFade>
      <BlurFade delay={0.08}>
        <h1 class="hero-title">Fix the workflow Ops still protects by hand.</h1>
      </BlurFade>
      <BlurFade delay={0.16}>
        <p class="hero-detail">
          We build the connectivity and outcome layers between your tools and AI. Delegate complex
          execution across your stack using custom MCP servers and governed agent skills, so your 
          team can stop babysitting workflows.
        </p>
      </BlurFade>
      <BlurFade delay={0.24}>
        <p class="hero-support">
          For teams carrying risky work across CRM, docs, inboxes, and internal systems.
        </p>
      </BlurFade>
      <BlurFade delay={0.32}>
        <div class="hero-cta">
          <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
          <a href="/contact" class="hero-link">See if your workflow qualifies for a pilot →</a>
        </div>
      </BlurFade>
    </div>
    <BlurFade delay={0.28} class="hero-visual-wrapper">
      <div class="hero-artifact">
        <div class="hero-artifact-header">
          <span class="hero-artifact-label">Governed execution artifact</span>
          <h2 class="hero-artifact-title">Policy OS</h2>
          <p class="hero-artifact-copy">
            The workflow moves only when the rule is explicit. Safe actions continue. Risky actions
            wait for review. Disallowed actions stop with a reason.
          </p>
        </div>

        <div class="hero-artifact-states">
          <div class="hero-artifact-state">
            <span class="hero-state-pill is-allow">Auto-run</span>
            <p>Known action, valid tenant, no open exception.</p>
          </div>
          <div class="hero-artifact-state">
            <span class="hero-state-pill is-review">Approval</span>
            <p>Escalate when the workflow crosses a defined trust boundary.</p>
          </div>
          <div class="hero-artifact-state">
            <span class="hero-state-pill is-block">Stop</span>
            <p>Return a clear reason instead of turning the workflow into cleanup.</p>
          </div>
        </div>

        <div class="hero-artifact-footer">
          <span>Reason codes</span>
          <span>Approval paths</span>
          <span>Release checks</span>
        </div>
      </div>
    </BlurFade>

    <BlurFade delay={0.4} class="hero-signals-wrapper">
      <div class="hero-signal-list" aria-label="Engagement progression">
        {#each heroSignals as signal}
          <article class="hero-signal">
            <div class="hero-signal-top">
              <span class="hero-signal-step">{signal.step}</span>
              <span class="hero-signal-rule" aria-hidden="true"></span>
            </div>
            <div class="hero-signal-copy">
              <strong>{signal.title}</strong>
              <p>{signal.copy}</p>
            </div>
          </article>
        {/each}
      </div>
    </BlurFade>
  </div>
</section>

<!-- How Engagements Progress -->
<section id="how" class="process-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">How Engagements Progress</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="section-intro">
        Start with the workflow creating the most drag. Map the trust boundary first. Only narrow,
        low-risk workflows qualify for a pilot. Policy OS starts when governance matters.
      </p>
    </BlurFade>

    <div class="funnel-steps">
      <BlurFade delay={0.15}>
        <div class="funnel-step">
          <div class="funnel-step-indicator">
            <div class="funnel-step-num">1</div>
            <div class="funnel-step-line"></div>
          </div>
          <div class="funnel-step-content">
            <span class="funnel-step-label">Step 1</span>
            <h3>Workflow Mapping Session</h3>
            <p>
              Most teams start here. I map handoffs, exceptions, approvals, and the right path into
              pilot, Policy OS, or enterprise scope.
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <div class="funnel-step">
          <div class="funnel-step-indicator">
            <div class="funnel-step-num">2</div>
            <div class="funnel-step-line"></div>
          </div>
          <div class="funnel-step-content">
            <span class="funnel-step-label">Step 2</span>
            <h3>Qualified Pilot Path</h3>
            <p>
              If the workflow is narrow, the owner is clear, and the risk is manageable, it may
              qualify for a constrained MCP Hub pilot.
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.35}>
        <div class="funnel-step">
          <div class="funnel-step-indicator">
            <div class="funnel-step-num">3</div>
            <div class="funnel-step-line"></div>
          </div>
          <div class="funnel-step-content">
            <span class="funnel-step-label">Step 3</span>
            <h3>Policy OS</h3>
            <p>
              This is the paid product. It adds approvals, blocked states, release checks, and
              reason-coded governance to live workflows.
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.45}>
        <div class="funnel-step">
          <div class="funnel-step-indicator">
            <div class="funnel-step-num">4</div>
          </div>
          <div class="funnel-step-content">
            <span class="funnel-step-label">Step 4</span>
            <h3>Enterprise Extension</h3>
            <p>
              Add this when several systems, teams, or compliance boundaries need one governed
              operating model and clean recovery paths.
            </p>
          </div>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<!-- What You Get -->
<section class="offerings-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">Offer Ladder</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="section-intro">
        Each offer answers the same questions: what gets fixed first, what needs review, and what
        your team inherits after launch.
      </p>
    </BlurFade>

    <div class="offerings-grid">
      <BlurFade delay={0.15}>
        <div class="offering-card">
          <div class="offering-header">
            <h3 class="offering-name">Workflow Mapping Session</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              The diagnostic path for ambiguous, risky, or cross-functional workflows that need a
              clear trust boundary before build approval.
            </p>
            <div class="offering-deliverables">
              <span class="deliverables-label">Includes</span>
              <ul>
                <li>Handoff and failure-mode map</li>
                <li>Approval boundary recommendation</li>
                <li>Pilot versus Policy OS routing</li>
                <li>30-day implementation direction</li>
              </ul>
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <div class="offering-card">
          <div class="offering-header">
            <h3 class="offering-name">Qualified MCP Hub Pilot</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              A constrained start for one narrow workflow with clear ownership, limited risk, and a
              checkpoint before expansion.
            </p>
            <div class="offering-deliverables">
              <span class="deliverables-label">Includes</span>
              <ul>
                <li>Workflow qualification review</li>
                <li>Scoped host and integration setup</li>
                <li>Constrained operating boundary</li>
                <li>Checkpoint for promotion or stop</li>
              </ul>
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.35}>
        <div class="offering-card offering-featured">
          <span class="offering-badge">The real product</span>
          <div class="offering-header">
            <h3 class="offering-name">Policy OS</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              The approval and oversight layer that keeps a live workflow trustworthy as volume,
              risk, and exceptions increase.
            </p>
            <div class="offering-deliverables">
              <span class="deliverables-label">Includes</span>
              <ul>
                <li>Pre-release quality gates</li>
                <li>Policy and approval boundaries</li>
                <li>Postmortem loops</li>
                <li>Monthly tuning</li>
              </ul>
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.45}>
        <div class="offering-card">
          <div class="offering-header">
            <h3 class="offering-name">Enterprise Extension</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              Cross-system control for workflows that need audit trails, recovery paths, and
              coordination across teams.
            </p>
            <div class="offering-deliverables">
              <span class="deliverables-label">Includes</span>
              <ul>
                <li>Cross-system orchestration</li>
                <li>Audit and review controls</li>
                <li>Recovery design</li>
                <li>Architecture support</li>
              </ul>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<!-- The Model -->
<section class="problem-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">The Model</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <div class="problem-statements model-grid">
        <div class="model-copy">
          <p class="problem-text">
            Connecting tools is getting easier. Governing live workflows is not.
          </p>
          <p class="problem-text">
            The hard part is deciding what can run automatically, what needs approval, what needs a
            human checkpoint, and when the workflow should stop with a reason. That is the work.
          </p>
          <ul class="control-outcomes">
            <li>Low-risk workflows can start narrow when the owner, boundary, and checkpoint are clear.</li>
            <li>Safe actions run automatically once the workflow and tenant are in good standing.</li>
            <li>Risky actions route to approval instead of becoming cleanup.</li>
            <li>Disallowed actions stop with a reason buyers and operators can both understand.</li>
          </ul>
          <p class="problem-text">
            When a client primarily needs full system development and team onboarding, I refer that
            engagement to Half Dozen directly.
          </p>
          <p class="problem-punchline">
            Reliable workflows are the product. Operational leverage is the outcome.
          </p>
        </div>
        <div class="mcp-flow-wrapper">
          <HubMcpFlow />
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<!-- Proof -->
<section class="audience-section">
  <div class="section-container">
    <BlurFade>
      <ArtifactSystemStrip
        title="What makes the workflow dependable"
        description="The buyer promise is backed by explicit contracts, runbooks, and release evidence, not by founder memory or hidden prompts."
      />
    </BlurFade>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="cta-heading">Map the workflow your team still protects by hand.</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="cta-subtext">
        In one session, I will map the handoffs, approval points, failure modes, and artifact
        bundle the workflow needs.
      </p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-buttons">
        <ShimmerButton href="/book">Book Mapping Session</ShimmerButton>
        <a href="/contact" class="cta-book-link">See if your workflow qualifies for a pilot →</a>
      </div>
    </BlurFade>
  </div>
</section>

<style>
  /* Section containers */
  .section-container {
    max-width: var(--content-width-lg);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  .section-heading {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    text-align: center;
    margin-bottom: var(--space-4, 1rem);
    letter-spacing: var(--tracking-tight, -0.015em);
  }

  .section-intro {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    text-align: center;
    max-width: var(--content-width-sm);
    margin: 0 auto var(--space-8, 3rem);
    line-height: var(--leading-relaxed);
  }

  /* Hero with restrained support artifact */
  .hero {
    position: relative;
    padding: clamp(5rem, 9vw, 8rem) var(--container-padding, 1.5rem)
      clamp(4rem, 7vw, 6rem);
    max-width: 100%;
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(720px circle at 50% 32%, white, transparent);
    -webkit-mask-image: radial-gradient(720px circle at 50% 32%, white, transparent);
  }

  .hero-container {
    position: relative;
    width: 100%;
    max-width: min(var(--content-width-xl), calc(100vw - 2 * var(--container-padding)));
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(2.25rem, 4vw, 4rem);
    align-items: start;
    margin: 0 auto;
  }

  @media (min-width: 901px) {
    .hero-container {
      grid-template-columns: minmax(0, 1.05fr) minmax(21rem, 0.95fr);
    }
  }

  .hero-content {
    min-width: 0;
    max-width: 36rem;
    text-align: left;
    display: grid;
    gap: 0;
  }

  .hero-eyebrow {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-4, 1rem);
  }

  .hero-title {
    font-size: clamp(2.75rem, 5.5vw, 4.75rem);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    max-width: 9ch;
    margin-bottom: var(--space-4, 1rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
  }

  .hero-detail {
    font-size: clamp(1rem, 1vw + 0.9rem, 1.2rem);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-4, 1rem);
    line-height: 1.68;
    max-width: 29rem;
  }

  .hero-support {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    line-height: 1.7;
    max-width: 28rem;
    margin-bottom: var(--space-7, 2.5rem);
  }

  .hero-cta {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--space-4, 1rem) var(--space-5, 1.5rem);
    margin-bottom: var(--space-8, 3rem);
  }

  .hero-link {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-decoration: none;
    padding-top: 0.7rem;
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .hero-link:hover {
    color: var(--color-fg-primary);
  }

  :global(.hero-signals-wrapper) {
    grid-column: 1 / -1;
    margin-top: var(--space-4, 1rem);
  }

  .hero-signal-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4, 1rem);
    padding-top: var(--space-6, 2rem);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  @media (min-width: 768px) {
    .hero-signal-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .hero-signal {
    display: grid;
    gap: var(--space-4, 1rem);
    min-width: 0;
    padding: 1.05rem 1rem 1.15rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
      rgba(255, 255, 255, 0.02);
  }

  .hero-signal-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .hero-signal-rule {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }

  .hero-signal-step {
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    flex-shrink: 0;
  }

  .hero-signal-copy strong {
    display: block;
    font-size: 1rem;
    line-height: 1.25;
    color: var(--color-fg-primary);
    margin-bottom: 0.5rem;
  }

  .hero-signal-copy p {
    font-size: 0.94rem;
    line-height: 1.62;
    color: var(--color-fg-muted);
    margin: 0;
  }

  .hero-artifact {
    position: relative;
    display: grid;
    gap: var(--space-6, 2rem);
    padding: clamp(1.5rem, 2vw, 2rem);
    border-radius: 26px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
      rgba(6, 8, 12, 0.88);
    box-shadow:
      0 32px 80px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    max-width: 31rem;
  }

  .hero-artifact::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 25px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 38%);
    pointer-events: none;
  }

  :global(.hero-visual-wrapper) {
    min-width: 0;
  }

  .hero-artifact-header {
    position: relative;
    z-index: 1;
    display: grid;
    gap: var(--space-3, 0.75rem);
  }

  .hero-artifact-label {
    font-size: 0.68rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.44);
  }

  .hero-artifact-title {
    font-size: clamp(2rem, 2vw + 1.25rem, 2.9rem);
    line-height: 1.04;
    letter-spacing: -0.04em;
    color: #ffffff;
    margin: 0;
  }

  .hero-artifact-copy {
    font-size: 0.98rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.72);
    max-width: 28rem;
    margin: 0;
  }

  .hero-artifact-states {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 0.9rem;
  }

  .hero-artifact-state {
    display: grid;
    gap: 0.5rem;
    padding: 1rem 1.1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
  }

  .hero-artifact-state p {
    margin: 0;
    font-size: 0.93rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.72);
  }

  .hero-state-pill {
    width: fit-content;
    padding: 0.28rem 0.62rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .hero-state-pill.is-allow {
    color: #8de5bb;
    background: rgba(38, 98, 76, 0.35);
    border: 1px solid rgba(141, 229, 187, 0.18);
  }

  .hero-state-pill.is-review {
    color: #f4d98b;
    background: rgba(111, 84, 28, 0.35);
    border: 1px solid rgba(244, 217, 139, 0.18);
  }

  .hero-state-pill.is-block {
    color: #f5a19d;
    background: rgba(114, 43, 39, 0.35);
    border: 1px solid rgba(245, 161, 157, 0.18);
  }

  .hero-artifact-footer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .hero-artifact-footer span {
    font-size: 0.76rem;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    padding: 0.55rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  /* How It Works — Funnel Steps */
  .process-section {
    padding: var(--section-padding-lg, 8rem) 0 var(--section-padding, 6rem);
  }

  .funnel-steps {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .funnel-step {
    display: flex;
    gap: var(--space-5, 1.5rem);
    align-items: flex-start;
  }

  .funnel-step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .funnel-step-num {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-emphasis);
    border-radius: var(--radius-full, 9999px);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    color: var(--color-fg-secondary);
    background: var(--color-bg-pure);
    position: relative;
    z-index: 1;
  }

  .funnel-step-line {
    width: 1px;
    height: 100%;
    min-height: 2rem;
    background: var(--color-border-default);
    flex: 1;
  }

  .funnel-step-content {
    padding-bottom: var(--space-8, 3rem);
  }

  .funnel-step-label {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-fg-muted);
    display: block;
    margin-bottom: var(--space-1, 0.25rem);
  }

  .funnel-step-content h3 {
    font-size: var(--text-h2);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .funnel-step-content p {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-3, 0.75rem);
  }

  /* The Model Section */
  .problem-section {
    padding: var(--section-padding-lg, 8rem) 0;
    background: #000000;
    color: #ffffff;
  }

  .problem-section .section-heading {
    color: #ffffff;
  }

  .problem-statements {
    max-width: var(--content-width-xl, 1200px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-6, 2rem);
  }

  .problem-text {
    font-size: clamp(1.25rem, 3vw + 0.5rem, 1.75rem);
    line-height: var(--leading-relaxed);
    color: rgba(255, 255, 255, 0.7);
    text-align: left;
  }

  .mcp-flow-wrapper {
    margin: 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .problem-punchline {
    font-size: clamp(1.5rem, 4vw + 0.5rem, 2.5rem);
    font-weight: var(--font-bold);
    color: #ffffff;
    text-align: left;
    margin-top: var(--space-2, 0.5rem);
    letter-spacing: var(--tracking-tight);
  }

  .model-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: center;
  }

  .model-copy {
    display: grid;
    gap: 1.25rem;
  }

  .control-outcomes {
    display: grid;
    gap: 0.85rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .control-outcomes li {
    padding: 1rem 1.1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
      rgba(255, 255, 255, 0.02);
    color: rgba(255, 255, 255, 0.82);
    line-height: 1.6;
  }
  /* What You Get — Offerings */
  .offerings-section {
    padding: var(--section-padding, 6rem) 0;
  }

  .offerings-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-6, 2rem);
    align-items: stretch;
    overflow: visible;
  }

  @media (min-width: 768px) {
    .offerings-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-5, 1.5rem);
    }
  }

  @media (min-width: 1024px) {
    .offerings-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-5, 1.5rem);
    }
  }

  /* BlurFade wrappers must stretch so grid equalizes row height */
  .offerings-grid > :global(*) {
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .offering-card {
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-xl, 16px);
    background: var(--color-bg-pure);
    box-shadow: var(--glass-shine-soft);
    overflow: visible;
    flex: 1;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      box-shadow var(--duration-standard) var(--ease-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .offering-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  }

  .offering-card:hover {
    border-color: var(--color-border-emphasis);
    box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
    transform: translateY(-3px);
  }

  /* Featured offering — elevated z-index so badge is visible above siblings */
  .offering-card.offering-featured {
    z-index: 1;
    border-color: rgba(96, 165, 250, 0.3);
    background: linear-gradient(180deg, rgba(96, 165, 250, 0.04) 0%, var(--color-bg-pure) 100%);
    box-shadow:
      var(--glass-shine-standard),
      0 0 0 1px rgba(96, 165, 250, 0.08);
  }

  .offering-card.offering-featured:hover {
    border-color: rgba(96, 165, 250, 0.5);
    box-shadow:
      var(--glass-shine-strong),
      0 0 0 1px rgba(96, 165, 250, 0.15),
      0 8px 32px rgba(96, 165, 250, 0.1);
    transform: translateY(-4px);
  }

  .offering-card.offering-featured::before {
    background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent);
  }

  .offering-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(96, 165, 250, 1);
    background: rgba(10, 14, 20, 0.95);
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: var(--radius-full, 9999px);
    padding: 0.2rem 0.75rem;
    white-space: nowrap;
    z-index: 10;
  }

  .offering-header {
    padding: var(--space-4, 1rem) var(--space-4, 1rem) var(--space-3, 0.75rem);
    text-align: center;
  }

  .offering-name {
    font-size: var(--text-body-lg);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    margin-top: var(--space-2, 0.5rem);
  }

  .offering-body {
    padding: 0 var(--space-4, 1rem) var(--space-4, 1rem);
    flex: 1;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
  }

  .offering-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    padding-top: var(--space-3, 0.75rem);
    margin-bottom: var(--space-4, 1rem);
  }

  .offering-deliverables {
    margin-top: auto;
  }

  .deliverables-label {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-fg-muted);
    display: block;
    margin-bottom: var(--space-2, 0.5rem);
  }

  .offering-deliverables ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .offering-deliverables li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    padding-left: 1.25rem;
    position: relative;
  }

  .offering-deliverables li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(96, 165, 250, 0.6);
  }

  /* Problem Section */
  .problem-section {
    padding: var(--section-padding, 6rem) 0;
  }

  .problem-statements {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    text-align: left;
  }

  .problem-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: var(--space-6, 2rem);
  }

  .problem-punchline {
    font-size: clamp(1.5rem, 2.2vw + 0.9rem, 2.4rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    line-height: 1.28;
    letter-spacing: var(--tracking-tight, -0.01em);
    max-width: 24ch;
    margin: 0;
  }

  /* Audience / Built For */
  .audience-section {
    padding: var(--section-padding, 6rem) 0;
  }

  @media (max-width: 900px) {
    .model-grid {
      grid-template-columns: 1fr;
    }

    .problem-text,
    .problem-punchline {
      text-align: center;
    }

    .problem-punchline {
      margin: 0 auto;
    }
  }

  @media (max-width: 1024px) and (min-width: 769px) {
    .offerings-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-6, 2rem);
    }

    .offering-card.offering-featured {
      order: -1;
    }

    .offering-card.offering-featured .offering-body {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(16rem, 0.9fr);
      gap: var(--space-5, 1.5rem);
      align-items: start;
    }

    .offering-card.offering-featured .offering-description {
      margin-bottom: 0;
      padding-top: var(--space-4, 1rem);
    }

    .offering-card.offering-featured .offering-deliverables {
      margin-top: 0;
    }
  }

  /* CTA */
  .cta-section {
    padding: var(--section-padding, 6rem) 0;
    text-align: center;
  }

  .cta-heading {
    font-size: var(--text-h1);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .cta-subtext {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-6, 2rem);
    max-width: var(--content-width-sm);
    margin-left: auto;
    margin-right: auto;
    line-height: var(--leading-relaxed);
  }

  .cta-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4, 1rem);
  }

  .cta-book-link {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-decoration: none;
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .cta-book-link:hover {
    color: var(--color-fg-primary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: clamp(3rem, 13vw, 4.5rem);
      max-width: 8ch;
    }

    .hero-detail {
      font-size: 1.05rem;
    }

    .hero-cta {
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: var(--space-6, 2rem);
    }

    .hero-link {
      display: block;
      padding-top: 0;
    }

    .hero-signal-list {
      grid-template-columns: 1fr;
      gap: var(--space-3, 0.75rem);
      padding-top: var(--space-5, 1.5rem);
    }

    .hero-artifact {
      padding: 1.25rem;
      border-radius: 22px;
    }

    .offerings-grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .offering-card.offering-featured {
      order: -1;
    }

    .process-section,
    .offerings-section,
    .problem-section,
    .audience-section,
    .cta-section {
      padding: var(--layout-3, 4rem) 0;
    }
  }
</style>
