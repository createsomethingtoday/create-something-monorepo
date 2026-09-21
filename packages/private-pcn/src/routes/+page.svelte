<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  import NetworkPreview from '$lib/components/NetworkPreview.svelte';
</script>

<svelte:head>
  <title>Private networks for agentic engineering builders | CREATE SOMETHING</title>
  <meta
    name="description"
    content="A private home for agentic engineering builders: share techniques and package MCP servers, agent plugins and skills with the context to use them."
  />
  <link rel="canonical" href="https://private.createsomething.agency/" />
</svelte:head>
<main id="main">
  <section class="creator-hero">
    <div class="creator-hero-top">
      <p class="eyebrow">PRIVATE NETWORKS / AGENTIC ENGINEERING</p>
      <span class="hero-edition">BUILT FOR INDEPENDENT BUILDERS</span>
    </div>
    <div class="creator-hero-grid">
      <div>
        <h1>Share the practice.<br /><em>Package the work.</em></h1>
        <p class="lede">
          Build a private home for your agentic engineering techniques and the tools behind them.
          Bring MCP servers, agent plugins and skills together with the context that makes them
          useful.
        </p>
        <div class="hero-actions">
          <a class="button" href="/apply" data-impact="primary_action"
            >Apply as a creator <Icon name="arrow-right" /></a
          ><a class="inline-link" href="#network-preview"
            >Explore the possibilities <Icon name="arrow-down" /></a
          >
        </div>
        <p class="hero-note">
          Reviewed creators. Your offerings, your prices. Invited creators receive one free month
          after approval.
        </p>
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
            <p>Techniques / packages / lessons learned</p>
          </div>
        </div>
        <div class="field-route"><span>CURATE + PUBLISH</span></div>
        <div class="field-network">
          <div class="field-network-header">
            <span>YOUR PRIVATE NETWORK</span><Icon name="network" size={20} />
          </div>
          <strong>From working code<br />to shared understanding.</strong>
          <div class="field-topics">
            <span>MCP servers</span><span>Agent plugins & skills</span><span
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
  {#if data.selfServiceEnabled}
    <section id="pricing" class="launch-plan">
      <div>
        <p class="eyebrow">CREATOR / MONTHLY</p>
        <h2>A private home<br />for your <em>practice.</em></h2>
        <p>For independent creators teaching agent workflows, technical methods, and research.</p>
      </div>
      <div>
        <p class="plan-price">$24.50 <span>USD / month per network</span></p>
        <ul>
          <li>One owner and 100 active members</li>
          <li>20 sessions, up to 30 minutes and 1 GB each</li>
          <li>5,000 delivered video minutes per calendar month</li>
          <li>Private access and selected public previews</li>
          <li>Your network address, membership controls, and record export</li>
        </ul>
        <p>No automatic overage charges. Cancel renewal through your billing portal.</p>
        <a class="button" href="/apply">Apply to create a network <Icon name="arrow-right" /></a>
        <p class="muted">
          Custom domains, migrations, and bespoke integrations are available through a separately
          scoped managed build.
        </p>
      </div>
    </section>
  {/if}
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
            Your network name, structure and access rules. Choose your asset prices and document the
            permissions, evaluation and support behind each release.
          </p>
        </div>
      </article>
    </div>
  </section>
  <section class="creator-handoff" id="start">
    <div>
      <p class="eyebrow">04 / A REVIEWED CREATOR NETWORK</p>
      <h2>Useful work.<br /><em>A standard worth sharing.</em></h2>
      <p>
        Show your credentials and teach one concrete agentic engineering technique. Once approved,
        build a network around the practice and assets you want to share.
      </p>
      <a class="button" href="/apply" data-impact="primary_action"
        >Apply as a creator <Icon name="arrow-right" /></a
      >
      <p>
        <a href="/support">Company project? Explore private support <Icon name="arrow-right" /></a>
      </p>
    </div>
    <div class="delivery-steps">
      <article>
        <span>01 / SUBMIT</span>
        <h3>Credentials and a teaching video.</h3>
        <p>Explain the technique, its constraints, how you evaluated it, and where it can fail.</p>
      </article>
      <article>
        <span>02 / REVIEW</span>
        <h3>Human judgment before access.</h3>
        <p>
          Every creator is reviewed. An invitation from another creator includes a free month of
          hosting after approval.
        </p>
      </article>
      <article>
        <span>03 / SHARE</span>
        <h3>Your practice, your offerings.</h3>
        <p>
          Teach in private sessions, sell composable assets at your own prices, and record the
          evidence behind your work.
        </p>
      </article>
    </div>
  </section>
</main>

<style>
  .launch-plan {
    padding: 80px 4.5vw;
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8vw;
  }
  .launch-plan h2 {
    font-size: clamp(36px, 4vw, 60px);
    letter-spacing: -2px;
  }
  .plan-price {
    font-size: 48px;
    letter-spacing: -2px;
  }
  .plan-price span {
    display: block;
    font-size: 14px;
    letter-spacing: 0;
    color: var(--muted);
  }
  .launch-plan li {
    line-height: 1.6;
    margin: 12px 0;
  }
  .launch-plan .muted {
    font-size: 13px;
    margin-top: 24px;
  }
  @media (max-width: 760px) {
    .launch-plan {
      grid-template-columns: 1fr;
      gap: 32px;
      padding-top: 48px;
      padding-bottom: 48px;
    }
  }
</style>
