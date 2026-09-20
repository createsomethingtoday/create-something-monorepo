<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head
  ><title>Show your field engineering practice | CREATE SOMETHING Private</title><meta
    name="description"
    content="Make your agentic engineering practice inspectable: teach a technique, package the implementation, and document evaluation and field outcomes."
  /><link
    rel="canonical"
    href="https://private.createsomething.agency/field-engineering"
  /></svelte:head
>
<main id="main">
  <section class="creator-hero">
    <p class="eyebrow">PRIVATE / FORWARD DEPLOYED ENGINEERING</p>
    <div class="creator-hero-grid">
      <div>
        <h1>Show how you work<br /><em>when it matters.</em></h1>
        <p class="lede">
          A working demo starts the conversation. Your decisions, constraints and evidence show the
          engineering behind it. Build a private network around the practice you can explain and
          help others apply.
        </p>
        <a class="button" href="/apply" data-impact="primary_action"
          >Apply as a creator <Icon name="arrow-right" /></a
        >
        <p class="hero-note">Credentials + a teaching video. Every creator is reviewed.</p>
      </div>
      <aside class="field-dossier">
        <div class="field-caption">
          <span>FIELD NOTE / EXAMPLE STRUCTURE</span><Icon name="workflow" size={24} />
        </div>
        <h2>From a client problem<br />to a repeatable technique.</h2>
        <dl>
          <dt>01 / CONTEXT</dt>
          <dd>Workflow, operator, constraint, baseline.</dd>
          <dt>02 / IMPLEMENTATION</dt>
          <dd>MCP, skill, permissions, human review.</dd>
          <dt>03 / EVALUATION</dt>
          <dd>Test cases, failures, recovery, limits.</dd>
          <dt>04 / FIELD RESULT</dt>
          <dd>Observed change, evidence, attribution.</dd>
        </dl>
        <p class="field-hint">
          A suggested evidence structure, not a completed project or certification.
        </p>
      </aside>
    </div>
  </section>
  <section class="builder-workspace">
    <p class="eyebrow">TEACH / PACKAGE / PROVE</p>
    <h2>Make the reasoning<br /><em>as useful as the code.</em></h2>
    <ol class="practice-steps">
      <li>
        <span><Icon name="terminal" /> TEACH THE TECHNIQUE</span>Walk through one real engineering
        decision, including the failure you designed for.
      </li>
      <li>
        <span><Icon name="package" /> SHARE THE ARTIFACT</span>Package the MCP, plugin or skill with
        permissions, installation, evaluation and recovery guidance.
      </li>
      <li>
        <span><Icon name="workflow" /> RECORD THE RESULT</span>Keep engagement, successful
        reproduction and customer outcomes separate. Explain how each was measured.
      </li>
    </ol>
    <div class="builder-split">
      <div>
        <h2>A portfolio people<br />can inspect.</h2>
        <p>
          Use sessions to explain your practice and versioned assets to share the implementation.
          Keep client work private and publish only what you have permission to share.
        </p>
        <p>
          Views and downloads show interest. They do not establish skill, successful deployment or
          customer impact. Private does not issue a forward deployed engineer certification.
        </p>
      </div>
      <aside class="builder-panel">
        <p class="eyebrow">COMPANIES / PRIVATE SUPPORT</p>
        <h2>Work through your<br />agentic project.</h2>
        <p>
          CREATE SOMETHING’s $900/month subscription brings scoped guidance to one agreed workflow.
          Delivery is reserved for approved partners. Custom builds and managed operations are
          scoped separately.
        </p>
        <a href="/support">Explore company support <Icon name="arrow-right" /></a>
      </aside>
    </div>
  </section>
</main>
