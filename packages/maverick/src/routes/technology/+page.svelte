<script lang="ts">
  import { reveal } from '$lib/redesign/motion';
  import IndustrySequence from '$lib/redesign/IndustrySequence.svelte';
  import EditorialPage from '$lib/redesign/EditorialPage.svelte';
</script>

<EditorialPage
  title="How our chemistry works"
  eyebrow="Technology"
  path="/technology"
  intro="Bio-based chemistry engineered for specific industrial applications."
>
  <div class="chapter-row" use:reveal>
    <span class="chapter-index">01</span>
    <h2>Engineered<br />for the job</h2>
    <p>Bio-based chemistry engineered for specific industrial applications.</p>
  </div>
  <div class="chapter-row" use:reveal>
    <span class="chapter-index">02</span>
    <h2>One platform.<br />Two markets.</h2>
    <div>
      <h3>Oil &amp; Gas</h3>
      <p>PetroX covers oil &amp; gas and produced-water treatment.</p>
      <a class="text-link" href="/oil-gas">Explore Oil &amp; Gas →</a>
      <h3>Mining &amp; Metals</h3>
      <p>LithX is designed for use in agglomeration and curing within heap-leach processes.</p>
      <a class="text-link" href="/mining">Explore Mining &amp; Metals →</a>
    </div>
  </div>
  <IndustrySequence />
  <div class="chapter-row" use:reveal>
    <span class="chapter-index">03</span>
    <h2>Made by us</h2>
    <p>We manufacture our own chemistry.</p>
  </div>
  <aside class="review-note">
    <strong>Preview · technical detail pending</strong>
    <p>
      The chemistry narrative and laboratory evidence are awaiting review. No performance, safety or
      scale claims are presented here.
    </p>
  </aside>
</EditorialPage>
