<script lang="ts">
  export type AgencySignKind = 'map' | 'build' | 'control' | 'approval' | 'proof';

  let { kind }: { kind: AgencySignKind } = $props();
</script>

<!-- Original elementary geometry shared by signs and hero route diagrams. -->
<svg
  viewBox="0 0 32 32"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linejoin="round"
  stroke-linecap="round"
  aria-hidden="true"
  focusable="false"
>
  {#if kind === 'map'}
    <path d="M3 12 16 5 29 12 16 19Z M3 12v7l13 7 13-7v-7 M16 19v7 M10 12l6-3 6 3-6 3Z" />
    <path d="M10 12v3 M22 12v3 M16 15v3" />
  {:else if kind === 'build'}
    <path
      d="m4 9 12-6 12 6-12 6Z M4 9v5l12 6 12-6V9 M16 15v5 M4 20l12 6 12-6 M4 24l12 6 12-6 M16 26v4"
    />
  {:else if kind === 'control'}
    <path
      d="M4 12 16 6l12 6v10l-8 4 M12 26l-8-4V12 M4 22l12-6 12 6 M16 6v10 M12 28v-7 M20 28v-7 M12 23h8"
    />
  {:else if kind === 'approval'}
    <path d="M4 14 16 7l12 7-12 7Z M4 14v6l12 7 12-7v-6 M16 21v6" />
    <path d="m10.5 14.5 4 2.5 7-5" />
  {:else}
    <path
      d="m8 8 12-5 5 4v17l-12 5-5-4Z M8 8l5 4 12-5 M13 12v17 M17 15l5-2 M17 20l5-2 M17 25l5-2"
    />
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  path {
    vector-effect: non-scaling-stroke;
  }
</style>
