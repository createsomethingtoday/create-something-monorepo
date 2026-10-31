<script lang="ts">
  const chapters = [
    {
      id: 'overview',
      title: 'Give the reader a starting point.',
      time: '00:02',
      label: 'One hub, three kinds of insight',
      detail:
        'Research, resiliency reports and newsroom updates share one destination. The three labeled entry points explain what a reader can find before they begin browsing.',
      value: 'The interface makes a varied publication library easier to approach.',
      area: 'left:15%;top:48%;width:70%;height:16%',
      alt: 'Cato Insights Hub with three entry cards: Resiliency Report, Industry Research and Newsroom.'
    },
    {
      id: 'filter',
      title: 'Narrow the choice without losing context.',
      time: '00:08',
      label: 'Industry Research is selected',
      detail:
        'The selected filter sits beside two research cards. Each card carries its content type, date, title and a reading link, so the reader can compare the remaining options.',
      value: 'A specific interest becomes a manageable set of articles.',
      area: 'left:15%;top:69%;width:70%;height:25%',
      alt: 'Industry Research selected in the sidebar; two matching research cards remain visible.'
    },
    {
      id: 'article',
      title: 'Carry the reader into the substance.',
      time: '00:15',
      label: 'The article opens with key takeaways',
      detail:
        'The research article provides a summary, publication date and key takeaways. A link back to the Industry Research Hub preserves a route to the collection.',
      value: 'The reader can begin with the main ideas and return to related research.',
      area: 'left:17%;top:64%;width:66%;height:24%',
      alt: 'Published Cato research article with a Key takeaways panel and a link back to the Industry Research Hub.'
    }
  ];
</script>

<section id="cato-tour" class="tour" aria-labelledby="cato-tour-title">
  <div class="intro">
    <p class="eyebrow">Built with Webflow components · Cato Insights Hub</p>
    <h3 id="cato-tour-title">From a collection of content to a useful reading journey.</h3>
    <p>
      Explore three moments from our recorded public website walkthrough. Open a chapter at your own
      pace.
    </p>
  </div>
  <div class="chapters">
    {#each chapters as chapter, i}
      <details name="cato-chapters" open={i === 0}>
        <summary
          ><span class="number">0{i + 1}</span><span>{chapter.title}</span><span
            class="expand"
            aria-hidden="true">+</span
          ></summary
        >
        <div class="chapter">
          <figure>
            <div class="frame">
              <img
                src={`/films/cato-tour/${chapter.id}.jpg`}
                alt={chapter.alt}
                width="1600"
                height="1000"
                loading="lazy"
              /><span class="annotation" style={chapter.area} aria-hidden="true"
                ><b>0{i + 1}</b></span
              >
            </div>
            <figcaption>Actual recording frame · {chapter.time} · September 23, 2026</figcaption>
          </figure>
          <div class="reading">
            <p class="eyebrow">What to notice</p>
            <h4>{chapter.label}</h4>
            <p>{chapter.detail}</p>
            <p class="value">{chapter.value}</p>
            <a href={`/films/cato-tour/${chapter.id}.jpg`}>Inspect full-size frame ↗</a>
          </div>
        </div>
      </details>
    {/each}
  </div>
  <div class="provenance">
    <p>
      CREATE SOMETHING built the Hub with Webflow components. These annotations describe the visible
      visitor experience, not the editor or measured business results.
    </p>
    <a href="https://www.catosupply.com/insights">Explore the public Hub ↗</a>
  </div>
  <details
    class="recording"
    ontoggle={(event) => {
      if (!event.currentTarget.open) event.currentTarget.querySelector('video')?.pause();
    }}
  >
    <summary>Watch the original 17-second recording</summary><video
      controls
      preload="none"
      poster="/films/cato-recording-poster.jpg"
      ><source src="/films/cato-client-study.mp4" type="video/mp4" /><track
        kind="captions"
        src="/films/cato-recording.vtt"
        srclang="en"
        label="English"
        default
      /></video
    >
    <p>
      Recording transcript: Open the Insights Hub, filter by Industry Research, then open and read a
      published article.
    </p>
  </details>
</section>

<style>
  .tour {
    padding: 0;
    margin: 3rem 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }
  .intro,
  .provenance {
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }
  .intro {
    max-width: 58rem;
  }
  h3 {
    font-size: clamp(1.8rem, 3vw, 2.8rem);
    line-height: 1.12;
    letter-spacing: -0.035em;
    margin: 0.75rem 0 1rem;
  }
  p {
    line-height: 1.6;
  }
  .eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  summary {
    cursor: pointer;
    min-height: 4.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    list-style: none;
    font-weight: 600;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .number {
    font: 0.8rem monospace;
    color: var(--color-performance-muted, #5e6268);
  }
  .expand {
    margin-left: auto;
    font-size: 1.5rem;
  }
  details[open] > summary .expand {
    transform: rotate(45deg);
  }
  details {
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }
  details[open] > summary {
    background: var(--color-performance-paper, #f3f3f0);
  }
  summary:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: -3px;
  }
  .chapter {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(15rem, 1fr);
    gap: 1.5rem;
    padding: 1.25rem;
  }
  figure {
    margin: 0;
    min-width: 0;
  }
  .frame {
    position: relative;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
  .annotation {
    position: absolute;
    border: 2px solid var(--color-performance-signal, #0057b8);
    pointer-events: none;
  }
  .annotation b {
    position: absolute;
    top: -1rem;
    left: -0.5rem;
    background: var(--color-performance-signal, #0057b8);
    color: #fff;
    padding: 0.25rem 0.4rem;
    font: 0.75rem monospace;
  }
  figcaption {
    font-size: 0.7rem;
    margin-top: 0.75rem;
    color: var(--color-performance-muted, #5e6268);
  }
  h4 {
    font-size: 1.35rem;
    line-height: 1.25;
    margin: 0.5rem 0;
  }
  .reading p {
    font-size: 0.95rem;
  }
  .value {
    border-left: 2px solid var(--color-performance-signal, #0057b8);
    padding-left: 1rem;
  }
  a {
    text-underline-offset: 0.2em;
    font-size: 0.85rem;
  }
  .provenance {
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  .provenance p {
    font-size: 0.8rem;
    max-width: 44rem;
  }
  .provenance a {
    flex-shrink: 0;
  }
  .recording video {
    display: block;
    width: 100%;
    max-height: 70vh;
  }
  .recording > p {
    padding: 0 1.25rem;
    font-size: 0.8rem;
  }
  @media (max-width: 760px) {
    .chapter {
      grid-template-columns: 1fr;
    }
    .reading {
      padding: 0.25rem;
    }
    .provenance {
      display: block;
    }
    summary {
      font-size: 0.95rem;
      gap: 0.6rem;
    }
    .tour {
      padding: 0;
      margin: 2rem 0;
    }
  }
</style>
