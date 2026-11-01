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
<main id="main" tabindex="-1" class="builder-workspace">
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
    <a use:inkReveal class="asset-card" href="/library"
      ><p class="eyebrow"><Icon name="package" size={24} /> 01 / LEARN & BUILD</p>
      <h2>Use what others<br />have figured out.</h2>
      <p>
        Browse the library, sign in with your invited email, then choose a lesson or learning path.
        Return to the same network to find your saved playback position.
      </p>
      <div class="card-foot">
        <span>Private lessons require member access</span><span
          >Explore the library <Icon name="arrow-right" /></span
        >
      </div></a
    ><a use:inkReveal class="asset-card" href="/dashboard"
      ><p class="eyebrow"><Icon name="network" size={24} /> 02 / CREATE & TEACH</p>
      <h2>Teach a technique.<br />Share your practice.</h2>
      <p>
        Open your workspace to continue a network or see your next access step. Creator approval
        comes before network setup; uploads begin as private drafts.
      </p>
      <div class="card-foot">
        <span>Invitation or application. Human review.</span><span
          >Creator workspace <Icon name="arrow-right" /></span
        >
      </div></a
    >
  </div>
  <p>
    Looking for an acquired MCP, plugin or skill? <a href="/collection">Open your collection</a>.
    Asset ownership and network membership are separate.
  </p>
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
