<script lang="ts">
  import type { Tool } from './document';
  let { tool }: { tool: Tool } = $props();
</script>

<svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if tool === 'select'}<path d="m5 3 14 9-7 1-3 7z" />
  {:else if tool === 'pen'}<path d="m4 20 1-5L16 4a2.1 2.1 0 0 1 3 3L8 18zM14 6l4 4" />
  {:else if tool === 'eraser'}<path d="m4 13 9-9 7 7-9 9H7l-4-4a2 2 0 0 1 1-3ZM9 8l7 7M11 20h9" />
  {:else if tool === 'rectangle'}<rect x="4" y="5" width="16" height="14" rx="1" />
  {:else if tool === 'ellipse'}<ellipse cx="12" cy="12" rx="8" ry="7" />
  {:else if tool === 'arrow'}<path d="M4 20 20 4M9 4h11v11" />
  {:else if tool === 'note'}<path d="M4 4h16v11l-5 5H4zM15 20v-5h5M8 9h8M8 12h5" />
  {:else if tool === 'connector'}<rect x="2" y="3" width="6" height="6" rx="1" /><rect x="16" y="15" width="6" height="6" rx="1" /><path d="M5 9v6h14" />
  {:else if tool === 'group'}<path stroke-dasharray="3 3" d="M3 3h18v18H3z" /><rect x="7" y="7" width="4" height="4" /><rect x="13" y="13" width="4" height="4" />
  {:else if tool === 'pan'}<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v5c0 4-2 6-6 6h-2c-2 0-3-1-4-3l-4-5a1.5 1.5 0 0 1 2-2z" />{/if}
</svg>
