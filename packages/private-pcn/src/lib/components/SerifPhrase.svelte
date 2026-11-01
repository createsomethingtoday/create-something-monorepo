<script lang="ts">
  let { text }: { text: string } = $props();
  const split = $derived(text.lastIndexOf(' ') + 1);
  const prefix = $derived(text.slice(0, split));
  const ending = $derived(text.slice(split));
</script>

<em
  >{prefix}<span class="ending"
    >{#if ending.endsWith('.')}{ending.slice(0, -1)}<span class="period">.</span
      >{:else}{ending}{/if}</span
  ></em
>

<style>
  .ending {
    white-space: nowrap;
  }
  .period {
    /* Match Canon PerformanceCampaignOpening's optical punctuation treatment. */
    margin-inline-start: 0.055em;
    letter-spacing: normal;
  }
</style>
