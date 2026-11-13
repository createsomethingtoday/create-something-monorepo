<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/styles/canon.css';
  import Button from '$lib/components/Button.svelte';
  import Select from '$lib/components/form/Select.svelte';
  import CanonCompanion from '$lib/character/CanonCompanion.svelte';
  import TactileStudy from '$lib/character/TactileStudy.svelte';
  import { expressions, expressionCopy, samplePreparationText, type CanonExpression } from '$lib/character';
  let selected = $state('welcome');
  let prepared = $state(false);
  let ready = $state(false);
  onMount(() => { ready = true; });
  const expression = $derived(selected as CanonExpression);
  const poses = [
    { title:'Welcome', description:'An open invitation.' },
    { title:'Attention', description:'Ready to listen.' },
    { title:'Focus', description:'Reading the page.' },
    { title:'Review', description:'A draft to consider.' },
    { title:'Pause', description:'Room for another approach.' },
    { title:'Handback', description:'Returning the work.' }
  ];
</script>
<svelte:head><title>Canon · A compact companion</title><meta name="description" content="A tactile compact study and truthful local state text, on a black foundation." /></svelte:head>
<div class="foundation" data-theme="dark">
<main>
  <nav aria-label="Showroom"><a href="/next">← Canon</a><a href="/next/components">Components</a></nav>
  <header><h1>A little presence.<br />A clear next step.</h1><p class="intro">The woven face keeps its material character. Clear words carry the state, the evidence and the next decision.</p><p>Filled oval eyes and a pixel smile keep the expression warm. The approved character is a static still; clear words carry the real state.</p></header>
  <section aria-labelledby="try-title" class="ruled">
    <div class="demo">
      <div><h2 id="try-title">Try the state text</h2><p>Local simulation. This page has no connection to a live tool.</p>
        <noscript><p>JavaScript is required to try the local state text. The character studies and guidance remain available below.</p></noscript>
        <Select label="Sample state" bind:value={selected} disabled={!ready}>{#each expressions as state}<option value={state}>{expressionCopy[state].title}</option>{/each}</Select>
        <div class="actions"><Button disabled={!ready} onclick={() => { prepared = true; selected = 'attentive'; }}>Prepare a sample</Button><Button variant="secondary" disabled={!ready} onclick={() => { prepared = false; selected = 'welcome'; }}>Reset sample</Button></div>
      </div>
      <div class="sample"><CanonCompanion size={96} /><div aria-live="polite" aria-atomic="true"><h3>{expressionCopy[expression].title}</h3><p>{expressionCopy[expression].description}</p><p class="receipt">{prepared ? samplePreparationText : 'Nothing has been prepared. No live tool is running.'}</p></div></div>
    </div><p class="note">The same r42 still image accompanies every state. It does not show progress or change expression.</p>
  </section>
  <section aria-labelledby="scale-title" class="ruled"><h2 id="scale-title">Material at a useful scale</h2><p>Use the tactile head at 96 px. Smaller placements use plain Canon text, so the expression stays clear wherever it appears.</p>
    <div class="themes">{#each ['dark','light'] as theme}<div class="specimen" data-theme={theme}><h3>{theme === 'dark' ? 'Black foundation' : 'Paper comparison'}</h3><div class="sizes">{#each [24,32,48,64,96] as size}<figure><div class="size-slot"><CanonCompanion size={size as 24 | 32 | 48 | 64 | 96} /></div><figcaption>{size} px<br />{size === 96 ? 'Tactile head' : 'Identity text'}</figcaption></figure>{/each}</div></div>{/each}</div>
    <p class="note">The complete head and antenna fit a 96 px square. Its softly cuboid silhouette uses about 93.5 px of the width. Independent compact review passed on both backgrounds; that does not approve a full-resolution material master.</p>
    <details class="diagnostics"><summary>Compare the studies</summary><p>64 px is a diagnostic only. It remains unsupported in the application.</p><div class="themes">{#each ['dark','light'] as theme}<div class="specimen" data-theme={theme}><h3>{theme === 'dark' ? 'Black comparison' : 'Paper comparison'}</h3><div class="sizes"><figure><div class="size-slot"><TactileStudy size={96} revision="r34" /></div><figcaption>Previous · 96 px</figcaption></figure><figure><div class="size-slot"><TactileStudy size={96} revision="r42" /></div><figcaption>Cuboid oval · 96 px</figcaption></figure><figure><div class="size-slot"><TactileStudy size={64} revision="r42" /></div><figcaption>64 px · unsupported</figcaption></figure></div></div>{/each}</div></details>
  </section>
  <section aria-labelledby="reference-title" class="ruled"><h2 id="reference-title">A workshop companion</h2><p>A soft cuboid, useful notebook and woven face keep Canon familiar. The approved figure has an opaque black backdrop, matching the website foundation.</p><div class="themes"><figure class="reference"><img src="/canon-next/approved-v1/body-r41.webp" alt="A squat charcoal felt Canon with a soft cuboid head, oval woven eyes, an inviting palm and a notebook pocket, on black." width="1199" height="1312" /><figcaption>Approved black-background figure · r41</figcaption></figure><figure class="reference"><img src="/canon-next/filled-oval-body-framed-prototype.png" alt="Earlier squat felt Canon with oval woven eyes, a short pale-tipped antenna and a notebook pocket." width="1199" height="1312" /><figcaption>Earlier framed body · r38</figcaption></figure></div></section>
  <section aria-labelledby="pose-title" class="ruled"><h2 id="pose-title">Small gestures, clear words</h2><p>Six captioned still studies on black, displayed at up to 200 px. A raised palm makes room for a pause; an offered notebook marks a handback. The interface still names the real state. These poses do not animate or replace the static head in the sample above.</p><div class="pose-grid">{#each poses as pose, index}<figure class="pose-card"><div class="pose-frame" aria-hidden="true"><img src="/canon-next/approved-v1/gestures-r45.webp" alt="" width="1536" height="1024" style:left={`${-(index % 3) * 100}%`} style:top={`${-Math.floor(index / 3) * 100}%`} /></div><figcaption><h3>{pose.title}</h3><p>{pose.description}</p></figcaption></figure>{/each}</div><p class="note">Independent review passed these captioned gestures at their intended display size. These black-background studies are not transparent assets. These six editorial poses are approved for this use.</p></section>
  <footer><p>A face can show attention. Execution, approval and completion need evidence in the interface.</p><a href="/next">Back to Canon</a></footer>
</main>
</div>
<style>
  :global(body:has(.foundation)) { margin:0; background:#000; }
  .foundation { background:#000; min-height:100vh; color:var(--color-performance-fg-primary); font-family:var(--font-performance-sans); }
  main { max-width:1120px; margin:auto; padding:24px clamp(20px,4vw,48px) 48px; }
  nav { display:flex; justify-content:space-between; gap:20px; font-size:.875rem; } a { color:inherit; text-underline-offset:4px; } nav a,footer a { display:inline-flex; align-items:center; min-height:44px; min-width:44px; } a:focus-visible,summary:focus-visible { outline:2px solid var(--color-performance-focus); outline-offset:3px; }
  header { padding:80px 0 48px; max-width:800px; } h1 { font-size:clamp(2.5rem,6vw,4.75rem); letter-spacing:-.055em; line-height:1.06; margin:20px 0 28px; font-weight:500; } h2 { font-size:1.5rem; letter-spacing:-.025em; margin:0 0 16px; } h3 { font-size:1rem; margin:0 0 12px; } p { line-height:1.6; color:var(--color-performance-fg-secondary); } .intro { font-size:1.2rem; max-width:620px; }
  section { margin-bottom:64px; } .ruled { border-top:1px solid var(--color-performance-border-default); padding-top:28px; } .demo { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; } .actions { display:flex; gap:12px; flex-wrap:wrap; margin-top:20px; } .sample { display:flex; gap:24px; align-items:center; } .receipt { font-size:.875rem; border-top:1px solid var(--color-performance-border-default); padding-top:12px; } .note { margin:28px 0 0; font-size:.875rem; }
  .themes { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:28px; } .specimen { background:#000; color:var(--color-performance-fg-primary); border:1px solid var(--color-performance-border-default); padding:24px; min-width:0; } .specimen[data-theme='light'] { background:var(--color-performance-bg-pure); } .specimen h3 { color:var(--color-performance-fg-primary); } .sizes { display:flex; gap:20px; align-items:end; flex-wrap:wrap; } figure { margin:0; } .size-slot { height:100px; display:flex; align-items:end; justify-content:center; } figcaption { margin-top:16px; font-size:.875rem; line-height:1.5; color:var(--color-performance-fg-secondary); }
  .diagnostics { margin-top:24px; } .diagnostics summary { min-height:44px; display:flex; align-items:center; cursor:pointer; text-decoration:underline; text-underline-offset:4px; }
  .pose-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; margin-top:28px; } .pose-card { border:1px solid var(--color-performance-border-default); padding:16px; min-width:0; } .pose-frame { width:min(100%,200px); aspect-ratio:1; position:relative; overflow:hidden; margin:auto; } .pose-frame img { position:absolute; width:300%; height:200%; max-width:none; } .pose-card figcaption p { margin:0; }
  .reference { margin:24px 0 0; border:1px solid var(--color-performance-border-default); padding:24px; } .reference img { display:block; width:min(100%,320px); height:auto; margin:auto; } footer { border-top:1px solid var(--color-performance-border-default); padding-top:24px; font-size:.875rem; }
  @media(max-width:760px) { header { padding-top:48px; } .demo,.themes { grid-template-columns:1fr; } .demo { gap:32px; } .sample { gap:16px; } .pose-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media(max-width:520px) { .pose-grid { grid-template-columns:1fr; } }
  @media(max-width:380px) { .sample { align-items:start; flex-direction:column; } }
</style>
