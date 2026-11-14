<script lang="ts">
  import '$lib/vnext/theme.css';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import TextField from '$lib/components/form/TextField.svelte';
  import Alert from '$lib/components/feedback/Alert.svelte';
  import Select from '$lib/components/form/Select.svelte';
  import Checkbox from '$lib/components/form/Checkbox.svelte';
  import { Workbench } from '$lib/vnext';
  import ChapterRuler from '$lib/wayfinding/ChapterRuler.svelte';
  import CanonCompanion from '$lib/character/CanonCompanion.svelte';
  let dark = $state(true);
  let name = $state('');
  let choice = $state('recap');
  let checked = $state(true);
  let guideMenu: HTMLDetailsElement | undefined;
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && guideMenu?.open && guideMenu.contains(document.activeElement)) {
    guideMenu.open = false;
    guideMenu.querySelector('summary')?.focus();
  }
}} />

<svelte:head
  ><title>Canon · A capable companion</title><meta
    name="description"
    content="Explore the next Canon: a calm, approachable system for useful work and clear decisions."
  /><link rel="preload" as="image" href="/canon-next/approved-v1/welcome-bench.webp" media="(min-width:768px)" /><link rel="preload" as="image" href="/canon-next/portrait/welcome-bench-portrait.png" media="(max-width:767px)" /></svelte:head
>

<div class="showroom" data-canon-next data-theme={dark ? 'dark' : 'light'}>
  <a class="skip" href="#begin">Skip to content</a>
  <main>
    <header>
      <a class="brand" href="/next"
        >Canon</a
      >
      <nav class="desktop-guides" aria-label="Showroom">
        <a href="/next/components">Components</a><a href="/next/patterns">Patterns</a><a href="/next/character">Character</a><a href="/next/world">World</a>
      </nav>
      <details class="mobile-guides" bind:this={guideMenu}>
        <summary>Guides</summary>
        <nav aria-label="Showroom guides">
          <a href="/next/components">Components</a><a href="/next/patterns">Patterns</a><a href="/next/character">Character</a><a href="/next/world">World</a>
        </nav>
      </details>
      <button
        class="appearance"
        aria-label={dark ? 'Use light appearance' : 'Use dark appearance'}
        onclick={() => (dark = !dark)}
        ><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20"
          ><circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          /><path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor" /></svg
        ><span>Theme</span></button
      >
    </header>
    <ChapterRuler chapters={[
      { id: 'begin', label: 'Begin', note: 'A place for the next small step' },
      { id: 'try', label: 'Try a task', short: 'Try', note: 'Explore a local draft, from scope to review' },
      { id: 'system', label: 'The system', short: 'System', note: 'A shared language for useful work' },
      { id: 'principles', label: 'Principles', short: 'Care', note: 'Measured structure, a warmer presence' }
    ]} />
    <section id="begin" class="hero" data-theme="dark" aria-labelledby="welcome-title" aria-describedby="welcome-scene" tabindex="-1">
      <div class="hero-copy">
        <h1 id="welcome-title">Small steps.<br />Good work.</h1>
        <p>Try a sample meeting task. Decide what to keep.</p>
        <div class="actions"><Button href="#try">Try a small task</Button></div>
      </div>
      <p id="welcome-scene" class="sr-only">Concept illustration: Canon at a small felt-lined workbench, beside paper that has folded itself into a staircase.</p>
    </section>
    <p class="art-caption">Concept illustration · Welcome Bench</p>
    <section id="try" class="opening" aria-labelledby="try-title"><div class="section-heading"><h2 id="try-title">A little help.<br />A decision you own.</h2><p class="muted">Explore a sample meeting task. See the scope, prepare a draft, and decide what to keep.</p></div><Workbench /></section>
    <section id="system">
      <div class="section-heading">
        <h2>A shared language,<br />from hello to handback.</h2>
        <p class="muted">
          Approachable at the beginning. Precise when it matters. These are the same primitives used
          in the sample above.
        </p>
      </div>
      <h3>Color with a purpose</h3>
      <div class="swatches">
        {#each [['bg', 'Foundation'], ['panel', 'Surface'], ['ink', 'Type'], ['action', 'Action'], ['success', 'Success'], ['error', 'Error']] as [role, label]}<div
          >
            <div style={`background:var(--cn-${role})`}></div>
            <strong>{label}</strong><small
              >Semantic role</small
            >
          </div>{/each}
      </div>
      <div class="specimen-row">
        <h3>Type that gives you room</h3>
        <div>
          <p class="display">Make something<br />a little easier.</p>
          <p class="lead">A good next step is one you understand.</p>
          <p>
            Use comfortable body text for the work itself. Reserve strong contrast and weight for
            the decision, rather than asking every label to compete.
          </p>
          <small class="muted">Supporting text · 14px minimum in controls</small>
        </div>
      </div>
      <div class="specimen-row">
        <h3>Actions and states</h3>
        <div>
          <div class="actions">
            <Button variant="primary">Continue</Button><Button variant="secondary">Edit scope</Button><Button
              variant="ghost">Not now</Button
            >
          </div>
          <div class="actions">
            <Button variant="secondary" disabled>Unavailable</Button><Button variant="secondary" loading>Preparing</Button><Button variant="ghost">Keep editing</Button>
          </div>
          <p class="muted">
            Hover to inspect response. Tab to see the focus ring. Loading controls cannot activate.
          </p>
        </div>
      </div>
      <div class="specimen-row">
        <h3>Inputs and choices</h3>
        <div class="stack">
          <TextField
            label="Project name"
            bind:value={name}
            placeholder="Intake pilot"
            description="A name the whole team will recognize."
          /><TextField label="Required detail" value="" error="Add an owner before continuing." /><TextField
            label="Connection"
            value="No account connected"
            disabled
            description="Disabled example"
          />
          <Select label="Draft type" bind:value={choice}>
            <option value="recap">Meeting recap</option><option value="handoff">Project handoff</option>
          </Select>
          <Checkbox label="Include next steps" bind:checked />
          <p>
            <label
              >Detail level <input
                aria-label="Detail level"
                type="range"
                min="1"
                max="3"
                value="2"
              /></label
            >
          </p>
        </div>
      </div>
      <div class="specimen-row">
        <h3>Feedback with a next step</h3>
        <div class="stack">
          <Alert title="Ready when you are">Review the plan before starting.</Alert><Alert
            variant="success"
            title="Draft saved locally">You can return to this draft during the session.</Alert
          ><Alert variant="warning" title="One detail is missing"
            >Choose an owner before approving.</Alert
          ><Alert variant="error" title="This did not finish"
            >Your draft is saved. Retry with the saved sample.</Alert
          >
        </div>
      </div>
      <div class="specimen-row">
        <h3>Surfaces and empty states</h3>
        <div class="stack">
          <Card padding="md"
            ><div class="empty-companion"><CanonCompanion size={96} /><div><h3>A useful place to begin</h3>
            <p>Choose one small task and make the next step visible.</p></div></div></Card
          ><Card padding="md"
            ><h3>Nothing waiting for review</h3>
            <p>
              Your prepared drafts will appear here. Nothing runs without your decision.
            </p></Card
          >
        </div>
      </div>
      <div class="specimen-row">
        <h3>Compact review</h3>
        <div>
          <dl class="cn-facts">
            <div>
              <dt>Object</dt>
              <dd>Intake pilot recap</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>Prepare local draft</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>Human review required</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>Simulation only</dd>
            </div>
          </dl>
          <Button variant="secondary">Review proposed draft</Button>
        </div>
      </div>
      <div class="specimen-row">
        <h3>Existing Canon, carried forward</h3>
        <div class="property-performance">
          <div class="canonical-example">
            <Card
              ><h3>The same component contracts</h3>
              <TextField
                label="Handoff owner"
                value="Morgan"
                description="Existing Canon TextField"
              />
              <div class="actions">
                <Button>Review handoff</Button><Button
                  variant="secondary"
                  href="#system">Explore the system</Button
                >
              </div></Card
            >
          </div>
        </div>
      </div>
      <div data-canon-next data-theme={dark ? 'light' : 'dark'} class="counterpart">
        <Card padding="md"
          ><h3>The same system, another light.</h3>
          <p>Semantic roles carry contrast, hierarchy and meaning into both appearances.</p>
          <Button variant="primary">A clear next step</Button></Card
        >
      </div>
    </section>
    <section id="principles" aria-labelledby="principles-title">
      <div class="section-heading"><h2 id="principles-title">Measured structure.<br />A warmer presence.</h2><p class="muted">Precision makes the work understandable. A small, useful surprise makes room for curiosity.</p></div>
      <div class="principles"><div><h3>Keep a clear foundation.</h3><p>Black, quiet rules and precise type give each thought a place. Let the work set the pace.</p></div><div><h3>Give warmth a purpose.</h3><p>A paper step, an offered hand, a ribbon finding its way. The whimsy helps explain what happens next.</p></div><div><h3>Make decisions visible.</h3><p>Show the scope, the draft and the evidence. A friendly face accompanies the work; your choices direct it.</p></div></div>
    </section>
    <section class="closing" data-theme="dark" aria-labelledby="closing-title" aria-describedby="closing-scene"><div class="closing-copy"><h2 id="closing-title">Make room for<br />the next step.</h2><p>Try the pieces together. Keep what helps.</p><Button href="#try">Try a small task</Button></div><p id="closing-scene" class="sr-only">Concept environment: an empty wooden workbench, with folded paper steps, a pencil and a cream lamp.</p></section>
    <footer><nav aria-label="Canon guides"><a href="/next/components">Components</a><a href="/next/patterns">Patterns</a><a href="/next/character">Character</a><a href="/next/world">World</a></nav><p>Canon design study · Original character prototype · All examples stay local</p></footer>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
  }
  main {
    max-width: 1280px;
    margin: auto;
    padding: 32px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    margin-bottom: 32px;
  }
  .brand {
    display: flex;
    align-items: center;
    min-height: 44px;
    gap: 10px;
    font-size: 26px;
    font-weight: 600;
    text-decoration: none;
    color: inherit;
    letter-spacing: -0.04em;
  }
  nav {
    display: flex;
    gap: 28px;
    margin-left: auto;
  }
  nav a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 14px;
    color: var(--cn-muted);
    text-decoration: none;
    text-underline-offset: 5px;
  }
  nav a:hover {
    text-decoration: underline;
  }
  .mobile-guides{display:none}
  .appearance {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 12px;
    background: transparent;
    color: inherit;
    border: 1px solid transparent;
    border-radius: var(--cn-radius);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .appearance:hover {
    background: var(--cn-panel);
    border-color: var(--cn-line);
  }
  .opening {
    max-width: none;
  }
  section {
    padding-top: 80px;
  }
  .section-heading {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: center;
    margin-bottom: 40px;
  }
  .section-heading h2 {
    font-size: 36px;
    margin: 0;
  }
  .section-heading p {
    margin: 0;
  }
  .canonical-example {
    padding: 0;
  }
  .swatches {
    display: grid;
      grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    margin-bottom: 56px;
  }
  .swatches div div {
    height: 80px;
    border: 1px solid var(--cn-line);
    border-radius: 0;
    margin-bottom: 12px;
  }
  .swatches small {
    display: block;
    font-size: 14px;
    color: var(--cn-muted);
  }
  .specimen-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 48px;
    padding: 40px 0;
    border-top: 1px solid var(--cn-line);
  }
  h3 {
    font-size: 18px;
    font-weight: 550;
  }
  .specimen-row > h3 {
    color: var(--cn-muted);
  }
  .display {
    font-size: clamp(32px, 5vw, 52px);
    line-height: 1.15;
    letter-spacing: -0.04em;
    margin-top: 0;
  }
  .lead {
    font-size: 24px;
  }
  .stack {
    display: grid;
    gap: 16px;
  }
  .counterpart {
    padding: 24px;
    border-radius: 4px;
    margin-top: 32px;
  }
  footer {
    padding: 32px 0;
    margin-top: 56px;
    border-top: 1px solid var(--cn-line);
    font-size: 14px;
    color: var(--cn-muted);
  }
  @media (max-width: 800px) {
    .swatches {
      grid-template-columns: repeat(4, 1fr);
    }
    .section-heading,
    .specimen-row {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }
  @media (max-width: 600px) {
    main {
      padding: 16px;
    }
    header {
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 28px;
    }
    .brand {
      font-size: 24px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-left: 0;
      width: 100%;
      order: 3;
    }
    .appearance {
      margin-left: auto;
    }
    .appearance span {
      display: none;
    }
    .section-heading h2 {
      font-size: 30px;
    }
    .swatches {
      grid-template-columns: repeat(2, 1fr);
    }
    section {
      padding-top: 48px;
    }
  }
  .skip{position:absolute;left:16px;top:-100px;padding:12px;background:var(--cn-bg);z-index:3;color:var(--cn-ink)}.skip:focus{top:12px}
  .showroom{min-height:100vh}
  section{scroll-margin-top:24px}
  section.hero,.closing{position:relative;box-sizing:border-box;isolation:isolate;background-color:#000;background-repeat:no-repeat;background-size:100% 100%;background-position:center;color:var(--color-performance-fg-primary);padding:24px;aspect-ratio:941/1672}
  section.hero{background-image:linear-gradient(180deg,rgba(0,0,0,.4),transparent 54%),url('/canon-next/portrait/welcome-bench-portrait.png')}
  .closing{aspect-ratio:auto;height:clamp(480px,135vw,520px);background-size:100% auto;background-position:center bottom;background-image:linear-gradient(180deg,rgba(0,0,0,.4),transparent 54%),url('/canon-next/portrait/welcome-cta-portrait-framed.png');margin-top:80px}
  .hero-copy,.closing-copy{position:relative;z-index:1;max-width:580px}
  .hero h1{font-size:clamp(42px,5vw,68px);font-weight:500;line-height:1.03;letter-spacing:-.05em;margin:0 0 20px}
  .hero-copy>p,.closing-copy>p{font-size:17px;line-height:1.6;max-width:34ch;color:var(--color-performance-fg-secondary)}
  .art-caption{font-size:14px;color:var(--cn-muted);margin:12px 0 0}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
  .empty-companion{display:flex;align-items:center;gap:24px}.empty-companion h3{margin-top:0}.empty-companion p{margin-bottom:0}
  .principles{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}.principles>div{border-top:1px solid var(--cn-line);padding-top:16px}.principles p{color:var(--cn-muted)}
  footer nav{margin:0 0 20px;flex-wrap:wrap}footer p{margin:0}
  @media(min-width:768px){section.hero,.closing{aspect-ratio:1672/941;padding:4%;background-size:100% 100%}section.hero{background-image:linear-gradient(90deg,rgba(0,0,0,.72),transparent 60%),url('/canon-next/approved-v1/welcome-bench.webp')}.closing{aspect-ratio:auto;min-height:340px;height:clamp(340px,38vw,480px);background-size:100% 100%,auto 100%;background-position:center,right bottom;background-image:linear-gradient(90deg,#000 31%,rgba(0,0,0,.9) 36%,transparent 65%),url('/canon-next/approved-v1/welcome-clean-plate.webp')}.hero-copy,.closing-copy{max-width:35%}.hero h1{font-size:clamp(42px,4.2vw,60px)}.closing h2{font-size:clamp(30px,3.4vw,48px);margin:0 0 20px}}
  @media(max-width:767px){header{margin-bottom:12px;gap:12px;flex-wrap:nowrap}header .desktop-guides{display:none}.mobile-guides{display:block;position:relative;margin-left:auto;z-index:4}.mobile-guides summary{display:flex;align-items:center;gap:10px;min-height:44px;padding-inline:12px;font-size:14px;list-style:none;cursor:pointer;border-radius:var(--cn-radius)}.mobile-guides summary::-webkit-details-marker{display:none}.mobile-guides summary::after{content:'';width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px)}.mobile-guides[open] summary::after{transform:rotate(225deg) translate(-2px,-1px)}.mobile-guides summary:hover{background:var(--cn-panel)}.mobile-guides summary:focus-visible{outline:2px solid var(--cn-ink);outline-offset:2px}.mobile-guides nav{position:absolute;right:0;top:calc(100% + 8px);display:grid;gap:0;width:192px;padding:8px;background:var(--cn-panel);border:1px solid var(--cn-line);border-radius:var(--cn-radius);box-shadow:0 12px 32px #0005}.mobile-guides nav a{padding-inline:12px;color:var(--cn-ink)}.appearance{margin-left:0}.appearance span{display:none}main :global([data-chapter-ruler]){margin-block:12px 28px}.closing h2{font-size:30px;line-height:1.1;margin:0 0 20px}}
  @media(max-width:900px){.principles{grid-template-columns:1fr;gap:16px}}
  @media(max-width:400px){.hero .actions :global(.btn),.closing-copy :global(.btn){padding-inline:16px}.empty-companion{align-items:start;flex-direction:column}}
</style>
