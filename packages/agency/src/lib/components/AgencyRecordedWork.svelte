<script lang="ts">
  interface Props { id?: string; title?: string; }
  let { id = 'recorded-work', title = 'Work you can inspect.' }: Props = $props();
  const examples = [
    {
      id: 'cato', label: 'Cato Insights Hub', image: '/films/cato-tour/overview.jpg',
      alt: 'Recorded Cato Insights Hub interface with entry points for reports, industry research and newsroom content.',
      detail: 'A publication hub built with Webflow components. Follow the reader from the collection into an article.',
      href: '/products#cato-tour', action: 'Inspect the annotated tour',
      source: 'https://www.catonetworks.com/resources/'
    },
    {
      id: 'maverick', label: 'MaverickX', image: '/films/maverick-recording-poster.jpg',
      alt: 'MaverickX website shown in the existing recorded public website walkthrough.',
      detail: 'A recorded public website walkthrough: industry selection, solution tabs and the contact entry.',
      href: '/?film=websites#work', action: 'Watch the website walkthrough',
      source: 'https://www.maverickx.com/'
    }
  ] as const;
  let selected = $state(0);
  const current = $derived(examples[selected]);
</script>

<section class="recorded-work" {id} aria-labelledby={`${id}-title`}>
  <header><p class="eyebrow">Actual work / recorded interfaces</p><h2 id={`${id}-title`}>{title}</h2></header>
  <div class="selection" aria-label="Choose a recorded example">
    {#each examples as example, index}
      <button type="button" aria-pressed={selected === index} onclick={() => selected = index}>{example.label}<span aria-hidden="true">↘</span></button>
    {/each}
  </div>
  <figure>
    <img src={current.image} alt={current.alt} width="1600" height="1000" loading="lazy" />
    <figcaption>Recorded public website / visitor experience, not a measured business outcome</figcaption>
  </figure>
  <div class="readback" aria-live="polite">
    <div><h3>{current.label}</h3><p>{current.detail}</p></div>
    <a href={current.href}>{current.action}<span aria-hidden="true">↗</span></a>
  </div>
  <noscript><p class="static-links"><a href="/products#cato-tour">Inspect Cato’s annotated tour ↗</a><a href="/?film=websites#work">Watch MaverickX ↗</a></p></noscript>
</section>

<style>
  .recorded-work { padding: clamp(2.5rem, 5vw, 5rem) 6vw; background: var(--color-performance-bg-pure); color: var(--color-performance-fg-primary); }
  header { margin-bottom: var(--space-performance-lg); }
  .eyebrow, figcaption { font: 11px/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .eyebrow { margin: 0 0 var(--space-performance-sm); text-transform: uppercase; letter-spacing: var(--tracking-performance-wide); }
  h2 { margin: 0; font: var(--font-performance-medium) clamp(2rem, 4.2vw, 4.5rem)/1.04 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .selection { display: flex; gap: var(--space-performance-lg); border-bottom: 1px solid var(--color-performance-shell-border-strong); }
  button { display: inline-flex; gap: var(--space-performance-lg); justify-content: space-between; align-items: center; min-height: 48px; padding: var(--space-performance-sm) 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-performance-fg-secondary); font: inherit; cursor: pointer; }
  button[aria-pressed='true'] { border-color: var(--color-performance-fg-primary); color: var(--color-performance-fg-primary); }
  figure { margin: var(--space-performance-lg) 0 0; }
  img { display: block; width: 100%; height: auto; max-height: 42rem; object-fit: contain; object-position: top; background: var(--color-performance-bg-pure); }
  figcaption { margin-top: var(--space-performance-sm); }
  .readback { display: flex; justify-content: space-between; align-items: start; gap: var(--space-performance-lg); margin-top: var(--space-performance-md); }
  h3 { font: var(--font-performance-medium) var(--text-performance-body)/1.3 var(--font-performance-interface); margin: 0 0 var(--space-performance-xs); }
  .readback p { max-width: 48ch; margin: 0; color: var(--color-performance-fg-secondary); font-size: var(--text-performance-body-sm); line-height: 1.6; }
  a { display: inline-flex; align-items: center; gap: var(--space-performance-md); min-height: 44px; color: inherit; text-underline-offset: .3em; }
  .static-links { display: flex; flex-wrap: wrap; gap: var(--space-performance-lg); }
  button:focus-visible, a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  @media(max-width: 600px) { .selection { gap: var(--space-performance-md); } button { font-size: var(--text-performance-body-sm); gap: var(--space-performance-sm); } .readback { flex-direction: column; gap: var(--space-performance-sm); } }
</style>
