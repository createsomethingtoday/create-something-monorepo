<script lang="ts">
  import type { PageData } from './$types';
  import RichNote from '$lib/RichNote.svelte';
  import { createObjectCenterResolver, objectBounds, uid } from '$lib/document';
  import { saveDocument } from '$lib/persistence';
  import { connectorLabelLayout } from '$lib/webmcp';
  let { data }: { data: PageData } = $props();
  const document = $derived(data.share.document);
  const index = $derived(new Map(document.objects.map((object) => [object.id, object])));
  const objects = $derived([...document.objects.filter((object) => object.kind === 'group'), ...document.objects.filter((object) => object.kind !== 'group')]);
  const center = $derived(createObjectCenterResolver(document.objects));
  const connectorLabels = $derived(connectorLabelLayout(document.objects));
  const bounds = $derived(objectBounds(document.objects, document.objects));
  const frame = $derived({ x: bounds.x - 60, y: bounds.y - 60, width: Math.max(320, bounds.width + 120), height: Math.max(240, bounds.height + 120) });
  const path = (points: { x: number; y: number }[]) => points.map((point, i) => `${i ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
  async function copyLocal() {
    const now = new Date().toISOString();
    await saveDocument({ ...structuredClone(document), id: uid('canvas'), title: `${document.title} copy`, createdAt: now, updatedAt: now });
    location.href = '/';
  }
</script>

<svelte:head><title>{document.title} · View-only Draw snapshot</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<main><header><img src="/brand/create-something-agency-white.svg" alt="CREATE SOMETHING" /><div><strong>{document.title}</strong><span>View-only snapshot · revision {data.share.revision}</span></div><button onclick={copyLocal}>Copy to a new local canvas</button></header>
  <section aria-label={`View-only snapshot: ${document.title}`}>
    <svg viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} role="img" aria-label={document.title}>
      <defs><marker id="head" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="context-stroke" /></marker></defs><rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill="#000" />
      {#each objects as object (object.id)}
        {#if object.kind === 'stroke'}<path d={path(object.points)} fill="none" stroke={object.color} stroke-width={object.width} stroke-linecap="round" stroke-linejoin="round" />
        {:else if object.kind === 'rectangle'}<rect x={Math.min(object.from.x,object.to.x)} y={Math.min(object.from.y,object.to.y)} width={Math.abs(object.to.x-object.from.x)} height={Math.abs(object.to.y-object.from.y)} fill="none" stroke={object.color} />
        {:else if object.kind === 'ellipse'}<ellipse cx={(object.from.x+object.to.x)/2} cy={(object.from.y+object.to.y)/2} rx={Math.abs(object.to.x-object.from.x)/2} ry={Math.abs(object.to.y-object.from.y)/2} fill="none" stroke={object.color} />
        {:else if object.kind === 'arrow'}<line x1={object.from.x} y1={object.from.y} x2={object.to.x} y2={object.to.y} stroke={object.color} marker-end="url(#head)" />
        {:else if object.kind === 'note'}<g><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="#111" stroke="rgba(255,255,255,.22)" /><foreignObject x={object.x+16} y={object.y+14} width={object.width-32} height={object.height-28}>{#if object.content}<RichNote content={object.content}/>{:else}<div xmlns="http://www.w3.org/1999/xhtml" class="plain">{object.text}</div>{/if}</foreignObject></g>
        {:else if object.kind === 'group'}<g><rect x={object.x} y={object.y} width={object.width} height={object.height} fill="rgba(252,170,45,.025)" stroke="#fcaa2d" stroke-dasharray="8 6"/><text x={object.x+12} y={object.y+24}>{object.label}</text></g>
        {:else if object.kind === 'connector'}{@const from=index.get(object.fromId)}{@const to=index.get(object.toId)}{#if from&&to}{@const a=center(from)}{@const b=center(to)}{@const label=connectorLabels.get(object.id)}<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fcaa2d" marker-end="url(#head)" />{#if object.label&&label}<text class="connector-label" x={label.x} y={label.y} text-anchor="middle">{object.label}</text>{/if}{/if}{/if}
      {/each}
    </svg>
  </section>
</main>
<style>main{height:100dvh;display:grid;grid-template-rows:64px 1fr;background:#000;color:#fff;font-family:Arial,sans-serif}header{display:flex;align-items:center;gap:18px;padding:10px 18px;border-bottom:1px solid #222;background:#0d0d0d}header img{width:145px}header div{display:grid;gap:3px;min-width:0;flex:1}header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}header span{color:#999;font:10px monospace;text-transform:uppercase}button{padding:10px;border:1px solid #fcaa2d;border-radius:3px;background:#fcaa2d;color:#111;font-weight:750}section{min-height:0}svg{width:100%;height:100%;display:block}.plain{height:100%;overflow:hidden;white-space:pre-wrap;color:#fff;font:500 16px/1.35 Arial,sans-serif}text{fill:#fcaa2d;font:700 11px monospace}.connector-label{paint-order:stroke;stroke:#000;stroke-width:5px}@media(max-width:700px){header{height:auto;flex-wrap:wrap}header img{width:110px}button{width:100%}main{grid-template-rows:auto 1fr}}</style>
