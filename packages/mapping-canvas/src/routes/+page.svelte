<script lang="ts">
  import './page.css';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { clearDocument, loadDocument, saveDocument } from '$lib/persistence';
  import { commit, convert, createDocument, parse, redo, removeObjects, restoreConversion, serialize, uid, undo, withObjects, type CanvasDocument, type CanvasObject, type History, type Point, type Shape, type Stroke, type Tool } from '$lib/document';
  import { DEFAULT_DRAWING_COLOR, DRAWING_COLOR_PREFERENCE, DRAWING_PALETTE, isColorableObject, isDrawingColor, recolorObjects, type DrawingColor } from '$lib/palette';
  import { isValidCanvasTitle, type CanvasOperation } from '$lib/paired-session';
  import { beginPairing, companionStatus, discoverHosts, forgetCompanion, hasNativeBridge, hostStatus, nativeRole as readNativeRole, pairCompanion, refreshCompanion, replaceHostDocument, revokeCompanion, setCompanionOnline, submitNativeOperation, type DiscoveredHost, type NativeRole, type NativeSessionStatus, type PairingOffer } from '$lib/native-pairing';

  const tools: { id: Tool; label: string; key: string }[] = [
    { id: 'select', label: 'Select', key: 'V' }, { id: 'pen', label: 'Pen', key: 'P' },
    { id: 'eraser', label: 'Eraser', key: 'E' }, { id: 'rectangle', label: 'Rectangle', key: 'R' },
    { id: 'ellipse', label: 'Ellipse', key: 'O' }, { id: 'arrow', label: 'Arrow', key: 'A' },
    { id: 'note', label: 'Note', key: 'N' }, { id: 'connector', label: 'Connector', key: 'C' },
    { id: 'group', label: 'Group', key: 'G' }, { id: 'pan', label: 'Pan', key: 'H' }
  ];
  const TOOL_SIDEBAR_PREFERENCE = 'mapping-canvas-tool-sidebar-collapsed';
  const canonicalUrl = 'https://draw.createsomething.agency/';
  const publicTitle = 'Drawing Canvas for Mapping Meetings | CREATE SOMETHING';
  const publicDescription = 'A local-first drawing canvas for mapping meetings, spatial notes, shapes, connectors, groups, and portable JSON, SVG, or PNG exports.';
  const socialImage = `${canonicalUrl}og-image.png`;
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://createsomething.ltd/#organization',
    name: 'CREATE SOMETHING',
    url: 'https://createsomething.agency',
    logo: 'https://createsomething.ltd/icon-512.png'
  };
  const applicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${canonicalUrl}#application`,
    name: 'CREATE SOMETHING Draw',
    alternateName: 'Mapping Canvas',
    url: canonicalUrl,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern browser',
    description: publicDescription,
    isAccessibleForFree: true,
    image: socialImage,
    publisher: { '@id': organizationSchema['@id'] },
    featureList: [
      'Free-form pen and shape drawing',
      'Spatial notes, connectors, and groups',
      'Local-first browser storage',
      'JSON, SVG, and PNG export'
    ]
  };
  const jsonLd = (schema: unknown) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</scr` + 'ipt>';

  let history = $state<History>({ past: [], present: createDocument(), future: [] });
  let selectedIds = $state<string[]>([]), tool = $state<Tool>('pen'), drawing = $state(false);
  let nativeShell = $state(false);
  let nativeRole = $state<NativeRole>('web'), pairingOpen = $state(false), pairingBusy = $state(false);
  let pairingOffer = $state<PairingOffer | null>(null), discoveredHosts = $state<DiscoveredHost[]>([]), selectedHost = $state<DiscoveredHost | null>(null), pairingCode = $state('');
  let nativeSession = $state<NativeSessionStatus>({});
  let sidebarCollapsed = $state(false);
  let drawingColor = $state<DrawingColor>(DEFAULT_DRAWING_COLOR);
  let start = $state<Point | null>(null), draftPoints = $state<Point[]>([]), draftShape = $state<Shape | null>(null);
  let movingObjectId = $state<string | null>(null), dragLast = $state<Point | null>(null), dragOrigin = $state<CanvasDocument | null>(null), dragMoved = $state(false);
  let lasso = $state<{ from: Point; to: Point } | null>(null), conversionOpen = $state(false), status = $state('Loading local canvas…'), ready = $state(false);
  let surface: SVGSVGElement, fileInput = $state<HTMLInputElement | null>(null), viewportWidth = $state(1200), viewportHeight = $state(800);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let mirrorTimer: ReturnType<typeof setInterval> | undefined;
  let nativeTail: Promise<void> = Promise.resolve();
  let nativeOptimisticVersion = 0;
  const document = $derived(history.present), viewport = $derived(document.viewport);
  const selectedObjects = $derived(document.objects.filter(({ id }) => selectedIds.includes(id)));
  const paletteVisible = $derived(['pen', 'rectangle', 'ellipse', 'arrow'].includes(tool) || selectedObjects.some(isColorableObject));
  const renderObjects = $derived([...document.objects.filter(({ kind }) => kind === 'group'), ...document.objects.filter(({ kind }) => kind !== 'group')]);
  const transform = $derived(`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`);

  onMount(() => {
    nativeShell = hasNativeBridge();
    try { const savedColor = localStorage.getItem(DRAWING_COLOR_PREFERENCE); if (isDrawingColor(savedColor)) drawingColor = savedColor; } catch { /* Preference persistence is optional. */ }
    try { sidebarCollapsed = localStorage.getItem(TOOL_SIDEBAR_PREFERENCE) === 'true'; } catch { /* Preference persistence is optional. */ }
    void initializeSession();
    const resize = () => { viewportWidth = surface?.clientWidth || window.innerWidth; viewportHeight = surface?.clientHeight || window.innerHeight; };
    const surfaceObserver = new ResizeObserver(resize);
    resize(); surfaceObserver.observe(surface); window.addEventListener('resize', resize); window.addEventListener('keydown', keydown);
    mirrorTimer = setInterval(() => void refreshMirroredState(), 750);
    if (import.meta.env.PROD) navigator.serviceWorker?.register('/service-worker.js').catch(() => undefined);
    return () => { surfaceObserver.disconnect(); clearInterval(mirrorTimer); window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); };
  });

  async function initializeSession() {
    if (!nativeShell) {
      await loadDocument().then((saved) => { if (saved) { history = { past: [], present: saved, future: [] }; status = 'Restored from this device'; } else status = 'New local session'; }).catch(() => status = 'Local storage unavailable · export copies');
      ready = true;
      return;
    }
    try {
      nativeRole = await readNativeRole();
      nativeSession = nativeRole === 'host' ? await hostStatus() : await companionStatus();
      if (nativeSession.document) history = { past: [], present: nativeSession.document, future: [] };
      if (nativeRole === 'companion' && nativeSession.sessionId && nativeSession.online !== false && (nativeSession.queueDepth || 0) > 0) {
        const reconciled = await setCompanionOnline(true);
        nativeSession = { ...nativeSession, ...reconciled };
        if (reconciled.document) history = { past: [], present: reconciled.document, future: [] };
      }
      status = nativeRole === 'host' ? 'Mac session ready · Wi-Fi pairing available' : nativeSession.status === 'paired' ? 'Paired with Mac' : 'Pair this iPhone with Draw on Mac';
    } catch (error) { status = error instanceof Error ? error.message : 'Native session unavailable'; }
    ready = true;
  }

  async function openPairing() {
    pairingOpen = true; pairingBusy = true;
    try {
      if (nativeRole === 'host') pairingOffer = await beginPairing();
      else { discoveredHosts = await discoverHosts(); selectedHost = discoveredHosts[0] || null; }
    } catch (error) { status = error instanceof Error ? error.message : 'Pairing unavailable'; }
    finally { pairingBusy = false; }
  }

  async function refreshMirroredState() {
    if (!ready || nativeRole === 'web' || drawing || window.document.activeElement?.closest('input,textarea,[contenteditable="true"]')) return;
    if (nativeRole === 'companion' && (!nativeSession.sessionId || nativeSession.online === false || (nativeSession.queueDepth || 0) > 0)) return;
    try {
      const refreshed = nativeRole === 'host' ? await hostStatus() : await refreshCompanion();
      if (refreshed.revision !== nativeSession.revision && refreshed.document) {
        history = nativeRole === 'host'
          ? { past: [...history.past, history.present], present: refreshed.document, future: [] }
          : { past: history.past, present: refreshed.document, future: [] };
      }
      nativeSession = { ...nativeSession, ...refreshed };
    } catch { /* A transient local-network loss is represented by the queue path. */ }
  }

  async function confirmCompanionPairing() {
    if (!selectedHost || !/^\d{6}$/.test(pairingCode)) return;
    pairingBusy = true;
    try {
      nativeSession = await pairCompanion(selectedHost, pairingCode);
      if (nativeSession.document) history = { past: [], present: nativeSession.document, future: [] };
      pairingOpen = false; status = 'Paired securely with Mac over local Wi-Fi';
    } catch (error) { status = error instanceof Error ? error.message : 'Pairing rejected'; }
    finally { pairingBusy = false; }
  }

  function sendNative(operations: CanvasOperation[], recordsHistory = false) {
    if (nativeRole === 'web' || !operations.length) return;
    const role = nativeRole;
    const queued = operations.map((operation) => ({ operation, optimisticVersion: ++nativeOptimisticVersion }));
    nativeTail = nativeTail.then(async () => {
      let authoritativePrevious: CanvasDocument | undefined;
      for (const { operation, optimisticVersion } of queued) {
        const result = await submitNativeOperation(role, operation);
        authoritativePrevious ||= result.previousDocument;
        nativeSession = { ...nativeSession, ...result };
        if (result.document && result.status !== 'queued' && result.status !== 'conflict' && optimisticVersion === nativeOptimisticVersion) {
          const past = recordsHistory && authoritativePrevious
            ? [...history.past.slice(0, -1), authoritativePrevious]
            : history.past;
          history = { past, present: result.document, future: [] };
        }
        if (result.status === 'queued') status = `${result.queueDepth || 1} action queued · reconnect to Mac`;
        else if (result.status === 'queue_full') status = result.error || 'Offline queue is full · reconnect before editing';
        else if (result.status === 'conflict') status = 'Session changed on Mac · reconciliation required';
        else if (result.status === 'credentials_rejected') status = 'Pairing credentials rejected · export if needed, then forget and re-pair';
        else if (result.status === 'pairing_changed') status = 'Pairing changed while syncing · using the current Mac session';
        else status = role === 'host' ? `Mac committed revision ${result.revision}` : `Synced revision ${result.revision}`;
      }
    }).catch((error) => { status = error instanceof Error ? error.message : 'Native operation failed'; });
  }

  function point(event: PointerEvent): Point { const rect = surface.getBoundingClientRect(); return { x: (event.clientX - rect.left - viewport.x) / viewport.zoom, y: (event.clientY - rect.top - viewport.y) / viewport.zoom }; }
  function companionCanEdit() { if (nativeRole !== 'companion') return true; if (nativeSession.sessionId && !nativeSession.requiresRepair) return true; status = nativeSession.requiresRepair ? 'Pairing credentials rejected · export if needed, then forget and re-pair' : 'Pair this iPhone with a Mac before editing'; return false; }
  function queueSave(next: CanvasDocument) { if (!browser || nativeRole !== 'web') return; clearTimeout(saveTimer); status = 'Saving locally…'; saveTimer = setTimeout(() => void saveDocument(next).then(() => status = 'Saved on this device').catch(() => status = 'Local save failed · export a copy'), 120); }
  function apply(next: CanvasDocument, operation?: CanvasOperation | CanvasOperation[]) { if (!companionCanEdit()) return; history = commit(history, next); queueSave(next); sendNative(operation ? (Array.isArray(operation) ? operation : [operation]) : [], true); }
  function updateViewport(next: CanvasDocument['viewport'], authoritative = true) { if (!companionCanEdit()) return; const updated = { ...document, viewport: next, updatedAt: new Date().toISOString() }; history = { ...history, present: updated }; queueSave(updated); if (authoritative) sendNative([{ type: 'set_viewport', viewport: next }]); }
  function chooseColor(color: DrawingColor, label: string) { drawingColor = color; try { localStorage.setItem(DRAWING_COLOR_PREFERENCE, color); } catch { /* Keep drawing when preference storage is unavailable. */ } const next = recolorObjects(document, selectedIds, color); if (next !== document) { const changed = next.objects.filter((object) => selectedIds.includes(object.id)); apply(next, changed.map((object) => ({ type: 'put_object', object }))); status = `Selected marks changed to ${label}`; } else status = `${label} selected for new marks`; }
  function toggleSidebar() { sidebarCollapsed = !sidebarCollapsed; try { localStorage.setItem(TOOL_SIDEBAR_PREFERENCE, String(sidebarCollapsed)); } catch { /* Keep the rail usable when preference storage is unavailable. */ } }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !ready) return;
    if (!companionCanEdit()) return;
    try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
    const here = point(event); drawing = true; start = here;
    if (tool === 'pen') draftPoints = [here];
    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'arrow') draftShape = { id: 'draft', kind: tool, createdAt: new Date().toISOString(), from: here, to: here, color: drawingColor };
    if (tool === 'select') lasso = { from: here, to: here };
    if (tool === 'note') { const item: CanvasObject = { id: uid('note'), kind: 'note', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 260, height: 132, text: 'New thought' }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; drawing = false; }
    if (tool === 'group') { const item: CanvasObject = { id: uid('group'), kind: 'group', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 360, height: 220, label: 'Working group', childIds: [] }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; drawing = false; }
  }
  function pointerMove(event: PointerEvent) {
    if (!drawing || !start) return; const here = point(event);
    if (movingObjectId && dragLast) {
      const dx = here.x - dragLast.x, dy = here.y - dragLast.y;
      if (dx || dy) {
        const moved = document.objects.map((object) => object.id === movingObjectId ? moveObject(object, dx, dy) : object);
        history = { ...history, present: withObjects(document, moved) }; dragLast = here; dragMoved = true;
      }
      return;
    }
    if (tool === 'pen') draftPoints = [...draftPoints, here];
    if (draftShape) draftShape = { ...draftShape, to: here };
    if (lasso) lasso = { ...lasso, to: here };
    if (tool === 'pan') updateViewport({ ...viewport, x: viewport.x + event.movementX, y: viewport.y + event.movementY }, false);
  }
  function pointerUp(event: PointerEvent) {
    if (!drawing) return; const here = point(event);
    if (movingObjectId) {
      const moved = document.objects.find(({ id }) => id === movingObjectId);
      if (dragMoved && moved && dragOrigin) {
        history = { past: [...history.past, dragOrigin], present: document, future: [] };
        sendNative([{ type: 'put_object', object: moved }], true); queueSave(document);
      }
      movingObjectId = null; dragLast = null; dragOrigin = null; dragMoved = false; drawing = false; start = null;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
      return;
    }
    if (tool === 'pen' && draftPoints.length > 1) { const item: Stroke = { id: uid('stroke'), kind: 'stroke', createdAt: new Date().toISOString(), points: draftPoints, color: drawingColor, width: 3 }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; }
    if (draftShape && start && Math.hypot(here.x - start.x, here.y - start.y) > 4) { const item = { ...draftShape, id: uid(draftShape.kind), to: here }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; }
    if (tool === 'pan') sendNative([{ type: 'set_viewport', viewport }]);
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
  function moveObject(object: CanvasObject, dx: number, dy: number): CanvasObject {
    if (object.kind === 'stroke') return { ...object, points: object.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
    if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return { ...object, from: { x: object.from.x + dx, y: object.from.y + dy }, to: { x: object.to.x + dx, y: object.to.y + dy } };
    if (object.kind === 'note' || object.kind === 'group') return { ...object, x: object.x + dx, y: object.y + dy };
    return object;
  }
  function selectPointer(event: PointerEvent, id: string) {
    event.stopPropagation();
    if (tool === 'eraser') { apply(removeObjects(document, [id]), { type: 'remove_objects', ids: [id] }); selectedIds = []; return; }
    if (tool === 'connector') { selectedIds = selectedIds.includes(id) ? selectedIds : [...selectedIds.slice(-1), id]; if (selectedIds.length === 2) runConversion('connector'); return; }
    selectedIds = event.shiftKey ? (selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]) : [id];
    if (tool === 'select' && !event.shiftKey) {
      const here = point(event); movingObjectId = id; dragLast = here; dragOrigin = document; dragMoved = false; drawing = true; start = here;
      try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
    }
  }
  function isTextEditingEvent(event: KeyboardEvent) { return event.target instanceof Element && Boolean(event.target.closest('input,textarea,[contenteditable="true"]')); }
  function selectKeyboard(event: KeyboardEvent, id: string) { if (isTextEditingEvent(event) || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); selectedIds = event.shiftKey ? [...new Set([...selectedIds, id])] : [id]; }
  function runConversion(target: 'note' | 'connector' | 'group') { const next = convert(document, selectedIds, target); if (next === document) { status = target === 'connector' ? 'Select two objects to make a connector' : 'Select source material first'; return; } const created = next.objects.at(-1)!; apply(next, { type: 'convert', selectedIds: [...selectedIds], target, resultId: created.id, createdAt: created.createdAt }); selectedIds = [created.id]; conversionOpen = false; status = `Converted to ${target}. Source preserved.`; }
  function restoreSelected() { const selected = selectedObjects[0]; if (!selected?.sourceSnapshot) return; const next = restoreConversion(document, selected.id); apply(next, { type: 'restore_conversion', id: selected.id }); selectedIds = selected.sourceIds || []; status = 'Conversion removed. Source restored.'; }
  async function commitHostReplacement<T>(resolve: () => T, documentOf: (value: T) => CanvasDocument, install: (value: T) => void, reason: 'undo' | 'redo' | 'import' | 'reset') { if (nativeRole !== 'host') { const value = resolve(); install(value); return value; } let committed!: T; const replacement = nativeTail.then(async () => { committed = resolve(); const expectedRevision = nativeSession.revision || 0; const result = await replaceHostDocument(documentOf(committed), reason, expectedRevision); nativeSession = { ...nativeSession, ...result }; install(committed); status = `Mac committed ${reason} at revision ${nativeSession.revision}`; }); nativeTail = replacement.catch(() => undefined); try { await replacement; return committed; } catch (error) { const refreshed = await hostStatus(); nativeSession = { ...nativeSession, ...refreshed }; if (refreshed.document) history = { past: history.past, present: refreshed.document, future: [] }; throw error; } }
  async function doUndo() { if (nativeRole === 'companion') return; try { const next = await commitHostReplacement(() => undo(history), (value) => value.present, (value) => history = value, 'undo'); selectedIds = []; queueSave(next.present); } catch (error) { status = error instanceof Error ? error.message : 'Undo conflicted with an iPhone change'; } }
  async function doRedo() { if (nativeRole === 'companion') return; try { const next = await commitHostReplacement(() => redo(history), (value) => value.present, (value) => history = value, 'redo'); selectedIds = []; queueSave(next.present); } catch (error) { status = error instanceof Error ? error.message : 'Redo conflicted with an iPhone change'; } }
  function keydown(event: KeyboardEvent) { if (isTextEditingEvent(event)) return; if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); void (event.shiftKey ? doRedo() : doUndo()); return; } if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) { const ids = [...selectedIds]; apply(removeObjects(document, ids), { type: 'remove_objects', ids }); selectedIds = []; return; } const match = tools.find(({ key }) => key.toLowerCase() === event.key.toLowerCase()); if (match) tool = match.id; }
  function wheel(event: WheelEvent) { event.preventDefault(); updateViewport({ ...viewport, zoom: Math.max(.25, Math.min(3, viewport.zoom * (event.deltaY > 0 ? .9 : 1.1))) }); }
  const path = (points: Point[]) => points.map((value, index) => `${index ? 'L' : 'M'} ${value.x} ${value.y}`).join(' ');
  function wrappedLines(text: string, fits: (value: string) => boolean) { const lines: string[] = []; for (const paragraph of text.split('\n')) { if (!paragraph) { lines.push(''); continue; } let line = ''; for (const word of paragraph.split(/\s+/)) { const next = `${line}${line ? ' ' : ''}${word}`; if (line && !fits(next)) { lines.push(line); line = word; } else line = next; } lines.push(line); } return lines; }

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
      for (const [lineNumber, line] of wrappedLines(note.text, (value) => value.length <= Math.max(12, Math.floor((note.width - 32) / 8))).entries()) { const span = window.document.createElementNS(namespace, 'tspan'); span.setAttribute('x', String(note.x + 16)); span.setAttribute('dy', lineNumber ? '1.35em' : '0'); span.textContent = line || '\u00a0'; text.append(span); }
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
      else if (object.kind === 'note') { context.fillStyle = '#111'; context.strokeStyle = 'rgba(255,255,255,.18)'; context.fillRect(object.x, object.y, object.width, object.height); context.strokeRect(object.x, object.y, object.width, object.height); context.fillStyle = '#fff'; context.font = '500 16px Arial'; let y = object.y + 30; for (const line of wrappedLines(object.text, (value) => context.measureText(value).width <= object.width - 32)) { if (line) context.fillText(line, object.x + 16, y); y += 22; } if (object.sourceIds?.length) { context.fillStyle = 'rgba(255,255,255,.45)'; context.font = '700 9px monospace'; context.fillText(`CONVERTED · ${object.sourceIds.length} SOURCE`, object.x + 16, object.y + object.height - 10); } }
      else if (object.kind === 'group') { context.strokeStyle = '#fcaa2d'; context.setLineDash([8, 6]); context.strokeRect(object.x, object.y, object.width, object.height); context.setLineDash([]); context.fillStyle = '#fcaa2d'; context.font = '700 11px monospace'; context.fillText(object.label.toUpperCase(), object.x + 12, object.y + 24); }
    }
    context.restore(); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('PNG export failed'); download(blob, 'image/png', 'png'); status = 'PNG exported';
  }
  async function importJson(event: Event) { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file || nativeRole === 'companion') return; try { const next = parse(await file.text()); const committed = await commitHostReplacement(() => next, (value) => value, (value) => history = commit(history, value), 'import'); selectedIds = []; queueSave(committed); status = 'Canvas imported'; } catch (error) { status = error instanceof Error ? error.message : 'Import failed'; } finally { if (fileInput) fileInput.value = ''; } }
  async function resetCanvas() { if (nativeRole === 'companion') { status = 'Reset is owned by the Mac'; return; } if (!confirm(nativeRole === 'host' ? 'Reset the Mac-authoritative canvas? Export first if you need a copy.' : 'Reset this local canvas? Export first if you need a copy.')) return; clearTimeout(saveTimer); saveTimer = undefined; status = 'Resetting canvas…'; if (nativeRole === 'web') await clearDocument(); try { await commitHostReplacement(() => createDocument(), (value) => value, (value) => history = { past: [], present: value, future: [] }, 'reset'); selectedIds = []; status = nativeRole === 'host' ? 'New Mac session document' : 'New local session'; } catch (error) { status = error instanceof Error ? error.message : 'Reset conflicted with an iPhone change'; } }
  function updateTitle(input: HTMLInputElement) { if (!companionCanEdit()) return; const title = input.value || 'Untitled mapping session'; if (!isValidCanvasTitle(title)) { input.value = document.title; status = 'Title must be 240 UTF-8 bytes or fewer'; return; } const next = { ...document, title, updatedAt: new Date().toISOString() }; history = { ...history, present: next }; queueSave(next); sendNative([{ type: 'set_title', title }]); }
</script>

<svelte:head>
  <title>{document.title === 'Untitled mapping session' ? publicTitle : `${document.title} · CREATE SOMETHING Draw`}</title>
  <meta name="description" content={publicDescription} />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="CREATE SOMETHING" />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:site_name" content="CREATE SOMETHING Draw" />
  <meta property="og:title" content={publicTitle} />
  <meta property="og:description" content={publicDescription} />
  <meta property="og:image" content={socialImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="CREATE SOMETHING Draw mapping canvas interface" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={publicTitle} />
  <meta name="twitter:description" content={publicDescription} />
  <meta name="twitter:image" content={socialImage} />
  <meta name="twitter:image:alt" content="CREATE SOMETHING Draw mapping canvas interface" />
  {@html jsonLd(organizationSchema)}
  {@html jsonLd(applicationSchema)}
</svelte:head>

<main class="app-shell" class:native-shell={nativeShell}>
  <header class="topbar">
    <div class="identity"><img src="/brand/create-something-agency-white.svg" alt="CREATE SOMETHING .agency" /><span>Draw · Mapping canvas</span>{#if nativeRole !== 'web'}<button class="native-link" aria-label="Open device pairing" onclick={openPairing}>{nativeRole === 'host' ? 'Pair' : nativeSession.sessionId ? 'Linked' : 'Link'}</button>{/if}</div>
    <input class="title" aria-label="Canvas title" maxlength="240" value={document.title} oninput={(event) => updateTitle(event.currentTarget)} />
    {#if nativeRole !== 'companion'}<div class="file-actions"><button onclick={() => fileInput?.click()}>Import</button><button onclick={exportJson}>JSON</button><button onclick={exportSvg}>SVG</button><button onclick={exportPng}>PNG</button><button onclick={resetCanvas}>Reset</button><input bind:this={fileInput} class="visually-hidden" type="file" accept="application/json,.json" onchange={importJson} /></div>{/if}
  </header>
  <section class="workbench" class:tool-sidebar-collapsed={sidebarCollapsed} aria-label="Mapping canvas workbench">
    <nav class="toolbar" aria-label="Canvas tools"><button class="sidebar-toggle" aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? 'Expand tool sidebar' : 'Collapse tool sidebar'} title={sidebarCollapsed ? 'Expand tools' : 'Collapse tools'} onclick={toggleSidebar}><i aria-hidden="true">{sidebarCollapsed ? '›' : '‹'}</i><span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span></button>{#each tools as entry}<button class:active={tool === entry.id} aria-pressed={tool === entry.id} aria-label={`${entry.label} tool (${entry.key})`} title={`${entry.label} · ${entry.key}`} onclick={() => tool = entry.id}><kbd class="tool-key">{entry.key}</kbd><span class="tool-label">{entry.label}</span></button>{/each}</nav>
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
            {:else if object.kind === 'note'}<g data-object-id={object.id} class:selected role="button" tabindex="0" aria-label={`Note: ${object.text}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="#111" stroke={selected ? '#fcaa2d' : 'rgba(255,255,255,.18)'} /><foreignObject x={object.x + 16} y={object.y + 14} width={object.width - 32} height={object.height - 28}><textarea xmlns="http://www.w3.org/1999/xhtml" aria-label="Edit note" value={object.text} disabled={nativeRole === 'companion' && (!nativeSession.sessionId || nativeSession.requiresRepair)} onpointerdown={(event) => event.stopPropagation()} oninput={(event) => { if (!companionCanEdit()) return; const changed = { ...object, text: event.currentTarget.value }; const next = withObjects(document, document.objects.map((entry) => entry.id === object.id ? changed : entry)); history = { ...history, present: next }; queueSave(next); sendNative([{ type: 'put_object', object: changed }]); }}></textarea></foreignObject>{#if object.sourceIds?.length}<text x={object.x + 16} y={object.y + object.height - 10} class="provenance">CONVERTED · {object.sourceIds.length} SOURCE</text>{/if}</g>
            {:else if object.kind === 'group'}<g class:selected role="button" tabindex="0" aria-label={`Group: ${object.label}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="rgba(252,170,45,.025)" stroke={selected ? '#fcaa2d' : 'rgba(252,170,45,.5)'} stroke-dasharray="8 6" /><text x={object.x + 12} y={object.y + 24} class="group-label">{object.label}</text></g>
            {:else if object.kind === 'connector'}{@const from = document.objects.find(({ id }) => id === object.fromId)}{@const to = document.objects.find(({ id }) => id === object.toId)}{#if from && to}{@const a = objectCenter(from)}{@const b = objectCenter(to)}<line class:selected role="button" tabindex="0" aria-label="Connector" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fcaa2d" stroke-width="2" marker-end="url(#arrowhead)" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />{/if}{/if}
          {/each}
          {#if draftPoints.length > 1}<path data-ui="true" d={path(draftPoints)} fill="none" stroke={drawingColor} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />{/if}
          {#if draftShape}{#if draftShape.kind === 'rectangle'}<rect data-ui="true" x={Math.min(draftShape.from.x, draftShape.to.x)} y={Math.min(draftShape.from.y, draftShape.to.y)} width={Math.abs(draftShape.to.x - draftShape.from.x)} height={Math.abs(draftShape.to.y - draftShape.from.y)} fill="transparent" stroke={draftShape.color} />{:else if draftShape.kind === 'ellipse'}<ellipse data-ui="true" cx={(draftShape.from.x + draftShape.to.x) / 2} cy={(draftShape.from.y + draftShape.to.y) / 2} rx={Math.abs(draftShape.to.x - draftShape.from.x) / 2} ry={Math.abs(draftShape.to.y - draftShape.from.y) / 2} fill="transparent" stroke={draftShape.color} />{:else}<line data-ui="true" x1={draftShape.from.x} y1={draftShape.from.y} x2={draftShape.to.x} y2={draftShape.to.y} stroke={draftShape.color} marker-end="url(#arrowhead)" />{/if}{/if}
          {#if lasso}<rect data-ui="true" x={Math.min(lasso.from.x, lasso.to.x)} y={Math.min(lasso.from.y, lasso.to.y)} width={Math.abs(lasso.to.x - lasso.from.x)} height={Math.abs(lasso.to.y - lasso.from.y)} fill="rgba(252,170,45,.08)" stroke="#fcaa2d" stroke-dasharray="5 5" />{/if}
        </g>
      </svg>
      <div class="history"><button onclick={() => void doUndo()} disabled={nativeRole === 'companion' || !history.past.length}>Undo</button><button onclick={() => void doRedo()} disabled={nativeRole === 'companion' || !history.future.length}>Redo</button><span>{Math.round(viewport.zoom * 100)}%</span><button onclick={() => updateViewport({ x: 0, y: 0, zoom: 1 })}>Reset view</button></div>
      {#if paletteVisible}<div class="palette" role="group" aria-label="Mark color" data-ui="true"><span>Mark color</span><div>{#each DRAWING_PALETTE as color}<button class:active={drawingColor === color.value} aria-pressed={drawingColor === color.value} aria-label={`${color.label} color`} data-testid={`color-${color.id}`} style={`--swatch:var(${color.token},${color.value})`} onclick={() => chooseColor(color.value, color.label)}><i aria-hidden="true"></i><small>{color.label}</small></button>{/each}</div></div>{/if}
      {#if selectedIds.length}<div class="selection" data-ui="true"><span>{selectedIds.length} selected</span><button class="convert" data-testid="convert-menu" onclick={() => conversionOpen = !conversionOpen}>Convert to…</button>{#if selectedObjects.length === 1 && selectedObjects[0].sourceSnapshot}<button data-testid="restore-source" onclick={restoreSelected}>Restore source</button>{/if}{#if conversionOpen}<div class="conversion-menu"><button data-testid="convert-note" onclick={() => runConversion('note')}>Note<small>Retain as editable text</small></button><button data-testid="convert-connector" onclick={() => runConversion('connector')} disabled={selectedIds.length < 2}>Connector<small>Relate two selected objects</small></button><button data-testid="convert-group" onclick={() => runConversion('group')}>Group<small>Name a working boundary</small></button></div>{/if}</div>{/if}
      {#if pairingOpen}<section class="pairing-panel" data-ui="true" aria-label="Device pairing"><header><strong>{nativeRole === 'host' ? 'Pair iPhone' : 'Connect to Mac'}</strong><button aria-label="Close pairing" onclick={() => pairingOpen = false}>×</button></header>{#if pairingBusy}<p>Looking for the secure session…</p>{:else if nativeRole === 'host'}<p>Enter this one-time code on the iPhone. Both devices must be on the same local network.</p><output class="pairing-code">{pairingOffer?.code || '—'}</output><small>Mac fingerprint {nativeSession.transport?.certificateFingerprint?.slice(0, 16) || 'unavailable'} · expires {pairingOffer ? new Date(pairingOffer.expiresAt).toLocaleTimeString() : 'soon'}</small>{#if nativeSession.pairedClients?.length}<div class="paired-list">{#each nativeSession.pairedClients as client}<span>{client.clientId}<button disabled={Boolean(client.revokedAt)} onclick={async () => { await revokeCompanion(client.clientId); nativeSession = await hostStatus(); }}>Revoke</button></span>{/each}</div>{/if}{:else if nativeSession.sessionId}<p>{nativeSession.requiresRepair ? 'This Mac rejected the pairing credentials. Export if needed, then forget and re-pair.' : 'Securely linked to the Mac session.'}</p><small>{nativeSession.certificateFingerprint?.slice(0, 16)} · revision {nativeSession.revision} · {nativeSession.queueDepth || 0} queued</small><button disabled={nativeSession.requiresRepair} onclick={async () => { const result = await setCompanionOnline(nativeSession.online === false); nativeSession = { ...nativeSession, ...result }; if (result.document) history = { past: history.past, present: result.document, future: [] }; }}> {nativeSession.online === false ? 'Reconnect' : 'Test offline'} </button><button onclick={async () => { nativeSession = await forgetCompanion(); discoveredHosts = []; selectedHost = null; pairingCode = ''; status = 'Pairing removed · choose Link to pair again'; pairingOpen = false; }}>Forget and re-pair</button>{:else}<p>{discoveredHosts.length ? 'Confirm the Mac fingerprint, then enter its six-digit code.' : 'No Mac session found. Open Draw on Mac and choose Pair.'}</p>{#if selectedHost}<label>Mac session<select bind:value={selectedHost}>{#each discoveredHosts as host}<option value={host}>{host.endpoint}</option>{/each}</select></label><small>Fingerprint {selectedHost.certificateFingerprint.slice(0, 16)}</small><label>Pairing code<input inputmode="numeric" maxlength="6" bind:value={pairingCode} placeholder="000000" /></label><button class="convert" disabled={!/^\d{6}$/.test(pairingCode)} onclick={confirmCompanionPairing}>Pair securely</button>{/if}{/if}</section>{/if}
    </div>
  </section>
  <footer class="statusbar"><span><i aria-hidden="true"></i>{status}</span><span>{nativeRole === 'host' ? 'MAC AUTHORITY' : nativeRole === 'companion' ? 'IPHONE COMPANION' : 'LOCAL DRAFT'} · CONVERSION IS OPERATOR-APPROVED</span></footer>
</main>
