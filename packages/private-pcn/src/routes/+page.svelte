<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { BOOKING_URL } from '$lib/client';
  import NetworkPreview from '$lib/components/NetworkPreview.svelte';
</script>

<svelte:head>
  <title>Private networks for agentic engineering creators | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Your own network for teaching agentic engineering. Publish technical walkthroughs, curate a video library, and choose who gets access. Built around your brand and domain."
  />
  <link rel="canonical" href="https://private.createsomething.agency/" />
</svelte:head>
<main id="main">
  <section class="creator-hero">
    <div class="creator-hero-top">
      <p class="eyebrow">PRIVATE NETWORKS / AGENTIC ENGINEERING</p>
      <span class="hero-edition">BUILT FOR INDEPENDENT CREATORS</span>
    </div>
    <div class="creator-hero-grid">
      <div>
        <h1>Teach what<br />you’re{' '}<em>building.</em></h1>
        <p class="lede">
          Give your agent builds, technical deep dives, and hard-won knowledge a home. A private
          content network shaped around your audience and your way of teaching.
        </p>
        <div class="hero-actions">
          <a class="button" href={BOOKING_URL}
            >Build your network <span aria-hidden="true"><Icon name="external-link" /></span></a
          ><a class="inline-link" href="#network-preview"
            >Explore the possibilities <Icon name="arrow-down" /></a
          >
        </div>
        <p class="hero-note">Custom-built with you. Your brand. Your domain.</p>
      </div>
      <div
        class="engineering-field"
        role="img"
        aria-label="A creator publishes a build walkthrough, reviews access, and shares it with members. Example network structure."
      >
        <div class="field-caption"><span>KNOWLEDGE, WITH CONTEXT</span><span>FIG. 01</span></div>
        <div class="field-source">
          <span class="field-node">01</span>
          <div>
            <small>THE CREATOR</small><strong>What you know.</strong>
            <p>Builds / methods / lessons learned</p>
          </div>
        </div>
        <div class="field-route"><span>CURATE + PUBLISH</span></div>
        <div class="field-network">
          <div class="field-network-header">
            <span>YOUR PRIVATE NETWORK</span><Icon name="network" size={20} />
          </div>
          <strong>From working code<br />to shared understanding.</strong>
          <div class="field-topics">
            <span>MCP integrations</span><span>Agent workflows</span><span
              >Evaluation walkthroughs</span
            >
          </div>
          <div class="field-gate">
            <span>ACCESS / YOU DECIDE</span><b>Public preview · Invited members</b>
          </div>
        </div>
        <div class="field-footer">
          <span>02 / YOUR AUDIENCE</span>
          <p>A place to learn from the work.</p>
        </div>
      </div>
    </div>
    <div class="creator-scope">
      <span>FOR EDUCATORS</span><span>FOR BUILDERS</span><span>FOR RESEARCHERS</span><span
        >FOR TECHNICAL COMMUNITIES</span
      >
    </div>
  </section>
  <NetworkPreview />
  <section class="service-section creator-service" id="the-service">
    <div>
      <p class="eyebrow">03 / THE NETWORK IS YOURS</p>
      <h2>Keep the depth.<br /><em>Choose the boundaries.</em></h2>
      <p class="section-intro">
        Your work can be public. Your deeper explanation can have a more deliberate home. We build
        the library, access, and publishing workflow around how you want to teach.
      </p>
    </div>
    <div class="service-rows">
      <article>
        <span>01</span>
        <div>
          <h3>Organize around what people learn</h3>
          <p>
            Group video walkthroughs into your own series: agent architecture, tool use, evals, or
            the next subject you want to explore.
          </p>
        </div>
      </article>
      <article>
        <span>02</span>
        <div>
          <h3>Choose what stays private</h3>
          <p>
            Invite members and publish public previews. Decide which lessons welcome new people and
            which belong inside your network.
          </p>
        </div>
      </article>
      <article>
        <span>03</span>
        <div>
          <h3>Publish without rebuilding a platform</h3>
          <p>
            Upload a private draft, check processing, then publish. Manage content and member access
            from one creator workspace.
          </p>
        </div>
      </article>
      <article>
        <span>04</span>
        <div>
          <h3>Make it unmistakably yours</h3>
          <p>
            Your identity, your domain, your library structure. Paid memberships, repository
            integrations, and other extensions are scoped with you.
          </p>
        </div>
      </article>
    </div>
  </section>
  <section class="creator-handoff" id="start">
    <div>
      <p class="eyebrow">04 / BUILD WITH CREATE SOMETHING</p>
      <h2>You bring the knowledge.<br /><em>We build the place.</em></h2>
      <p>
        Bring your audience, a few recordings, or an idea for a network. We’ll map the experience,
        agree the scope, and build it with you.
      </p>
      <a class="button" href={BOOKING_URL}
        >Build your network <span aria-hidden="true"><Icon name="external-link" /></span></a
      >
    </div>
    <div class="delivery-steps">
      <article>
        <span>01 / DEFINE</span>
        <h3>Audience, content, access.</h3>
        <p>Set the structure, brand, membership model, and ownership before the build.</p>
      </article>
      <article>
        <span>02 / LAUNCH</span>
        <h3>Build, migrate, verify.</h3>
        <p>Move the agreed content and test the publishing and member experience together.</p>
      </article>
      <article>
        <span>03 / OPERATE</span>
        <h3>Keep publishing.</h3>
        <p>
          Training, a runbook, and an agreed support plan. Build, support, and video usage are
          quoted separately.
        </p>
      </article>
    </div>
  </section>
</main>
