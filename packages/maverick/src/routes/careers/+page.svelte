<script lang="ts">
  import { reveal } from '$lib/redesign/motion';
  import EditorialPage from '$lib/redesign/EditorialPage.svelte';
</script>

<EditorialPage
  imagery={false}
  title="Careers"
  eyebrow="Join Maverick X"
  path="/careers"
  intro="A team of scientists, engineers, and operators developing and manufacturing bio-based chemistry for oil, gas and metals."
>
  <nav class="section-index" aria-label="Careers sections">
    <a href="#how-we-work">01 · How we work</a><a href="#open-roles">02 · Open roles</a>
  </nav>
  <div class="editorial-grid">
    <section id="how-we-work" class="indexed-section" use:reveal>
      <span class="chapter-index">01</span>
      <h2>How we work</h2>
      <p>Built in Austin, Texas.</p>
      <aside class="review-note">
        <strong>Preview · culture and values pending</strong>
        <p>The team’s culture and core-values copy will be added after review.</p>
      </aside>
    </section>
    <section id="open-roles" class="indexed-section" use:reveal>
      <span class="chapter-index">02</span>
      <h2>Open roles</h2>
      <p>Explore current opportunities through our careers page and LinkedIn.</p>
      <div class="career-links">
        <a
          class="text-link"
          href="https://jobs.lever.co/maverickx"
          target="_blank"
          rel="noopener noreferrer">View open roles ↗</a
        ><a
          class="text-link"
          href="https://www.linkedin.com/company/maverickx/jobs/"
          target="_blank"
          rel="noopener noreferrer">Maverick X on LinkedIn ↗</a
        >
      </div>
    </section>
  </div>
</EditorialPage>
