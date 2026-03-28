<script lang="ts">
  import { SEO } from '@create-something/canon';
  import {
    AnimatedGridPattern,
    BlurFade,
    BorderBeam,
    OrbitingCircles,
    ShimmerButton
  } from '@create-something/canon/magicui';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  // Structured data for SEO/AEO
  const services = [
    {
      name: 'Workflow Infrastructure',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Policy OS',
      description:
        'The oversight layer: policy artifacts, approvals, blocked states, release checks, and incident loops once the workflow touches revenue, trust, or compliance.',
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
  title={`${agencyCoreMessaging.categoryLabel} | CREATE SOMETHING .agency`}
  description="CREATE SOMETHING .agency helps ops-minded teams make critical workflows safe enough to trust in production."
  keywords="governed workflow infrastructure, production automation, technical operators, enterprise workflow architecture, automation reliability, custom mcp"
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
        <p class="hero-eyebrow">{agencyCoreMessaging.categoryLabel}</p>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h1 class="hero-title">Make the workflow safe enough to trust.</h1>
      </BlurFade>
      <BlurFade delay={0.2}>
        <p class="hero-detail">
          For the operator who has to answer for what happens next. I fix the workflow creating the
          most drag, then add approvals, visibility, and recovery paths as the stakes rise.
        </p>
      </BlurFade>
      <BlurFade delay={0.25}>
        <div class="hero-actions">
          <div class="hero-cta">
            <ShimmerButton href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</ShimmerButton>
            <a href="#how" class="hero-link">See how it works →</a>
          </div>
          <p class="hero-cta-note">{agencyCoreMessaging.workflowCtaDetail}</p>
        </div>
      </BlurFade>
    </div>
    <BlurFade delay={0.4} class="hero-visual-wrapper">
      <div class="hero-visual-frame">
        <div class="hero-visual-glow" aria-hidden="true"></div>
        <div class="hero-visual-container">
          <BorderBeam
            size={250}
            duration={12}
            colorFrom="rgba(96, 165, 250, 0.8)"
            colorTo="rgba(167, 139, 250, 0.6)"
          />
          <div class="orbital-container">
            <!-- FAR BACK LAYER -->
            <div class="orbit-layer layer-far">
              <OrbitingCircles radius={145} duration={50} startAngle={0}>
                <div class="orbit-item orbit-far">
                  {@render githubIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={145} duration={50} startAngle={90}>
                <div class="orbit-item orbit-far">
                  {@render figmaIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={145} duration={50} startAngle={180}>
                <div class="orbit-item orbit-far">
                  {@render stripeIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={145} duration={50} startAngle={270}>
                <div class="orbit-item orbit-far">
                  {@render dropboxIcon()}
                </div>
              </OrbitingCircles>
            </div>
            <!-- MAIN LAYER -->
            <div class="orbit-layer layer-main">
              <OrbitingCircles radius={110} duration={30} startAngle={0}>
                <div class="orbit-item">
                  {@render salesforceIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={110} duration={30} startAngle={90}>
                <div class="orbit-item">
                  {@render aiIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={110} duration={30} startAngle={180}>
                <div class="orbit-item">
                  {@render slackIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={110} duration={30} startAngle={270}>
                <div class="orbit-item">
                  {@render notionIcon()}
                </div>
              </OrbitingCircles>
            </div>
            <!-- CLOSE LAYER -->
            <div class="orbit-layer layer-close">
              <OrbitingCircles radius={75} duration={18} startAngle={45} reverse>
                <div class="orbit-item orbit-close">
                  {@render hubspotIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={75} duration={18} startAngle={135} reverse>
                <div class="orbit-item orbit-close">
                  {@render zapierIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={75} duration={18} startAngle={225} reverse>
                <div class="orbit-item orbit-close">
                  {@render googleIcon()}
                </div>
              </OrbitingCircles>
              <OrbitingCircles radius={75} duration={18} startAngle={315} reverse>
                <div class="orbit-item orbit-close">
                  {@render airtableIcon()}
                </div>
              </OrbitingCircles>
            </div>
            <!-- Central hub -->
            <div class="orbital-center">
              <div class="center-icon">
                {@render createSomethingLogo()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<!-- How I Work -->
<section id="how" class="process-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">How I Work</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="section-intro">
        Start with one workflow your team still has to watch too closely. Make the handoffs
        reliable first. Add governance only where the risk justifies it.
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
            <span class="funnel-step-label">Lane 1</span>
            <h3>Workflow Infrastructure</h3>
            <p>
              I map the rules, owners, and handoffs around the workflow your team still has to
              watch too closely.
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
            <span class="funnel-step-label">Lane 2</span>
            <h3>Policy OS</h3>
            <p>
              I add approvals, release checks, blocked states, and review loops so speed does not
              turn into cleanup.
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.35}>
        <div class="funnel-step">
          <div class="funnel-step-indicator">
            <div class="funnel-step-num">3</div>
          </div>
          <div class="funnel-step-content">
            <span class="funnel-step-label">Lane 3</span>
            <h3>Enterprise Extension</h3>
            <p>
              I extend the control layer when several systems, teams, or compliance boundaries
              have to stay aligned.
            </p>
          </div>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<!-- Proof -->
<section class="audience-section">
  <div class="section-container">
    <BlurFade>
      <ArtifactSystemStrip
        title="How trust stays visible"
        description="Every engagement ships with runbooks, approval boundaries, and release evidence your team can review, inherit, and run after launch."
      />
    </BlurFade>
  </div>
</section>

<!-- What You Get -->
<section class="offerings-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="section-heading">What Your Team Gets</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="section-intro">
        One clear entry point, visible controls, and artifacts your team can inherit after launch.
      </p>
    </BlurFade>

    <div class="offerings-grid">
      <BlurFade delay={0.15}>
        <div class="offering-card offering-featured">
          <div class="offering-header">
            <span class="offering-badge">Most teams start here</span>
            <h3 class="offering-name">Workflow Infrastructure</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              The first reliable operating path: one workflow rebuilt with clearer rules, safer
              handoffs, and less manual protection.
            </p>
            <div class="offering-deliverables">
              <span class="deliverables-label">Includes</span>
              <ul>
                <li>Workflow implementation</li>
                <li>Business-rule mapping</li>
                <li>Auth and access setup</li>
                <li>Runbook and handoff artifacts</li>
              </ul>
            </div>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <div class="offering-card">
          <div class="offering-header">
            <h3 class="offering-name">Policy OS</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              Add the oversight layer once the workflow is live and volume, exceptions, or trust
              risk start to climb.
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

      <BlurFade delay={0.35}>
        <div class="offering-card">
          <div class="offering-header">
            <h3 class="offering-name">Enterprise Extension</h3>
          </div>
          <div class="offering-body">
            <p class="offering-description">
              Cross-system coordination for workflows that need audit trails, recovery paths, and
              steadier control.
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
      <h2 class="section-heading">Why Governance Matters</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <div class="problem-statements model-grid">
        <div class="model-copy">
          <p class="problem-text">
            Connecting tools is getting easier. Getting your team to trust the result is harder.
          </p>
          <p class="problem-text">
            The hard part is deciding what can run automatically, what needs a person in the loop,
            and what should stop with a clear reason. That is where governance starts.
          </p>
          <ul class="control-outcomes">
            <li>Safe actions run automatically when the workflow is healthy.</li>
            <li>Risky actions pause for review instead of becoming cleanup.</li>
            <li>Disallowed actions stop with a reason your team can understand.</li>
          </ul>
          <p class="problem-text">
            If what you need is staff augmentation or a full internal delivery team, I will route
            you to a better-fit partner.
          </p>
          <p class="problem-punchline">
            Trust is the product. Speed is the outcome.
          </p>
        </div>
        <div class="mcp-flow-wrapper">
          <HubMcpFlow />
        </div>
      </div>
    </BlurFade>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade>
      <h2 class="cta-heading">{agencyCoreMessaging.workflowCtaHeading}</h2>
    </BlurFade>
    <BlurFade delay={0.1}>
      <p class="cta-subtext">{agencyCoreMessaging.workflowCtaDetail}</p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <div class="cta-buttons">
        <ShimmerButton href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</ShimmerButton>
        <a href="/services" class="cta-book-link"> {agencyCoreMessaging.engagementModelLabel} </a>
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

  /* Hero with grid background - two column layout */
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
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
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .hero-container {
    position: relative;
    width: 100%;
    max-width: min(var(--content-width-xl), calc(100vw - 2 * var(--container-padding)));
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-8, 3rem);
    align-items: center;
    margin: 0 auto;
  }

  @media (min-width: 901px) {
    .hero-container {
      grid-template-columns: 2fr minmax(380px, 1fr);
    }
  }

  .hero-content {
    min-width: 0;
    text-align: left;
  }

  .hero-eyebrow {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .hero-title {
    font-size: clamp(2.75rem, 5vw + 1.5rem, 5rem);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-6, 2rem);
    line-height: 1.05;
    letter-spacing: var(--tracking-tighter, -0.025em);
    text-wrap: balance;
  }

  .hero-detail {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: var(--leading-relaxed);
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3, 0.75rem);
  }

  .hero-cta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4, 1rem);
  }

  .hero-link {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-decoration: none;
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .hero-link:hover {
    color: var(--color-fg-primary);
  }

  .hero-cta-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    line-height: var(--leading-relaxed);
    margin: 0;
    text-wrap: pretty;
  }

  /* Hero visual frame - contains glow + bordered container */
  .hero-visual-frame {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-visual-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at center,
      rgba(96, 165, 250, 0.15) 0%,
      rgba(167, 139, 250, 0.08) 40%,
      transparent 70%
    );
    filter: blur(40px);
    pointer-events: none;
  }

  .hero-visual-container {
    position: relative;
    padding: var(--space-6, 2rem);
    border-radius: var(--radius-xl, 16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }

  .orbital-container {
    position: relative;
    width: 300px;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .orbit-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .orbit-layer.layer-far {
    z-index: 1;
    filter: blur(2px);
    opacity: 0.5;
  }

  .orbit-layer.layer-main {
    z-index: 5;
  }

  .orbit-layer.layer-close {
    z-index: 8;
    filter: blur(0.5px);
    opacity: 0.85;
  }

  .orbital-center {
    position: relative;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .center-icon {
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px) saturate(120%);
    -webkit-backdrop-filter: blur(20px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    color: white;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .center-icon :global(svg) {
    width: 52px;
    height: 52px;
  }

  .orbit-item {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    color: white;
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
  }

  .orbit-item :global(svg) {
    width: 22px;
    height: 22px;
  }

  .orbit-item.orbit-far {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .orbit-item.orbit-far :global(svg) {
    width: 16px;
    height: 16px;
  }

  .orbit-item.orbit-close {
    width: 38px;
    height: 38px;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .orbit-item.orbit-close :global(svg) {
    width: 18px;
    height: 18px;
  }

  :global(.hero-visual-wrapper) {
    display: none;
  }

  @media (min-width: 901px) {
    :global(.hero-visual-wrapper) {
      display: block;
      min-width: 0;
    }
  }

  /* How It Works — Funnel Steps */
  .process-section {
    padding: var(--section-padding, 6rem) 0;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(1rem, 1.8vw, 1.75rem);
    align-items: stretch;
    overflow: visible;
    max-width: 74rem;
    margin: var(--space-8, 3rem) auto 0;
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
    isolation: isolate;
    border-radius: var(--radius-xl, 16px);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.012)),
      rgba(11, 11, 13, 0.95);
    box-shadow: var(--glass-shine-soft);
    overflow: visible;
    flex: 1;
    border: 1px solid rgba(255, 255, 255, 0.07);
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      box-shadow var(--duration-standard) var(--ease-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .offering-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 8%;
    right: 8%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    z-index: 0;
  }

  .offering-card:hover {
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: var(--glass-shine-standard), 0 16px 32px rgba(0, 0, 0, 0.18);
    transform: translateY(-3px);
  }

  .offering-card.offering-featured {
    z-index: 2;
    border-color: rgba(255, 255, 255, 0.12);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.032) 0%, rgba(255, 255, 255, 0.012) 100%),
      rgba(11, 11, 13, 0.95);
    box-shadow:
      var(--glass-shine-standard),
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 18px 36px rgba(0, 0, 0, 0.2);
  }

  .offering-card.offering-featured:hover {
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow:
      var(--glass-shine-strong),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 20px 40px rgba(0, 0, 0, 0.22);
    transform: translateY(-4px);
  }

  .offering-card.offering-featured::before {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  }

  .offering-badge {
    position: absolute;
    top: 0;
    left: 1.2rem;
    transform: translateY(calc(-50% - 1px));
    z-index: 3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.68);
    background: rgba(8, 8, 10, 0.98);
    backdrop-filter: blur(10px) saturate(110%);
    -webkit-backdrop-filter: blur(10px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.7);
    border-radius: var(--radius-full, 9999px);
    padding: 0.24rem 0.58rem;
    white-space: nowrap;
  }

  .offering-header {
    position: relative;
    z-index: 1;
    display: grid;
    align-content: start;
    gap: 0.65rem;
    min-height: 5.35rem;
    padding: 2rem 1.2rem 0.85rem;
    text-align: left;
  }

  .offering-name {
    font-size: clamp(1.18rem, 0.34vw + 1.06rem, 1.46rem);
    font-weight: var(--font-bold);
    color: var(--color-fg-primary);
    line-height: 1.12;
    margin: 0;
    text-wrap: balance;
  }

  .offering-body {
    padding: 0.95rem 1.2rem 1.2rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .offering-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin-bottom: 1.1rem;
  }

  .offering-deliverables {
    margin-top: auto;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid rgba(255, 255, 255, 0.035);
    border-radius: 12px;
    padding: 0.85rem 0.9rem;
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
    gap: 0.4rem;
  }

  .offering-deliverables li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    padding-left: 0.95rem;
    position: relative;
  }

  .offering-deliverables li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5em;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.32);
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
      grid-column: 1 / -1;
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
      font-size: clamp(2.75rem, 8vw, 5rem);
    }

    .hero-link {
      display: none;
    }

    .offerings-grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .offering-header {
      min-height: auto;
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
