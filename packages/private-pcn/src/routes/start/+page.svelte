<script lang="ts">
  import FoundationEntry from '$lib/components/FoundationEntry.svelte';
  let { data } = $props();
  import SerifPhrase from '$lib/components/SerifPhrase.svelte';
  import { inkReveal } from '$lib/ink-motion';
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head
  ><title>What brings you here? | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="builder-workspace">
  {#if data.foundation}<FoundationEntry foundation={data.foundation} />{/if}
  <div class="ink-onboarding">
    <div>
      <p class="eyebrow">PRIVATE / MAKE IT YOURS</p>
      <h1>Learn a technique.<br /><SerifPhrase text="Build on it." /></h1>
      <p class="lede">
        One account for learning from other builders and sharing your own practice. Choose where to
        start. You can do both.
      </p>
    </div>
    <img
      src="/media/human-ink/practice.webp"
      width="1280"
      height="1280"
      alt="A hand holds a notebook of techniques and working notes."
    />
  </div>
  <div class="builder-grid onboarding-choices">
    <a use:inkReveal class="asset-card" href="/collection"
      ><p class="eyebrow"><Icon name="package" size={24} /> 01 / LEARN & BUILD</p>
      <h2>Use what others<br />have figured out.</h2>
      <p>
        Keep your MCP servers, agent plugins and skills in one collection, with release details and
        installation guidance.
      </p>
      <div class="card-foot">
        <span>No network subscription required</span><span
          >Your collection <Icon name="arrow-right" /></span
        >
      </div></a
    ><a use:inkReveal class="asset-card" href="/apply"
      ><p class="eyebrow"><Icon name="network" size={24} /> 02 / SHARE & SELL</p>
      <h2>Turn your practice<br />into useful assets.</h2>
      <p>
        Apply with your credentials and a teaching video. Once approved, build a network for your
        community.
      </p>
      <div class="card-foot">
        <span>Invitation or application. Human review.</span><span
          >Creator application <Icon name="arrow-right" /></span
        >
      </div></a
    >
  </div>
</main>

<style>
  .ink-onboarding {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 40px;
    align-items: center;
  }
  .ink-onboarding img {
    width: 100%;
    max-width: 300px;
    justify-self: center;
    height: auto;
  }
  @media (max-width: 700px) {
    .ink-onboarding {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .ink-onboarding img {
      max-width: 210px;
    }
  }
</style>
