<script lang="ts">
  import '$lib/styles/canon.css';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import ChapterRuler from '$lib/wayfinding/ChapterRuler.svelte';
  let dark = $state(true);
  const chapters = [
    {id:'begin',label:'Begin',note:'A manageable first step'},
    {id:'world',label:'The world',short:'World',note:'Useful work, a gently impossible place'},
    {id:'materials',label:'Materials',note:'Different materials, shared care'},
    {id:'scenes',label:'Scenes',note:'One task, one small surprise'},
    {id:'composition',label:'Composition',short:'Compose',note:'Give the picture and the words a place'}
  ];
  const root = '/canon-next/approved-v1/';
</script>

<svelte:head>
  <link rel="preload" as="image" href="/canon-next/approved-v1/welcome-bench.webp" media="(min-width:768px)" /><link rel="preload" as="image" href="/canon-next/portrait/welcome-bench-portrait.png" media="(max-width:767px)" />
  <title>Canon · The small workshop</title>
  <meta name="description" content="Canon’s small workshop: a guide to useful warmth, task-connected whimsy and considered illustration." />
</svelte:head>

<div class="world" data-theme={dark ? 'dark' : 'light'}>
  <a class="skip" href="#main">Skip to content</a>
  <header>
    <a class="brand" href="/next">Canon<span> / The world</span></a>
    <button class="theme" onclick={() => dark = !dark} aria-label={dark ? 'Use light appearance' : 'Use dark appearance'}> {dark ? 'Light appearance' : 'Dark appearance'}</button>
  </header>
  <main id="main">
    <ChapterRuler {chapters} />
    <section id="begin" class="sample" data-theme="dark" aria-labelledby="hero-title" aria-describedby="hero-scene">
      <div class="hero-copy">
        <h1 id="hero-title">Start with<br />one small thing.</h1>
        <p class="lead">Make the next step easier to see.</p>
        <Button href="/next/patterns">Find a starting point</Button>
      </div>
      <p id="hero-scene" class="sr-only">Concept illustration: a small charcoal felt Canon offers a folded paper staircase on a sunlit wooden workbench, beside paper trays and a cream lamp.</p>
    </section>
    <p class="art-caption">Concept illustration — responsive composition study. Portrait artwork is a new prototype.</p>

    <section id="world" class="introduction guide-section" aria-labelledby="world-title">
      <div class="two-col"><h2 id="world-title">Useful work.<br />A gently impossible place.</h2><div><p>Canon’s world is a miniature workshop. Familiar materials make abstract work tangible; a small physical surprise helps explain what happens next.</p><p>Keep the interface quiet and neutral. Let warmth live in the illustration, with enough space for people to understand the task.</p></div></div>
    </section>

    <section id="materials" class="guide-section" aria-labelledby="materials-title">
      <div class="section-title"><h2 id="materials-title">Different materials, shared care.</h2></div>
      <dl class="materials">
        <div><dt>Charcoal felt</dt><dd>Soft walls and Canon’s squat body. The woven digital face keeps its oval eyes clear.</dd></div>
        <div><dt>Pale ash</dt><dd>Benches, rails and frames. Visible grain and purposeful joinery bring warmth.</dd></div>
        <div><dt>Paper & linen</dt><dd>Cotton-rag sheets hold a thought. Undyed woven strips connect separate pieces.</dd></div>
        <div><dt>Matte porcelain</dt><dd>Simple trays and practical lamps. Keep smooth surfaces distinct from the textiles.</dd></div>
      </dl>
      <Card padding="md"><div class="material-note"><h3>Small maker. Human-sized tools.</h3><p>Use Canon’s eye level, soft window light and grounded shadows. Oversized pencils and paper establish the miniature scale. Preserve the short legs, softly squared head, cream-tipped antenna and notebook pocket.</p></div></Card>
    </section>

    <section id="scenes" class="guide-section" aria-labelledby="scenes-title"><h2 id="scenes-title">One task. One small surprise.</h2>
      <article class="scene">
        <div class="two-col"><h3>01 / Welcome Bench</h3><div><p class="scene-line">Make the beginning feel manageable.</p><p>A sheet folds itself into a few small steps. The surprise belongs to the task: there is a place to start.</p><p class="guidance">Keep the staircase, offered hand and full face together. This is the complete approved wide frame.</p></div></div>
        <figure><img loading="lazy" decoding="async" src={root + 'welcome-bench.webp'} width="1672" height="941" alt="Canon offers a folded paper staircase on the sunlit Welcome Bench, beside paper trays and a cream lamp." /><figcaption>Approved concept illustration — Welcome Bench, original wide scene.</figcaption></figure>
      </article>
      <article class="scene">
        <div class="two-col"><h3>02 / Connection Loom</h3><div><p class="scene-line">Give the pieces a way to work together.</p><p>Two linen ribbons rise into eager arches before joining the loom. Canon guides the weave; the environment does some of the welcoming.</p></div></div>
        <figure><img loading="lazy" decoding="async" src={root + 'connection-loom.webp'} width="1672" height="941" alt="Two cream ribbons rise into playful arches from porcelain trays and enter a wooden loom while Canon guides the cloth." /><figcaption>Concept illustration — bringing separate pieces together.</figcaption></figure>
        <p class="guidance">Preserve both trays, both arches, the loom and working hands. The task spans the width; a narrow crop breaks the story.</p>
      </article>
      <article class="scene nook">
        <div><h3>03 / Review Nook</h3><p class="scene-line">A little room to look it over.</p><p>A blank sheet raises its own corner, as if politely asking for attention. The lamp leans toward the work.</p><p class="guidance">Keep the lifted corner, tray, antenna and full gesture in view. This portrait scene has room for a short thought at upper left; the lamp occupies the right.</p></div>
        <figure><img loading="lazy" decoding="async" src={root + 'review-nook.webp'} width="1122" height="1402" alt="A blank sheet lifts one corner like a raised hand in a wooden review alcove; Canon gestures beside it and a cream lamp leans toward the page." /><figcaption>Concept illustration — room for review.</figcaption></figure>
      </article>
      <article class="scene">
        <div class="two-col"><h3>04 / The empty bench</h3><div><p class="scene-line">The world has a personality of its own.</p><p>Even without Canon, the paper staircase keeps the scene playful. Leave room beside the steps for a considered future composition.</p></div></div>
        <figure><img loading="lazy" decoding="async" src={root + 'welcome-clean-plate.webp'} width="1671" height="941" alt="An empty wooden workbench with folded paper steps, porcelain trays, a pencil and a cream lamp, against a charcoal felt wall." /><figcaption>Concept environment — Welcome Bench, without character.</figcaption></figure>
        <p class="guidance">The clean plate is one pixel narrower than Welcome and has small scene differences. It needs deliberate alignment, matching light and a contact shadow before character placement.</p>
      </article>
    </section>

    <section id="composition" class="guide-section" aria-labelledby="composition-title"><div class="two-col"><h2 id="composition-title">Give the picture room.<br />Give the words a place.</h2><div><p>Keep headings and actions as real text. Place them outside the art on small screens and preserve each scene’s full aspect ratio.</p><p>The wide scenes offer a quiet upper-left area for a later exact composition. Test contrast at the final size before placing type there. Never cover a face, hand or task object.</p><p>Use an adjacent concept caption. These scenes explain an idea; they do not show a completed workflow or a customer result.</p></div></div>
    </section>
    <section class="closing" data-theme="dark" aria-labelledby="closing-title" aria-describedby="closing-scene">
      <div class="closing-copy"><h2 id="closing-title">Make room for<br />the next small thing.</h2><p>Find the pieces for your next useful task.</p><Button href="/next/patterns">Explore patterns</Button></div>
      <p id="closing-scene" class="sr-only">Concept environment: the empty Welcome Bench with paper steps, porcelain trays, a pencil and a cream lamp.</p>
    </section><p class="art-caption">Concept environment — responsive composition study. Portrait artwork is a new prototype.</p>
    <footer><p>Continue through Canon</p><nav aria-label="Canon guides"><a href="/next">Overview</a><a href="/next/components">Components</a><a href="/next/patterns">Patterns</a><a href="/next/character">Character</a></nav><p class="fine">Approved environment references · Character study r09 · Local design guide</p></footer>
  </main>
</div>

<style>
  :global(body){margin:0} .world{background:var(--color-performance-paper);color:var(--color-performance-fg-primary);min-height:100vh;font-family:var(--font-performance-sans)}
  .world[data-theme="dark"]{background:#000} section[id]{scroll-margin-top:24px} figcaption{font-family:var(--font-performance-mono)}
  header,main{max-width:1280px;margin:auto;padding-inline:40px} header{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:108px} a{color:inherit;text-underline-offset:5px} .brand{font-size:23px;letter-spacing:-.04em;text-decoration:none;font-weight:600}.brand span{font-size:14px;font-weight:400;letter-spacing:0;color:var(--color-performance-fg-secondary)}
  .theme{font:inherit;font-size:14px;padding:10px 14px;min-height:44px;border:1px solid var(--color-performance-line);border-radius:0;color:inherit;background:var(--color-performance-panel);cursor:pointer}.skip{position:absolute;top:-100px;left:16px;z-index:2;padding:12px;background:var(--color-performance-paper)}.skip:focus{top:12px} :is(a,button):focus-visible{outline:2px solid var(--color-performance-focus);outline-offset:4px}
  .sample{padding-top:28px}.hero-copy{max-width:670px;padding:0 0 36px}h1{font-size:clamp(48px,6.5vw,86px);line-height:1.04;letter-spacing:-.055em;font-weight:550;margin:0 0 24px}.lead{font-size:21px;line-height:1.55;max-width:450px;margin:0 0 26px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:0}figcaption,.guidance,.fine{font-size:14px;line-height:1.6;color:var(--color-performance-fg-secondary)}figcaption{padding-top:12px} .guide-section{padding-top:88px}.introduction{padding-top:100px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:64px}h2{font-size:clamp(28px,3.3vw,44px);line-height:1.15;letter-spacing:-.035em;font-weight:530;margin:0 0 24px}p{line-height:1.7;margin:0 0 18px}.two-col p:last-child{margin-bottom:0}h3{font-size:20px;line-height:1.35;font-weight:550;margin:0 0 16px}.materials{display:grid;grid-template-columns:repeat(4,1fr);gap:30px;margin:36px 0}.materials dt{font-weight:600;margin-bottom:12px}.materials dd{margin:0;color:var(--color-performance-fg-secondary);font-size:15px;line-height:1.7}.material-note{display:grid;grid-template-columns:1fr 2fr;gap:40px}.material-note p{margin:0;font-size:16px}.scene{padding:36px 0 0;margin-top:36px;border-top:1px solid var(--color-performance-line)}.scene figure{margin-top:30px}.scene-line{font-size:23px;line-height:1.4;letter-spacing:-.02em}.scene>.guidance{max-width:750px;margin-top:18px}.nook{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}.nook figure{margin-top:0}.nook>div{max-width:420px}footer{border-top:1px solid var(--color-performance-line);margin-top:88px;padding:36px 0}footer nav{display:flex;flex-wrap:wrap;gap:8px 28px;margin-bottom:28px}footer a{display:inline-flex;align-items:center;min-height:44px;font-size:16px}.fine{margin:0}
  .sample,.closing{position:relative;box-sizing:border-box;background-color:#000;background-repeat:no-repeat;background-position:center;background-size:100% 100%;color:var(--color-performance-fg-primary);padding:24px;aspect-ratio:941/1672}
  .sample{background-image:linear-gradient(180deg,rgba(0,0,0,.4),transparent 54%),url('/canon-next/portrait/welcome-bench-portrait.png')}.closing{background-image:linear-gradient(180deg,rgba(0,0,0,.4),transparent 54%),url('/canon-next/portrait/welcome-cta-portrait.png');margin-top:88px}
  .hero-copy,.closing-copy{position:relative;z-index:1;max-width:580px;padding:0}.closing-copy p{max-width:30ch}.art-caption{font:12px/1.6 var(--font-performance-mono);color:var(--color-performance-fg-secondary);margin:12px 0 0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  @media(min-width:768px){.sample,.closing{aspect-ratio:1672/941;padding:4% 4%;background-size:100% 100%}.sample{background-image:linear-gradient(90deg,rgba(0,0,0,.72),transparent 60%),url('/canon-next/approved-v1/welcome-bench.webp')}.closing{background-image:linear-gradient(90deg,rgba(0,0,0,.7),transparent 60%),url('/canon-next/approved-v1/welcome-clean-plate.webp')}.hero-copy,.closing-copy{max-width:35%}h1{font-size:clamp(30px,4vw,56px)}.lead{font-size:16px;line-height:1.5;margin-bottom:18px}.closing h2{font-size:clamp(26px,3.4vw,48px)}}
  @media(max-width:767px){header,main{padding-inline:20px}header{min-height:88px}.brand span{display:block;font-size:12px}.theme{max-width:145px;font-size:13px}.two-col,.nook,.material-note{grid-template-columns:1fr;gap:20px}.materials{grid-template-columns:1fr 1fr;gap:28px 24px}.guide-section,.introduction{padding-top:60px}.nook>div{max-width:none}.nook figure{max-width:520px;margin-inline:auto}.scene{margin-top:24px;padding-top:28px}.hero-copy{padding-bottom:0}.lead{font-size:16px;line-height:1.5;margin-bottom:18px}h1{font-size:clamp(38px,6vw,46px)}.closing h2{font-size:30px;line-height:1.1;margin-bottom:18px}header{margin-bottom:12px}main :global([data-chapter-ruler]){margin-block:12px 28px}footer{margin-top:60px}}
  @media(max-width:359px){header,main{padding-inline:16px}.materials{grid-template-columns:1fr}.brand{font-size:21px}h1{font-size:36px}}
</style>
