<script lang="ts">let paused = $state(false);</script>
<section class="research-trace" class:paused aria-label="Illustrative research sequence">
  <div class="trace" aria-hidden="true"><pre>. : + / = #    . : + / = #    . : + / = #    . : + / = #    . : + / = #</pre></div>
  <div class="trace-note"><p>Question → Method → Evidence <span>Illustrative sequence</span></p><button type="button" onclick={() => paused = !paused}>{paused ? 'Resume motion' : 'Pause motion'}</button></div>
</section>
<style>
.research-trace { margin-block: 2rem; border-block: 1px solid var(--color-performance-line); }
.trace { overflow: hidden; padding-block: 1.5rem; }
pre { width: max-content; color: var(--color-performance-muted); font: 1rem var(--font-performance-mono); animation: flow 18s linear infinite; }
.trace-note { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding-block: .75rem; font: .6875rem/1.6 var(--font-performance-mono); }
p { margin: 0; } span { display: block; color: var(--color-performance-muted); } button { min-height: 44px; padding: .5rem; border: 1px solid var(--color-performance-line); color: inherit; background: transparent; } button:focus-visible { outline: 3px solid var(--color-performance-focus); outline-offset: 4px; }
.paused pre { animation-play-state: paused; }
@keyframes flow { to { transform: translateX(-14rem); } }
@media (prefers-reduced-motion: reduce) { pre { animation: none; } button { display: none; } }
</style>
