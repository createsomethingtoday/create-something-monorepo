<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import NetworkPreview from '$lib/components/NetworkPreview.svelte';
  import DitherScene from '$lib/components/DitherScene.svelte';
  import HumanInkHero from '$lib/components/HumanInkHero.svelte';
  import '$lib/home.css';
  let { data } = $props();
  const topics = [
    ['MCP servers', 'Connect agents to the tools and context behind your practice.', 'en-blue'],
    [
      'Agent plugins',
      'Package a working approach with the boundaries and evidence to use it.',
      'en-orange'
    ],
    ['Skills', 'Share repeatable techniques, methods, and the judgment behind them.', 'en-pink'],
    [
      'Private sessions',
      'Teach the implementation in video series built around what people learn.',
      'en-green'
    ]
  ];
  const features = [
    [
      'Organize around what people learn',
      'Group video walkthroughs into your own series: agent architecture, tool use, evals, or the next subject you want to explore.'
    ],
    [
      'Choose what stays private',
      'Invite members and publish public previews. Decide which lessons welcome new people and which belong inside your network.'
    ],
    [
      'Publish without rebuilding a platform',
      'Upload a private draft, check processing, then publish. Manage content and member access from one creator workspace.'
    ],
    [
      'Make it unmistakably yours',
      'Your network name, structure and access rules. Choose your asset prices and document the permissions, evaluation and support behind each release.'
    ]
  ];
</script>

<svelte:head>
  <title>Private networks for agentic engineering builders | CREATE SOMETHING</title>
  <meta
    name="description"
    content="A private home for agentic engineering builders: share techniques and package MCP servers, agent plugins and skills with the context to use them."
  />
  <link rel="canonical" href="https://private.createsomething.agency/" />
</svelte:head>

<main id="main" class="en-home">
  <section class="en-hero en-frame" aria-labelledby="home-heading">
    <div class="en-hero-heading">
      <h1 id="home-heading">Share the practice.<br /><em>Package the work.</em></h1>
      <div class="en-hero-copy">
        <p>
          A private home for agentic engineering builders. Bring MCP servers, agent plugins and
          skills together with the context that makes them useful.
        </p>
        <div class="en-actions">
          <a class="en-button" href="/join" data-impact="primary_action"
            >Request an invitation <Icon name="arrow-right" /></a
          ><a class="en-link" href="#network-preview"
            >Explore the possibilities <Icon name="arrow-down" /></a
          >
        </div>
        <p class="en-note">
          Reviewed creators. Your offerings, your prices. One free month after approval.
        </p>
      </div>
    </div>
    <div class="en-hero-tiles">
      <div class="en-art-tile"><HumanInkHero /></div>
      <a class="en-topic en-blue" href="#network-preview"
        ><span>For educators</span><span class="en-tile-title"
          >Turn working knowledge into shared understanding.<small>Teach the technique.</small
          ></span
        ></a
      >
      <div class="en-shape-tile" aria-hidden="true">
        <svg viewBox="0 0 100 100"
          >{#each Array(12) as _, i}<rect
              x="45"
              y="0"
              width="10"
              height="50"
              transform="rotate({i * 30} 50 50)"
            />{/each}</svg
        >
      </div>
      <a href="#the-service" aria-label="Explore how your private network works"
        ><DitherScene
          src="/media/human-ink/practice.webp"
          alt="A builder turns working notes into a teaching practice."
          tone="4a78ff"
        /></a
      >
      <a class="en-topic en-pink" href="#network-preview"
        ><span>For researchers</span><span class="en-tile-title"
          >Experiments worth repeating.<small>Share what you learned.</small></span
        ></a
      >
      <a href="#start" aria-label="Learn how to become a reviewed creator"
        ><DitherScene
          src="/media/human-ink/exchange.webp"
          alt="Two people exchange knowledge across a table."
          tone="86e0a9"
        /></a
      >
    </div>
  </section>
  <section class="en-frame en-topics" aria-labelledby="topics-heading">
    <div class="en-section-heading">
      <h2 id="topics-heading">A practice, with<br />everything behind it.</h2>
      <p>
        Bring the work and the explanation together. A private network gives your techniques, tools,
        and teaching a deliberate home.
      </p>
    </div>
    <ul class="en-topic-grid">
      {#each topics as topic, i}<li>
          <a class={topic[2]} href="#the-service"
            ><span class="en-topic-top"
              ><span>0{i + 1} / Your network</span><svg viewBox="0 0 100 100" aria-hidden="true"
                >{#if i === 0}<circle cx="50" cy="50" r="50" />{:else if i === 1}<path
                    d="M0 48A50 50 0 0 1 100 48ZM0 52H100A50 50 0 0 1 0 52Z"
                  />{:else if i === 2}<circle cx="25" cy="25" r="23" /><circle
                    cx="75"
                    cy="25"
                    r="23"
                  /><circle cx="25" cy="75" r="23" /><circle
                    cx="75"
                    cy="75"
                    r="23"
                  />{:else}{#each Array(12) as _, j}<rect
                      x="45"
                      y="0"
                      width="10"
                      height="50"
                      transform="rotate({j * 30} 50 50)"
                    />{/each}{/if}</svg
              ></span
            ><span
              ><h3>{topic[0]}</h3>
              <p>{topic[1]}</p></span
            ></a
          >
        </li>{/each}
    </ul>
  </section>
  <div class="en-frame en-preview"><NetworkPreview /></div>
  {#if data.selfServiceEnabled}
    <section id="pricing" class="en-frame en-pricing">
      <div class="en-section-heading">
        <h2>A private home<br />for your practice.</h2>
        <p>For independent creators teaching agent workflows, technical methods, and research.</p>
      </div>
      <div class="en-price-grid">
        <div class="en-price-tile">
          <span>Creator / monthly</span>
          <p class="en-price">$24.50</p>
          <p>USD / month per network</p>
          <ul>
            <li>One owner and 100 active members</li>
            <li>20 sessions, up to 30 minutes and 1 GB each</li>
            <li>5,000 delivered video minutes per calendar month</li>
            <li>Private access and selected public previews</li>
            <li>Your network address, membership controls, and record export</li>
          </ul>
          <p>No automatic overage charges. Cancel renewal through your billing portal.</p>
          <a class="en-button" href="/join">Introduce your practice <Icon name="arrow-right" /></a>
        </div>
        <div class="en-price-tile en-dark">
          <span>A more specific home</span>
          <h3>Built around<br />your practice.</h3>
          <p>
            Custom domains, migrations, and bespoke integrations are available through a separately
            scoped managed build.
          </p>
          <a class="en-button en-accent" href="/support"
            >Explore private support <Icon name="arrow-right" /></a
          >
        </div>
      </div>
    </section>
  {/if}
  <section class="en-dark en-service" id="the-service">
    <div class="en-frame">
      <div class="en-section-heading">
        <h2>Keep the depth.<br />Choose the boundaries.</h2>
        <p>
          Your work can be public. Your deeper explanation can have a more deliberate home. We build
          the library, access, and publishing workflow around how you want to teach.
        </p>
      </div>
      <ol class="en-feature-grid">
        {#each features as feature, index}<li>
            <span class="en-number">0{index + 1}</span>
            <h3>{feature[0]}</h3>
            <p>{feature[1]}</p>
          </li>{/each}
      </ol>
    </div>
  </section>
  <section class="en-frame en-start" id="start">
    <div class="en-section-heading">
      <h2>Useful work.<br />A standard worth sharing.</h2>
      <p>
        Show your credentials and teach one concrete agentic engineering technique. Once approved,
        build a network around the practice and assets you want to share.
      </p>
    </div>
    <ol class="en-steps">
      <li>
        <span>01 / Submit</span>
        <h3>Credentials and a teaching video.</h3>
        <p>Explain the technique, its constraints, how you evaluated it, and where it can fail.</p>
      </li>
      <li>
        <span>02 / Review</span>
        <h3>Human judgment before access.</h3>
        <p>
          Every creator is reviewed. An invitation from another creator includes a free month of
          hosting after approval.
        </p>
      </li>
      <li>
        <span>03 / Share</span>
        <h3>Your practice, your offerings.</h3>
        <p>
          Teach in private sessions, sell composable assets at your own prices, and record the
          evidence behind your work.
        </p>
      </li>
    </ol>
    <div class="en-cta">
      <div>
        <h2>Your practice.<br />A home of its own.</h2>
        <div class="en-actions">
          <a class="en-button" href="/join" data-impact="primary_action"
            >Request an invitation <Icon name="arrow-right" /></a
          >
          <p>
            Company project?<br /><a class="en-link" href="/support"
              >Explore private support <Icon name="arrow-right" /></a
            >
          </p>
        </div>
      </div>
      <div class="en-cta-shape" aria-hidden="true">
        <svg viewBox="0 0 100 100"
          ><circle cx="25" cy="25" r="23" /><circle cx="75" cy="25" r="23" /><circle
            cx="25"
            cy="75"
            r="23"
          /><circle cx="75" cy="75" r="23" /></svg
        >
      </div>
    </div>
  </section>
</main>
