<script lang="ts">
  import { BOOKING_URL } from '$lib/client';
</script>

<svelte:head>
  <title>Private content networks, built for you | CREATE SOMETHING Private</title>
  <meta
    name="description"
    content="A branded home for your video library and members. CREATE SOMETHING builds, launches, and supports private content networks on your own domain."
  />
  <link rel="canonical" href="https://private.createsomething.agency/" />
</svelte:head>
<main id="main">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">01 / YOUR OWN CONTENT NETWORK</p>
      <h1>Make room<br />for{' '}<em>your people.</em></h1>
      <p class="lede">
        Your films, courses, and field knowledge deserve a home of their own. We build private
        content networks around your brand, your audience, and the way you want to share.
      </p>
      <a class="button" href={BOOKING_URL}>Discuss your network <span aria-hidden="true">↗</span></a
      >
      <p class="hero-note">Built for you. On your domain. Supported after launch.</p>
    </div>
    <a
      class="hero-library"
      href="/library"
      aria-label="Explore the CREATE SOMETHING demonstration library"
    >
      <div class="library-chrome">
        <span>PRIVATE / LIBRARY</span><span class="status-dot">YOUR BRAND HERE</span>
      </div>
      <div class="cover-study">
        <div class="study-grid"></div>
        <span class="study-label">A SPACE TO GO DEEPER</span>
        <div class="study-title">Beyond<br /><i>the feed.</i></div>
        <span class="study-index">FIELD NOTES / VOL. 01</span><span
          class="play-mark"
          aria-hidden="true">↗</span
        >
      </div>
      <div class="library-caption">
        <div>
          <span class="eyebrow">CREATE SOMETHING / DEMONSTRATION</span>
          <h2>A library with a point of view.</h2>
        </div>
        <span aria-hidden="true">↗</span>
      </div>
    </a>
  </section>
  <div class="scope-strip" aria-label="Service essentials">
    <span>YOUR DOMAIN</span><span>MEMBER ACCESS</span><span>VIDEO PUBLISHING</span><span
      >ONGOING SUPPORT</span
    >
  </div>
  <section class="service-section" id="the-service">
    <div>
      <p class="eyebrow">02 / WHAT WE BUILD</p>
      <h2>A destination.<br /><em>And the system behind it.</em></h2>
      <p class="section-intro">
        A public feed can help people find you. Your own network gives them somewhere to stay,
        learn, and return.
      </p>
    </div>
    <div class="service-rows">
      <article>
        <span>01</span>
        <div>
          <h3>A library that feels like you</h3>
          <p>
            Your visual identity, curated series, and a watch experience that works across screens.
            Bring your existing content; we plan the migration with you.
          </p>
        </div>
      </article>
      <article>
        <span>02</span>
        <div>
          <h3>Access you can control</h3>
          <p>
            Invite members, publish a public preview, and keep the rest private. Paid memberships
            can be included when your business needs them.
          </p>
        </div>
      </article>
      <article>
        <span>03</span>
        <div>
          <h3>A publishing workflow you can run</h3>
          <p>
            Upload, review, and publish from one place. See playback requests and keep a record of
            publishing and access changes.
          </p>
        </div>
      </article>
      <article>
        <span>04</span>
        <div>
          <h3>Someone there after launch</h3>
          <p>
            Documented operation, training, and a support agreement with clear responsibilities. You
            know what you own and who to call.
          </p>
        </div>
      </article>
    </div>
  </section>
  <section class="delivery-section">
    <p class="eyebrow">03 / FROM LIBRARY TO LAUNCH</p>
    <h2>Built around your content.<br /><em>Scoped before we start.</em></h2>
    <div class="delivery-grid">
      <article>
        <span>01 / DEFINE</span>
        <h3>Find the right shape.</h3>
        <p>
          We review your library, audience, access model, and brand. You receive a scope with
          deliverables, responsibilities, and acceptance criteria.
        </p>
      </article>
      <article>
        <span>02 / BUILD</span>
        <h3>Make it yours.</h3>
        <p>
          We configure your network, migrate the agreed content, and test the publishing and member
          experience together.
        </p>
      </article>
      <article>
        <span>03 / OPERATE</span>
        <h3>Launch with a plan.</h3>
        <p>
          Your team gets training and a runbook. Hosting, video usage, and ongoing support are
          defined in your agreement.
        </p>
      </article>
    </div>
  </section>
  <section class="invitation">
    <div>
      <p class="eyebrow">04 / START A CONVERSATION</p>
      <h2>What would you<br /><em>put inside?</em></h2>
    </div>
    <div>
      <p>
        Bring a library, an audience, or a plan for one. We’ll help you define a network worth
        building.
      </p>
      <p class="muted">
        Custom implementation + ongoing operations. Your quote separates the build, support, and
        video usage. Content production and additional integrations are scoped separately.
      </p>
      <a class="button" href={BOOKING_URL}>Discuss your network <span aria-hidden="true">↗</span></a
      >
    </div>
  </section>
</main>
