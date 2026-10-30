<script lang="ts">
  import { onMount } from 'svelte';
  import FocusedRevisionPanel from '../FocusedRevisionPanel.svelte';
  import { createDocument, type CanvasDocument } from '../document';
  let document = $state<CanvasDocument>({ ...createDocument(), id: 'focus-harness', objects: [{ id: 'review', kind: 'note', createdAt: 'now', x: 0, y: 0, width: 200, height: 120, text: 'Noah reviews every action.' }] });
  let calls = $state(0);
  let pending: { resolve: (result: Record<string, unknown>) => void; reject: (error: Error) => void } | undefined;
  const execute = () => { calls += 1; return new Promise<Record<string, unknown>>((resolve, reject) => { pending = { resolve, reject }; }); };
  onMount(() => {
    const api = {
      complete: () => { pending?.resolve({ changeId: 'synthetic-focus-receipt' }); pending = undefined; },
      fail: () => { pending?.reject(new Error('Synthetic interrupted result')); pending = undefined; },
      changeProject: () => { document = { ...document, id: 'other-focus-harness' }; }
    };
    (window as unknown as { __focusedRevisionHarness: typeof api }).__focusedRevisionHarness = api;
    return () => { delete (window as unknown as { __focusedRevisionHarness?: typeof api }).__focusedRevisionHarness; };
  });
</script>
<div class="harness" aria-label="Isolated focus/error test harness">
  <button onkeydown={(e) => e.stopPropagation()}>Outside prototype</button>
  <p aria-label="Harness calls">{calls}</p>
  <FocusedRevisionPanel {document} selectedIds={['review']} disabled={false} {execute} />
</div>
<style>.harness { position:fixed;inset:0 0 0 auto;width:min(400px,100vw);z-index:10000;overflow:auto;background:#111;color:#fff;padding:12px; }.harness>button { min-height:44px;color:inherit;background:#222;border:1px solid #888; }</style>
