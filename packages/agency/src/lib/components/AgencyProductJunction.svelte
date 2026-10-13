<script lang="ts">
  import { IsometricIllustration } from "@create-something/canon";
</script>
<!-- Original route diagram authored from elementary planes and independent branches.
     The native links immediately below repeat the complete meaning at every width. -->
<div class="product-junction" aria-hidden="true">
  <p>Choose the path that fits</p>
  <svg viewBox="0 0 560 360" fill="none" focusable="false">
    <g class="branches" stroke="currentColor" stroke-width="2">
      <path d="M100 181 260 67 M100 181h160 M100 181l160 114" />
    </g>
    <svg x="18" y="129" width="96" height="96"><IsometricIllustration kind="diagnose" size={96} /></svg>
    <svg x="245" y="15" width="96" height="96"><IsometricIllustration kind="map" size={96} /></svg>
    <svg x="245" y="129" width="96" height="96"><IsometricIllustration kind="build" size={96} /></svg>
    <svg x="245" y="243" width="96" height="96"><IsometricIllustration kind="operate" size={96} /></svg>
    <g class="names" fill="currentColor">
      <text x="24" y="240">Your task</text>
      <text x="350" y="64">Map</text>
      <text x="350" y="178">Build</text>
      <text x="350" y="292">Control</text>
    </g>
    <g class="details" fill="currentColor">
      <text x="350" y="90">Define</text>
      <text x="350" y="204">Connect</text>
      <text x="350" y="318">Operate · includes Map</text>
    </g>
  </svg>
</div>

<style>
  .product-junction { --isometric-surface: var(--color-performance-mode-campaign-surface); color: var(--color-performance-mode-campaign-ink); }
  p { margin: 0; font: var(--text-performance-caption)/1.5 var(--font-performance-mono); }
  .product-junction > svg { display: block; width: 100%; height: auto; }
  .branches { color: var(--color-performance-signal-soft); }
  .names { font: var(--font-performance-semibold) 22px var(--font-performance-interface); }
  .details { font: 15px var(--font-performance-interface); }
</style>
