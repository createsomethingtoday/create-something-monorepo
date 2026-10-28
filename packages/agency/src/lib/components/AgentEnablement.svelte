<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  let video: HTMLVideoElement;
  let story: HTMLDetailsElement;
  const steps = [
    ['Request', '“Map intake, review and delivery on this sample canvas.”'],
    ['Permitted context', 'The sample steps and selected Draw canvas. No inbox, client records or database access.'],
    ['Agent action', 'Add three named shapes and connect them in order. This is an illustrative task, not an observed run.'],
    ['Review checkpoint', 'The owner inspects the sequence before sharing. Missing permission or unclear scope stops the work.'],
    ['Output', 'An editable workflow canvas. A shareable canvas URL is a handoff, not a database connection.'],
    ['Receipt', 'Record the request, allowed context, actions, output reference, review decision and open questions. A receipt alone does not prove correctness.']
  ];
  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const pause = () => video?.pause();
    const change = () => { if (preference.matches) pause(); };
    const unsubscribe = reducedFilmMotion.subscribe(reduced => { if (reduced) pause(); });
    const visibility = () => { if (document.hidden) pause(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); });
    if (video) observer.observe(video);
    preference.addEventListener('change', change);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); unsubscribe(); preference.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  });
</script>

<section id="agent-enablement" class="enablement" aria-labelledby="enablement-title">
  <header><p class="eyebrow">Context → Permission → Work → Proof</p><h2 id="enablement-title">An agent is the beginning.<br />The work starts with context.</h2><p>We help turn an agent someone shares with you into a working path in your own environment. We confirm tool compatibility, connect or build the missing pieces, test the agreed task, and help your team use and improve it.</p></header>
  <details class="canon-story" bind:this={story} ontoggle={() => { if (!story.open) video?.pause(); }}>
    <summary>Watch canon explain · 26 seconds · silent</summary>
    <div class="story-layout">
      <video bind:this={video} controls muted playsinline preload="none" width="1080" height="1350" poster="/films/agent-enablement/poster.png" aria-label="canon: An agent is the beginning" aria-describedby="canon-story-description">
        <source src="/films/agent-enablement/canon-silent.mp4" type="video/mp4" />
        <track kind="captions" src="/films/agent-enablement/captions.vtt" srclang="en" label="On-screen text" />
        <a href="/films/agent-enablement/canon-silent.mp4">Download the silent story</a>
      </video>
      <div id="canon-story-description"><h3>A possibility, then a practical setup.</h3><p>canon meets someone new. Their context, tools and permission define the next step. An illustrative workflow takes shape, ready for human review and a receipt.</p><p>Concept illustration. The canvas sequence is staged; no client task or live agent run is shown. The complete explanation and buying paths below work without the video or character.</p><p>Playback starts only when you choose Play. The story stays still by default, including with reduced motion.</p><a href="/films/agent-enablement/canon-silent.mp4">Download the silent video ↗</a></div>
    </div>
  </details>
  <div class="example">
    <div><p class="eyebrow">Illustrative Draw workflow / no task has run</p><ol>{#each steps as step,index}<li><span class="number">0{index+1}</span><div><h3>{step[0]}</h3><p>{step[1]}</p></div></li>{/each}</ol></div>
    <aside aria-label="Synthetic handoff example"><p class="eyebrow">Example receipt / synthetic</p><dl><dt>Request</dt><dd>Map intake → review → delivery</dd><dt>Authority</dt><dd>Selected sample canvas only</dd><dt>Decision</dt><dd>Pending owner review</dd><dt>Output reference</dt><dd>Not created in this illustration</dd><dt>Open question</dt><dd>Who owns final delivery?</dd></dl><p>Measured activity, estimated usage costs and verified billing are separate records. No run activity or charges are reported in this example.</p><a href="/map">Inspect our first-party Draw canvas ↗</a></aside>
  </div>
  <div class="paths" id="team-enablement">
    <article><h3>Start with one bounded workflow.</h3><p>Bring one task, the tools involved and an example of a good result. We agree on access and scope, build the working path, check an example and a failure case, and hand over instructions and recovery steps.</p><a href="/agent-foundation">What a checked handoff includes ↗</a></article>
    <article><h3>Roll it out with your team.</h3><p>Agree on owners, identity and tool access, data boundaries, approval points, budgets, evaluation cases and recovery before expanding the workflow.</p><a href={agencyCoreMessaging.teamMembershipInquiryHref}>Discuss team setup ↗</a><details><summary>Technical and governance detail</summary><p>Instructions describe policy; host permissions and tool checks enforce authority. We confirm each integration’s availability and limits. Your team reviews the result before a separately agreed production promotion.</p><p>Ongoing technical support preserves project context, improves the agent and helps your team use it. Scope and response times are agreed before payment. Production incident response requires a separate managed Control agreement.</p><a href="/control">Read the Control boundary ↗</a></details></article>
  </div>
</section>

<style>
  .enablement { scroll-margin-top: 6rem; padding: var(--space-performance-xl) 7vw; background: var(--color-performance-paper); color: var(--color-performance-ink); border-bottom: 1px solid var(--color-performance-shell-border-strong); }
  .eyebrow,.number,dt { font: .75rem/1.6 var(--font-performance-mono); }
  .eyebrow { text-transform: uppercase; }
  h2 { font: var(--font-performance-medium) clamp(2rem,4vw,3.5rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); margin-block: var(--space-performance-sm); }
  header>p { max-width: 67ch; } p { line-height: 1.65; }
  h3 { font-size: 1.15rem; line-height: 1.4; margin: 0 0 .5rem; }
  a { color: inherit; text-underline-offset: .25em; display: inline-flex; align-items: center; min-height: 44px; }
  summary { cursor: pointer; min-height: 56px; padding-block: 1rem; font-weight: var(--font-performance-medium); }
  details { border-top: 1px solid var(--color-performance-shell-border-strong); }
  .canon-story { margin-block: var(--space-performance-lg); }
  .story-layout { display: grid; grid-template-columns: minmax(0,20rem) minmax(0,1fr); gap: 2rem; padding-bottom: var(--space-performance-lg); }
  video { display: block; width: 100%; height: auto; aspect-ratio: 4/5; background: var(--color-performance-ink); }
  .example { display: grid; grid-template-columns: minmax(0,1.3fr) minmax(0,1fr); gap: clamp(1.5rem,5vw,5rem); }
  ol { list-style: none; padding: 0; margin: 0; } li { display: grid; grid-template-columns: 2rem minmax(0,1fr); gap: 1rem; padding-block: 1rem; border-top: 1px solid var(--color-performance-shell-border-default); } li p { margin: 0; font-size: .9375rem; }
  aside { align-self: start; border: 1px solid var(--color-performance-shell-border-strong); padding: 1.5rem; } aside p { font-size: .875rem; } dl { margin: 1rem 0; } dt { margin-top: 1rem; } dd { margin: .25rem 0 0; line-height: 1.5; }
  .paths { scroll-margin-top: 6rem; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem,5vw,5rem); margin-top: var(--space-performance-xl); border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: var(--space-performance-lg); } article { min-width: 0; } article p { font-size: .9375rem; }
  a:focus-visible,summary:focus-visible,video:focus-visible { outline: 2px solid var(--color-performance-ink); outline-offset: 5px; }
  @media(max-width:720px) { .enablement { padding-inline: 6vw; } .example,.paths,.story-layout { grid-template-columns: 1fr; } video { max-width: 24rem; } }
</style>
