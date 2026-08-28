<script lang="ts">
  import './page.css';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { clearDocument, loadDocument, saveDocument } from '$lib/persistence';
  import { commit, convert, createDocument, parse, redo, removeObjects, restoreConversion, serialize, uid, undo, withObjects, type CanvasDocument, type CanvasObject, type History, type Point, type Shape, type Stroke, type Tool } from '$lib/document';

  const tools: { id: Tool; label: string; key: string }[] = [
    { id: 'select', label: 'Select', key: 'V' }, { id: 'pen', label: 'Pen', key: 'P' },
    { id: 'eraser', label: 'Eraser', key: 'E' }, { id: 'rectangle', label: 'Rectangle', key: 'R' },
    { id: 'ellipse', label: 'Ellipse', key: 'O' }, { id: 'arrow', label: 'Arrow', key: 'A' },
    { id: 'note', label: 'Note', key: 'N' }, { id: 'connector', label: 'Connector', key: 'C' },
    { id: 'group', label: 'Group', key: 'G' }, { id: 'pan', label: 'Pan', key: 'H' }
  ];

  let history = $state<History>({ past: [], present: createDocument(), future: [] });
  let selectedIds = $state<string[]>([]), tool = $state<Tool>('pen'), drawing = $state(false);
  let start = $state<Point | null>(null), draftPoints = $state<Point[]>([]), draftShape = $state<Shape | null>(null);
  let lasso = $state<{ from: Point; to: Point } | null>(null), conversionOpen = $state(false), status = $state('Loading local canvas…'), ready = $state(false);
  let surface: SVGSVGElement, fileInput: HTMLInputElement, viewportWidth = $state(1200), viewportHeight = $state(800);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const document = $derived(history.present), viewport = $derived(document.viewport);
  const selectedObjects = $derived(document.objects.filter(({ id }) => selectedIds.includes(id)));
  const renderObjects = $derived([...document.objects.filter(({ kind }) => kind === 'group'), ...document.objects.filter(({ kind }) => kind !== 'group')]);
  const transform = $derived(`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`);

  onMount(() => {
    void loadDocument().then((saved) => { if (saved) { history = { past: [], present: saved, future: [] }; status = 'Restored from this device'; } else status = 'New local session'; }).catch(() => status = 'Local storage unavailable · export copies').finally(() => ready = true);
    const resize = () => { viewportWidth = surface?.clientWidth || window.innerWidth; viewportHeight = surface?.clientHeight || window.innerHeight; };
    resize(); window.addEventListener('resize', resize); window.addEventListener('keydown', keydown);
    if (import.meta.env.PROD) navigator.serviceWorker?.register('/service-worker.js').catch(() => undefined);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); };
  });

  function point(event: PointerEvent): Point { const rect = surface.getBoundingClientRect(); return { x: (event.clientX - rect.left - viewport.x) / viewport.zoom, y: (event.clientY - rect.top - viewport.y) / viewport.zoom }; }
  function queueSave(next: CanvasDocument) { if (!browser) return; clearTimeout(saveTimer); status = 'Saving locally…'; saveTimer = setTimeout(() => void saveDocument(next).then(() => status = 'Saved on this device').catch(() => status = 'Local save failed · export a copy'), 120); }
  function apply(next: CanvasDocument) { history = commit(history, next); queueSave(next); }
  function updateViewport(next: CanvasDocument['viewport']) { const updated = { ...document, viewport: next, updatedAt: new Date().toISOString() }; history = { ...history, present: updated }; queueSave(updated); }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !ready) return;
    try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
    const here = point(event); drawing = true; start = here;
    if (tool === 'pen') draftPoints = [here];
    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'arrow') draftShape = { id: 'draft', kind: tool, createdAt: new Date().toISOString(), from: here, to: here, color: '#f7f4ee' };
    if (tool === 'select') lasso = { from: here, to: here };
    if (tool === 'note') { const item: CanvasObject = { id: uid('note'), kind: 'note', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 260, height: 132, text: 'New thought' }; apply(withObjects(document, [...document.objects, item])); selectedIds = [item.id]; drawing = false; }
    if (tool === 'group') { const item: CanvasObject = { id: uid('group'), kind: 'group', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 360, height: 220, label: 'Working group', childIds: [] }; apply(withObjects(document, [...document.objects, item])); selectedIds = [item.id]; drawing = false; }
  }
  function pointerMove(event: PointerEvent) {
    if (!drawing || !start) return; const here = point(event);
    if (tool === 'pen') draftPoints = [...draftPoints, here];
    if (draftShape) draftShape = { ...draftShape, to: here };
    if (lasso) lasso = { ...lasso, to: here };
    if (tool === 'pan') updateViewport({ ...viewport, x: viewport.x + event.movementX, y: viewport.y + event.movementY });
  }
  function pointerUp(event: PointerEvent) {
    if (!drawing) return; const here = point(event);
    if (tool === 'pen' && draftPoints.length > 1) { const item: Stroke = { id: uid('stroke'), kind: 'stroke', createdAt: new Date().toISOString(), points: draftPoints, color: '#f7f4ee', width: 3 }; apply(withObjects(document, [...document.objects, item])); selectedIds = [item.id]; }
    if (draftShape && start && Math.hypot(here.x - start.x, here.y - start.y) > 4) { const item = { ...draftShape, id: uid(draftShape.kind), to: here }; apply(withObjects(document, [...document.objects, item])); selectedIds = [item.id]; }
    if (lasso) { const left = Math.min(lasso.from.x, lasso.to.x), right = Math.max(lasso.from.x, lasso.to.x), top = Math.min(lasso.from.y, lasso.to.y), bottom = Math.max(lasso.from.y, lasso.to.y); selectedIds = document.objects.filter((object) => { const center = objectCenter(object); return center.x >= left && center.x <= right && center.y >= top && center.y <= bottom; }).map(({ id }) => id); }
    drawing = false; start = null; draftPoints = []; draftShape = null; lasso = null;
    try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
  }

  function objectCenter(object: CanvasObject): Point {
    if (object.kind === 'stroke') return object.points[Math.floor(object.points.length / 2)] || { x: 0, y: 0 };
    if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return { x: (object.from.x + object.to.x) / 2, y: (object.from.y + object.to.y) / 2 };
    if (object.kind === 'note' || object.kind === 'group') return { x: object.x + object.width / 2, y: object.y + object.height / 2 };
    if (object.kind !== 'connector') return { x: 0, y: 0 };
    const from = document.objects.find(({ id }) => id === object.fromId), to = document.objects.find(({ id }) => id === object.toId);
    const a = from ? objectCenter(from) : { x: 0, y: 0 }, b = to ? objectCenter(to) : { x: 0, y: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function selectPointer(event: PointerEvent, id: string) {
    event.stopPropagation();
    if (tool === 'eraser') { apply(removeObjects(document, [id])); selectedIds = []; return; }
    if (tool === 'connector') { selectedIds = selectedIds.includes(id) ? selectedIds : [...selectedIds.slice(-1), id]; if (selectedIds.length === 2) runConversion('connector'); return; }
    selectedIds = event.shiftKey ? (selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]) : [id];
  }
  function selectKeyboard(event: KeyboardEvent, id: string) { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); selectedIds = event.shiftKey ? [...new Set([...selectedIds, id])] : [id]; }
  function runConversion(target: 'note' | 'connector' | 'group') { const next = convert(document, selectedIds, target); if (next === document) { status = target === 'connector' ? 'Select two objects to make a connector' : 'Select source material first'; return; } const created = next.objects.at(-1)!; apply(next); selectedIds = [created.id]; conversionOpen = false; status = `Converted to ${target}. Source preserved.`; }
  function restoreSelected() { const selected = selectedObjects[0]; if (!selected?.sourceSnapshot) return; const next = restoreConversion(document, selected.id); apply(next); selectedIds = selected.sourceIds || []; status = 'Conversion removed. Source restored.'; }
  function doUndo() { const next = undo(history); history = next; selectedIds = []; queueSave(next.present); }
  function doRedo() { const next = redo(history); history = next; selectedIds = []; queueSave(next.present); }
  function keydown(event: KeyboardEvent) { if ((event.target as HTMLElement)?.matches('input,textarea')) return; if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? doRedo() : doUndo(); return; } if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) { apply(removeObjects(document, selectedIds)); selectedIds = []; return; } const match = tools.find(({ key }) => key.toLowerCase() === event.key.toLowerCase()); if (match) tool = match.id; }
  function wheel(event: WheelEvent) { event.preventDefault(); updateViewport({ ...viewport, zoom: Math.max(.25, Math.min(3, viewport.zoom * (event.deltaY > 0 ? .9 : 1.1))) }); }
  const path = (points: Point[]) => points.map((value, index) => `${index ? 'L' : 'M'} ${value.x} ${value.y}`).join(' ');

  function download(content: BlobPart, type: string, extension: string) { const blob = content instanceof Blob ? content : new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${document.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'mapping-canvas'}.${extension}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url)); }
  function exportJson() { download(serialize(document), 'application/json', 'json'); status = 'JSON exported'; }
  function svgMarkup() {
    const clone = surface.cloneNode(true) as SVGSVGElement, namespace = 'http://www.w3.org/2000/svg';
    clone.querySelectorAll('[data-ui=true]').forEach((node) => node.remove());
    clone.querySelectorAll('.group-label').forEach((node) => { node.setAttribute('fill', '#fcaa2d'); node.setAttribute('font-family', 'monospace'); node.setAttribute('font-size', '11'); node.setAttribute('font-weight', '700'); });
    clone.querySelectorAll('.provenance').forEach((node) => { node.setAttribute('fill', 'rgba(255,255,255,.45)'); node.setAttribute('font-family', 'monospace'); node.setAttribute('font-size', '9'); node.setAttribute('font-weight', '700'); });
    for (const note of document.objects.filter((object) => object.kind === 'note')) {
      const group = clone.querySelector(`[data-object-id="${CSS.escape(note.id)}"]`), editor = group?.querySelector('foreignObject');
      if (!group || !editor) continue;
      editor.remove();
      const text = window.document.createElementNS(namespace, 'text'); text.setAttribute('x', String(note.x + 16)); text.setAttribute('y', String(note.y + 30)); text.setAttribute('fill', '#fff'); text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('font-size', '16');
      const words = note.text.split(/\s+/); let line = '', lineNumber = 0;
      for (const word of words) { const next = `${line}${line ? ' ' : ''}${word}`; if (next.length > Math.max(12, Math.floor((note.width - 32) / 8)) && line) { const span = window.document.createElementNS(namespace, 'tspan'); span.setAttribute('x', String(note.x + 16)); span.setAttribute('dy', lineNumber++ ? '1.35em' : '0'); span.textContent = line; text.append(span); line = word; } else line = next; }
      if (line) { const span = window.document.createElementNS(namespace, 'tspan'); span.setAttribute('x', String(note.x + 16)); span.setAttribute('dy', lineNumber ? '1.35em' : '0'); span.textContent = line; text.append(span); }
      group.append(text);
    }
    clone.setAttribute('xmlns', namespace); clone.setAttribute('width', String(viewportWidth)); clone.setAttribute('height', String(viewportHeight)); return new XMLSerializer().serializeToString(clone);
  }
  function exportSvg() { download(svgMarkup(), 'image/svg+xml', 'svg'); status = 'SVG exported'; }
  async function exportPng() {
    const ratio = devicePixelRatio, canvas = window.document.createElement('canvas'); canvas.width = viewportWidth * ratio; canvas.height = viewportHeight * ratio;
    const context = canvas.getContext('2d')!; context.scale(ratio, ratio); context.fillStyle = '#000'; context.fillRect(0, 0, viewportWidth, viewportHeight);
    context.strokeStyle = 'rgba(255,255,255,.055)'; context.lineWidth = 1;
    for (let x = 0; x < viewportWidth; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, viewportHeight); context.stroke(); }
    for (let y = 0; y < viewportHeight; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(viewportWidth, y); context.stroke(); }
    context.save(); context.translate(viewport.x, viewport.y); context.scale(viewport.zoom, viewport.zoom);
    const arrow = (from: Point, to: Point, color: string) => { context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 2; context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke(); const angle = Math.atan2(to.y - from.y, to.x - from.x); context.beginPath(); context.moveTo(to.x, to.y); context.lineTo(to.x - 10 * Math.cos(angle - Math.PI / 6), to.y - 10 * Math.sin(angle - Math.PI / 6)); context.lineTo(to.x - 10 * Math.cos(angle + Math.PI / 6), to.y - 10 * Math.sin(angle + Math.PI / 6)); context.closePath(); context.fill(); };
    for (const object of document.objects) {
      if (object.kind === 'stroke') { context.strokeStyle = object.color; context.lineWidth = object.width; context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath(); object.points.forEach((value, index) => index ? context.lineTo(value.x, value.y) : context.moveTo(value.x, value.y)); context.stroke(); }
      else if (object.kind === 'rectangle') { context.strokeStyle = object.color; context.lineWidth = 2; context.strokeRect(object.from.x, object.from.y, object.to.x - object.from.x, object.to.y - object.from.y); }
      else if (object.kind === 'ellipse') { context.strokeStyle = object.color; context.lineWidth = 2; context.beginPath(); context.ellipse((object.from.x + object.to.x) / 2, (object.from.y + object.to.y) / 2, Math.abs(object.to.x - object.from.x) / 2, Math.abs(object.to.y - object.from.y) / 2, 0, 0, Math.PI * 2); context.stroke(); }
      else if (object.kind === 'arrow') arrow(object.from, object.to, object.color);
      else if (object.kind === 'connector') { const from = document.objects.find(({ id }) => id === object.fromId), to = document.objects.find(({ id }) => id === object.toId); if (from && to) arrow(objectCenter(from), objectCenter(to), '#fcaa2d'); }
      else if (object.kind === 'note') { context.fillStyle = '#111'; context.strokeStyle = 'rgba(255,255,255,.18)'; context.fillRect(object.x, object.y, object.width, object.height); context.strokeRect(object.x, object.y, object.width, object.height); context.fillStyle = '#fff'; context.font = '500 16px Arial'; const words = object.text.split(/\s+/); let line = '', y = object.y + 30; for (const word of words) { const next = `${line}${line ? ' ' : ''}${word}`; if (context.measureText(next).width > object.width - 32 && line) { context.fillText(line, object.x + 16, y); line = word; y += 22; } else line = next; } if (line) context.fillText(line, object.x + 16, y); }
      else if (object.kind === 'group') { context.strokeStyle = '#fcaa2d'; context.setLineDash([8, 6]); context.strokeRect(object.x, object.y, object.width, object.height); context.setLineDash([]); context.fillStyle = '#fcaa2d'; context.font = '700 11px monospace'; context.fillText(object.label.toUpperCase(), object.x + 12, object.y + 24); }
    }
    context.restore(); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('PNG export failed'); download(blob, 'image/png', 'png'); status = 'PNG exported';
  }
  async function importJson(event: Event) { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return; try { const next = parse(await file.text()); history = commit(history, next); selectedIds = []; queueSave(next); status = 'Canvas imported'; } catch (error) { status = error instanceof Error ? error.message : 'Import failed'; } finally { fileInput.value = ''; } }
  async function resetCanvas() { if (!confirm('Reset this local canvas? Export first if you need a copy.')) return; clearTimeout(saveTimer); saveTimer = undefined; status = 'Resetting local canvas…'; await clearDocument(); const next = createDocument(); history = { past: [], present: next, future: [] }; selectedIds = []; status = 'New local session'; }
  function updateTitle(value: string) { const next = { ...document, title: value || 'Untitled mapping session', updatedAt: new Date().toISOString() }; history = { ...history, present: next }; queueSave(next); }
</script>

<svelte:head><title>{document.title} · Mapping Canvas</title><meta name="description" content="Free-form thinking that becomes structured mapping material." /></svelte:head>

<main class="app-shell">
  <header class="topbar">
    <div class="identity"><i aria-hidden="true"></i><div><b>CREATE SOMETHING</b><span>Mapping canvas</span></div></div>
    <input class="title" aria-label="Canvas title" value={document.title} oninput={(event) => updateTitle(event.currentTarget.value)} />
    <div class="file-actions"><button onclick={() => fileInput.click()}>Import</button><button onclick={exportJson}>JSON</button><button onclick={exportSvg}>SVG</button><button onclick={exportPng}>PNG</button><button onclick={resetCanvas}>Reset</button><input bind:this={fileInput} class="visually-hidden" type="file" accept="application/json,.json" onchange={importJson} /></div>
  </header>
  <section class="workbench" aria-label="Mapping canvas workbench">
    <nav class="toolbar" aria-label="Canvas tools">{#each tools as entry}<button class:active={tool === entry.id} aria-pressed={tool === entry.id} aria-label={`${entry.label} tool (${entry.key})`} title={`${entry.label} · ${entry.key}`} onclick={() => tool = entry.id}><kbd>{entry.key}</kbd><span>{entry.label}</span></button>{/each}</nav>
    <div class="canvas-frame">
      <svg bind:this={surface} class:crosshair={tool !== 'select' && tool !== 'pan'} role="group" aria-label="Canvas objects" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} onpointerdown={pointerDown} onpointermove={pointerMove} onpointerup={pointerUp} onpointercancel={pointerUp} onwheel={wheel}>
        <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0L0 0 0 32" fill="none" stroke="rgba(255,255,255,.055)" /></pattern><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="context-stroke" /></marker><filter id="selected"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fcaa2d" flood-opacity=".6" /></filter></defs>
        <rect width="100%" height="100%" fill="#000" /><rect width="100%" height="100%" fill="url(#grid)" />
        <g transform={transform}>
          {#each renderObjects as object (object.id)}
            {@const selected = selectedIds.includes(object.id)}
            {#if object.kind === 'stroke'}<path class:selected role="button" tabindex="0" aria-label="Ink stroke" d={path(object.points)} fill="none" stroke={object.color} stroke-width={object.width} stroke-linecap="round" stroke-linejoin="round" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'rectangle'}<rect class:selected role="button" tabindex="0" aria-label="Rectangle" x={Math.min(object.from.x, object.to.x)} y={Math.min(object.from.y, object.to.y)} width={Math.abs(object.to.x - object.from.x)} height={Math.abs(object.to.y - object.from.y)} fill="transparent" stroke={object.color} stroke-width="2" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'ellipse'}<ellipse class:selected role="button" tabindex="0" aria-label="Ellipse" cx={(object.from.x + object.to.x) / 2} cy={(object.from.y + object.to.y) / 2} rx={Math.abs(object.to.x - object.from.x) / 2} ry={Math.abs(object.to.y - object.from.y) / 2} fill="transparent" stroke={object.color} stroke-width="2" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'arrow'}<line class:selected role="button" tabindex="0" aria-label="Arrow" x1={object.from.x} y1={object.from.y} x2={object.to.x} y2={object.to.y} stroke={object.color} stroke-width="2" marker-end="url(#arrowhead)" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'note'}<g data-object-id={object.id} class:selected role="button" tabindex="0" aria-label={`Note: ${object.text}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="#111" stroke={selected ? '#fcaa2d' : 'rgba(255,255,255,.18)'} /><foreignObject x={object.x + 16} y={object.y + 14} width={object.width - 32} height={object.height - 28}><textarea xmlns="http://www.w3.org/1999/xhtml" aria-label="Edit note" value={object.text} onpointerdown={(event) => event.stopPropagation()} oninput={(event) => { const next = withObjects(document, document.objects.map((entry) => entry.id === object.id ? { ...object, text: event.currentTarget.value } : entry)); history = { ...history, present: next }; queueSave(next); }}></textarea></foreignObject>{#if object.sourceIds?.length}<text x={object.x + 16} y={object.y + object.height - 10} class="provenance">CONVERTED · {object.sourceIds.length} SOURCE</text>{/if}</g>
            {:else if object.kind === 'group'}<g class:selected role="button" tabindex="0" aria-label={`Group: ${object.label}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="rgba(252,170,45,.025)" stroke={selected ? '#fcaa2d' : 'rgba(252,170,45,.5)'} stroke-dasharray="8 6" /><text x={object.x + 12} y={object.y + 24} class="group-label">{object.label}</text></g>
            {:else if object.kind === 'connector'}{@const from = document.objects.find(({ id }) => id === object.fromId)}{@const to = document.objects.find(({ id }) => id === object.toId)}{#if from && to}{@const a = objectCenter(from)}{@const b = objectCenter(to)}<line class:selected role="button" tabindex="0" aria-label="Connector" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fcaa2d" stroke-width="2" marker-end="url(#arrowhead)" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />{/if}{/if}
          {/each}
          {#if draftPoints.length > 1}<path data-ui="true" d={path(draftPoints)} fill="none" stroke="#f7f4ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />{/if}
          {#if draftShape}{#if draftShape.kind === 'rectangle'}<rect data-ui="true" x={Math.min(draftShape.from.x, draftShape.to.x)} y={Math.min(draftShape.from.y, draftShape.to.y)} width={Math.abs(draftShape.to.x - draftShape.from.x)} height={Math.abs(draftShape.to.y - draftShape.from.y)} fill="transparent" stroke="#f7f4ee" />{:else if draftShape.kind === 'ellipse'}<ellipse data-ui="true" cx={(draftShape.from.x + draftShape.to.x) / 2} cy={(draftShape.from.y + draftShape.to.y) / 2} rx={Math.abs(draftShape.to.x - draftShape.from.x) / 2} ry={Math.abs(draftShape.to.y - draftShape.from.y) / 2} fill="transparent" stroke="#f7f4ee" />{:else}<line data-ui="true" x1={draftShape.from.x} y1={draftShape.from.y} x2={draftShape.to.x} y2={draftShape.to.y} stroke="#f7f4ee" marker-end="url(#arrowhead)" />{/if}{/if}
          {#if lasso}<rect data-ui="true" x={Math.min(lasso.from.x, lasso.to.x)} y={Math.min(lasso.from.y, lasso.to.y)} width={Math.abs(lasso.to.x - lasso.from.x)} height={Math.abs(lasso.to.y - lasso.from.y)} fill="rgba(252,170,45,.08)" stroke="#fcaa2d" stroke-dasharray="5 5" />{/if}
        </g>
      </svg>
      <div class="history"><button onclick={doUndo} disabled={!history.past.length}>Undo</button><button onclick={doRedo} disabled={!history.future.length}>Redo</button><span>{Math.round(viewport.zoom * 100)}%</span><button onclick={() => updateViewport({ x: 0, y: 0, zoom: 1 })}>Reset view</button></div>
      {#if selectedIds.length}<div class="selection" data-ui="true"><span>{selectedIds.length} selected</span><button class="convert" data-testid="convert-menu" onclick={() => conversionOpen = !conversionOpen}>Convert to…</button>{#if selectedObjects.length === 1 && selectedObjects[0].sourceSnapshot}<button data-testid="restore-source" onclick={restoreSelected}>Restore source</button>{/if}{#if conversionOpen}<div class="conversion-menu"><button data-testid="convert-note" onclick={() => runConversion('note')}>Note<small>Retain as editable text</small></button><button data-testid="convert-connector" onclick={() => runConversion('connector')} disabled={selectedIds.length < 2}>Connector<small>Relate two selected objects</small></button><button data-testid="convert-group" onclick={() => runConversion('group')}>Group<small>Name a working boundary</small></button></div>{/if}</div>{/if}
    </div>
  </section>
  <footer class="statusbar"><span><i aria-hidden="true"></i>{status}</span><span>LOCAL DRAFT · CONVERSION IS OPERATOR-APPROVED</span></footer>
</main>
