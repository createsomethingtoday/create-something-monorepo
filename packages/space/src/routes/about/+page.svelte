<script lang="ts">
  import { SEO } from '@create-something/canon';
  import '$lib/workshop/workshop.css';
</script>

<SEO
  title="About the Workshop | CREATE SOMETHING .space"
  description="Why CREATE SOMETHING shares tools, workflows, skills, and reusable code."
  propertyName="space"
  ogImage="/images/workshop/open-workshop.webp"
/>
<article class="workshop">
  <header class="wrap section">
    <p class="eyebrow">About the workshop</p>
    <h1>Made through use.<br />Shared for reuse.</h1>
  </header>
  <section class="wrap body">
    <p class="lead">
      CREATE SOMETHING builds systems that connect tools and AI. This workshop is where we share the
      useful parts: a way to verify code, a method for defining work, a small library that makes the
      next project easier.
    </p>
    <p>
      Each project starts with a particular problem. We publish the source and explain its
      boundaries so you can decide whether it fits yours. Some entries are installable packages.
      Others are building blocks to study and adapt.
    </p>
    <h2>The work continues in public.</h2>
    <p>
      Try something. Report a bug with a reproducible example. Improve the documentation, or
      contribute a change through the project repository. You do not need to become a client to use
      the public work.
    </p>
    <h2>One practice, several places.</h2>
    <p>
      <a href="/workbench">The Workbench</a> holds our interactive tools.
      <a href="https://createsomething.io">.io</a>
      publishes the research and findings behind the work.
      <a href="https://createsomething.agency">.agency</a> is where teams commission implementations and
      ongoing operations.
    </p>
  </section>
  <footer class="wrap section">
    <h2>Find something worth using.</h2>
    <div class="actions">
      <a class="primary" href="/projects">Explore projects ↗</a><a
        class="text-link"
        href="https://github.com/createsomethingtoday">Contribute on GitHub ↗</a
      >
    </div>
  </footer>
</article>

<style>
  .body {
    max-width: 850px;
  }
  header h1 {
    margin-top: 1.5rem;
  }
  .body p {
    margin-bottom: 2rem;
  }
  .body h2 {
    font-size: 2rem;
    margin: 3rem 0 1rem;
  }
  .body a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
</style>
