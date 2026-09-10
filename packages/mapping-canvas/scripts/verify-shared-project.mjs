import { chromium } from '@playwright/test';

const baseUrl = process.env.CANVAS_URL ?? 'http://localhost:5173';
const runLabel = process.env.CANVAS_RUN_LABEL ?? 'shared-project-local';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const page = await context.newPage();
const legacyCanvasId = `legacy-canvas-${crypto.randomUUID()}`;
const legacyMotionId = `legacy-motion-${crypto.randomUUID()}`;

await page.addInitScript(() => {
  window.__drawWebMcpTools = {};
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool(tool) {
        window.__drawWebMcpTools[tool.name] = tool;
      }
    }
  });
});

await page.goto(new URL('/icon.svg', baseUrl).href);
await page.evaluate(async ({ canvasId, motionId }) => {
  const open = (name, store, options) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store, options);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const put = async (db, store, value, key) => new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    if (key === undefined) transaction.objectStore(store).put(value);
    else transaction.objectStore(store).put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  const timestamp = new Date().toISOString();
  const canvasDb = await open('create-something-mapping-canvas', 'documents');
  await put(canvasDb, 'documents', {
    version: 'create-something.mapping-canvas.v1',
    id: canvasId,
    title: 'Legacy Canvas verifier',
    createdAt: timestamp,
    updatedAt: timestamp,
    viewport: { x: 0, y: 0, zoom: 1 },
    objects: []
  }, 'active');
  canvasDb.close();
  const motionDb = await open('create-something-draw-animation', 'projects', { keyPath: 'id' });
  await put(motionDb, 'projects', {
    version: 'draw.animation.v1',
    id: motionId,
    revision: 3,
    title: 'Legacy Motion verifier',
    width: 1280,
    height: 720,
    duration: 5,
    fps: 24,
    background: '#eee5d4',
    assets: [],
    drawings: []
  });
  motionDb.close();
}, { canvasId: legacyCanvasId, motionId: legacyMotionId });

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof window.__drawWebMcpTools?.draw_get_state?.execute === 'function');

const canvas = await page.evaluate(async (legacyProjectId) => {
  const tools = window.__drawWebMcpTools;
  const before = await tools.draw_inspect.execute({ limit: 1 });
  const composed = await tools.draw_compose.execute({
    expectedRevision: before.revision,
    placement: 'visible-center',
    layout: { direction: 'row', gap: 96 },
    nodes: [
      { ref: 'approval', text: 'A person approves' },
      { ref: 'release', text: 'Production release' }
    ],
    edges: [{ ref: 'handoff', from: 'approval', to: 'release', label: 'then' }]
  });
  await tools.draw_edit_note.execute({
    id: composed.refs.approval,
    content: {
      blocks: [
        { type: 'heading1', runs: [{ text: 'A person approves', bold: true }] },
        { type: 'bullet', runs: [{ text: 'Work crosses the gate', italic: true }] }
      ]
    }
  });
  const state = await tools.draw_get_state.execute({});
  if (state.document.id !== legacyProjectId) throw new Error('Legacy Canvas was not migrated.');
  return {
    projectId: state.document.id,
    noteId: composed.refs.approval,
    releaseId: composed.refs.release,
    connectorId: composed.refs.handoff
  };
}, legacyCanvasId);

await page.getByRole('link', { name: 'Motion', exact: true }).click();
await page.waitForURL((url) => url.pathname === '/animate' && url.searchParams.get('project') === canvas.projectId);
await page.waitForLoadState('networkidle');
await page.waitForFunction(async (projectId) => {
  try {
    const tools = window.__drawWebMcpTools;
    return typeof tools?.draw_animation_drawing?.execute === 'function' &&
      typeof tools?.draw_animation_apply?.execute === 'function' &&
      (await tools.draw_animation_inspect.execute({}))?.id === projectId;
  } catch {
    return false;
  }
}, canvas.projectId);
if (!await page.locator('select[aria-label="Saved animation project"] option').evaluateAll(
  (options, id) => options.some((option) => option.value === id),
  legacyMotionId
)) throw new Error('Legacy Motion project was not preserved in the shared project list.');

const motion = await page.evaluate(async ({ projectId, noteId, releaseId }) => {
  const tools = window.__drawWebMcpTools;
  const before = await tools.draw_animation_inspect.execute({});
  if (before.id !== projectId) throw new Error('Motion opened a different Draw project.');
  for (const id of [noteId, releaseId]) {
    const summary = before.drawings.find((drawing) => drawing.id === id);
    if (summary?.source?.space !== 'canvas' || summary.source.objectId !== id)
      throw new Error(`Motion lost Canvas identity for ${id}.`);
  }
  const note = await tools.draw_animation_drawing.execute({ id: noteId });
  const pose = { ...note.drawing.poses[0], time: 1, x: note.drawing.poses[0].x + 80 };
  const applied = await tools.draw_animation_apply.execute({
    expectedRevision: before.revision,
    operations: [{ type: 'put_pose', id: noteId, pose }]
  });
  return { revision: applied.revision, poseTime: pose.time };
}, canvas);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(async (projectId) => {
  try {
    return (await window.__drawWebMcpTools?.draw_animation_inspect?.execute({}))?.id === projectId;
  } catch {
    return false;
  }
}, canvas.projectId);

const reloaded = await page.evaluate(async ({ noteId, expectedRevision }) => {
  const tools = window.__drawWebMcpTools;
  const drawing = await tools.draw_animation_drawing.execute({ id: noteId });
  let staleRevisionDenied = false;
  try {
    await tools.draw_animation_apply.execute({
      expectedRevision: expectedRevision - 1,
      operations: [{ type: 'settings', background: '#ffffff' }]
    });
  } catch {
    staleRevisionDenied = true;
  }
  return {
    revision: drawing.revision,
    poseTimes: drawing.drawing.poses.map((pose) => pose.time),
    staleRevisionDenied
  };
}, { noteId: canvas.noteId, expectedRevision: motion.revision });

if (reloaded.revision !== motion.revision || !reloaded.poseTimes.includes(motion.poseTime))
  throw new Error('Motion edit did not survive reload.');
if (!reloaded.staleRevisionDenied) throw new Error('Motion accepted a stale revision.');

await page.getByRole('link', { name: 'Canvas', exact: true }).click();
await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('project') === canvas.projectId);
await page.waitForLoadState('networkidle');
await page.waitForFunction(async (projectId) => {
  try {
    return (await window.__drawWebMcpTools?.draw_get_state?.execute({}))?.document?.id === projectId;
  } catch {
    return false;
  }
}, canvas.projectId);

const returned = await page.evaluate(async ({ noteId, releaseId }) => {
  const state = await window.__drawWebMcpTools.draw_get_state.execute({});
  const ids = state.document.objects.map((object) => object.id);
  return {
    projectId: state.document.id,
    noteText: state.document.objects.find((object) => object.id === noteId)?.text,
    objectIdsRetained: ids.includes(noteId) && ids.includes(releaseId)
  };
}, canvas);

const legacySourcesRetained = await page.evaluate(async ({ canvasId, motionId }) => {
  const get = (database, store, key) => new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(store);
      const query = transaction.objectStore(store).get(key);
      query.onsuccess = () => resolve(Boolean(query.result));
      query.onerror = () => reject(query.error);
      transaction.oncomplete = () => db.close();
    };
    request.onerror = () => reject(request.error);
  });
  return {
    canvas: await get('create-something-mapping-canvas', 'documents', 'active'),
    motion: await get('create-something-draw-animation', 'projects', motionId),
    canvasId
  };
}, { canvasId: legacyCanvasId, motionId: legacyMotionId });

if (!returned.objectIdsRetained || returned.noteText !== 'A person approves\n• Work crosses the gate')
  throw new Error('Canvas did not retain stable IDs and formatted-note projection after Motion.');
if (!legacySourcesRetained.canvas || !legacySourcesRetained.motion)
  throw new Error('Legacy source data was deleted during migration.');

await context.close();
await browser.close();
console.log(JSON.stringify({
  baseUrl,
  runLabel,
  projectId: canvas.projectId,
  legacyCanvasMigrated: canvas.projectId === legacyCanvasId,
  legacyMotionPreserved: true,
  legacySourcesRetained: legacySourcesRetained.canvas && legacySourcesRetained.motion,
  canvasObjectIds: [canvas.noteId, canvas.releaseId, canvas.connectorId],
  motionObjectIds: [canvas.noteId, canvas.releaseId],
  formattedText: returned.noteText,
  motionRevision: motion.revision,
  poseTimes: reloaded.poseTimes,
  staleRevisionDenied: reloaded.staleRevisionDenied,
  result: 'pass'
}, null, 2));
