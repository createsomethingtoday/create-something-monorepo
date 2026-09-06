<script lang="ts">
  import './page.css';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { clearDocument, loadDocument, saveDocument } from '$lib/persistence';
  import { commit, convert, createDocument, createObjectCenterResolver, expandCompoundIds, objectBounds, parse, redo, removeObjects, resizeGroup, restoreConversion, selectObjectIdsInBounds, serialize, uid, undo, withObjects, type CanvasDocument, type CanvasObject, type History, type Point, type Shape, type Stroke, type Tool } from '$lib/document';
  import { DEFAULT_DRAWING_COLOR, DRAWING_COLOR_PREFERENCE, DRAWING_PALETTE, isColorableObject, isDrawingColor, recolorObjects, type DrawingColor } from '$lib/palette';
  import { applyCanvasOperations, isValidCanvasTitle, type CanvasOperation } from '$lib/paired-session';
  import { connectorLabelLayout, createDrawWebMcpTools, drawRevision, registerDrawWebMcpTools, type DrawRenderedGeometry, type DrawTransitionKind } from '$lib/webmcp';
  import { beginPairing, companionStatus, discoverHosts, forgetCompanion, hasNativeBridge, hostStatus, nativeRole as readNativeRole, pairCompanion, refreshCompanion, replaceHostDocument, revokeCompanion, setCompanionOnline, submitNativeOperation, type DiscoveredHost, type NativeRole, type NativeSessionStatus, type PairingOffer } from '$lib/native-pairing';
  import { fitViewportToBounds, normalizeWheelDelta, panViewport, zoomViewportAt } from '$lib/viewport';
  import { createNoteInputBuffer } from '$lib/note-input';
  import { paddedSegmentBounds } from '$lib/spatial';
  import RichNote from '$lib/RichNote.svelte';
  import { noteContentText, plainNoteContent, type NoteBlockType } from '$lib/note-content';

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
  let resizingGroupId = $state<string | null>(null), resizeOrigin = $state<CanvasDocument | null>(null), resizeMoved = $state(false);
  let lasso = $state<{ from: Point; to: Point } | null>(null), conversionOpen = $state(false), status = $state('Loading local canvas…'), ready = $state(false);
  let companionResetArmed = $state(false);
  let share = $state<{ shareId: string; url: string; token: string; revision: number } | null>(null), sharing = $state(false);
  let companionResetTimer: ReturnType<typeof setTimeout> | undefined;
  let surface: SVGSVGElement, canvasContent: SVGGElement, fileInput = $state<HTMLInputElement | null>(null), viewportWidth = $state(1200), viewportHeight = $state(800);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let mirrorTimer: ReturnType<typeof setInterval> | undefined;
  let nativeTail: Promise<void> = Promise.resolve();
  let agentMutationTail: Promise<void> = Promise.resolve();
  let agentMutationActive = $state(false);
  let nativeOptimisticVersion = 0;
  let nativeConflictEpoch = 0;
  let agentTransition = $state<{ id: string; kind: DrawTransitionKind; affectedIds: string[] } | null>(null);
  let agentTransitionTimer: ReturnType<typeof setTimeout> | undefined;
  let agentCameraActive = $state(false);
  let agentCameraTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;
  const activeTouches = new Map<number, { x: number; y: number }>();
  let pinch: { distance: number; world: Point; origin: CanvasDocument['viewport'] } | null = null;
  let pendingTouchAction: { pointerId: number; point: Point; tool: 'note' | 'group' } | null = null;
  const noteInput = createNoteInputBuffer(commitNoteText);
  const document = $derived(history.present), viewport = $derived(document.viewport);
  const objectIndex = $derived(new Map(document.objects.map((object) => [object.id, object])));
  const connectorLabels = $derived(connectorLabelLayout(document.objects));
  const selectedIdSet = $derived(new Set(selectedIds));
  const agentAffectedIdSet = $derived(new Set(agentTransition?.affectedIds ?? []));
  const resolveObjectCenter = $derived(createObjectCenterResolver(document.objects));
  const selectedObjects = $derived(document.objects.filter(({ id }) => selectedIdSet.has(id)));
  const paletteVisible = $derived(['pen', 'rectangle', 'ellipse', 'arrow'].includes(tool) || selectedObjects.some(isColorableObject));
  const renderObjects = $derived([...document.objects.filter(({ kind }) => kind === 'group'), ...document.objects.filter(({ kind }) => kind !== 'group')]);
  const transform = $derived(`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`);

  onMount(() => {
    nativeShell = hasNativeBridge();
    try { const savedColor = localStorage.getItem(DRAWING_COLOR_PREFERENCE); if (isDrawingColor(savedColor)) drawingColor = savedColor; } catch { /* Preference persistence is optional. */ }
    try { sidebarCollapsed = localStorage.getItem(TOOL_SIDEBAR_PREFERENCE) === 'true'; } catch { /* Preference persistence is optional. */ }
    try { const saved = localStorage.getItem(`draw-share:${history.present.id}`); if (saved) share = JSON.parse(saved); } catch { /* Sharing remains explicit and optional. */ }
    void initializeSession();
    const webMcp = registerDrawWebMcpTools(createDrawWebMcpTools({
      getState: agentState,
      applyOperations: (operations, expectedRevision) => queueAgentMutation(() => {
        const currentRevision = drawRevision(document);
        if (expectedRevision && expectedRevision !== currentRevision) throw new Error(`Canvas revision is stale. Inspect again and retry with revision ${currentRevision}.`);
        return applyAgentOperations(operations);
      }),
      select: (ids) => { assertAgentControlReady(); const existing = new Set(document.objects.map(({ id }) => id)); selectedIds = [...expandCompoundIds(document, ids.filter((id) => existing.has(id)))]; status = selectedIds.length ? `Agent focused ${selectedIds.length} object${selectedIds.length === 1 ? '' : 's'}` : 'Agent cleared selection'; },
      setTool: (next) => { assertAgentControlReady(); tool = next; status = `Agent selected ${next} tool`; },
      undo: () => queueAgentMutation(() => browserLocalHistory('undo')),
      redo: () => queueAgentMutation(() => browserLocalHistory('redo')),
      reset: () => queueAgentMutation(resetCanvasFromAgent),
      animate: showAgentTransition,
      focus: (target) => queueAgentMutation(() => focusAgentCamera(target)),
      renderedGeometry: readRenderedGeometry,
      shareStatus: () => share ? { shareId: share.shareId, url: new URL(share.url, location.origin).href, revision: share.revision } : null,
      publishSnapshot: publishSnapshotForAgent,
      updateSnapshot: updateSnapshotForAgent,
      revokeSnapshot: revokeSnapshotForAgent
    }));
    if (webMcp.registered) status = `${webMcp.registered} agent tools ready · loading local canvas…`;
    const resize = () => { viewportWidth = surface?.clientWidth || window.innerWidth; viewportHeight = surface?.clientHeight || window.innerHeight; };
    const surfaceObserver = new ResizeObserver(resize);
    resize(); surfaceObserver.observe(surface); window.addEventListener('resize', resize); window.addEventListener('keydown', keydown);
    mirrorTimer = setInterval(() => void refreshMirroredState(), 750);
    if (import.meta.env.PROD) navigator.serviceWorker?.register('/service-worker.js').catch(() => undefined);
    return () => { noteInput.flushAll(); surfaceObserver.disconnect(); clearInterval(mirrorTimer); clearTimeout(agentTransitionTimer); clearTimeout(agentCameraTimer); clearTimeout(wheelTimer); window.removeEventListener('resize', resize); window.removeEventListener('keydown', keydown); };
  });

  function queueAgentMutation<T>(action: () => Promise<T> | T): Promise<T> {
    const queued = agentMutationTail.then(async () => {
      assertAgentControlReady();
      agentMutationActive = true;
      try { return await action(); }
      finally { agentMutationActive = false; }
    });
    agentMutationTail = queued.then(() => undefined, () => undefined);
    return queued;
  }

  function assertAgentControlReady() {
    if (!ready) throw new Error('Draw is still loading. Try the tool again.');
    if (drawing || pinch || pendingTouchAction || resizingGroupId || resizeOrigin || movingObjectId || dragOrigin || noteInput.hasPending()) throw new Error('Finish the active human gesture before applying an agent control.');
  }

  function agentState() {
    assertAgentControlReady();
    return { document: JSON.parse(JSON.stringify(document)) as CanvasDocument, selectedIds: [...selectedIds], tool, canUndo: history.past.length > 0, canRedo: history.future.length > 0, surface: { width: viewportWidth, height: viewportHeight } };
  }

  async function settledRender() {
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const deadline = performance.now() + 1_200;
    while ((agentTransition || agentCameraActive) && performance.now() < deadline) await nextFrame();
    if (agentTransition || agentCameraActive) throw new Error('Draw rendering did not settle before geometry inspection. Try again.');
    await nextFrame();
    await nextFrame();
  }

  async function readRenderedGeometry(input: { ids?: string[]; limit: number }): Promise<DrawRenderedGeometry> {
    assertAgentControlReady();
    if (nativeShell || nativeRole !== 'web') throw new Error('Rendered geometry is limited to the browser-local web canvas.');
    await settledRender();
    assertAgentControlReady();

    const surfaceRect = surface.getBoundingClientRect();
    const contentMatrix = canvasContent.getScreenCTM();
    if (!contentMatrix) throw new Error('Draw could not resolve the rendered canvas transform.');
    const inverse = contentMatrix.inverse();
    const viewportBounds = (rect: DOMRect): { x: number; y: number; width: number; height: number } => ({
      x: rect.left - surfaceRect.left,
      y: rect.top - surfaceRect.top,
      width: rect.width,
      height: rect.height
    });
    const worldBounds = (rect: DOMRect): { x: number; y: number; width: number; height: number } => {
      const corners = [
        new DOMPoint(rect.left, rect.top), new DOMPoint(rect.right, rect.top),
        new DOMPoint(rect.right, rect.bottom), new DOMPoint(rect.left, rect.bottom)
      ].map((point) => point.matrixTransform(inverse));
      const xs = corners.map(({ x }) => x), ys = corners.map(({ y }) => y);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    };
    const clipped = (bounds: { x: number; y: number; width: number; height: number }) => bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > surfaceRect.width || bounds.y + bounds.height > surfaceRect.height;
    const requested = input.ids ? new Set(input.ids) : undefined;
    const matches = document.objects.filter(({ id }) => !requested || requested.has(id));
    const selected = matches.slice(0, input.limit);
    const existingIds = new Set(document.objects.map(({ id }) => id));
    const missingIds = input.ids?.filter((id) => !existingIds.has(id)) ?? [];
    const colorProbe = window.document.createElement('canvas'); colorProbe.width = 1; colorProbe.height = 1;
    const colorContext = colorProbe.getContext('2d', { willReadFrequently: true });
    const visibleStroke = (element: SVGGraphicsElement) => {
      const style = getComputedStyle(element), opacity = Number.parseFloat(style.opacity), strokeOpacity = Number.parseFloat(style.strokeOpacity);
      if (style.stroke === 'none' || opacity === 0 || strokeOpacity === 0) return false;
      if (!colorContext) return style.stroke !== 'transparent';
      colorContext.clearRect(0, 0, 1, 1); colorContext.fillStyle = '#000'; colorContext.fillStyle = style.stroke; colorContext.fillRect(0, 0, 1, 1);
      return colorContext.getImageData(0, 0, 1, 1).data[3] > 0;
    };
    const paintedRect = (element: SVGGraphicsElement) => {
      const rect = element.getBoundingClientRect(), matrix = element.getScreenCTM(), style = getComputedStyle(element);
      const strokeWidth = style.stroke === 'none' ? 0 : Number.parseFloat(style.strokeWidth);
      if (!matrix || !Number.isFinite(strokeWidth) || strokeWidth <= 0) return rect;
      const scale = Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d));
      const inset = strokeWidth * scale / 2;
      return new DOMRect(rect.left - inset, rect.top - inset, rect.width + inset * 2, rect.height + inset * 2);
    };
    const decoratedLineRect = (line: SVGLineElement) => {
      const rect = paintedRect(line), matrix = line.getScreenCTM();
      if (!line.hasAttribute('marker-end') || !matrix) return rect;
      const start = new DOMPoint(line.x1.baseVal.value, line.y1.baseVal.value).matrixTransform(matrix), end = new DOMPoint(line.x2.baseVal.value, line.y2.baseVal.value).matrixTransform(matrix);
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const unit = distance ? { x: (end.x - start.x) / distance, y: (end.y - start.y) / distance } : { x: 1, y: 0 }, normal = { x: -unit.y, y: unit.x };
      const scale = Math.hypot(matrix.a, matrix.b), stroke = Number.parseFloat(getComputedStyle(line).strokeWidth) * scale;
      const points = [
        { x: end.x + unit.x * stroke, y: end.y + unit.y * stroke },
        { x: end.x - unit.x * 9 * stroke + normal.x * 3.5 * stroke, y: end.y - unit.y * 9 * stroke + normal.y * 3.5 * stroke },
        { x: end.x - unit.x * 9 * stroke - normal.x * 3.5 * stroke, y: end.y - unit.y * 9 * stroke - normal.y * 3.5 * stroke }
      ];
      const left = Math.min(rect.left, ...points.map(({ x }) => x)), top = Math.min(rect.top, ...points.map(({ y }) => y));
      const right = Math.max(rect.right, ...points.map(({ x }) => x)), bottom = Math.max(rect.bottom, ...points.map(({ y }) => y));
      return new DOMRect(left, top, right - left, bottom - top);
    };
    const unionRect = (first: DOMRect, second: DOMRect) => {
      const left = Math.min(first.left, second.left), top = Math.min(first.top, second.top);
      return new DOMRect(left, top, Math.max(first.right, second.right) - left, Math.max(first.bottom, second.bottom) - top);
    };
    const rendered = selected.flatMap((object) => {
      const element = surface.querySelector<SVGGraphicsElement>(`[data-object-id="${CSS.escape(object.id)}"]`);
      if (!element) return [];
      if (!(element instanceof SVGGElement) && !visibleStroke(element)) return [];
      if ((element instanceof SVGRectElement && (!element.width.baseVal.value || !element.height.baseVal.value))
        || (element instanceof SVGEllipseElement && (!element.rx.baseVal.value || !element.ry.baseVal.value))) return [];
      let rect = element instanceof SVGGElement
        ? [...element.querySelectorAll<SVGGraphicsElement>(':scope > :not([data-ui="true"])')].reduce<DOMRect | undefined>((bounds, child) => {
            const childBounds = paintedRect(child);
            if (!bounds) return DOMRect.fromRect(childBounds);
            return unionRect(bounds, childBounds);
          }, undefined) ?? paintedRect(element)
        : element instanceof SVGLineElement ? decoratedLineRect(element) : paintedRect(element);
      if (object.kind === 'connector') {
        const label = element.parentElement?.querySelector<SVGTextElement>('.connector-label');
        if (label) rect = unionRect(rect, paintedRect(label));
      }
      const view = viewportBounds(rect);
      return [{ id: object.id, kind: object.kind, worldBounds: worldBounds(rect), viewportBounds: view, clipped: clipped(view) }];
    });
    const byId = new Map(document.objects.map((object) => [object.id, object]));
    const connectors = selected.flatMap((object) => {
      if (object.kind !== 'connector') return [];
      const line = surface.querySelector<SVGLineElement>(`line[data-object-id="${CSS.escape(object.id)}"]`);
      if (!line) return [];
      const label = line.parentElement?.querySelector<SVGTextElement>('.connector-label');
      const labelRect = label ? paintedRect(label) : undefined;
      return [{
        id: object.id,
        fromId: object.fromId,
        toId: object.toId,
        route: [{ x: line.x1.baseVal.value, y: line.y1.baseVal.value }, { x: line.x2.baseVal.value, y: line.y2.baseVal.value }],
        ...(labelRect ? { labelBounds: { worldBounds: worldBounds(labelRect), viewportBounds: viewportBounds(labelRect) } } : {})
      }];
    });
    const connectorById = new Map(connectors.map((connector) => [connector.id, connector]));
    const contains = (groupId: string, candidateId: string) => {
      const group = byId.get(groupId);
      const visited = new Set<string>(), stack = group?.kind === 'group' ? [...group.childIds] : [];
      while (stack.length) {
        const id = stack.pop()!;
        if (id === candidateId) return true;
        if (visited.has(id)) continue;
        visited.add(id);
        const child = byId.get(id);
        if (child?.kind === 'group') stack.push(...child.childIds);
      }
      return false;
    };
    const overlapBounds = (first: { x: number; y: number; width: number; height: number }, second: { x: number; y: number; width: number; height: number }) => {
      const x = Math.max(first.x, second.x), y = Math.max(first.y, second.y);
      const right = Math.min(first.x + first.width, second.x + second.width);
      const bottom = Math.min(first.y + first.height, second.y + second.height);
      return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : undefined;
    };
    const segmentHitsBounds = (start: { x: number; y: number }, end: { x: number; y: number }, bounds: { x: number; y: number; width: number; height: number }, padding = 1) => {
      const expanded = { x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
      let minimum = 0, maximum = 1;
      for (const [origin, delta, low, high] of [[start.x, end.x - start.x, expanded.x, expanded.x + expanded.width], [start.y, end.y - start.y, expanded.y, expanded.y + expanded.height]] as const) {
        if (delta === 0) { if (origin < low || origin > high) return false; continue; }
        const first = (low - origin) / delta, second = (high - origin) / delta;
        minimum = Math.max(minimum, Math.min(first, second)); maximum = Math.min(maximum, Math.max(first, second));
        if (minimum > maximum) return false;
      }
      return true;
    };
    const markerPoints = (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const distance = Math.hypot(end.x - start.x, end.y - start.y), unit = distance ? { x: (end.x - start.x) / distance, y: (end.y - start.y) / distance } : { x: 1, y: 0 }, normal = { x: -unit.y, y: unit.x };
      return [{ x: end.x + unit.x * 2, y: end.y + unit.y * 2 }, { x: end.x - unit.x * 18 + normal.x * 7, y: end.y - unit.y * 18 + normal.y * 7 }, { x: end.x - unit.x * 18 - normal.x * 7, y: end.y - unit.y * 18 - normal.y * 7 }];
    };
    type PaintSegment = { start: { x: number; y: number }; end: { x: number; y: number }; padding: number };
    const paintGeometry = (object: CanvasObject, entry: typeof rendered[number]) => {
      const segments: PaintSegment[] = [], rects: Array<{ x: number; y: number; width: number; height: number }> = [], triangles: Array<Array<{ x: number; y: number }>> = [];
      const addLine = (start: { x: number; y: number }, end: { x: number; y: number }, padding = 1) => segments.push({ start, end, padding });
      if (object.kind === 'stroke') for (let index = 1; index < object.points.length; index += 1) addLine(object.points[index - 1], object.points[index], object.width / 2);
      else if (object.kind === 'arrow') { addLine(object.from, object.to); triangles.push(markerPoints(object.from, object.to)); }
      else if (object.kind === 'connector') { const connector = connectorById.get(object.id); if (connector) { addLine(connector.route[0], connector.route[1]); triangles.push(markerPoints(connector.route[0], connector.route[1])); if (connector.labelBounds) rects.push(connector.labelBounds.worldBounds); } }
      else if (object.kind === 'rectangle') { const left = Math.min(object.from.x, object.to.x), right = Math.max(object.from.x, object.to.x), top = Math.min(object.from.y, object.to.y), bottom = Math.max(object.from.y, object.to.y); addLine({ x: left, y: top }, { x: right, y: top }); addLine({ x: right, y: top }, { x: right, y: bottom }); addLine({ x: right, y: bottom }, { x: left, y: bottom }); addLine({ x: left, y: bottom }, { x: left, y: top }); }
      else if (object.kind === 'ellipse') {
        const center = { x: (object.from.x + object.to.x) / 2, y: (object.from.y + object.to.y) / 2 }, radius = { x: Math.abs(object.to.x - object.from.x) / 2, y: Math.abs(object.to.y - object.from.y) / 2 };
        const renderedRadius = Math.max(entry.viewportBounds.width, entry.viewportBounds.height) / 2, maximumError = .25;
        const estimatedSegments = Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - maximumError / Math.max(maximumError, renderedRadius))));
        const segmentCount = Math.max(48, Math.min(4_096, Number.isFinite(estimatedSegments) ? estimatedSegments : 4_096));
        const points = Array.from({ length: segmentCount + 1 }, (_, index) => ({ x: center.x + Math.cos(index / segmentCount * Math.PI * 2) * radius.x, y: center.y + Math.sin(index / segmentCount * Math.PI * 2) * radius.y }));
        for (let index = 1; index < points.length; index += 1) {
          const middleAngle = (index - .5) / segmentCount * Math.PI * 2;
          const sagitta = (1 - Math.cos(Math.PI / segmentCount)) * Math.hypot(radius.x * Math.cos(middleAngle), radius.y * Math.sin(middleAngle));
          addLine(points[index - 1], points[index], 1 + sagitta);
        }
      }
      else if (object.kind === 'group') {
        rects.push({ x: object.x - 1, y: object.y - 1, width: object.width + 2, height: object.height + 2 });
        const label = surface.querySelector<SVGGraphicsElement>(`[data-object-id="${CSS.escape(object.id)}"] .group-label`);
        if (label) rects.push(worldBounds(paintedRect(label)));
      }
      else rects.push(entry.worldBounds);
      return { segments, rects, triangles };
    };
    const pointSegmentDistance = (point: { x: number; y: number }, segment: PaintSegment) => { const dx = segment.end.x - segment.start.x, dy = segment.end.y - segment.start.y, lengthSquared = dx * dx + dy * dy, t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared)) : 0; return Math.hypot(point.x - (segment.start.x + t * dx), point.y - (segment.start.y + t * dy)); };
    const segmentDistance = (first: PaintSegment, second: PaintSegment) => {
      const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const firstSides = [cross(first.start, first.end, second.start), cross(first.start, first.end, second.end)], secondSides = [cross(second.start, second.end, first.start), cross(second.start, second.end, first.end)];
      const projectionsOverlap = Math.max(Math.min(first.start.x, first.end.x), Math.min(second.start.x, second.end.x)) <= Math.min(Math.max(first.start.x, first.end.x), Math.max(second.start.x, second.end.x)) && Math.max(Math.min(first.start.y, first.end.y), Math.min(second.start.y, second.end.y)) <= Math.min(Math.max(first.start.y, first.end.y), Math.max(second.start.y, second.end.y));
      if (projectionsOverlap && firstSides[0] * firstSides[1] <= 0 && secondSides[0] * secondSides[1] <= 0) return 0;
      return Math.min(pointSegmentDistance(first.start, second), pointSegmentDistance(first.end, second), pointSegmentDistance(second.start, first), pointSegmentDistance(second.end, first));
    };
    type SegmentNode = { minX: number; maxX: number; minY: number; maxY: number; count: number; segments?: PaintSegment[]; left?: SegmentNode; right?: SegmentNode };
    const segmentTrees = new WeakMap<PaintSegment[], SegmentNode | undefined>();
    const segmentTree = (segments: PaintSegment[]) => {
      if (segmentTrees.has(segments)) return segmentTrees.get(segments);
      const build = (items: PaintSegment[]): SegmentNode | undefined => {
        if (!items.length) return undefined;
        const node = { ...paddedSegmentBounds(items)!, count: items.length };
        if (items.length <= 8) return { ...node, segments: items };
        const horizontal = node.maxX - node.minX >= node.maxY - node.minY, sorted = [...items].sort((a, b) => (horizontal ? (a.start.x + a.end.x) - (b.start.x + b.end.x) : (a.start.y + a.end.y) - (b.start.y + b.end.y)));
        const middle = Math.ceil(sorted.length / 2);
        return { ...node, left: build(sorted.slice(0, middle)), right: build(sorted.slice(middle)) };
      };
      const tree = build(segments); segmentTrees.set(segments, tree); return tree;
    };
    const segmentsOverlap = (first: PaintSegment[], second: PaintSegment[]) => {
      const a = segmentTree(first), b = segmentTree(second);
      if (!a || !b) return false;
      const stack: Array<[SegmentNode, SegmentNode]> = [[a, b]];
      while (stack.length) {
        const [left, right] = stack.pop()!;
        if (left.maxX < right.minX || right.maxX < left.minX || left.maxY < right.minY || right.maxY < left.minY) continue;
        if (left.segments && right.segments) {
          if (left.segments.some((segment) => right.segments!.some((candidate) => segmentDistance(segment, candidate) <= segment.padding + candidate.padding))) return true;
          continue;
        }
        if (!right.segments && (left.segments || right.count >= left.count)) { if (right.left) stack.push([left, right.left]); if (right.right) stack.push([left, right.right]); }
        else { if (left.left) stack.push([left.left, right]); if (left.right) stack.push([left.right, right]); }
      }
      return false;
    };
    const triangleEdges = (triangle: Array<{ x: number; y: number }>) => triangle.map((start, index) => ({ start, end: triangle[(index + 1) % triangle.length], padding: 0 }));
    const pointInTriangle = (point: { x: number; y: number }, triangle: Array<{ x: number; y: number }>) => {
      const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const sides = triangle.map((vertex, index) => cross(vertex, triangle[(index + 1) % triangle.length], point));
      return sides.every((side) => side >= 0) || sides.every((side) => side <= 0);
    };
    const triangleHitsRect = (triangle: Array<{ x: number; y: number }>, rect: { x: number; y: number; width: number; height: number }) => {
      const corners = [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }];
      return triangleEdges(triangle).some((edge) => segmentHitsBounds(edge.start, edge.end, rect, 0)) || corners.some((corner) => pointInTriangle(corner, triangle)) || triangle.some((point) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);
    };
    const triangleHitsSegment = (triangle: Array<{ x: number; y: number }>, segment: PaintSegment) => pointInTriangle(segment.start, triangle) || pointInTriangle(segment.end, triangle) || triangleEdges(triangle).some((edge) => segmentDistance(edge, segment) <= segment.padding);
    const trianglesOverlap = (first: Array<{ x: number; y: number }>, second: Array<{ x: number; y: number }>) => first.some((point) => pointInTriangle(point, second)) || second.some((point) => pointInTriangle(point, first)) || triangleEdges(first).some((edge) => triangleEdges(second).some((candidate) => segmentDistance(edge, candidate) === 0));
    const paintHitsRect = (paint: ReturnType<typeof paintGeometry>, rect: { x: number; y: number; width: number; height: number }) => paint.rects.some((candidate) => overlapBounds(candidate, rect)) || paint.segments.some((segment) => segmentHitsBounds(segment.start, segment.end, rect, segment.padding)) || paint.triangles.some((triangle) => triangleHitsRect(triangle, rect));
    const paintCache = new Map<string, ReturnType<typeof paintGeometry>>();
    const paintFor = (object: CanvasObject, entry: typeof rendered[number]) => { const cached = paintCache.get(object.id); if (cached) return cached; const paint = paintGeometry(object, entry); paintCache.set(object.id, paint); return paint; };
    const paintsOverlap = (a: ReturnType<typeof paintGeometry>, b: ReturnType<typeof paintGeometry>) => {
      if (a.rects.some((rect) => b.rects.some((candidate) => overlapBounds(rect, candidate)))) return true;
      if (a.segments.some((segment) => b.rects.some((rect) => segmentHitsBounds(segment.start, segment.end, rect, segment.padding))) || b.segments.some((segment) => a.rects.some((rect) => segmentHitsBounds(segment.start, segment.end, rect, segment.padding)))) return true;
      if (segmentsOverlap(a.segments, b.segments)) return true;
      if (a.triangles.some((triangle) => b.rects.some((rect) => triangleHitsRect(triangle, rect))) || b.triangles.some((triangle) => a.rects.some((rect) => triangleHitsRect(triangle, rect)))) return true;
      if (a.triangles.some((triangle) => b.segments.some((segment) => triangleHitsSegment(triangle, segment))) || b.triangles.some((triangle) => a.segments.some((segment) => triangleHitsSegment(triangle, segment)))) return true;
      return a.triangles.some((triangle) => b.triangles.some((candidate) => trianglesOverlap(triangle, candidate)));
    };
    const paintedOverlap = (firstObject: CanvasObject, first: typeof rendered[number], secondObject: CanvasObject, second: typeof rendered[number]) => paintsOverlap(paintFor(firstObject, first), paintFor(secondObject, second));
    const connectorContactPoint = (id: string) => {
      const connector = connectorById.get(id);
      if (connector) return { x: (connector.route[0].x + connector.route[1].x) / 2, y: (connector.route[0].y + connector.route[1].y) / 2 };
      const object = byId.get(id);
      return object ? resolveObjectCenter(object) : undefined;
    };
    const connectorPaintPastContacts = (object: Extract<CanvasObject, { kind: 'connector' }>, entry: typeof rendered[number], contacts: Point[]) => {
      const paint = paintFor(object, entry), cut = (segment: PaintSegment, contact: Point) => {
        const dx = segment.end.x - segment.start.x, dy = segment.end.y - segment.start.y, lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) return [];
        const distance = Math.sqrt(lengthSquared), t = Math.max(0, Math.min(1, ((contact.x - segment.start.x) * dx + (contact.y - segment.start.y) * dy) / lengthSquared));
        const nearest = { x: segment.start.x + dx * t, y: segment.start.y + dy * t }, perpendicular = Math.hypot(contact.x - nearest.x, contact.y - nearest.y), clearance = Math.max(4, segment.padding * 4);
        if (perpendicular >= clearance) return [segment];
        const half = Math.sqrt(clearance * clearance - perpendicular * perpendicular) / distance, low = Math.max(0, t - half), high = Math.min(1, t + half), pieces: PaintSegment[] = [];
        if (low > 0) pieces.push({ ...segment, end: { x: segment.start.x + dx * low, y: segment.start.y + dy * low } });
        if (high < 1) pieces.push({ ...segment, start: { x: segment.start.x + dx * high, y: segment.start.y + dy * high } });
        return pieces;
      };
      const segments = contacts.reduce((pieces, contact) => pieces.flatMap((segment) => cut(segment, contact)), paint.segments);
      return { ...paint, segments, triangles: paint.triangles.filter((triangle) => !contacts.some((contact) => pointInTriangle(contact, triangle))) };
    };
    const overlap = (first: typeof rendered[number], second: typeof rendered[number]) => overlapBounds(first.worldBounds, second.worldBounds);
    const overlaps: DrawRenderedGeometry['overlaps'] = [];
    let comparisonCount = 0;
    for (let firstIndex = 0; firstIndex < rendered.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < rendered.length; secondIndex += 1) {
        comparisonCount += 1;
        const first = rendered[firstIndex], second = rendered[secondIndex], firstObject = byId.get(first.id), secondObject = byId.get(second.id);
        const broadOverlap = overlap(first, second);
        if (!broadOverlap) continue;
        const connectorRelated = (connector: Extract<CanvasObject, { kind: 'connector' }>, candidate: CanvasObject) => connector.fromId === candidate.id || connector.toId === candidate.id
          || (candidate.kind === 'group' && (contains(candidate.id, connector.fromId) || contains(candidate.id, connector.toId)));
        const firstRelated = firstObject?.kind === 'connector' && secondObject && connectorRelated(firstObject, secondObject), secondRelated = secondObject?.kind === 'connector' && firstObject && connectorRelated(secondObject, firstObject);
        const firstEndpointContainer = firstObject?.kind === 'connector' && secondObject && (firstObject.fromId === secondObject.id || firstObject.toId === secondObject.id
          || (secondObject.kind === 'group' && (contains(secondObject.id, firstObject.fromId) || contains(secondObject.id, firstObject.toId))));
        const secondEndpointContainer = secondObject?.kind === 'connector' && firstObject && (secondObject.fromId === firstObject.id || secondObject.toId === firstObject.id
          || (firstObject.kind === 'group' && (contains(firstObject.id, secondObject.fromId) || contains(firstObject.id, secondObject.toId))));
        const firstLabelBounds = firstEndpointContainer ? connectorById.get(first.id)?.labelBounds?.worldBounds : undefined, secondLabelBounds = secondEndpointContainer ? connectorById.get(second.id)?.labelBounds?.worldBounds : undefined;
        const relatedLabelOverlap = firstLabelBounds && secondObject && paintHitsRect(paintFor(secondObject, second), firstLabelBounds) ? firstLabelBounds
          : secondLabelBounds && firstObject && paintHitsRect(paintFor(firstObject, first), secondLabelBounds) ? secondLabelBounds : undefined;
        const connectorContactIds = firstObject?.kind === 'connector' && secondObject?.kind === 'connector'
          ? new Set([
              ...[firstObject.fromId, firstObject.toId].filter((id) => id === secondObject.fromId || id === secondObject.toId),
              ...[firstObject.fromId, firstObject.toId].filter((id) => id === secondObject.id),
              ...[secondObject.fromId, secondObject.toId].filter((id) => id === firstObject.id)
            ]) : new Set<string>();
        const connectorContactPoints = [...connectorContactIds].map(connectorContactPoint).filter((point): point is Point => point !== undefined);
        if ((firstRelated || secondRelated) && !relatedLabelOverlap && !connectorContactPoints.length) continue;
        const visiblePaintOverlap = firstObject && secondObject && (connectorContactPoints.length
          ? paintsOverlap(connectorPaintPastContacts(firstObject as Extract<CanvasObject, { kind: 'connector' }>, first, connectorContactPoints), connectorPaintPastContacts(secondObject as Extract<CanvasObject, { kind: 'connector' }>, second, connectorContactPoints))
          : paintedOverlap(firstObject, first, secondObject, second));
        if (!relatedLabelOverlap && !visiblePaintOverlap) continue;
        const sharedCompound = firstObject?.kind === 'stroke' && secondObject?.kind === 'stroke'
          && firstObject.sourceIds?.length === 2 && secondObject.sourceIds?.length === 2
          && firstObject.sourceIds.every((id, index) => id === secondObject.sourceIds?.[index])
          && firstObject.sourceIds.includes(firstObject.id) && firstObject.sourceIds.includes(secondObject.id);
        if (sharedCompound) continue;
        const bounds = relatedLabelOverlap || broadOverlap;
        if (!bounds) continue;
        const containment = (first.kind === 'group' && contains(first.id, second.id)) || (second.kind === 'group' && contains(second.id, first.id));
        overlaps.push({ firstId: first.id, secondId: second.id, bounds, classification: containment ? 'containment' : 'peer' });
      }
    }
    return {
      surface: { x: 0, y: 0, width: surfaceRect.width, height: surfaceRect.height },
      objects: rendered,
      connectors,
      overlaps,
      totalObjectCount: matches.length,
      missingIds,
      unrenderedIds: selected.filter(({ id }) => !rendered.some((entry) => entry.id === id)).map(({ id }) => id),
      comparisonCount,
      truncated: matches.length > selected.length
    };
  }

  function focusAgentCamera(target: { scope: 'all' | 'selection' | 'ids' | 'bounds'; ids?: string[]; bounds?: { x: number; y: number; width: number; height: number }; padding: number }) {
    assertAgentControlReady();
    const ids = target.scope === 'all' ? document.objects.map(({ id }) => id) : target.scope === 'selection' ? [...selectedIds] : target.ids;
    if (ids && !ids.length) throw new Error('No objects are available for focus.');
    const objects = ids?.map((id) => objectIndex.get(id)).filter((object) => object !== undefined) ?? [];
    if (ids && objects.length !== ids.length) throw new Error('One or more focus IDs do not exist.');
    const bounds = target.bounds ?? objectBounds(objects, document.objects);
    const next = fitViewportToBounds(viewport, bounds, { width: viewportWidth, height: viewportHeight }, { padding: target.padding, force: true });
    if (next.x === viewport.x && next.y === viewport.y && next.zoom === viewport.zoom) return { ...(ids ? { ids } : {}), bounds };
    clearTimeout(agentCameraTimer);
    agentCameraActive = true;
    updateViewport(next, false);
    agentCameraTimer = setTimeout(() => agentCameraActive = false, 520);
    status = `Agent focused ${ids?.length || 'canvas'}${ids?.length === 1 ? ' object' : ' objects'}`;
    return { ...(ids ? { ids } : {}), bounds };
  }

  async function browserLocalHistory(direction: 'undo' | 'redo') {
    if (nativeShell || nativeRole !== 'web') throw new Error('WebMCP history is limited to the browser-local canvas. Use Draw device controls for paired Mac and iPhone sessions.');
    await (direction === 'undo' ? doUndo() : doRedo());
  }

  function showAgentTransition(kind: DrawTransitionKind, affectedIds: string[], preserveViewport = false) {
    const id = `agent-${crypto.randomUUID()}`;
    agentTransition = { id, kind, affectedIds };
    clearTimeout(agentTransitionTimer);
    agentTransitionTimer = setTimeout(() => agentTransition = null, 700);
    const affectedIdSet = new Set(affectedIds), affected = document.objects.filter(({ id }) => affectedIdSet.has(id));
    const followable = !preserveViewport && !['history', 'reset'].includes(kind) && affected.length > 0;
    const nextViewport = followable ? fitViewportToBounds(viewport, objectBounds(affected, document.objects), { width: viewportWidth, height: viewportHeight }) : viewport;
    const framed = nextViewport !== viewport;
    if (framed) {
      clearTimeout(agentCameraTimer);
      agentCameraActive = true;
      updateViewport(nextViewport, false);
      agentCameraTimer = setTimeout(() => agentCameraActive = false, 520);
    }
    status = `Agent ${kind} · ${affectedIds.length || 'canvas'} ${affectedIds.length === 1 ? 'object' : 'objects'}${framed ? ' · framed' : ''}`;
    return id;
  }

  async function applyAgentOperations(operations: CanvasOperation[]) {
    if (!ready) throw new Error('Draw is still loading. Try the tool again.');
    if (nativeShell || nativeRole !== 'web') throw new Error('WebMCP mutation is limited to the browser-local canvas. Use Draw device controls for paired Mac and iPhone sessions.');
    if (!companionCanEdit()) throw new Error(status);
    const before = JSON.parse(JSON.stringify(document)) as CanvasDocument;
    const next = applyCanvasOperations(before, operations);
    if (!next) throw new Error('One or more Draw operations are invalid for the current document. No changes were applied.');
    apply(next, operations);
    const existing = new Set(next.objects.map(({ id }) => id));
    selectedIds = selectedIds.filter((id) => existing.has(id));
    return { before, after: next };
  }

  async function resetCanvasFromAgent() {
    if (!ready) throw new Error('Draw is still loading. Try the tool again.');
    if (nativeShell || nativeRole !== 'web') throw new Error('WebMCP reset is limited to the browser-local canvas. Use Draw device controls for paired Mac and iPhone sessions.');
    clearTimeout(saveTimer); saveTimer = undefined;
    if (nativeRole === 'web') await clearDocument();
    const next = createDocument();
    await commitHostReplacement(() => next, (value) => value, (value) => history = { past: [], present: value, future: [] }, 'reset');
    share = null;
    selectedIds = [];
    queueSave(next);
  }

  async function initializeSession() {
    if (!nativeShell) {
      await loadDocument().then((saved) => { if (saved) { history = { past: [], present: saved, future: [] }; try { const managed = localStorage.getItem(`draw-share:${saved.id}`); share = managed ? JSON.parse(managed) : null; } catch { share = null; } status = 'Restored from this device'; } else status = 'New local session'; }).catch(() => status = 'Local storage unavailable · export copies');
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
    } catch (error) { status = error instanceof Error ? error.message : String(error || 'Pairing unavailable'); }
    finally { pairingBusy = false; }
  }

  async function refreshMirroredState() {
    if (!ready || nativeRole === 'web' || drawing || wheelTimer || window.document.activeElement?.closest('input,textarea,[contenteditable="true"]')) return;
    if (nativeRole === 'companion' && (!nativeSession.sessionId || nativeSession.online === false || (nativeSession.queueDepth || 0) > 0)) return;
    const optimisticVersion = nativeOptimisticVersion;
    try {
      const refreshed = nativeRole === 'host' ? await hostStatus() : await refreshCompanion();
      if (optimisticVersion !== nativeOptimisticVersion || wheelTimer) return;
      if (refreshed.revision !== nativeSession.revision && refreshed.document) {
        companionResetArmed = false; clearTimeout(companionResetTimer);
        history = nativeRole === 'host'
          ? { past: [...history.past, history.present], present: refreshed.document, future: [] }
          : { past: [], present: refreshed.document, future: [] };
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

  function sendNative(operations: CanvasOperation[], recordsHistory = false, preserveFuture = false) {
    if (nativeRole === 'web' || !operations.length) return;
    let historyOperationIndex = 0;
    if (wheelTimer && operations.some(({ type }) => type !== 'set_viewport')) {
      clearTimeout(wheelTimer); wheelTimer = undefined;
      operations = [{ type: 'set_viewport', viewport: { ...viewport } }, ...operations];
      historyOperationIndex = 1;
    }
    const role = nativeRole;
    const conflictEpoch = nativeConflictEpoch;
    const queued = operations.map((operation) => ({ operation, optimisticVersion: ++nativeOptimisticVersion }));
    nativeTail = nativeTail.then(async () => {
      if (conflictEpoch !== nativeConflictEpoch) return;
      let authoritativePrevious: CanvasDocument | undefined;
      for (const [index, { operation, optimisticVersion }] of queued.entries()) {
        const result = await submitNativeOperation(role, operation);
        const authoritativeDocument = result.document ? structuredClone(result.document) : undefined;
        if (recordsHistory && index === historyOperationIndex) authoritativePrevious = result.previousDocument;
        nativeSession = { ...nativeSession, ...result };
        if (result.status === 'conflict') {
          nativeConflictEpoch += 1;
          nativeOptimisticVersion += 1;
          if (authoritativeDocument) history = { past: [], present: authoritativeDocument, future: [] };
          status = 'Session changed on Mac · authoritative canvas restored';
          break;
        }
        if (result.status === 'queue_full') {
          nativeConflictEpoch += 1;
          nativeOptimisticVersion += 1;
          if (authoritativeDocument) history = { past: [], present: authoritativeDocument, future: [] };
          status = result.error || 'Offline queue is full · reconnect before editing';
          break;
        }
        if (authoritativeDocument && result.status !== 'queued' && optimisticVersion === nativeOptimisticVersion) {
          const past = recordsHistory && authoritativePrevious
            ? [...history.past.slice(0, -1), authoritativePrevious]
            : history.past;
          history = { past, present: authoritativeDocument, future: preserveFuture ? history.future : [] };
        }
        if (result.status === 'queued') status = `${result.queueDepth || 1} action queued · reconnect to Mac`;
        else if (result.status === 'credentials_rejected') status = 'Pairing credentials rejected · export if needed, then forget and re-pair';
        else if (result.status === 'pairing_changed') status = 'Pairing changed while syncing · using the current Mac session';
        else status = role === 'host' ? `Mac committed revision ${result.revision}` : `Synced revision ${result.revision}`;
      }
    }).catch((error) => { status = error instanceof Error ? error.message : 'Native operation failed'; });
  }

  function point(event: PointerEvent): Point { const rect = surface.getBoundingClientRect(); return { x: (event.clientX - rect.left - viewport.x) / viewport.zoom, y: (event.clientY - rect.top - viewport.y) / viewport.zoom }; }
  function companionCanEdit() { if (nativeRole !== 'companion') return true; if (nativeSession.sessionId && !nativeSession.requiresRepair) return true; status = nativeSession.requiresRepair ? 'Pairing credentials rejected · export if needed, then forget and re-pair' : 'Pair this iPhone with a Mac before editing'; return false; }
  function queueSave(next: CanvasDocument) { if (!browser || nativeRole !== 'web') return; clearTimeout(saveTimer); status = 'Saving locally…'; saveTimer = setTimeout(() => void saveDocument(next).then(() => status = 'Saved on this device').catch(() => status = 'Local save failed · export a copy'), 120); }
  function commitNoteText(id: string, text: string) { if (!companionCanEdit()) return; const current = document.objects.find((entry) => entry.id === id); if (!current || current.kind !== 'note' || (current.text === text && !current.content)) return; const changed = { ...current, text, content: undefined }; const next = withObjects(document, document.objects.map((entry) => entry.id === id ? changed : entry)); history = { ...history, present: next }; queueSave(next); sendNative([{ type: 'put_object', object: changed }]); }
  function formatSelectedNote(blockType: NoteBlockType = 'paragraph', mark?: 'bold' | 'italic' | 'underline' | 'code' | 'link') {
    const note = selectedObjects.length === 1 && selectedObjects[0].kind === 'note' ? selectedObjects[0] : null;
    if (!note || !companionCanEdit()) return;
    const link = mark === 'link' ? prompt('Safe link (https:// or mailto:)') : undefined;
    if (mark === 'link' && (!link || (!link.startsWith('https://') && !link.startsWith('mailto:')))) { status = 'Links must use https:// or mailto:'; return; }
    const content = plainNoteContent(note.text); content.blocks[0].type = blockType;
    if (mark) content.blocks[0].runs[0] = { ...content.blocks[0].runs[0], ...(mark === 'link' ? { link: link! } : { [mark]: true }) };
    const changed = { ...note, text: noteContentText(content), content };
    apply(withObjects(document, document.objects.map((entry) => entry.id === note.id ? changed : entry)), { type: 'put_object', object: changed });
    status = 'Formatted note saved locally';
  }
  function clearSelectedNoteFormatting() { const note = selectedObjects.find((entry) => entry.kind === 'note'); if (note?.kind === 'note') commitNoteText(note.id, note.text); }
  function apply(next: CanvasDocument, operation?: CanvasOperation | CanvasOperation[]) { if (!companionCanEdit()) return; history = commit(history, next); queueSave(next); sendNative(operation ? (Array.isArray(operation) ? operation : [operation]) : [], true); }
  function operationsBetween(from: CanvasDocument, to: CanvasDocument): CanvasOperation[] {
    const operations: CanvasOperation[] = [];
    if (JSON.stringify(from.objects) !== JSON.stringify(to.objects)) {
      operations.push({ type: 'replace_objects', objects: to.objects });
    }
    if (from.title !== to.title) operations.push({ type: 'set_title', title: to.title });
    if (JSON.stringify(from.viewport) !== JSON.stringify(to.viewport)) operations.push({ type: 'set_viewport', viewport: to.viewport });
    return operations;
  }
  function updateViewport(next: CanvasDocument['viewport'], authoritative = true) { if (!companionCanEdit()) return; if (authoritative) { clearTimeout(wheelTimer); wheelTimer = undefined; } const updated = { ...document, viewport: next, updatedAt: new Date().toISOString() }; history = { ...history, present: updated }; queueSave(updated); if (authoritative) sendNative([{ type: 'set_viewport', viewport: next }]); }
  function chooseColor(color: DrawingColor, label: string) { drawingColor = color; try { localStorage.setItem(DRAWING_COLOR_PREFERENCE, color); } catch { /* Keep drawing when preference storage is unavailable. */ } const next = recolorObjects(document, selectedIds, color); if (next !== document) { const changed = next.objects.filter((object) => selectedIds.includes(object.id)); apply(next, changed.map((object) => ({ type: 'put_object', object }))); status = `Selected marks changed to ${label}`; } else status = `${label} selected for new marks`; }
  function toggleSidebar() { sidebarCollapsed = !sidebarCollapsed; try { localStorage.setItem(TOOL_SIDEBAR_PREFERENCE, String(sidebarCollapsed)); } catch { /* Keep the rail usable when preference storage is unavailable. */ } }
  function createTapObject(action: { point: Point; tool: 'note' | 'group' }) {
    const { point: here } = action;
    const item: CanvasObject = action.tool === 'note'
      ? { id: uid('note'), kind: 'note', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 260, height: 132, text: 'New thought' }
      : { id: uid('group'), kind: 'group', createdAt: new Date().toISOString(), x: here.x, y: here.y, width: 360, height: 220, label: 'Working group', childIds: [] };
    apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item });
    selectedIds = [item.id]; drawing = false;
  }
  function beginNativePointerGesture() {
    if (wheelTimer) { clearTimeout(wheelTimer); wheelTimer = undefined; sendNative([{ type: 'set_viewport', viewport }]); }
    if (nativeRole !== 'web') nativeOptimisticVersion += 1;
  }
  function trackTouchPointer(event: PointerEvent) {
    if (!ready || agentMutationActive) return;
    noteInput.flushAll();
    stopAgentCamera();
    if (event.pointerType !== 'touch' || event.button !== 0) return;
    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activeTouches.size !== 2) return;
    if (wheelTimer) { clearTimeout(wheelTimer); wheelTimer = undefined; sendNative([{ type: 'set_viewport', viewport }]); }
    if (nativeRole !== 'web') nativeOptimisticVersion += 1;
    pendingTouchAction = null;
    const [a, b] = [...activeTouches.values()];
    const rect = surface.getBoundingClientRect();
    const center = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
    pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), world: { x: (center.x - viewport.x) / viewport.zoom, y: (center.y - viewport.y) / viewport.zoom }, origin: { ...viewport } };
    drawing = false; start = null; draftPoints = []; draftShape = null; lasso = null;
    if (dragOrigin) history = { ...history, present: dragOrigin };
    movingObjectId = null; dragLast = null; dragOrigin = null; dragMoved = false;
    if (resizeOrigin) history = { ...history, present: resizeOrigin };
    resizingGroupId = null; resizeOrigin = null; resizeMoved = false;
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !ready || agentMutationActive) return;
    if (!companionCanEdit()) return;
    stopAgentCamera();
    beginNativePointerGesture();
    try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
    if (pinch) return;
    const here = point(event);
    if (event.pointerType === 'touch' && (tool === 'note' || tool === 'group')) {
      pendingTouchAction = { pointerId: event.pointerId, point: here, tool };
      return;
    }
    drawing = true; start = here;
    if (tool === 'pen') draftPoints = [here];
    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'arrow') draftShape = { id: 'draft', kind: tool, createdAt: new Date().toISOString(), from: here, to: here, color: drawingColor };
    if (tool === 'select') lasso = { from: here, to: here };
    if (tool === 'note' || tool === 'group') createTapObject({ point: here, tool });
  }
  function pointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && activeTouches.has(event.pointerId)) activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && activeTouches.size >= 2) {
      const [a, b] = [...activeTouches.values()];
      const rect = surface.getBoundingClientRect();
      const center = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const zoom = Math.max(.25, Math.min(3, viewport.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance));
      pinch.distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      updateViewport({ x: center.x - pinch.world.x * zoom, y: center.y - pinch.world.y * zoom, zoom }, false);
      return;
    }
    if (!drawing || !start) return; const here = point(event);
    if (resizingGroupId && resizeOrigin) {
      const group = resizeOrigin.objects.find((object) => object.id === resizingGroupId && object.kind === 'group');
      if (group?.kind === 'group') {
        const width = Math.max(120, here.x - group.x), height = Math.max(80, here.y - group.y);
        history = { ...history, present: resizeGroup(resizeOrigin, group.id, width, height) };
        resizeMoved = width !== group.width || height !== group.height;
      }
      return;
    }
    if (movingObjectId && dragLast) {
      const dx = here.x - dragLast.x, dy = here.y - dragLast.y;
      if (dx || dy) {
        const movingIds = expandCompoundIds(document, [movingObjectId]);
        const moved = document.objects.map((object) => movingIds.has(object.id) ? moveObject(object, dx, dy) : object);
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
    if (event.pointerType === 'touch') activeTouches.delete(event.pointerId);
    if (pinch) {
      if (event.type === 'pointercancel') {
        history = { ...history, present: { ...document, viewport: pinch.origin } };
        pinch = null;
      } else if (activeTouches.size < 2) { pinch = null; sendNative([{ type: 'set_viewport', viewport }]); }
      drawing = false; start = null; draftPoints = []; draftShape = null; lasso = null;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
      return;
    }
    if (pendingTouchAction?.pointerId === event.pointerId) {
      if (event.type === 'pointercancel') {
        pendingTouchAction = null;
        try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
        return;
      }
      const action = pendingTouchAction; pendingTouchAction = null; createTapObject(action);
      try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
      return;
    }
    if (!drawing) return; const here = point(event);
    if (resizingGroupId) {
      if (event.type === 'pointercancel') {
        if (resizeOrigin) history = { ...history, present: resizeOrigin };
        resizingGroupId = null; resizeOrigin = null; resizeMoved = false; drawing = false; start = null;
        try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
        return;
      }
      if (resizeMoved && resizeOrigin) {
        history = { past: [...history.past, resizeOrigin], present: document, future: [] };
        sendNative([{ type: 'replace_objects', objects: document.objects }], true); queueSave(document);
      }
      resizingGroupId = null; resizeOrigin = null; resizeMoved = false; drawing = false; start = null;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
      return;
    }
    if (movingObjectId) {
      const movingIds = expandCompoundIds(document, [movingObjectId]);
      const moved = document.objects.filter(({ id }) => movingIds.has(id));
      if (dragMoved && moved.length && dragOrigin) {
        history = { past: [...history.past, dragOrigin], present: document, future: [] };
        sendNative(moved.map((object) => ({ type: 'put_object' as const, object })), true); queueSave(document);
      }
      movingObjectId = null; dragLast = null; dragOrigin = null; dragMoved = false; drawing = false; start = null;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
      return;
    }
    if (tool === 'pen' && draftPoints.length > 1) { const item: Stroke = { id: uid('stroke'), kind: 'stroke', createdAt: new Date().toISOString(), points: draftPoints, color: drawingColor, width: 3 }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; }
    if (draftShape && start && Math.hypot(here.x - start.x, here.y - start.y) > 4) { const item = { ...draftShape, id: uid(draftShape.kind), to: here }; apply(withObjects(document, [...document.objects, item]), { type: 'put_object', object: item }); selectedIds = [item.id]; }
    if (tool === 'pan') sendNative([{ type: 'set_viewport', viewport }]);
    if (lasso) { const left = Math.min(lasso.from.x, lasso.to.x), right = Math.max(lasso.from.x, lasso.to.x), top = Math.min(lasso.from.y, lasso.to.y), bottom = Math.max(lasso.from.y, lasso.to.y); selectedIds = selectObjectIdsInBounds(document, { left, right, top, bottom }); }
    drawing = false; start = null; draftPoints = []; draftShape = null; lasso = null;
    try { surface.releasePointerCapture(event.pointerId); } catch { /* Capture may not have been acquired. */ }
  }

  function moveObject(object: CanvasObject, dx: number, dy: number): CanvasObject {
    if (object.kind === 'stroke') return { ...object, points: object.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
    if (object.kind === 'rectangle' || object.kind === 'ellipse' || object.kind === 'arrow') return { ...object, from: { x: object.from.x + dx, y: object.from.y + dy }, to: { x: object.to.x + dx, y: object.to.y + dy } };
    if (object.kind === 'note' || object.kind === 'group') return { ...object, x: object.x + dx, y: object.y + dy };
    return object;
  }
  function selectPointer(event: PointerEvent, id: string) {
    event.stopPropagation();
    stopAgentCamera();
    if (pinch || agentMutationActive) return;
    beginNativePointerGesture();
    if (tool === 'eraser') { apply(removeObjects(document, [id]), { type: 'remove_objects', ids: [id] }); selectedIds = []; return; }
    if (tool === 'connector') { selectedIds = selectedIds.includes(id) ? selectedIds : [...selectedIds.slice(-1), id]; if (selectedIds.length === 2) runConversion('connector'); return; }
    const compoundIds = [...expandCompoundIds(document, [id])];
    selectedIds = event.shiftKey ? (selectedIds.includes(id) ? selectedIds.filter((value) => !compoundIds.includes(value)) : [...new Set([...selectedIds, ...compoundIds])]) : compoundIds;
    if (tool === 'select' && !event.shiftKey) {
      const here = point(event); movingObjectId = id; dragLast = here; dragOrigin = document; dragMoved = false; drawing = true; start = here;
      try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
    }
  }
  function resizePointer(event: PointerEvent, id: string) {
    event.stopPropagation();
    stopAgentCamera();
    if (pinch || agentMutationActive || tool !== 'select' || !companionCanEdit()) return;
    beginNativePointerGesture();
    const here = point(event); selectedIds = [id]; resizingGroupId = id; resizeOrigin = document; resizeMoved = false; drawing = true; start = here;
    try { surface.setPointerCapture(event.pointerId); } catch { /* SVG pointer capture is not supported in every browser. */ }
  }
  function resizeKeyboard(event: KeyboardEvent, id: string) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || agentMutationActive || !companionCanEdit()) return;
    const group = document.objects.find((object) => object.id === id && object.kind === 'group');
    if (group?.kind !== 'group') return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    const width = Math.max(120, group.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0));
    const height = Math.max(80, group.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
    const next = resizeGroup(document, id, width, height);
    if (next !== document) apply(next, { type: 'replace_objects', objects: next.objects });
  }
  function isTextEditingEvent(event: KeyboardEvent) { return event.target instanceof Element && Boolean(event.target.closest('input,textarea,[contenteditable="true"]')); }
  function selectKeyboard(event: KeyboardEvent, id: string) { if (isTextEditingEvent(event) || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); const compoundIds = [...expandCompoundIds(document, [id])]; selectedIds = event.shiftKey ? [...new Set([...selectedIds, ...compoundIds])] : compoundIds; }
  function runConversion(target: 'note' | 'connector' | 'group') { const next = convert(document, selectedIds, target); if (next === document) { status = target === 'connector' ? 'Select two objects to make a connector' : 'Select source material first'; return; } const created = next.objects.at(-1)!; apply(next, { type: 'convert', selectedIds: [...selectedIds], target, resultId: created.id, createdAt: created.createdAt }); selectedIds = [created.id]; conversionOpen = false; status = `Converted to ${target}. Source preserved.`; }
  function restoreSelected() { const selected = selectedObjects[0]; if (!selected?.sourceSnapshot) return; const next = restoreConversion(document, selected.id); apply(next, { type: 'restore_conversion', id: selected.id }); selectedIds = selected.sourceIds || []; status = 'Conversion removed. Source restored.'; }
  function cancelPendingWheelSync() { clearTimeout(wheelTimer); wheelTimer = undefined; }
  async function commitHostReplacement<T>(resolve: () => T, documentOf: (value: T) => CanvasDocument, install: (value: T) => void, reason: 'undo' | 'redo' | 'import' | 'reset') { if (nativeRole === 'host') cancelPendingWheelSync(); if (nativeRole !== 'host') { const value = resolve(); install(value); return value; } let committed!: T; const replacement = nativeTail.then(async () => { committed = resolve(); const expectedRevision = nativeSession.revision || 0; const result = await replaceHostDocument(documentOf(committed), reason, expectedRevision); nativeSession = { ...nativeSession, ...result }; install(committed); status = `Mac committed ${reason} at revision ${nativeSession.revision}`; }); nativeTail = replacement.catch(() => undefined); try { await replacement; return committed; } catch (error) { const refreshed = await hostStatus(); nativeSession = { ...nativeSession, ...refreshed }; if (refreshed.document) history = { past: history.past, present: refreshed.document, future: [] }; throw error; } }
  async function doUndo() { if (nativeRole === 'companion') { cancelPendingWheelSync(); const current = document, next = undo(history); if (next === history) return; history = next; selectedIds = []; sendNative(operationsBetween(current, next.present), false, true); return; } try { const next = await commitHostReplacement(() => undo(history), (value) => value.present, (value) => history = value, 'undo'); selectedIds = []; queueSave(next.present); } catch (error) { status = error instanceof Error ? error.message : 'Undo conflicted with an iPhone change'; } }
  async function doRedo() { if (nativeRole === 'companion') { cancelPendingWheelSync(); const current = document, next = redo(history); if (next === history) return; history = next; selectedIds = []; sendNative(operationsBetween(current, next.present), false, true); return; } try { const next = await commitHostReplacement(() => redo(history), (value) => value.present, (value) => history = value, 'redo'); selectedIds = []; queueSave(next.present); } catch (error) { status = error instanceof Error ? error.message : 'Redo conflicted with an iPhone change'; } }
  function keydown(event: KeyboardEvent) { if (isTextEditingEvent(event)) return; if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); void (event.shiftKey ? doRedo() : doUndo()); return; } if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) { const ids = [...selectedIds]; apply(removeObjects(document, ids), { type: 'remove_objects', ids }); selectedIds = []; return; } const match = tools.find(({ key }) => key.toLowerCase() === event.key.toLowerCase()); if (match) tool = match.id; }
  function stopAgentCamera() {
    if (agentCameraActive && canvasContent) {
      const renderedTransform = getComputedStyle(canvasContent).transform;
      if (renderedTransform && renderedTransform !== 'none') {
        const matrix = new DOMMatrixReadOnly(renderedTransform);
        const rendered = { x: matrix.e, y: matrix.f, zoom: Math.hypot(matrix.a, matrix.b) };
        if (Object.values(rendered).every(Number.isFinite)) updateViewport(rendered, false);
      }
    }
    clearTimeout(agentCameraTimer); agentCameraActive = false;
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    if (agentMutationActive || !companionCanEdit()) return;
    stopAgentCamera();
    const rect = surface.getBoundingClientRect();
    const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, rect.width);
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, rect.height);
    const next = event.ctrlKey || event.metaKey
      ? zoomViewportAt(viewport, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.exp(-deltaY * .01))
      : panViewport(viewport, deltaX, deltaY);
    if (nativeRole !== 'web') nativeOptimisticVersion += 1;
    updateViewport(next, false);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTimer = undefined; sendNative([{ type: 'set_viewport', viewport }]); }, 120);
  }
  const path = (points: Point[]) => points.map((value, index) => `${index ? 'L' : 'M'} ${value.x} ${value.y}`).join(' ');
  function wrappedLines(text: string, fits: (value: string) => boolean) { const lines: string[] = []; for (const paragraph of text.split('\n')) { if (!paragraph) { lines.push(''); continue; } let line = ''; for (const word of paragraph.split(/\s+/)) { const next = `${line}${line ? ' ' : ''}${word}`; if (line && !fits(next)) { lines.push(line); line = word; } else line = next; } lines.push(line); } return lines; }
  function paintNoteContent(context: CanvasRenderingContext2D, note: Extract<CanvasObject,{kind:'note'}>) {
    if (!note.content) { context.fillStyle = '#fff'; context.font = '500 16px Arial'; let y = note.y + 30; for (const line of wrappedLines(note.text, (value) => context.measureText(value).width <= note.width - 32)) { if (line) context.fillText(line, note.x + 16, y); y += 22; } return; }
    let y = note.y + 32, numbered = 0;
    for (const block of note.content.blocks) { let x = note.x + 16; const prefix = block.type === 'bullet' ? '• ' : block.type === 'numbered' ? `${++numbered}. ` : block.type === 'quote' ? '“' : ''; const size = block.type === 'heading1' ? 22 : block.type === 'heading2' ? 19 : block.type === 'heading3' ? 17 : 16; if (prefix) { context.fillStyle = block.type === 'quote' ? '#ddd' : '#fff'; context.font = `500 ${size}px Arial`; context.fillText(prefix, x, y); x += context.measureText(prefix).width; } for (const run of block.runs) { context.font = `${run.italic ? 'italic ' : ''}${run.bold || block.type.startsWith('heading') ? '700' : '500'} ${size}px ${run.code ? 'monospace' : 'Arial'}`; context.fillStyle = run.link ? '#7bb7ff' : '#fff'; context.fillText(run.text, x, y); const width = context.measureText(run.text).width; if (run.underline || run.link) { context.fillRect(x, y + 2, width, 1); } x += width; } if (block.type === 'quote') context.fillText('”', x, y); y += size * 1.45; }
  }

  function download(content: BlobPart, type: string, extension: string) { const blob = content instanceof Blob ? content : new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${document.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'mapping-canvas'}.${extension}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url)); }
  function exportJson() { download(serialize(document), 'application/json', 'json'); status = 'JSON exported'; }
  function rememberShare(next: typeof share) { share = next; try { const key = `draw-share:${document.id}`; if (next) localStorage.setItem(key, JSON.stringify(next)); else localStorage.removeItem(key); } catch { status = 'Link active, but management access could not be saved on this device'; } }
  async function publishSnapshotForAgent(input: { expiresAt?: string } = {}) {
    if (nativeRole !== 'web' || sharing) throw new Error('Snapshot publishing is not ready.'); sharing = true;
    try { const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document, ...input }) }); if (!response.ok) throw new Error('Snapshot could not be published'); const result = await response.json(); rememberShare({ shareId: result.shareId, url: result.url, token: result.managementToken, revision: result.revision }); status = 'View-only snapshot published'; return { shareId: result.shareId, url: new URL(result.url, location.origin).href, revision: result.revision }; }
    finally { sharing = false; }
  }
  async function updateSnapshotForAgent(input: { expectedShareRevision: number }) {
    if (!share || sharing || input.expectedShareRevision !== share.revision) throw new Error('Snapshot revision is stale or management access is unavailable.'); sharing = true;
    try { const response = await fetch(`/api/shares/${share.shareId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${share.token}` }, body: JSON.stringify({ document, expectedRevision: input.expectedShareRevision }) }); if (!response.ok) throw new Error(response.status === 409 ? 'Snapshot revision is stale.' : 'Snapshot could not be updated'); const result = await response.json(); rememberShare({ ...share, revision: result.revision }); status = `Shared snapshot updated · revision ${result.revision}`; return { shareId: share.shareId, url: new URL(share.url, location.origin).href, revision: result.revision }; }
    finally { sharing = false; }
  }
  async function revokeSnapshotForAgent() {
    if (!share || sharing) throw new Error('Management access is unavailable.'); sharing = true;
    try { const response = await fetch(`/api/shares/${share.shareId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${share.token}` } }); if (!response.ok) throw new Error('Snapshot could not be revoked'); rememberShare(null); status = 'View-only link revoked'; }
    finally { sharing = false; }
  }
  async function publishSnapshot() {
    if (nativeRole !== 'web' || sharing) return; sharing = true;
    try { const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document }) }); if (!response.ok) throw new Error('Snapshot could not be published'); const result = await response.json(); rememberShare({ shareId: result.shareId, url: result.url, token: result.managementToken, revision: result.revision }); status = 'View-only snapshot published'; await navigator.clipboard?.writeText(new URL(result.url, location.origin).href); }
    catch (error) { status = error instanceof Error ? error.message : 'Snapshot could not be published'; } finally { sharing = false; }
  }
  async function updateSnapshot() {
    if (!share || sharing) return; sharing = true;
    try { const response = await fetch(`/api/shares/${share.shareId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${share.token}` }, body: JSON.stringify({ document, expectedRevision: share.revision }) }); if (!response.ok) throw new Error(response.status === 409 ? 'Shared snapshot changed; reopen before updating' : 'Snapshot could not be updated'); const result = await response.json(); rememberShare({ ...share, revision: result.revision }); status = `Shared snapshot updated · revision ${result.revision}`; }
    catch (error) { status = error instanceof Error ? error.message : 'Snapshot could not be updated'; } finally { sharing = false; }
  }
  async function copyShareLink() { if (!share) return; await navigator.clipboard?.writeText(new URL(share.url, location.origin).href); status = 'View-only link copied'; }
  async function revokeSnapshot() {
    if (!share || sharing || !confirm('Revoke this view-only link? Recipients will no longer be able to open it.')) return; sharing = true;
    try { const response = await fetch(`/api/shares/${share.shareId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${share.token}` } }); if (!response.ok) throw new Error('Snapshot could not be revoked'); rememberShare(null); status = 'View-only link revoked'; }
    catch (error) { status = error instanceof Error ? error.message : 'Snapshot could not be revoked'; } finally { sharing = false; }
  }
  function svgMarkup() {
    const clone = surface.cloneNode(true) as SVGSVGElement, namespace = 'http://www.w3.org/2000/svg';
    clone.querySelectorAll('[data-ui=true]').forEach((node) => node.remove());
    clone.querySelectorAll('.group-label').forEach((node) => { node.setAttribute('fill', '#fcaa2d'); node.setAttribute('font-family', 'monospace'); node.setAttribute('font-size', '11'); node.setAttribute('font-weight', '700'); });
    clone.querySelectorAll('.connector-label').forEach((node) => { node.setAttribute('fill', '#fcaa2d'); node.setAttribute('font-family', 'monospace'); node.setAttribute('font-size', '11'); node.setAttribute('font-weight', '700'); node.setAttribute('paint-order', 'stroke'); node.setAttribute('stroke', '#000'); node.setAttribute('stroke-width', '5'); });
    clone.querySelectorAll('.provenance').forEach((node) => { node.setAttribute('fill', 'rgba(255,255,255,.45)'); node.setAttribute('font-family', 'monospace'); node.setAttribute('font-size', '9'); node.setAttribute('font-weight', '700'); });
    for (const note of document.objects.filter((object) => object.kind === 'note')) {
      const group = clone.querySelector(`[data-object-id="${CSS.escape(note.id)}"]`), editor = group?.querySelector('foreignObject');
      if (!group || !editor) continue;
      editor.remove();
      const text = window.document.createElementNS(namespace, 'text'); text.setAttribute('x', String(note.x + 16)); text.setAttribute('y', String(note.y + 30)); text.setAttribute('fill', '#fff'); text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('font-size', '16');
      if (note.content) {
        let numbered = 0;
        note.content.blocks.forEach((block, blockIndex) => { const line = window.document.createElementNS(namespace, 'tspan'); line.setAttribute('x', String(note.x + 16)); line.setAttribute('dy', blockIndex ? '1.45em' : '0'); if (block.type.startsWith('heading')) { line.setAttribute('font-size', block.type === 'heading1' ? '22' : block.type === 'heading2' ? '19' : '17'); line.setAttribute('font-weight', '700'); } const prefix = block.type === 'bullet' ? '• ' : block.type === 'numbered' ? `${++numbered}. ` : block.type === 'quote' ? '“' : ''; if (prefix) line.append(window.document.createTextNode(prefix)); block.runs.forEach((run) => { const part = window.document.createElementNS(namespace, 'tspan'); part.textContent = run.text; if (run.bold) part.setAttribute('font-weight', '700'); if (run.italic) part.setAttribute('font-style', 'italic'); if (run.underline || run.link) part.setAttribute('text-decoration', 'underline'); if (run.code) part.setAttribute('font-family', 'monospace'); if (run.link) part.setAttribute('fill', '#7bb7ff'); line.append(part); }); if (block.type === 'quote') line.append(window.document.createTextNode('”')); text.append(line); });
      } else for (const [lineNumber, line] of wrappedLines(note.text, (value) => value.length <= Math.max(12, Math.floor((note.width - 32) / 8))).entries()) { const span = window.document.createElementNS(namespace, 'tspan'); span.setAttribute('x', String(note.x + 16)); span.setAttribute('dy', lineNumber ? '1.35em' : '0'); span.textContent = line || '\u00a0'; text.append(span); }
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
    for (const object of renderObjects) {
      if (object.kind === 'stroke') { context.strokeStyle = object.color; context.lineWidth = object.width; context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath(); object.points.forEach((value, index) => index ? context.lineTo(value.x, value.y) : context.moveTo(value.x, value.y)); context.stroke(); }
      else if (object.kind === 'rectangle') { context.strokeStyle = object.color; context.lineWidth = 2; context.strokeRect(object.from.x, object.from.y, object.to.x - object.from.x, object.to.y - object.from.y); }
      else if (object.kind === 'ellipse') { context.strokeStyle = object.color; context.lineWidth = 2; context.beginPath(); context.ellipse((object.from.x + object.to.x) / 2, (object.from.y + object.to.y) / 2, Math.abs(object.to.x - object.from.x) / 2, Math.abs(object.to.y - object.from.y) / 2, 0, 0, Math.PI * 2); context.stroke(); }
      else if (object.kind === 'arrow') arrow(object.from, object.to, object.color);
      else if (object.kind === 'connector') { const from = objectIndex.get(object.fromId), to = objectIndex.get(object.toId); if (from && to) { const a = resolveObjectCenter(from), b = resolveObjectCenter(to), label = connectorLabels.get(object.id); arrow(a, b, '#fcaa2d'); if (object.label && label) { context.save(); context.font = '700 11px monospace'; context.textAlign = 'center'; context.lineWidth = 5; context.strokeStyle = '#000'; context.strokeText(object.label, label.x, label.y); context.fillStyle = '#fcaa2d'; context.fillText(object.label, label.x, label.y); context.textAlign = 'start'; context.restore(); } } }
      else if (object.kind === 'note') { context.fillStyle = '#111'; context.strokeStyle = 'rgba(255,255,255,.18)'; context.fillRect(object.x, object.y, object.width, object.height); context.strokeRect(object.x, object.y, object.width, object.height); paintNoteContent(context, object); if (object.sourceIds?.length) { context.fillStyle = 'rgba(255,255,255,.45)'; context.font = '700 9px monospace'; context.fillText(`CONVERTED · ${object.sourceIds.length} SOURCE`, object.x + 16, object.y + object.height - 10); } }
      else if (object.kind === 'group') { context.strokeStyle = '#fcaa2d'; context.setLineDash([8, 6]); context.strokeRect(object.x, object.y, object.width, object.height); context.setLineDash([]); context.fillStyle = '#fcaa2d'; context.font = '700 11px monospace'; context.fillText(object.label.toUpperCase(), object.x + 12, object.y + 24); }
    }
    context.restore(); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')); if (!blob) throw new Error('PNG export failed'); download(blob, 'image/png', 'png'); status = 'PNG exported';
  }
  async function importJson(event: Event) { const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file || nativeRole === 'companion') return; try { const next = parse(await file.text()); const committed = await commitHostReplacement(() => next, (value) => value, (value) => history = commit(history, value), 'import'); try { const managed = localStorage.getItem(`draw-share:${committed.id}`); share = managed ? JSON.parse(managed) : null; } catch { share = null; } selectedIds = []; queueSave(committed); status = 'Canvas imported'; } catch (error) { status = error instanceof Error ? error.message : 'Import failed'; } finally { if (fileInput) fileInput.value = ''; } }
  async function resetCanvas() { if (nativeRole === 'companion') { if (!companionResetArmed) { companionResetArmed = true; clearTimeout(companionResetTimer); companionResetTimer = setTimeout(() => companionResetArmed = false, 5000); status = 'Tap Confirm reset to clear the Mac canvas'; return; } companionResetArmed = false; clearTimeout(companionResetTimer); const current = document; const next = { ...document, title: 'Untitled mapping session', objects: [], viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: new Date().toISOString() }; history = commit(history, next); selectedIds = []; const operations: CanvasOperation[] = [{ type: 'replace_objects', objects: [] }]; if (current.title !== next.title) operations.push({ type: 'set_title', title: next.title }); if (JSON.stringify(current.viewport) !== JSON.stringify(next.viewport)) operations.push({ type: 'set_viewport', viewport: next.viewport }); sendNative(operations, true); status = 'Clear requested from iPhone'; return; } if (!confirm(nativeRole === 'host' ? 'Reset the Mac-authoritative canvas? Export first if you need a copy.' : 'Reset this local canvas? Export first if you need a copy.')) return; clearTimeout(saveTimer); saveTimer = undefined; status = 'Resetting canvas…'; if (nativeRole === 'web') await clearDocument(); try { await commitHostReplacement(() => createDocument(), (value) => value, (value) => history = { past: [], present: value, future: [] }, 'reset'); share = null; selectedIds = []; status = nativeRole === 'host' ? 'New Mac session document' : 'New local session'; } catch (error) { status = error instanceof Error ? error.message : 'Reset conflicted with an iPhone change'; } }
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
    <div class="identity"><img src="/brand/create-something-agency-white.svg" alt="CREATE SOMETHING .agency" /><span>Draw · Mapping canvas</span><a class="source-link" href="/download" target="_blank" rel="noreferrer">Mac</a><a class="source-link" href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/mapping-canvas" target="_blank" rel="noreferrer">Source</a>{#if nativeRole !== 'web'}<button class="native-link" aria-label="Open device pairing" onclick={openPairing}>{nativeRole === 'host' ? 'Pair' : nativeSession.sessionId ? 'Linked' : 'Link'}</button>{/if}</div>
    <input class="title" aria-label="Canvas title" maxlength="240" value={document.title} oninput={(event) => updateTitle(event.currentTarget)} />
    {#if nativeRole !== 'companion'}<div class="file-actions"><button onclick={() => fileInput?.click()}>Import</button><button onclick={exportJson}>JSON</button><button onclick={exportSvg}>SVG</button><button onclick={exportPng}>PNG</button>{#if share}<button onclick={copyShareLink}>Copy link</button><button onclick={updateSnapshot} disabled={sharing}>Update link</button><button onclick={revokeSnapshot} disabled={sharing}>Revoke</button>{:else}<button class="share-action" onclick={publishSnapshot} disabled={sharing}>Publish view-only</button>{/if}<button onclick={resetCanvas}>Reset</button><input bind:this={fileInput} class="visually-hidden" type="file" accept="application/json,.json" onchange={importJson} /></div>{/if}
  </header>
  <section class="workbench" class:tool-sidebar-collapsed={sidebarCollapsed} aria-label="Mapping canvas workbench">
    <nav class="toolbar" aria-label="Canvas tools"><button class="sidebar-toggle" aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? 'Expand tool sidebar' : 'Collapse tool sidebar'} title={sidebarCollapsed ? 'Expand tools' : 'Collapse tools'} onclick={toggleSidebar}><i aria-hidden="true">{sidebarCollapsed ? '›' : '‹'}</i><span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span></button>{#each tools as entry}<button class:active={tool === entry.id} aria-pressed={tool === entry.id} aria-label={`${entry.label} tool (${entry.key})`} title={`${entry.label} · ${entry.key}`} onclick={() => tool = entry.id}><kbd class="tool-key">{entry.key}</kbd><span class="tool-label">{entry.label}</span></button>{/each}</nav>
    <div class="canvas-frame">
      <svg bind:this={surface} class:crosshair={tool !== 'select' && tool !== 'pan'} role="group" aria-label="Canvas objects" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} onpointerdowncapture={trackTouchPointer} onpointerdown={pointerDown} onpointermove={pointerMove} onpointerup={pointerUp} onpointercancel={pointerUp} onwheel={wheel}>
        <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0L0 0 0 32" fill="none" stroke="rgba(255,255,255,.055)" /></pattern><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="context-stroke" /></marker><filter id="selected"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fcaa2d" flood-opacity=".6" /></filter></defs>
        <rect width="100%" height="100%" fill="#000" /><rect width="100%" height="100%" fill="url(#grid)" />
        <g bind:this={canvasContent} class:agent-camera={agentCameraActive} data-agent-camera={agentCameraActive ? 'following' : 'idle'} transform={transform}>
          {#each renderObjects as object (object.id)}
            {@const selected = selectedIdSet.has(object.id)}
            {#if object.kind === 'stroke'}<path data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label="Ink stroke" d={path(object.points)} fill="none" stroke={object.color} stroke-width={object.width} stroke-linecap="round" stroke-linejoin="round" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'rectangle'}<rect data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label="Rectangle" x={Math.min(object.from.x, object.to.x)} y={Math.min(object.from.y, object.to.y)} width={Math.abs(object.to.x - object.from.x)} height={Math.abs(object.to.y - object.from.y)} fill="transparent" stroke={object.color} stroke-width="2" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'ellipse'}<ellipse data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label="Ellipse" cx={(object.from.x + object.to.x) / 2} cy={(object.from.y + object.to.y) / 2} rx={Math.abs(object.to.x - object.from.x) / 2} ry={Math.abs(object.to.y - object.from.y) / 2} fill="transparent" stroke={object.color} stroke-width="2" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'arrow'}<line data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label="Arrow" x1={object.from.x} y1={object.from.y} x2={object.to.x} y2={object.to.y} stroke={object.color} stroke-width="2" marker-end="url(#arrowhead)" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />
            {:else if object.kind === 'note'}<g data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label={`Note: ${object.text}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="#111" stroke={selected ? '#fcaa2d' : 'rgba(255,255,255,.18)'} /><foreignObject x={object.x + 16} y={object.y + 14} width={object.width - 32} height={object.height - 28}>{#if object.content}<RichNote content={object.content} />{:else}<textarea xmlns="http://www.w3.org/1999/xhtml" aria-label="Edit note" value={object.text} disabled={nativeRole === 'companion' && (!nativeSession.sessionId || nativeSession.requiresRepair)} onpointerdown={(event) => event.stopPropagation()} oninput={(event) => { if (!companionCanEdit()) return; if (nativeRole !== 'web' && !noteInput.hasPending()) nativeOptimisticVersion += 1; noteInput.schedule(object.id, event.currentTarget.value); }} onblur={() => noteInput.flush(object.id)}></textarea>{/if}</foreignObject>{#if object.sourceIds?.length}<text x={object.x + 16} y={object.y + object.height - 10} class="provenance">CONVERTED · {object.sourceIds.length} SOURCE</text>{/if}</g>
            {:else if object.kind === 'group'}<g data-object-id={object.id} class:selected class:agent-change={agentAffectedIdSet.has(object.id)} role="button" tabindex="0" aria-label={`Group: ${object.label}`} onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)}><rect x={object.x} y={object.y} width={object.width} height={object.height} rx="4" fill="rgba(252,170,45,.025)" stroke={selected ? '#fcaa2d' : 'rgba(252,170,45,.5)'} stroke-dasharray="8 6" /><text x={object.x + 12} y={object.y + 24} class="group-label">{object.label}</text>{#if selected && tool === 'select'}<rect data-ui="true" class="resize-handle" role="button" tabindex="0" aria-label="Resize group" x={object.x + object.width - 9} y={object.y + object.height - 9} width="18" height="18" rx="2" onpointerdown={(event) => resizePointer(event, object.id)} onkeydown={(event) => resizeKeyboard(event, object.id)} />{/if}</g>
            {:else if object.kind === 'connector'}{@const from = objectIndex.get(object.fromId)}{@const to = objectIndex.get(object.toId)}{#if from && to}{@const a = resolveObjectCenter(from)}{@const b = resolveObjectCenter(to)}{@const label = connectorLabels.get(object.id)}<g class:agent-change={agentAffectedIdSet.has(object.id)}><line data-object-id={object.id} class:selected role="button" tabindex="0" aria-label="Connector" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fcaa2d" stroke-width="2" marker-end="url(#arrowhead)" onpointerdown={(event) => selectPointer(event, object.id)} onkeydown={(event) => selectKeyboard(event, object.id)} />{#if object.label && label}<text class="connector-label" x={label.x} y={label.y} text-anchor="middle">{object.label}</text>{/if}</g>{/if}{/if}
          {/each}
          {#if draftPoints.length > 1}<path data-ui="true" d={path(draftPoints)} fill="none" stroke={drawingColor} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />{/if}
          {#if draftShape}{#if draftShape.kind === 'rectangle'}<rect data-ui="true" x={Math.min(draftShape.from.x, draftShape.to.x)} y={Math.min(draftShape.from.y, draftShape.to.y)} width={Math.abs(draftShape.to.x - draftShape.from.x)} height={Math.abs(draftShape.to.y - draftShape.from.y)} fill="transparent" stroke={draftShape.color} />{:else if draftShape.kind === 'ellipse'}<ellipse data-ui="true" cx={(draftShape.from.x + draftShape.to.x) / 2} cy={(draftShape.from.y + draftShape.to.y) / 2} rx={Math.abs(draftShape.to.x - draftShape.from.x) / 2} ry={Math.abs(draftShape.to.y - draftShape.from.y) / 2} fill="transparent" stroke={draftShape.color} />{:else}<line data-ui="true" x1={draftShape.from.x} y1={draftShape.from.y} x2={draftShape.to.x} y2={draftShape.to.y} stroke={draftShape.color} marker-end="url(#arrowhead)" />{/if}{/if}
          {#if lasso}<rect data-ui="true" x={Math.min(lasso.from.x, lasso.to.x)} y={Math.min(lasso.from.y, lasso.to.y)} width={Math.abs(lasso.to.x - lasso.from.x)} height={Math.abs(lasso.to.y - lasso.from.y)} fill="rgba(252,170,45,.08)" stroke="#fcaa2d" stroke-dasharray="5 5" />{/if}
        </g>
      </svg>
      <div class="history"><button onclick={() => void doUndo()} disabled={!history.past.length}>Undo</button><button onclick={() => void doRedo()} disabled={!history.future.length}>Redo</button><span>{Math.round(viewport.zoom * 100)}%</span>{#if nativeRole === 'companion'}<button class:reset-confirm={companionResetArmed} aria-label={companionResetArmed ? 'Confirm reset' : 'Reset'} onclick={resetCanvas}>{companionResetArmed ? 'Confirm' : 'Reset'}</button>{/if}<button onclick={() => updateViewport({ x: 0, y: 0, zoom: 1 })}>Reset view</button></div>
      {#if paletteVisible}<div class="palette" role="group" aria-label="Mark color" data-ui="true"><span>Mark color</span><div>{#each DRAWING_PALETTE as color}<button class:active={drawingColor === color.value} aria-pressed={drawingColor === color.value} aria-label={`${color.label} color`} data-testid={`color-${color.id}`} style={`--swatch:var(${color.token},${color.value})`} onclick={() => chooseColor(color.value, color.label)}><i aria-hidden="true"></i><small>{color.label}</small></button>{/each}</div></div>{/if}
      {#if selectedIds.length}<div class="selection" data-ui="true"><span>{selectedIds.length} selected</span>{#if selectedObjects.length === 1 && selectedObjects[0].kind === 'note'}<div class="note-format" role="toolbar" aria-label="Note formatting"><button onclick={() => formatSelectedNote('heading1')}>H1</button><button onclick={() => formatSelectedNote('paragraph','bold')}>Bold</button><button onclick={() => formatSelectedNote('paragraph','italic')}>Italic</button><button onclick={() => formatSelectedNote('bullet')}>Bullet</button><button onclick={() => formatSelectedNote('quote')}>Quote</button><button onclick={() => formatSelectedNote('paragraph','code')}>Code</button><button onclick={() => formatSelectedNote('paragraph','link')}>Link</button><button onclick={clearSelectedNoteFormatting}>Plain</button></div>{/if}<button class="convert" data-testid="convert-menu" onclick={() => conversionOpen = !conversionOpen}>Convert to…</button>{#if selectedObjects.length === 1 && selectedObjects[0].sourceSnapshot}<button data-testid="restore-source" onclick={restoreSelected}>Restore source</button>{/if}{#if conversionOpen}<div class="conversion-menu"><button data-testid="convert-note" onclick={() => runConversion('note')}>Note<small>Retain as editable text</small></button><button data-testid="convert-connector" onclick={() => runConversion('connector')} disabled={selectedIds.length < 2}>Connector<small>Relate two selected objects</small></button><button data-testid="convert-group" onclick={() => runConversion('group')}>Group<small>Name a working boundary</small></button></div>{/if}</div>{/if}
      {#if agentTransition}<output class="agent-transition" aria-live="polite"><i aria-hidden="true"></i><span>Agent {agentTransition.kind}</span><small>{agentTransition.affectedIds.length ? `${agentTransition.affectedIds.length} artifact${agentTransition.affectedIds.length === 1 ? '' : 's'}` : 'canvas'}</small></output>{/if}
      {#if pairingOpen}<section class="pairing-panel" data-ui="true" aria-label="Device pairing"><header><strong>{nativeRole === 'host' ? 'Pair iPhone' : 'Connect to Mac'}</strong><button aria-label="Close pairing" onclick={() => pairingOpen = false}>×</button></header>{#if pairingBusy}<p>Looking for the secure session…</p>{:else if nativeRole === 'host'}<p>Enter this one-time code on the iPhone. Both devices must be on the same local network.</p><output class="pairing-code">{pairingOffer?.code || '—'}</output><small>Mac fingerprint {nativeSession.transport?.certificateFingerprint?.slice(0, 16) || 'unavailable'} · expires {pairingOffer ? new Date(pairingOffer.expiresAt).toLocaleTimeString() : 'soon'}</small>{#if nativeSession.pairedClients?.length}<div class="paired-list">{#each nativeSession.pairedClients as client}<span>{client.clientId}<button disabled={Boolean(client.revokedAt)} onclick={async () => { await revokeCompanion(client.clientId); nativeSession = await hostStatus(); }}>Revoke</button></span>{/each}</div>{/if}{:else if nativeSession.sessionId}<p>{nativeSession.requiresRepair ? 'This Mac rejected the pairing credentials. Export if needed, then forget and re-pair.' : 'Securely linked to the Mac session.'}</p><small>{nativeSession.certificateFingerprint?.slice(0, 16)} · revision {nativeSession.revision} · {nativeSession.queueDepth || 0} queued</small><button disabled={nativeSession.requiresRepair} onclick={async () => { const result = await setCompanionOnline(nativeSession.online === false); nativeSession = { ...nativeSession, ...result }; if (result.document) history = { past: [], present: result.document, future: [] }; }}> {nativeSession.online === false ? 'Reconnect' : 'Test offline'} </button><button onclick={async () => { nativeSession = await forgetCompanion(); discoveredHosts = []; selectedHost = null; pairingCode = ''; status = 'Pairing removed · choose Link to pair again'; pairingOpen = false; }}>Forget and re-pair</button>{:else}<p>{discoveredHosts.length ? 'Confirm the Mac fingerprint, then enter its six-digit code.' : 'No Mac session found. Open Draw on Mac and choose Pair.'}</p>{#if selectedHost}<label>Mac session<select bind:value={selectedHost}>{#each discoveredHosts as host}<option value={host}>{host.endpoint}</option>{/each}</select></label><small>Fingerprint {selectedHost.certificateFingerprint.slice(0, 16)}</small><label>Pairing code<input inputmode="numeric" maxlength="6" bind:value={pairingCode} placeholder="000000" /></label><button class="convert" disabled={!/^\d{6}$/.test(pairingCode)} onclick={confirmCompanionPairing}>Pair securely</button>{/if}{/if}</section>{/if}
    </div>
  </section>
  <footer class="statusbar"><span><i aria-hidden="true"></i>{status}</span><span>{nativeRole === 'host' ? 'MAC AUTHORITY' : nativeRole === 'companion' ? 'IPHONE COMPANION' : 'LOCAL DRAFT'} · CONVERSION IS OPERATOR-APPROVED</span></footer>
</main>
