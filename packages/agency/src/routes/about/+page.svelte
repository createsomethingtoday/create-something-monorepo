<script lang="ts">
  import { SEO } from '@create-something/canon';
</script>

<SEO
  title="Micah Johnson | CREATE SOMETHING .agency"
  description="A note from Micah Johnson on CREATE SOMETHING: AI-native technical support, human judgment, and work your team can understand and keep using."
  keywords="Micah Johnson, AI-native technical support, CREATE SOMETHING, workflow engineering"
  ogImage="/og-image.png"
  propertyName="agency"
/>

<div class="about-desk">
  <div class="page-label"><span>CREATE SOMETHING</span><span>About the work</span></div>
  <article class="about-letter" aria-labelledby="about-title">
    <span class="paper-tape" aria-hidden="true"></span>
    <header class="letter-heading">
      <p class="letter-kicker">A note from Micah Johnson</p>
      <h1 id="about-title">Good tools still<br />need people.</h1>
      <p class="letter-category">AI-native Technical support</p>
    </header>
    <div class="letter-body">
      <p>I help teams fix, improve, and use their tools. Sometimes that means repairing a broken handoff. Sometimes it means connecting software or helping someone make sense of an AI-built project. The starting point is the work you need to do.</p>
      <p>I played Division III basketball. It taught me to read the whole floor before forcing the next move: who is doing what, where the pressure is, and what happens next. Later, working as an equine veterinary technician made clear records and continuity of care feel concrete. Those habits stay with me in technical work.</p>
      <p>That is the approach behind CREATE SOMETHING. First, understand the task and the people responsible for it. Remove unnecessary steps. Then build the agreed change and check that it works.</p>
      <p>AI can take on useful work, but the decisions still need an owner. Before connecting tools, we agree on access, what may run, what needs approval, and when to stop. A connection is useful when your team can understand and trust what it does.</p>
      <p>The work should remain inspectable afterward: the changes, the checks, the instructions, and a way to recover. Ownership follows our agreement. Support helps your team use what we deliver and carries the context into the next improvement.</p>
      <p>CREATE SOMETHING connects <a href="https://createsomething.ltd">philosophy</a>, <a href="https://createsomething.io">research</a>, <a href="https://createsomething.space">experiments</a>, and client work. Each gives the others something to learn from. Here at .agency, that learning has a practical purpose: help your tools work better, and help you use them.</p>
      <p>If you have a task that needs attention, bring the tools involved and an example of the result you need. We can start there.</p>
    </div>
    <footer class="letter-signoff">
      <p>Micah Johnson<span>CREATE SOMETHING</span></p>
      <a href="/book">Talk through your workflow <span aria-hidden="true">↗</span></a>
    </footer>
  </article>
  <nav class="letter-next" aria-label="Explore CREATE SOMETHING">
    <a href="/services">Services and membership <span aria-hidden="true">↗</span></a>
    <a href="/products#cato-tour">See the work <span aria-hidden="true">↗</span></a>
    <a href="/stack">What you keep <span aria-hidden="true">↗</span></a>
  </nav>
</div>

<style>
  .about-desk {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
    padding: clamp(7rem, 12vw, 10rem) clamp(1.25rem, 5vw, 4rem) 5rem;
  }
  .page-label, .letter-next { max-width: 48rem; margin-inline: auto; }
  .page-label { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 3rem; font: .7rem/1.5 var(--font-performance-mono, monospace); letter-spacing: .04em; }
  .about-letter {
    position: relative;
    max-width: 48rem;
    margin-inline: auto;
    padding: clamp(2rem, 6vw, 5rem);
    background: #fffef9;
    color: #171717;
    border: 1px solid #deddd5;
    box-shadow: 0 3px 5px #09090908, 0 18px 44px #0909090d;
    transform: rotate(-.6deg);
  }
  .paper-tape { position: absolute; width: 8rem; height: 2rem; top: -1rem; left: calc(50% - 4rem); transform: rotate(3deg); background: #dedcd1b3; border-inline: 1px solid #d0cec380; }
  .letter-heading { margin-bottom: 2.5rem; }
  .letter-kicker, .letter-category { font: .75rem/1.6 var(--font-performance-mono, monospace); }
  .letter-kicker { margin: 0 0 1.5rem; }
  .about-letter h1 { font: 500 clamp(2.5rem, 5vw, 4rem)/1.08 var(--font-performance-interface, sans-serif); letter-spacing: -.04em; margin: 0 0 1.5rem; }
  .letter-category { margin: 0; color: #55554e; }
  .letter-body { font: 400 1.0625rem/1.85 var(--font-performance-interface, sans-serif); }
  .letter-body p { margin: 0 0 1.35em; }
  .about-letter a, .letter-next a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: .23em; }
  .about-letter a:focus-visible, .letter-next a:focus-visible { outline: 2px solid var(--color-performance-focus, #0057b8); outline-offset: 5px; }
  .letter-signoff { margin-top: 2.5rem; padding-top: 1.75rem; border-top: 1px solid #deddd5; }
  .letter-signoff p { margin: 0 0 1.25rem; font-size: 1rem; line-height: 1.6; font-weight: 500; }
  .letter-signoff p span { display: block; margin-top: .35rem; font: .7rem/1.6 var(--font-performance-mono, monospace); letter-spacing: .035em; }
  .letter-signoff a { display: inline-flex; align-items: center; gap: 1rem; min-height: 44px; font-size: .9375rem; }
  .letter-next { display: flex; justify-content: center; flex-wrap: wrap; gap: .5rem 2rem; margin-top: 2.5rem; }
  .letter-next a { display: inline-flex; align-items: center; gap: .5rem; min-height: 44px; font-size: .8125rem; }
  @media (max-width: 600px) {
    .about-desk { padding-inline: 1rem; padding-bottom: 3rem; }
    .page-label { font-size: .625rem; margin-bottom: 2.5rem; }
    .about-letter { transform: none; padding: 2.5rem 1.5rem 2rem; }
    .letter-body { font-size: 1rem; line-height: 1.8; }
    .letter-next { flex-direction: column; align-items: flex-start; margin-top: 1.5rem; padding-inline: .5rem; }
  }
  @media (prefers-reduced-motion: reduce) { .about-letter, .paper-tape { transform: none; } }
  @media print {
    :global(html:has(.about-desk)), :global(body:has(.about-desk)) { background: white !important; color: #171717; }
    :global(body:has(.about-desk) .layout-root > :not(main)),
    :global(body:has(.about-desk) .agency-surface > :not(.layout-root)) { display: none !important; }
    :global(body:has(.about-desk) main#main-content) { padding-top: 0 !important; }
    .about-desk { background: white; padding: 0; }
    .about-letter { max-width: none; padding: 0; background: white; box-shadow: none; border: 0; transform: none; }
    .page-label, .paper-tape, .letter-next { display: none; }
    .letter-body { font-size: 11pt; line-height: 1.55; }
    .letter-heading, .letter-signoff { break-inside: avoid; }
    .letter-body p { orphans: 3; widows: 3; }
  }
</style>
