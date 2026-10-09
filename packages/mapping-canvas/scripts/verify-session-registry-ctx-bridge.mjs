import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

// AUDIT BOUNDARY: --stage/--verify use browser only. --ctx uses CTX only and
// MUST be run in the normal workspace-write sandbox; never escalate that phase.
let ctxCalls = 0;
const phase = process.argv[2];
if (!['--stage', '--ctx', '--verify', '--self-test', '--prepare-combined'].includes(phase)) throw new Error('Select --stage, --ctx, --verify, --self-test, or --prepare-combined. Never escalate --ctx.');
const taskRoot = resolve(import.meta.dirname, '../../../..');
const fixtureRoot = join(taskRoot, 'ctx-draw-bridge-fixture');
const dataRoot = join(fixtureRoot, 'data');
const manifestPath = join(fixtureRoot, 'history-sources.json');
const combinedPath = join(fixtureRoot, 'combined.jsonl');
const base = process.env.CANVAS_URL || 'http://127.0.0.1:5197';
const sources = [
  { sourceId: 'client-a', scope: { clientId: 'synthetic-ctx-a', workspaceId: 'workspace-ctx-a' }, mapId: 'ctx-bridge-map-a', session: { provider: 'claude', sourceId: 'claude-cli-ephemeral-local', providerSessionId: '07886052-f963-4c78-9220-4a4f8d695ec4' } },
  { sourceId: 'client-b', scope: { clientId: 'synthetic-ctx-b', workspaceId: 'workspace-ctx-b' }, mapId: 'ctx-bridge-map-b', session: { provider: 'codex', sourceId: 'codex-cli-ephemeral-local', providerSessionId: '01a10948-04f0-72e1-8232-d902be2fd4e5' } }
];
const config = '[sources]\nautomatic = false\n\n[indexing]\nmode = "manual"\n\n[daemon]\nmode = "source-refresh-only"\n\n[search]\nsemantic = false\n\n[analytics]\nenabled = false\n\n[upgrade]\nauto = "off"\n\n[local_usage]\nenabled = false\n';
async function privateFile(path, value) { await writeFile(path, value, { mode: 0o600 }); await chmod(path, 0o600); }
async function jsonFile(path, max = 512_000) {
  const text = await readFile(path, 'utf8');
  if (Buffer.byteLength(text) > max) throw new Error('Fixture file exceeds bound.');
  return JSON.parse(text);
}
function closed(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('Bridge closed schema mismatch.');
}
function validatePayload(payload, source) {
  closed(payload, ['version', 'text', 'classification', 'scope', 'mapId', 'session', 'historicalRevision']);
  expect(payload.version).toBe('draw.ctx-bridge-projection.v1');
  expect(payload.text).toBe('drawbridgemarker imported synthetic map reference');
  expect(payload.classification).toBe('imported-synthetic-summary-not-native-lineage');
  closed(payload.scope, ['clientId', 'workspaceId']);
  closed(payload.session, ['provider', 'sourceId', 'providerSessionId']);
  expect(payload.scope).toEqual(source.scope);
  expect(payload.mapId).toBe(source.mapId);
  expect(payload.session).toEqual(source.session);
  if (typeof payload.historicalRevision !== 'string' || payload.historicalRevision.length > 240 || !payload.historicalRevision) throw new Error('Invalid historical revision.');
  return payload;
}
function projectionRecords(source, payload) {
  return [
        { record_type: 'manifest', schema_version: 'ctx-history-jsonl-v2' },
        { record_type: 'source', provider_key: 'draw-pilot', source_id: source.sourceId, source_format: 'draw-pilot-synthetic-summary-v1', trust: 'synthetic', fidelity: 'summary_only' },
        { record_type: 'session', source_id: source.sourceId, provider_session_id: `projection-${source.sourceId}-v1`, started_at: '2026-10-04T00:00:00Z', status: 'completed' },
        { record_type: 'event', source_id: source.sourceId, provider_session_id: `projection-${source.sourceId}-v1`, event_id: `draw-projection-${source.sourceId}-event-v1`, event_index: 0, occurred_at: '2026-10-04T00:00:01Z', event_type: 'summary', role: 'assistant', fidelity: 'summary_only', payload, preview: payload.text }
  ];
}
function validateProjection(text, source) {
  if (Buffer.byteLength(text) > 8000) throw new Error('Projection exceeds tiny source bound.');
  const records = text.trim().split('\n').map(line => JSON.parse(line));
  expect(records).toHaveLength(4);
  const payload = validatePayload(records[3].payload, source);
  expect(records).toEqual(projectionRecords(source, payload));
  return payload;
}
function combinedRecords(payloads) {
  return [{ record_type: 'manifest', schema_version: 'ctx-history-jsonl-v2' }, ...sources.flatMap((source, index) => projectionRecords(source, payloads[index]).slice(1))];
}
function validateCombined(text, payloads) {
  if (Buffer.byteLength(text) > 16000) throw new Error('Combined projection exceeds tiny source bound.');
  const records = text.trim().split('\n').map(line => JSON.parse(line));
  expect(records).toEqual(combinedRecords(payloads));
  expect(new Set(records.filter(row => row.record_type === 'source').map(row => row.source_id)).size).toBe(2);
}
async function readProjectionPayloads() {
  return Promise.all(sources.map(async source => validateProjection(await readFile(join(fixtureRoot, `${source.sourceId}.jsonl`), 'utf8'), source)));
}
function validateImport(imported) {
  expect(imported.schema_version).toBe(2); expect(imported.outcome).toBe('success'); expect(imported.failure_scope).toBe('none');
  expect(imported.sources).toHaveLength(1);
  const row = imported.sources[0];
  expect(row.status).toBe('published'); expect(row.failure_scope).toBe('none');
  expect(row.rejected_record_total).toBe(0);
  expect(row.provider).toBe('custom'); expect(row.path).toBe(combinedPath);
  expect(row.rejected_record_total).toBe(0);
  if (typeof row.published_generation !== 'string' || !row.published_generation) throw new Error('No authoritative published generation.');
  expect(imported.totals.current_indexed_sessions).toBe(2);
}
function validateSearch(found, source) {
  expect(found.payload_type).toBe('search_results'); expect(found.results).toHaveLength(1);
  expect(found.freshness.mode).toBe('off'); expect(found.freshness.error == null).toBe(true);
  expect(found.retrieval.requested_mode).toBe('lexical'); expect(found.retrieval.effective_mode).toBe('lexical');
  expect(found.results[0].provider_key).toBe('draw-pilot'); expect(found.results[0].source_id).toBe(source.sourceId);
}
function validateResult(result) {
  closed(result, ['version', 'results']); expect(result.version).toBe('draw.ctx-bridge-result.v1'); expect(result.results).toHaveLength(2);
  for (const [index, row] of result.results.entries()) {
    closed(row, ['sourceId', 'ctxEventId', 'ctxSessionId', 'payload']);
    expect(row.sourceId).toBe(sources[index].sourceId); validatePayload(row.payload, sources[index]);
    for (const id of [row.ctxEventId, row.ctxSessionId]) if (typeof id !== 'string' || !id || id.length > 240) throw new Error('Invalid CTX bridge reference.');
  }
  return result;
}
async function browserPhase(action) {
  const profile = await mkdtemp(join(tmpdir(), 'draw-ctx-bridge-'));
  await chmod(profile, 0o700);
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, { headless: true, ...(process.env.DRAW_CHROMIUM_PATH ? { executablePath: process.env.DRAW_CHROMIUM_PATH } : {}), viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.__tools = {};
      Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool(tool) { window.__tools[tool.name] = tool; } } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const navigate = async mapId => {
      await page.goto(`${base}/?registryPilot=1${mapId ? `&project=${encodeURIComponent(mapId)}` : ''}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(async () => { try { await window.__tools.draw_get_state.execute({}); return true; } catch { return false; } });
      const start = page.getByRole('button', { name: 'Start sketching', exact: true });
      if (await start.isVisible()) await start.click();
    };
    const call = (name, input = {}) => page.evaluate(async ({ name, input }) => window.__tools[name].execute(input), { name, input });
    await navigate();
    await action({ page, call, navigate });
    expect(errors).toEqual([]);
  } finally { await context?.close(); await rm(profile, { recursive: true, force: true }); }
}
class CtxBlocked extends Error { constructor(command, reason) { super(reason); this.command = command; this.reason = reason; } }
async function unmanagedCtxExecutable() {
  const selected = process.env.DRAW_CTX_PATH;
  if (!selected || !isAbsolute(selected)) throw new CtxBlocked('preflight', 'explicit-absolute-DRAW_CTX_PATH-required');
  let executable;
  try { executable = await realpath(selected); } catch { throw new CtxBlocked('preflight', 'selected-executable-unavailable'); }
  for (const marker of new Set([`${selected}.install.json`, `${executable}.install.json`])) {
    try { await lstat(marker); } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw new CtxBlocked('preflight', 'install-marker-status-unavailable');
    }
    throw new CtxBlocked('preflight', 'managed-install-startup-maintenance-requires-separate-review');
  }
  return executable;
}
async function ctx(args) {
  const executable = await unmanagedCtxExecutable();
  ctxCalls += 1;
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('CTX_')));
  Object.assign(env, { CTX_DATA_ROOT: dataRoot, CTX_DAEMON_ENABLED: 'false', CTX_DAEMON_MODE: 'source-refresh-only', CTX_SEARCH_SEMANTIC: 'false', CTX_ANALYTICS_ENABLED: 'false', CTX_UPGRADE_AUTO: 'off', CTX_LOCAL_USAGE_ENABLED: 'false', CTX_QUIET: '1' });
  return new Promise((accept, reject) => {
    const child = spawn(executable, [...args, '--data-root', dataRoot], { cwd: fixtureRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', failed = false;
    const stop = reason => { if (failed) return; failed = true; child.kill('SIGTERM'); reject(new CtxBlocked(args[0], reason)); };
    const timeout = setTimeout(() => stop('finite-command-timeout'), 60_000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 256_000) stop('stdout-bound-exceeded'); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16_000); });
    child.on('error', () => { clearTimeout(timeout); if (!failed) reject(new CtxBlocked(args[0], 'process-unavailable')); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (failed) return;
      if (code !== 0) {
        const reason = /permission|not permitted|access.*denied|socket/i.test(stderr) ? 'sandbox-permission-or-worker-endpoint-denied' : /verification|generation/i.test(stderr) ? 'generation-verification-unavailable' : 'ctx-command-failed';
        reject(new CtxBlocked(args[0], reason));
      } else {
        try { accept(JSON.parse(stdout)); } catch { reject(new CtxBlocked(args[0], 'unsupported-or-invalid-json-output')); }
      }
      stdout = ''; stderr = '';
    });
  });
}
if (phase === '--stage') {
  await mkdir(fixtureRoot, { recursive: true, mode: 0o700 }); await chmod(fixtureRoot, 0o700);
  await mkdir(dataRoot, { recursive: true, mode: 0o700 }); await chmod(dataRoot, 0o700);
  await rm(join(fixtureRoot, 'bridge-result.json'), { force: true });
  await rm(join(fixtureRoot, 'bridge-blocked.json'), { force: true });
  await privateFile(join(dataRoot, 'config.toml'), config);
  await browserPhase(async ({ page, call, navigate }) => {
    await page.evaluate(async sources => {
      const { createDocument } = await import('/src/lib/document.ts');
      const { saveCanvasProject } = await import('/src/lib/project-storage.ts');
      for (const source of sources) {
        const fixed = '2026-10-04T00:00:00.000Z';
        const document = { ...createDocument('Synthetic CTX projection map'), id: source.mapId, createdAt: fixed, updatedAt: fixed, objects: [{ id: 'ctx-rectangle', kind: 'rectangle', createdAt: fixed, from: { x: 50, y: 50 }, to: { x: 100, y: 100 }, color: '#fcaa2d' }] };
        if (!await saveCanvasProject(document, null)) throw new Error('Synthetic fixture creation failed');
      }
    }, sources);
    for (const source of sources) {
      await navigate(source.mapId);
      expect((await call('draw_get_state')).document.id).toBe(source.mapId);
      await call('draw_registry_register', { scope: source.scope, mapId: source.mapId });
      await call('draw_registry_link', { scope: source.scope, mapId: source.mapId, session: source.session, optIn: true });
      const historicalRevision = (await call('draw_inspect')).revision;
      const payload = validatePayload({ version: 'draw.ctx-bridge-projection.v1', text: 'drawbridgemarker imported synthetic map reference', classification: 'imported-synthetic-summary-not-native-lineage', scope: source.scope, mapId: source.mapId, session: source.session, historicalRevision }, source);
      const records = projectionRecords(source, payload);
      await privateFile(join(fixtureRoot, `${source.sourceId}.jsonl`), records.map(record => JSON.stringify(record)).join('\n') + '\n');
      const changed = await call('draw_registry_edit', { scope: source.scope, mapId: source.mapId, session: source.session, operationId: `ctx-stage-${source.sourceId}-newer-canonical`, expectedRevision: historicalRevision, commands: [{ type: 'transform', ids: ['ctx-rectangle'], x: 80, y: 90 }] });
      expect(changed.receipt.status).toBe('committed');
      const current = (await call('draw_inspect')).revision;
      expect(current).not.toBe(historicalRevision);
      await privateFile(join(fixtureRoot, `${source.sourceId}-bundle.json`), JSON.stringify(await call('draw_registry_export_bundle', { scope: source.scope, optIn: true })));
    }
  });
  await privateFile(manifestPath, JSON.stringify({ schema_version: 1, name: 'draw-pilot', display_name: 'Synthetic Draw projections only', version: '1.0.0', history_sources: sources.map(source => ({ id: source.sourceId, provider_key: 'draw-pilot', source_id: source.sourceId, source_format: 'draw-pilot-synthetic-summary-v1', path: `${source.sourceId}.jsonl`, enabled: true, refresh: 'manual' })) }));
  const stagedPayloads = await readProjectionPayloads();
  const stagedCombined = combinedRecords(stagedPayloads).map(record => JSON.stringify(record)).join('\n') + '\n';
  validateCombined(stagedCombined, stagedPayloads);
  await privateFile(combinedPath, stagedCombined);
  console.log(JSON.stringify({ phase: 'staged', fixtureRoot, dataRoot, sources: sources.map(source => `draw-pilot/${source.sourceId}`), ctxCalls: 0, next: 'Run --ctx in normal workspace-write sandbox only. This isolated data root does not prevent CTX startup attempts to maintain global managed skills/man pages; sandbox blocks outside writes.' }));
}
if (phase === '--ctx') {
  // This phase never loads browser surfaces, invokes providers or escalates.
  expect(await readFile(join(dataRoot, 'config.toml'), 'utf8')).toBe(config);
  const payloads = await readProjectionPayloads();
  validateCombined(await readFile(combinedPath, 'utf8'), payloads);
  const results = [];
  await rm(join(fixtureRoot, 'bridge-result.json'), { force: true });
  try {
    const importArgs = ['import', '--input-format', 'ctx-history-jsonl-v2', '--path', combinedPath, '--format', 'json'];
    validateImport(await ctx(importArgs));
    for (const source of sources) {
      const query = ['search', 'drawbridgemarker', '--provider-key', 'draw-pilot', '--source-id', source.sourceId, '--backend', 'lexical', '--refresh', 'off', '--events', '--limit', '2', '--format', 'json'];
      const found = await ctx(query);
      validateSearch(found, source);
      const hit = found.results[0];
      expect(hit.provider_key).toBe('draw-pilot'); expect(hit.source_id).toBe(source.sourceId);
      if (typeof hit.ctx_event_id !== 'string' || hit.ctx_event_id.length > 240) throw new Error('Invalid bounded CTX event reference.');
      const shown = await ctx(['show', 'event', hit.ctx_event_id, '--before', '0', '--after', '0', '--format', 'json']);
      expect(shown.payload_type).toBe('event_window');
      expect(shown.event.ctx_event_id).toBe(hit.ctx_event_id);
      expect(shown.event.ctx_session_id).toBe(hit.ctx_session_id);
      expect(shown.event.content.complete).toBe(true);
      expect(shown.event.content.policy_status).toBe('selected');
      expect(shown.event.provider_key).toBe('draw-pilot'); expect(shown.event.source_id).toBe(source.sourceId);
      const payload = validatePayload(shown.event.structured_content, source);
      results.push({ sourceId: source.sourceId, ctxEventId: hit.ctx_event_id, ctxSessionId: hit.ctx_session_id, payload });
    }
    validateImport(await ctx(importArgs));
    for (const row of results) {
      const final = await ctx(['search', 'drawbridgemarker', '--provider-key', 'draw-pilot', '--source-id', row.sourceId, '--backend', 'lexical', '--refresh', 'off', '--events', '--limit', '2', '--format', 'json']);
      validateSearch(final, sources.find(source => source.sourceId === row.sourceId)); expect(final.results[0].ctx_event_id).toBe(row.ctxEventId);
      expect(final.results[0].ctx_session_id).toBe(row.ctxSessionId);
    }
    await rm(join(fixtureRoot, 'bridge-blocked.json'), { force: true });
    await privateFile(join(fixtureRoot, 'bridge-result.json'), JSON.stringify({ version: 'draw.ctx-bridge-result.v1', results }));
    console.log(JSON.stringify({ phase: 'ctx-passed', ctxCalls, resultPath: join(fixtureRoot, 'bridge-result.json'), sources: results.map(result => result.sourceId), stableEventIds: results.map(result => result.ctxEventId), checks: ['explicit-combined-source-owned-file-import', 'two-source-coexistence', 'lexical-source-scoped-search', 'bounded-show-event', 'closed-payload-validation', 'repeat-import-stable-ids-no-duplicates'], providerTurns: 0 }));
  } catch (error) {
    if (!(error instanceof CtxBlocked)) throw error;
    await privateFile(join(fixtureRoot, 'bridge-blocked.json'), JSON.stringify({ phase: 'ctx-blocked', command: error.command, reason: error.reason }));
    console.log(JSON.stringify({ phase: 'ctx-blocked', ctxCalls, command: error.command, reason: error.reason, stagedFixtureRetained: fixtureRoot, next: 'Do not escalate or bypass. CTX phase requires a separately reviewed normal execution path; --verify is unavailable until bridge-result.json exists.' }));
    process.exitCode = 2;
  }
}
if (phase === '--verify') {
  const result = await jsonFile(join(fixtureRoot, 'bridge-result.json'), 32_000);
  validateResult(result);
  await browserPhase(async ({ page, call, navigate }) => {
    for (const source of sources) expect((await call('draw_registry_import_bundle', { scope: source.scope, bundle: await jsonFile(join(fixtureRoot, `${source.sourceId}-bundle.json`)), optIn: true })).status).toBe('complete');
    for (const [index, row] of result.results.entries()) {
      const source = sources[index], other = sources[1 - index], payload = row.payload;
      await navigate(payload.mapId);
      const [current] = await call('draw_registry_resolve', { scope: payload.scope, session: payload.session });
      expect(current.mapId).toBe(payload.mapId); expect(current.revision).not.toBe(payload.historicalRevision);
      expect(await call('draw_registry_resolve', { scope: other.scope, session: payload.session })).toEqual([]);
      const commands = [{ type: 'transform', ids: ['ctx-rectangle'], x: 180, y: 200 }];
      const request = { scope: payload.scope, mapId: payload.mapId, session: payload.session, operationId: `ctx-bridge-${source.sourceId}-edit`, expectedRevision: current.revision, commands };
      expect((await call('draw_registry_edit', { ...request, operationId: `${request.operationId}-historical`, expectedRevision: payload.historicalRevision })).receipt.status).toBe('failed');
      await expect(call('draw_registry_edit', { ...request, scope: other.scope, operationId: `${request.operationId}-wrong-scope` })).rejects.toThrow();
      const edited = await call('draw_registry_edit', request); expect(edited.receipt.status).toBe('committed'); expect(edited.receipt.session).toEqual(payload.session);
      const duplicate = await call('draw_registry_edit', request); expect(duplicate.duplicate).toBe(true); expect(duplicate.receipt).toEqual(edited.receipt);
      const [fresh] = await call('draw_registry_resolve', { scope: payload.scope, session: payload.session });
      expect(fresh.contentHash).toBe(edited.receipt.contentHash);
      const rectangle = fresh.document.objects.find(object => object.id === 'ctx-rectangle'); expect(rectangle.from).toEqual({ x: 180, y: 200 }); expect(rectangle.to).toEqual({ x: 230, y: 250 });
      expect(await page.evaluate(async document => (await import('/src/lib/session-registry-pilot.ts')).digest(document), fresh.document)).toBe(fresh.contentHash);
    }
  });
  console.log(JSON.stringify({ phase: 'verify-passed', evidence: 'actual-ctx-custom-source-to-draw-synthetic', ctxCalls: 0, providerTurns: 0, nativeTranscriptLineage: false, checks: ['validated-ctx-payload-reference', 'two-client-isolation', 'fresh-canonical-not-indexed-revision', 'historical-revision-rejected', 'guarded-committed-receipt', 'duplicate-once', 'actual-current-geometry-hash'] }));
}

if (phase === '--self-test') {
  const payload = source => ({ version: 'draw.ctx-bridge-projection.v1', text: 'drawbridgemarker imported synthetic map reference', classification: 'imported-synthetic-summary-not-native-lineage', scope: source.scope, mapId: source.mapId, session: source.session, historicalRevision: 'fixture-revision' });
  const valid = { version: 'draw.ctx-bridge-result.v1', results: sources.map(source => ({ sourceId: source.sourceId, ctxEventId: `fixture-event-${source.sourceId}`, ctxSessionId: `fixture-session-${source.sourceId}`, payload: payload(source) })) };
  validateResult(valid);
  const wrongScope = structuredClone(valid); wrongScope.results[0].payload.scope = sources[1].scope;
  expect(() => validateResult(wrongScope)).toThrow();
  expect(() => validateResult({ ...valid, transcript: 'forbidden' })).toThrow();
  const nestedExtra = structuredClone(valid); nestedExtra.results[0].payload.session.transcript = 'forbidden';
  expect(() => validateResult(nestedExtra)).toThrow();
  const wrongMap = structuredClone(valid); wrongMap.results[0].payload.mapId = sources[1].mapId;
  expect(() => validateResult(wrongMap)).toThrow();
  const invalidRevision = structuredClone(valid); invalidRevision.results[0].payload.historicalRevision = '';
  expect(() => validateResult(invalidRevision)).toThrow();
  const invalidReference = structuredClone(valid); invalidReference.results[0].ctxEventId = 'x'.repeat(241);
  expect(() => validateResult(invalidReference)).toThrow();
  const projection = projectionRecords(sources[0], payload(sources[0]));
  validateProjection(projection.map(record => JSON.stringify(record)).join('\n'), sources[0]);
  const tampered = structuredClone(projection); tampered[3].event_id = 'wrong-stable-id';
  expect(() => validateProjection(tampered.map(record => JSON.stringify(record)).join('\n'), sources[0])).toThrow();
  const wrongSource = structuredClone(projection); wrongSource[1].source_id = sources[1].sourceId;
  expect(() => validateProjection(wrongSource.map(record => JSON.stringify(record)).join('\n'), sources[0])).toThrow();
  const extraRecord = [...projection, { record_type: 'event', payload: { text: 'forbidden extra content' } }];
  expect(() => validateProjection(extraRecord.map(record => JSON.stringify(record)).join('\n'), sources[0])).toThrow();
  const payloads = sources.map(payload);
  const combined = combinedRecords(payloads);
  validateCombined(combined.map(record => JSON.stringify(record)).join('\n'), payloads);
  const missingClient = combined.filter(record => record.source_id !== sources[0].sourceId);
  expect(() => validateCombined(missingClient.map(record => JSON.stringify(record)).join('\n'), payloads)).toThrow();
  const duplicateClient = [...combined, ...combined.slice(1, 4)];
  expect(() => validateCombined(duplicateClient.map(record => JSON.stringify(record)).join('\n'), payloads)).toThrow();
  console.log(JSON.stringify({ phase: 'self-test-passed', evidence: 'offline-validation-only-not-ctx-publication', ctxCalls: 0, providerTurns: 0, browserCalls: 0, checks: ['closed-result', 'wrong-scope-rejected', 'unknown-fields-rejected', 'wrong-map-rejected', 'empty-revision-rejected', 'bounded-event-reference', 'staged-stable-id-tamper-rejected', 'staged-wrong-source-rejected', 'extra-record-rejected', 'combined-two-source-membership', 'missing-client-rejected', 'duplicate-client-rejected'] }));
}

if (phase === '--prepare-combined') {
  const payloads = await readProjectionPayloads();
  const text = combinedRecords(payloads).map(record => JSON.stringify(record)).join('\n') + '\n';
  validateCombined(text, payloads);
  await privateFile(combinedPath, text);
  console.log(JSON.stringify({ phase: 'combined-prepared', combinedPath, bytes: Buffer.byteLength(text), ctxCalls: 0, browserCalls: 0, providerTurns: 0, originalProjectionsAndBundles: 'preserved', existingDataRoot: 'preserved', next: 'Run --ctx only in the normal sandbox; no escalation or native provider discovery.' }));
}
