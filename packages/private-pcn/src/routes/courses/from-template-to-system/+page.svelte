<script lang="ts">
  import SerifPhrase from '$lib/components/SerifPhrase.svelte';
  const lessons = [
    { title: 'Choose the foundation', outcome: 'Compare templates against a business brief, licensing and structural fit. Make the purchase decision yourself.' },
    { title: 'Define the design language', outcome: 'Write a language contract for a fictional restoration workshop. Review the voice, hierarchy and constraints before requesting changes.' },
    { title: 'Tailor with Webflow MCP', outcome: 'Inspect the site and available tools, approve a bounded change, then verify its responsive result.' },
    { title: 'Add a validated interaction', outcome: 'Build and test accessible form validation in a React code component. Keep demonstration submission synthetic.' },
    { title: 'Verify and hand off', outcome: 'Check the result against the original brief. Document evidence, limitations and recovery instructions.' }
  ];
  const worksheets = [
    ['business-brief.md', 'Synthetic business brief'],
    ['template-comparison.md', 'Template comparison worksheet'],
    ['business-language.md', 'Design-language draft'],
    ['decision-log.md', 'Decision log worksheet'],
    ['form-validation-spec.md', 'Form validation specification']
  ];
</script>

<svelte:head>
  <title>From Template to System — course in progress | CREATE SOMETHING Private</title>
  <meta name="description" content="Follow the preparation of an agentic Webflow course with Codex: a purchased foundation, an approved design language, bounded changes and verification. Recording is next." />
  <link rel="canonical" href="https://private.createsomething.agency/courses/from-template-to-system" />
</svelte:head>
<main id="main" class="course-page">
  <section class="course-hero" aria-labelledby="course-title">
    <p class="eyebrow">PRIVATE / COURSE IN PROGRESS</p>
    <h1 id="course-title">From Template<br /><SerifPhrase text="to System." /></h1>
    <p class="lede">Agentic Webflow with Codex. Start with a purchased foundation. Define a language. Make bounded changes. Verify the result.</p>
    <p>For Webflow builders who want to work with an agent and keep their product judgment visible. The planned course uses a fictional furniture restoration workshop and a form interaction learners will build and test.</p>
    <a class="button" href="#course-outline">Explore the outline</a>
    <aside class="course-status" aria-label="Course production status">
      <strong>Recording is next.</strong>
      <p>The course direction and preparation package are approved. Lessons have not been recorded or released. You can review the outline and use the original preparation worksheets below.</p>
    </aside>
    <p class="disclosure">Micah Johnson works at Webflow. This course reflects his teaching approach and perspective. Documented capabilities and human decisions will be identified separately.</p>
  </section>
  <section class="course-section" aria-labelledby="course-outcome">
    <p class="eyebrow">BRIEF / INSPECT / APPROVE / APPLY / VERIFY</p>
    <h2 id="course-outcome">Make the decisions <SerifPhrase text="inspectable." /></h2>
    <div class="course-split">
      <div><h3>What you will practice</h3><p>Template selection, a design-language contract, bounded agent changes, form validation and an evidence-backed handoff. The goal is a deliberate site and a record of why it works.</p></div>
      <div><h3>Before you begin</h3><p>Basic Webflow Designer and responsive-layout familiarity. Template purchase, plan entitlements and official MCP access are separate requirements. Looking for a template that supplies roughly 70–80% of the foundation is a teaching heuristic, not a guarantee of time saved.</p></div>
    </div>
  </section>
  <section id="course-outline" class="course-section" aria-labelledby="outline-title">
    <p class="eyebrow">PLANNED CURRICULUM / FIVE LESSONS</p>
    <h2 id="outline-title">From a foundation <SerifPhrase text="to a verified result." /></h2>
    <ol class="course-lessons">
      {#each lessons as lesson, i}
        <li><span class="lesson-number">0{i + 1} / PLANNED</span><div><h3>{lesson.title}</h3><p>{lesson.outcome}</p></div></li>
      {/each}
    </ol>
    <p class="course-note">This is a preparation outline. No lesson playback, enrollment, release date, price or completion credential is offered here. Later app development is outside the initial course.</p>
  </section>
  <section class="course-section" aria-labelledby="worksheets-title">
    <p class="eyebrow">ORIGINAL PREPARATION MATERIAL</p>
    <h2 id="worksheets-title">Start with <SerifPhrase text="the brief." /></h2>
    <p>These text worksheets are original course preparation assets for a synthetic business. They contain no purchased template files. They are useful starting points; site changes and a real submission backend still need review and verification.</p>
    <ul class="worksheets">
      {#each worksheets as [filename, label]}
        <li><a href="/courses/from-template-to-system/{filename}" download>{label} <span aria-hidden="true">↓</span></a></li>
      {/each}
    </ul>
    <p class="course-note">Template rights are separate: a purchased template is licensed for its end product and is not redistributed in this kit. Check current <a href="https://webflow.com/templates/template-licenses">Webflow template licensing</a> and <a href="https://developers.webflow.com/mcp/reference/overview">MCP capabilities</a> before starting.</p>
  </section>
</main>
<style>
  .course-page{max-width:1200px;margin:0 auto;padding:0 var(--pcn-page-gutter)}
  .course-hero{padding:var(--pcn-section-space) 0 var(--pcn-section-space-compact)}
  .course-hero h1{font-size:clamp(3rem,7vw,6.2rem);line-height:1.05;letter-spacing:-.04em;margin:24px 0}
  .course-hero>p{max-width:780px}.course-hero .lede{font-size:clamp(1.25rem,2.5vw,1.65rem)}
  .course-hero .button{margin:20px 0}.course-status{border:1px solid var(--line);padding:24px;max-width:780px;margin:24px 0}.course-status p{margin-bottom:0}
  .disclosure,.course-note{font-size:var(--pcn-text-metadata);color:var(--muted);max-width:850px}
  .course-section{padding:var(--pcn-section-space-compact) 0;border-top:1px solid var(--line);scroll-margin-top:24px}
  .course-section h2{font-size:clamp(2rem,4vw,3rem);line-height:1.15;max-width:900px}
  .course-split{display:grid;grid-template-columns:1fr 1fr;gap:40px}.course-split h3{font-size:1.2rem}
  .course-lessons{list-style:none;padding:0;margin:32px 0}.course-lessons li{display:grid;grid-template-columns:150px 1fr;gap:24px;padding:24px 0;border-top:1px solid var(--line)}
  .lesson-number{font:12px/1.6 monospace;letter-spacing:1px;color:var(--muted)}.course-lessons h3{margin:0;font-size:1.5rem}.course-lessons p{max-width:760px;margin-bottom:0}
  .worksheets{padding-left:20px}.worksheets li{padding:9px 0}.worksheets a{display:inline-block;padding:3px 0}
  @media(max-width:640px){.course-split{grid-template-columns:1fr;gap:16px}.course-lessons li{grid-template-columns:1fr;gap:10px}.course-status{padding:20px}}
</style>
