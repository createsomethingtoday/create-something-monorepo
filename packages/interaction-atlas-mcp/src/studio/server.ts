import http from 'node:http';
import { createHash } from 'node:crypto';
import { createReadStream, watch, type FSWatcher } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

import {
  compileTranscriptSrt,
  createTranscriptEditorProject,
  findTranscriptCleanupCandidates,
  type ApplyTranscriptEditInput,
  type DecideTranscriptEditInput,
  type ProposeTranscriptEditInput,
  type TranscriptSegment
} from '@create-something/atlas-composition';

import { getAtlasStudioPalette } from './atlas.js';
import { renderStudioHtml } from './html.js';
import { inspectLocalVideoSource } from './media-intake.js';
import { createAcceptedOverlayPreviewPlan } from './media-overlay-preview.js';
import { renderAcceptedTranscript } from './media-render.js';
import { createCodexAppServerStdioRpc } from './codex-app-server-rpc.js';
import {
  dispatchManagedCodexProposal,
  type CodexAppServerEventRpc
} from './codex-app-server-proposal.js';
import {
  prepareManagedCodexProposal,
  type ManagedCodexProposalPreparation,
  type PrepareManagedCodexProposalInput
} from './managed-codex-proposal.js';
import {
  healSessionProductionBindings,
  type AtlasProductionBindingProfile
} from './production-bindings.js';
import {
  createWritebackProposal,
  exportWritebackProposalHandoffForSession,
  reviewWritebackProposalAction
} from './writeback-proposals.js';
import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  createSession,
  exportClientHandoffMarkdown,
  exportSessionMarkdown,
  getSessionPath,
  listSessions,
  readSession,
  readTranscriptEditorProject,
  removeNode,
  updateNode,
  updateEdge,
  updateNodes,
  writeTranscriptEditorProject
} from './store.js';
import {
  createAtlasMediaProject,
  getAtlasMediaProjectPath,
  initializeAtlasMediaProject,
  parseTimestampedTranscript,
  readAtlasMediaProject,
  writeAtlasMediaProject
} from './media-project.js';
import { inspectAtlasLocalSourceAsset, renderAndPersistAtlasMediaProject } from './media-render.js';
import {
  createCodexTranscriptProposalRunner,
  getCodexManagedAccountStatus,
  type CodexTranscriptProposalRunner
} from './codex-transcript-proposal.js';
import {
  applyApprovedTranscriptEdit,
  decideTranscriptEdit,
  exportEditedTranscriptSrt,
  proposeTranscriptEdit
} from '@create-something/atlas-composition';
import {
  activateStoryApiStep,
  addStoryApiQuestion,
  advanceStoryApiStep,
  clearStory,
  focusStory,
  getStory,
  type AtlasStoryApiSource,
  storySessionPayload
} from './story-api.js';
import { tidyNodeUpdates } from './client/layout.js';
import { readSharedCanvasState, updateSharedCanvasState } from './canvas-state.js';
import { buildAtlasDatabaseHealth } from './database-health.js';
import { inspectAtlasGovernedInteraction } from './governed-interaction.js';
import type { AtlasWritebackActionStatus } from './types.js';

export type StudioServerOptions = {
  host: string;
  port: number;
  sessionId?: string;
  cwd?: string;
  governedInteractionPath?: string;
  codexAppServerRpcFactory?: () => CodexAppServerEventRpc;
  codexTranscriptProposalRunner?: CodexTranscriptProposalRunner;
};

type SessionEventStream = {
  clients: Set<http.ServerResponse>;
  lastUpdatedAt: string;
  pending: NodeJS.Timeout | null;
  watcher: FSWatcher | null;
};

type CachedAsset = {
  body: Buffer;
  contentType: string;
  gzipBody: Buffer;
};

const gzipAsync = promisify(gzip);
const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const;

type LocalTranscriptProjectIntake = {
  assetId: string;
  filePath: string;
  projectId: string;
  transcriptSegments: Array<Omit<TranscriptSegment, 'assetId'>>;
};

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '::1' || normalized.startsWith('127.');
}

async function readJson<T = Record<string, unknown>>(request: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function storyApiSource(request: http.IncomingMessage): AtlasStoryApiSource {
  return request.headers['x-atlas-story-source'] === 'tauri' ? 'tauri' : 'http';
}

function sendText(
  response: http.ServerResponse,
  status: number,
  text: string,
  contentType = 'text/plain',
  headers: Record<string, string> = {}
): void {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    ...headers,
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'no-store'
  });
  response.end(text);
}

async function sendLocalRenderOutput(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  outputPath: string
): Promise<void> {
  const details = await stat(outputPath);
  const range = request.headers.range?.match(/bytes=(\d*)-(\d*)/);
  const start = range?.[1] ? Number(range[1]) : 0;
  const end = range?.[2] ? Number(range[2]) : details.size - 1;
  if (start < 0 || end < start || end >= details.size) {
    response.writeHead(416, { ...SECURITY_HEADERS, 'content-range': `bytes */${details.size}` }).end();
    return;
  }
  const headers: http.OutgoingHttpHeaders = {
    ...SECURITY_HEADERS,
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
    'content-length': end - start + 1,
    'content-type': localMediaContentType(outputPath)
  };
  if (range) headers['content-range'] = `bytes ${start}-${end}/${details.size}`;
  response.writeHead(range ? 206 : 200, headers);
  createReadStream(outputPath, { start, end }).pipe(response);
}

function localMediaContentType(mediaPath: string): string {
  switch (path.extname(mediaPath).toLowerCase()) {
    case '.m4a': return 'audio/mp4';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.mov': return 'video/quicktime';
    case '.webm': return 'video/webm';
    default: return 'video/mp4';
  }
}

function studioClientAssetPath(filename: string): string {
  const studioDistDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(studioDistDir, 'client', filename);
}

async function getStudioAssetVersion(): Promise<string> {
  const assets = await Promise.all(
    ['app.js', 'app.css'].map(async (filename) => {
      const info = await stat(studioClientAssetPath(filename));
      return `${filename}:${info.size}:${Math.trunc(info.mtimeMs)}`;
    })
  );
  return Buffer.from(assets.join('|')).toString('base64url').slice(0, 16);
}

async function sendAsset(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  cache: Map<string, CachedAsset>,
  filename: string,
  contentType: string
): Promise<void> {
  let asset = cache.get(filename);
  if (!asset) {
    const body = await readFile(studioClientAssetPath(filename));
    asset = {
      body,
      contentType,
      gzipBody: await gzipAsync(body)
    };
    cache.set(filename, asset);
  }

  const acceptsGzip = /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');
  const body = acceptsGzip ? asset.gzipBody : asset.body;
  const headers: http.OutgoingHttpHeaders = {
    ...SECURITY_HEADERS,
    'cache-control': 'public, max-age=31536000, immutable',
    'content-length': body.byteLength,
    'content-type': asset.contentType,
    vary: 'accept-encoding'
  };
  if (acceptsGzip) headers['content-encoding'] = 'gzip';
  response.writeHead(200, headers);
  response.end(body);
}

function badRequest(response: http.ServerResponse, error: unknown): void {
  const diagnostic =
    error && typeof error === 'object'
      ? (error as { code?: unknown; path?: unknown })
      : undefined;
  sendJson(response, 400, {
    error: error instanceof Error ? error.message : String(error),
    ...(typeof diagnostic?.code === 'string' ? { code: diagnostic.code } : {}),
    ...(typeof diagnostic?.path === 'string' ? { path: diagnostic.path } : {}),
  });
}

function sendEvent(response: http.ServerResponse, event: string, payload: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function startStudioServer(options: StudioServerOptions): Promise<http.Server> {
  const cwd = options.cwd ?? process.cwd();
  const codexTranscriptProposalRunner = options.codexTranscriptProposalRunner ?? createCodexTranscriptProposalRunner();
  let defaultSessionId = options.sessionId;
  const assetCache = new Map<string, CachedAsset>();
  const assetVersion = await getStudioAssetVersion().catch(() => 'dev');
  const sessionEventStreams = new Map<string, SessionEventStream>();

  const publishSessionIfChanged = async (sessionId: string, stream: SessionEventStream) => {
    try {
      const session = await readSession(sessionId, cwd);
      if (session.updatedAt === stream.lastUpdatedAt) return;
      stream.lastUpdatedAt = session.updatedAt;
      for (const client of stream.clients) sendEvent(client, 'session', session);
    } catch (error) {
      for (const client of stream.clients) {
        sendEvent(client, 'error', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  const publishSessionSnapshot = async (
    sessionId: string,
    stream: SessionEventStream,
    client: http.ServerResponse
  ) => {
    try {
      const session = await readSession(sessionId, cwd);
      if (session.updatedAt !== stream.lastUpdatedAt) {
        stream.lastUpdatedAt = session.updatedAt;
        for (const activeClient of stream.clients) sendEvent(activeClient, 'session', session);
        return;
      }
      sendEvent(client, 'session', session);
    } catch (error) {
      sendEvent(client, 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const scheduleSessionPublish = (sessionId: string, stream: SessionEventStream) => {
    if (stream.pending) return;
    stream.pending = setTimeout(() => {
      stream.pending = null;
      void publishSessionIfChanged(sessionId, stream);
    }, 35);
  };

  const getSessionEventStream = (sessionId: string): SessionEventStream => {
    const existing = sessionEventStreams.get(sessionId);
    if (existing) return existing;

    const stream: SessionEventStream = {
      clients: new Set(),
      lastUpdatedAt: '',
      pending: null,
      watcher: null
    };
    try {
      stream.watcher = watch(getSessionPath(sessionId, cwd), { persistent: false }, () => {
        scheduleSessionPublish(sessionId, stream);
      });
      stream.watcher.on('error', () => {
        scheduleSessionPublish(sessionId, stream);
      });
    } catch {
      stream.watcher = null;
    }

    sessionEventStreams.set(sessionId, stream);
    return stream;
  };

  const releaseSessionEventStream = (sessionId: string, response: http.ServerResponse) => {
    const stream = sessionEventStreams.get(sessionId);
    if (!stream) return;
    stream.clients.delete(response);
    if (stream.clients.size) return;
    if (stream.pending) clearTimeout(stream.pending);
    stream.watcher?.close();
    sessionEventStreams.delete(sessionId);
  };

  if (!defaultSessionId) {
    const sessions = await listSessions(cwd);
    defaultSessionId = sessions[0]?.id;
  }

  if (!defaultSessionId) {
    const session = await createSession(
      { client: 'Local client', workflow: 'Workflow mapping' },
      cwd
    );
    defaultSessionId = session.id;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? `${options.host}:${options.port}`}`
      );
      const method = request.method ?? 'GET';

      if (method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204, {
          ...SECURITY_HEADERS,
          'cache-control': 'public, max-age=86400',
        });
        response.end();
        return;
      }

      if (method === 'GET' && (url.pathname === '/' || url.pathname === '/sessions')) {
        response.writeHead(302, {
          ...SECURITY_HEADERS,
          location: `/sessions/${defaultSessionId}`,
        });
        response.end();
        return;
      }

      if (method === 'GET' && /^\/sessions\/[^/]+$/.test(url.pathname)) {
        sendText(response, 200, renderStudioHtml(assetVersion), 'text/html');
        return;
      }

      if (method === 'GET' && url.pathname === '/studio/assets/app.js') {
        await sendAsset(request, response, assetCache, 'app.js', 'text/javascript; charset=utf-8');
        return;
      }

      if (method === 'GET' && url.pathname === '/studio/assets/app.css') {
        await sendAsset(request, response, assetCache, 'app.css', 'text/css; charset=utf-8');
        return;
      }

      if (method === 'GET' && url.pathname === '/studio/assets/app.js.map') {
        await sendAsset(request, response, assetCache, 'app.js.map', 'application/json; charset=utf-8');
        return;
      }

      if (method === 'GET' && url.pathname === '/studio/assets/app.css.map') {
        await sendAsset(
          request,
          response,
          assetCache,
          'app.css.map',
          'application/json; charset=utf-8'
        );
        return;
      }

      if (method === 'GET' && url.pathname === '/api/palette') {
        sendJson(response, 200, getAtlasStudioPalette());
        return;
      }

      if (method === 'GET' && url.pathname === '/api/governed-interaction') {
        if (!options.governedInteractionPath) {
          sendJson(response, 404, {
            error: 'No governed interaction bundle is configured for this runtime.',
          });
          return;
        }
        const interaction = JSON.parse(
          await readFile(options.governedInteractionPath, 'utf8'),
        ) as unknown;
        sendJson(response, 200, inspectAtlasGovernedInteraction(interaction));
        return;
      }

      if (method === 'GET' && url.pathname === '/api/sessions') {
        sendJson(response, 200, await listSessions(cwd));
        return;
      }

      if (method === 'GET' && url.pathname === '/api/codex-account') {
        sendJson(response, 200, await getCodexManagedAccountStatus());
        return;
      }

      if (method === 'POST' && url.pathname === '/api/sessions') {
        const body = await readJson<{ client?: string; workflow?: string; owner?: string }>(
          request
        );
        sendJson(
          response,
          201,
          await createSession(
            {
              client: body.client?.trim() || 'Local client',
              workflow: body.workflow?.trim() || 'Workflow mapping',
              owner: body.owner
            },
            cwd
          )
        );
        return;
      }

      const clientHandoffMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/client-handoff\.md$/
      );
      if (method === 'GET' && clientHandoffMatch) {
        const session = await readSession(
          decodeURIComponent(clientHandoffMatch[1] ?? ''),
          cwd
        );
        sendText(response, 200, exportClientHandoffMarkdown(session), 'text/markdown');
        return;
      }

      const exportMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/export\.md$/);
      if (method === 'GET' && exportMatch) {
        const session = await readSession(decodeURIComponent(exportMatch[1] ?? ''), cwd);
        sendText(response, 200, exportSessionMarkdown(session), 'text/markdown');
        return;
      }

      const transcriptCaptionsMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/captions\.srt$/
      );
      if (method === 'GET' && transcriptCaptionsMatch) {
        const project = await readTranscriptEditorProject(
          decodeURIComponent(transcriptCaptionsMatch[1] ?? ''),
          cwd
        );
        const captions = compileTranscriptSrt(project);
        sendText(response, 200, captions, 'application/x-subrip', {
          'x-atlas-caption-sha256': createHash('sha256').update(captions).digest('hex')
        });
        return;
      }

      const managedCodexProposalPrepareMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/codex-proposal\/prepare$/
      );
      if (method === 'POST' && managedCodexProposalPrepareMatch) {
        if (!isLoopbackHost(options.host)) {
          sendJson(response, 403, {
            error: 'Managed Codex proposal preparation is available only when Atlas Studio is bound to a loopback host.'
          });
          return;
        }
        const sessionId = decodeURIComponent(managedCodexProposalPrepareMatch[1] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const body = await readJson<PrepareManagedCodexProposalInput>(request);
        sendJson(response, 200, prepareManagedCodexProposal(project, body));
        return;
      }

      const managedCodexProposalDispatchMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/codex-proposal\/dispatch$/
      );
      if (method === 'POST' && managedCodexProposalDispatchMatch) {
        if (!isLoopbackHost(options.host)) {
          sendJson(response, 403, { error: 'Managed Codex proposal dispatch is available only when Atlas Studio is bound to a loopback host.' });
          return;
        }
        const sessionId = decodeURIComponent(managedCodexProposalDispatchMatch[1] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const preparation = await readJson<ManagedCodexProposalPreparation>(request);
        const rpc = options.codexAppServerRpcFactory?.() ?? createCodexAppServerStdioRpc();
        const result = await dispatchManagedCodexProposal(project, preparation, rpc);
        sendJson(response, 200, await writeTranscriptEditorProject(sessionId, result.project, cwd));
        return;
      }

      const transcriptCleanupMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/cleanup-candidates$/
      );
      if (method === 'GET' && transcriptCleanupMatch) {
        const rawMinPauseUs = url.searchParams.get('minPauseUs');
        const minPauseUs = rawMinPauseUs === null ? undefined : Number(rawMinPauseUs);
        if (minPauseUs !== undefined && (!Number.isInteger(minPauseUs) || minPauseUs <= 0)) {
          throw new Error('Cleanup discovery requires a positive integer minPauseUs query parameter.');
        }
        const project = await readTranscriptEditorProject(
          decodeURIComponent(transcriptCleanupMatch[1] ?? ''),
          cwd
        );
        sendJson(
          response,
          200,
          findTranscriptCleanupCandidates(project, {
            fillerTerms: url.searchParams.getAll('fillerTerm'),
            minPauseUs
          })
        );
        return;
      }

      const overlayPreviewPlanMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/overlay-preview-plan$/
      );
      if (method === 'GET' && overlayPreviewPlanMatch) {
        const sessionId = decodeURIComponent(overlayPreviewPlanMatch[1] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        sendJson(response, 200, createAcceptedOverlayPreviewPlan(project));
        return;
      }

      const transcriptProjectMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project$/
      );
      if (method === 'GET' && transcriptProjectMatch) {
        try {
          sendJson(
            response,
            200,
            await readTranscriptEditorProject(decodeURIComponent(transcriptProjectMatch[1] ?? ''), cwd)
          );
        } catch (error) {
          if (error && typeof error === 'object' && (error as { code?: unknown }).code === 'ENOENT') {
            sendJson(response, 404, { error: 'No transcript project exists for this Atlas session.' });
            return;
          }
          throw error;
        }
        return;
      }

      if (method === 'PUT' && transcriptProjectMatch) {
        const sessionId = decodeURIComponent(transcriptProjectMatch[1] ?? '');
        const body = await readJson<Parameters<typeof writeTranscriptEditorProject>[1]>(request);
        sendJson(response, 200, await writeTranscriptEditorProject(sessionId, body, cwd));
        return;
      }

      const transcriptRenderMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/render$/
      );
      if (method === 'POST' && transcriptRenderMatch) {
        if (!isLoopbackHost(options.host)) {
          sendJson(response, 403, { error: 'Local rendering is available only when Atlas Studio is bound to a loopback host.' });
          return;
        }
        const sessionId = decodeURIComponent(transcriptRenderMatch[1] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const body = await readJson<{ fps?: number; outputPath: string }>(request);
        const result = await renderAcceptedTranscript(project, {
          outputPath: body.outputPath,
          fps: body.fps,
          requestedAt: new Date().toISOString()
        });
        await writeTranscriptEditorProject(sessionId, result.project, cwd);
        sendJson(response, 200, result);
        return;
      }

      const transcriptProposalMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/proposals\/([^/]+)$/
      );
      if (method === 'PATCH' && transcriptProposalMatch) {
        const sessionId = decodeURIComponent(transcriptProposalMatch[1] ?? '');
        const proposalId = decodeURIComponent(transcriptProposalMatch[2] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const body = await readJson<DecideTranscriptEditInput>(request);
        const next = decideTranscriptEdit(project, proposalId, body);
        sendJson(response, 200, await writeTranscriptEditorProject(sessionId, next, cwd));
        return;
      }

      const transcriptProposalApplyMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/proposals\/([^/]+)\/apply$/
      );
      if (method === 'POST' && transcriptProposalApplyMatch) {
        const sessionId = decodeURIComponent(transcriptProposalApplyMatch[1] ?? '');
        const proposalId = decodeURIComponent(transcriptProposalApplyMatch[2] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const body = await readJson<Omit<ApplyTranscriptEditInput, 'proposalId'>>(request);
        const next = applyApprovedTranscriptEdit(project, { ...body, proposalId });
        sendJson(response, 200, await writeTranscriptEditorProject(sessionId, next, cwd));
        return;
      }

      const transcriptProposalsMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/proposals$/
      );
      if (method === 'POST' && transcriptProposalsMatch) {
        const sessionId = decodeURIComponent(transcriptProposalsMatch[1] ?? '');
        const project = await readTranscriptEditorProject(sessionId, cwd);
        const body = await readJson<ProposeTranscriptEditInput>(request);
        const next = proposeTranscriptEdit(project, body);
        sendJson(response, 200, await writeTranscriptEditorProject(sessionId, next, cwd));
        return;
      }

      const transcriptIntakeMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/transcript-project\/intake$/
      );
      if (method === 'POST' && transcriptIntakeMatch) {
        if (!isLoopbackHost(options.host)) {
          sendJson(response, 403, {
            error: 'Local media intake is available only when Atlas Studio is bound to a loopback host.'
          });
          return;
        }
        const sessionId = decodeURIComponent(transcriptIntakeMatch[1] ?? '');
        const body = await readJson<LocalTranscriptProjectIntake>(request);
        if (!Array.isArray(body.transcriptSegments)) {
          throw new Error('Local media intake requires timestamped transcript segments.');
        }
        const sourceAsset = await inspectLocalVideoSource({
          id: body.assetId,
          filePath: body.filePath
        });
        const project = createTranscriptEditorProject({
          id: body.projectId,
          atlasSessionId: sessionId,
          sourceAsset,
          transcriptSegments: body.transcriptSegments.map((segment) => ({
            ...segment,
            assetId: sourceAsset.id
          })),
          createdAt: new Date().toISOString()
        });
        sendJson(response, 201, await writeTranscriptEditorProject(sessionId, project, cwd));
        return;
      }

      const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (method === 'GET' && sessionMatch) {
        sendJson(response, 200, await readSession(decodeURIComponent(sessionMatch[1] ?? ''), cwd));
        return;
      }

      const mediaProjectMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project$/);
      const mediaProjectCaptionsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/captions\.srt$/);
      if (method === 'GET' && mediaProjectCaptionsMatch) {
        const project = await readAtlasMediaProject(decodeURIComponent(mediaProjectCaptionsMatch[1] ?? ''), cwd);
        sendText(response, 200, exportEditedTranscriptSrt(project), 'application/x-subrip');
        return;
      }
      if (method === 'GET' && mediaProjectMatch) {
        sendJson(response, 200, await readAtlasMediaProject(decodeURIComponent(mediaProjectMatch[1] ?? ''), cwd));
        return;
      }
      if (method === 'POST' && mediaProjectMatch) {
        const body = await readJson<Parameters<typeof createAtlasMediaProject>[1]>(request);
        sendJson(
          response,
          201,
          await createAtlasMediaProject(decodeURIComponent(mediaProjectMatch[1] ?? ''), body, cwd)
        );
        return;
      }
      if (method === 'PUT' && mediaProjectMatch) {
        const body = await readJson<Parameters<typeof writeAtlasMediaProject>[1]>(request);
        sendJson(
          response,
          200,
          await writeAtlasMediaProject(decodeURIComponent(mediaProjectMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const mediaProjectImportMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/import$/);
      if (method === 'POST' && mediaProjectImportMatch) {
        const body = await readJson<{
          id?: string;
          sourcePath?: string;
          transcript?: string;
          includeTitleOverlay?: boolean;
        }>(request);
        const sourcePath = body.sourcePath?.trim();
        if (!sourcePath) throw new Error('A local source path is required.');
        const transcript = body.transcript?.trim();
        if (!transcript) throw new Error('A timestamped transcript is required.');
        const sessionId = decodeURIComponent(mediaProjectImportMatch[1] ?? '');
        const sourceAsset = await inspectAtlasLocalSourceAsset(sourcePath);
        sendJson(
          response,
          201,
          await initializeAtlasMediaProject(
            sessionId,
            {
              id: body.id?.trim() || `media_${Date.now().toString(36)}`,
              createdAt: new Date().toISOString(),
              sourceAsset,
              transcriptSegments: parseTimestampedTranscript(transcript),
              includeTitleOverlay: Boolean(body.includeTitleOverlay)
            },
            cwd
          )
        );
        return;
      }

      const mediaRenderMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/render$/);
      if (method === 'POST' && mediaRenderMatch) {
        const body = await readJson<{
          requestId?: string;
          requestedAt?: string;
          width?: number;
          height?: number;
          fps?: number;
        }>(request);
        sendJson(
          response,
          201,
          await renderAndPersistAtlasMediaProject(
            decodeURIComponent(mediaRenderMatch[1] ?? ''),
            {
              requestId: body.requestId?.trim() || `render_${Date.now().toString(36)}`,
              requestedAt: body.requestedAt?.trim() || new Date().toISOString(),
              width: body.width,
              height: body.height,
              fps: body.fps
            },
            cwd
          )
        );
        return;
      }

      const mediaSourceOutputMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/source\/([^/]+)$/);
      if (method === 'GET' && mediaSourceOutputMatch) {
        const sessionId = decodeURIComponent(mediaSourceOutputMatch[1] ?? '');
        const sourceAssetId = decodeURIComponent(mediaSourceOutputMatch[2] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        const sourceAsset = project.sourceAssets.find((asset) => asset.id === sourceAssetId);
        if (!sourceAsset?.uri.startsWith('file://')) {
          sendJson(response, 404, { error: 'No local source asset exists for this project.' });
          return;
        }
        await sendLocalRenderOutput(request, response, fileURLToPath(sourceAsset.uri));
        return;
      }

      const mediaRenderOutputMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/renders\/([^/]+)\.mp4$/);
      if (method === 'GET' && mediaRenderOutputMatch) {
        const sessionId = decodeURIComponent(mediaRenderOutputMatch[1] ?? '');
        const receiptId = decodeURIComponent(mediaRenderOutputMatch[2] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        const receipt = project.receipts.find((candidate) => candidate.id === receiptId && candidate.status === 'completed');
        if (!receipt?.request.output.path) {
          sendJson(response, 404, { error: 'No completed local render exists for this receipt.' });
          return;
        }
        const allowedRoot = path.join(path.dirname(getAtlasMediaProjectPath(project.id, cwd)), 'renders');
        const relativeOutput = path.relative(allowedRoot, receipt.request.output.path);
        if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) {
          throw new Error('Render output is outside the private project render directory.');
        }
        await sendLocalRenderOutput(request, response, receipt.request.output.path);
        return;
      }

      const mediaManualProposalMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/manual-transcript-proposals$/);
      if (method === 'POST' && mediaManualProposalMatch) {
        const body = await readJson<{ id?: string; proposedAt?: string; transcriptSegmentIds?: string[] }>(request);
        const selectedIds = new Set(body.transcriptSegmentIds ?? []);
        if (!selectedIds.size) throw new Error('Select at least one complete transcript segment before proposing a removal.');
        const sessionId = decodeURIComponent(mediaManualProposalMatch[1] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
        if (!revision) throw new Error('The local media project has no current revision.');
        const operations = revision.cutList.map((operation) =>
          operation.kind === 'keep' && operation.transcriptSegmentIds.length === 1 && selectedIds.has(operation.transcriptSegmentIds[0])
            ? { ...operation, kind: 'remove' as const, reason: 'Operator selected this transcript clip for removal.' }
            : operation
        );
        const next = proposeTranscriptEdit(project, {
          id: body.id?.trim() || `manual_${Date.now().toString(36)}`,
          baseRevisionId: revision.id,
          proposedBy: 'operator-transcript-selection',
          rationale: 'Operator-selected transcript removal awaiting review.',
          operations
        });
        sendJson(response, 201, await writeAtlasMediaProject(sessionId, next, cwd));
        return;
      }

      const mediaCodexProposalMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/codex-proposals$/);
      if (method === 'POST' && mediaCodexProposalMatch) {
        const body = await readJson<{
          id?: string;
          operatorPrompt?: string;
          requestedAt?: string;
          operatorConfirmedPrivateContent?: boolean;
        }>(request);
        if (body.operatorConfirmedPrivateContent !== true) {
          throw new Error('Operator confirmation is required before private transcript content is sent to managed Codex.');
        }
        const sessionId = decodeURIComponent(mediaCodexProposalMatch[1] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        const proposal = await codexTranscriptProposalRunner.propose(project, {
          id: body.id?.trim() || `codex_${Date.now().toString(36)}`,
          operatorPrompt: body.operatorPrompt?.trim() || '',
          requestedAt: body.requestedAt?.trim() || new Date().toISOString(),
          operatorConfirmedPrivateContent: body.operatorConfirmedPrivateContent === true
        });
        sendJson(response, 201, await writeAtlasMediaProject(
          sessionId,
          proposeTranscriptEdit(project, proposal),
          cwd
        ));
        return;
      }

      const mediaProposalDecisionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/proposals\/([^/]+)$/);
      if (method === 'PATCH' && mediaProposalDecisionMatch) {
        const body = await readJson<{ decision?: 'approved' | 'rejected'; decidedAt?: string; decidedBy?: string; note?: string }>(request);
        if (body.decision !== 'approved' && body.decision !== 'rejected') throw new Error('Expected proposal decision approved or rejected.');
        const sessionId = decodeURIComponent(mediaProposalDecisionMatch[1] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        const decided = decideTranscriptEdit(project, decodeURIComponent(mediaProposalDecisionMatch[2] ?? ''), {
            decision: body.decision,
            decidedAt: body.decidedAt?.trim() || new Date().toISOString(),
            decidedBy: body.decidedBy?.trim() || 'operator',
            note: body.note
          });
        // A rejection is also a durable editorial decision: retain the accepted
        // cut list in a new immutable revision, without applying the proposal.
        const next = body.decision === 'rejected'
          ? {
              ...decided,
              currentRevisionId: `revision-${decided.revisions.length + 1}`,
              revisions: [
                ...decided.revisions,
                {
                  ...decided.revisions.find((revision) => revision.id === decided.currentRevisionId)!,
                  id: `revision-${decided.revisions.length + 1}`,
                  parentRevisionId: decided.currentRevisionId,
                  createdAt: body.decidedAt?.trim() || new Date().toISOString(),
                  createdBy: 'operator' as const
                }
              ]
            }
          : decided;
        sendJson(response, 200, await writeAtlasMediaProject(sessionId, next, cwd));
        return;
      }

      const mediaProposalApplyMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/media-project\/proposals\/([^/]+)\/apply$/);
      if (method === 'POST' && mediaProposalApplyMatch) {
        const body = await readJson<{ revisionId?: string; appliedAt?: string }>(request);
        const sessionId = decodeURIComponent(mediaProposalApplyMatch[1] ?? '');
        const project = await readAtlasMediaProject(sessionId, cwd);
        sendJson(response, 200, await writeAtlasMediaProject(
          sessionId,
          applyApprovedTranscriptEdit(project, {
            proposalId: decodeURIComponent(mediaProposalApplyMatch[2] ?? ''),
            revisionId: body.revisionId?.trim() || `revision_${Date.now().toString(36)}`,
            appliedAt: body.appliedAt?.trim() || new Date().toISOString(),
            appliedBy: 'operator'
          }),
          cwd
        ));
        return;
      }

      const canvasStateMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/canvas-state$/);
      if (method === 'GET' && canvasStateMatch) {
        sendJson(
          response,
          200,
          await readSharedCanvasState(decodeURIComponent(canvasStateMatch[1] ?? ''), cwd)
        );
        return;
      }

      if (method === 'PUT' && canvasStateMatch) {
        const body = await readJson(request);
        sendJson(
          response,
          200,
          await updateSharedCanvasState(decodeURIComponent(canvasStateMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const databaseHealthMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/database-health$/);
      if (method === 'GET' && databaseHealthMatch) {
        sendJson(
          response,
          200,
          buildAtlasDatabaseHealth(await readSession(decodeURIComponent(databaseHealthMatch[1] ?? ''), cwd))
        );
        return;
      }

      const healMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/heal$/);
      if (method === 'POST' && healMatch) {
        const body = await readJson<{ profile?: AtlasProductionBindingProfile }>(request);
        sendJson(
          response,
          200,
          await healSessionProductionBindings(decodeURIComponent(healMatch[1] ?? ''), {
            cwd,
            profile: body.profile ?? 'template-system'
          })
        );
        return;
      }

      const proposalMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/proposals$/);
      if (method === 'POST' && proposalMatch) {
        const body = await readJson<{ profile?: AtlasProductionBindingProfile }>(request);
        sendJson(
          response,
          200,
          await createWritebackProposal(decodeURIComponent(proposalMatch[1] ?? ''), {
            cwd,
            profile: body.profile ?? 'template-system'
          })
        );
        return;
      }

      const proposalHandoffMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/proposals\/([^/]+)\/handoff\.md$/
      );
      if (method === 'GET' && proposalHandoffMatch) {
        const proposalId = decodeURIComponent(proposalHandoffMatch[2] ?? '');
        sendText(
          response,
          200,
          await exportWritebackProposalHandoffForSession(
            decodeURIComponent(proposalHandoffMatch[1] ?? ''),
            {
              cwd,
              proposalId: proposalId === 'latest' ? undefined : proposalId
            }
          ),
          'text/markdown'
        );
        return;
      }

      const proposalActionMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/proposals\/([^/]+)\/actions\/([^/]+)$/
      );
      if (method === 'PATCH' && proposalActionMatch) {
        const body = await readJson<{
          note?: string;
          operator?: boolean;
          status?: AtlasWritebackActionStatus;
        }>(request);
        if (
          !body.status ||
          body.status === 'applied' ||
          !['approved', 'rejected', 'proposed'].includes(body.status)
        ) {
          throw new Error('Expected status approved, rejected, or proposed');
        }
        sendJson(
          response,
          200,
          await reviewWritebackProposalAction(
            decodeURIComponent(proposalActionMatch[1] ?? ''),
            {
              actionId: decodeURIComponent(proposalActionMatch[3] ?? ''),
              actor: body.operator === false ? 'agent' : 'operator',
              note: body.note,
              proposalId: decodeURIComponent(proposalActionMatch[2] ?? ''),
              status: body.status
            },
            cwd
          )
        );
        return;
      }

      const eventsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
      if (method === 'GET' && eventsMatch) {
        const sessionId = decodeURIComponent(eventsMatch[1] ?? '');
        response.writeHead(200, {
          ...SECURITY_HEADERS,
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no'
        });
        response.write(': connected\n\n');

        const stream = getSessionEventStream(sessionId);
        stream.clients.add(response);
        request.on('close', () => {
          releaseSessionEventStream(sessionId, response);
        });
        void publishSessionSnapshot(sessionId, stream, response);
        return;
      }

      const addNodeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/nodes$/);
      if (method === 'POST' && addNodeMatch) {
        const body = await readJson<Parameters<typeof addNode>[1]>(request);
        sendJson(
          response,
          201,
          await addNode(decodeURIComponent(addNodeMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const updateNodeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/nodes\/([^/]+)$/);
      if (method === 'PATCH' && updateNodeMatch) {
        const body = await readJson<Parameters<typeof updateNode>[2]>(request);
        sendJson(
          response,
          200,
          await updateNode(
            decodeURIComponent(updateNodeMatch[1] ?? ''),
            decodeURIComponent(updateNodeMatch[2] ?? ''),
            body,
            cwd
          )
        );
        return;
      }

      if (method === 'DELETE' && updateNodeMatch) {
        sendJson(
          response,
          200,
          await removeNode(
            decodeURIComponent(updateNodeMatch[1] ?? ''),
            decodeURIComponent(updateNodeMatch[2] ?? ''),
            cwd
          )
        );
        return;
      }

      const tidyMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/tidy$/);
      if (method === 'POST' && tidyMatch) {
        const sessionId = decodeURIComponent(tidyMatch[1] ?? '');
        const body = await readJson<{ viewportWidth?: number }>(request);
        const session = await readSession(sessionId, cwd);
        const updates = tidyNodeUpdates(session, { viewportWidth: body.viewportWidth });
        const next = updates.length ? await updateNodes(sessionId, updates, cwd) : session;
        sendJson(response, 200, { session: next, updates });
        return;
      }

      const addEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges$/);
      if (method === 'POST' && addEdgeMatch) {
        const body = await readJson<Parameters<typeof addEdge>[1]>(request);
        sendJson(
          response,
          201,
          await addEdge(decodeURIComponent(addEdgeMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const updateEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges\/([^/]+)$/);
      if (method === 'PATCH' && updateEdgeMatch) {
        const body = await readJson<Parameters<typeof updateEdge>[2]>(request);
        sendJson(
          response,
          200,
          await updateEdge(
            decodeURIComponent(updateEdgeMatch[1] ?? ''),
            decodeURIComponent(updateEdgeMatch[2] ?? ''),
            body,
            cwd
          )
        );
        return;
      }

      const observationMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/observations$/);
      if (method === 'POST' && observationMatch) {
        const body = await readJson<Parameters<typeof addObservation>[1]>(request);
        sendJson(
          response,
          201,
          await addObservation(decodeURIComponent(observationMatch[1] ?? ''), body, cwd)
        );
        return;
      }

      const storyMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story$/);
      if (method === 'GET' && storyMatch) {
        sendJson(
          response,
          200,
          storySessionPayload(
            await getStory(decodeURIComponent(storyMatch[1] ?? ''), storyApiSource(request), cwd)
          )
        );
        return;
      }

      if (method === 'POST' && storyMatch) {
        const body = await readJson(request);
        sendJson(
          response,
          200,
          storySessionPayload(
            await focusStory(decodeURIComponent(storyMatch[1] ?? ''), body, storyApiSource(request), cwd)
          )
        );
        return;
      }

      if (method === 'DELETE' && storyMatch) {
        sendJson(
          response,
          200,
          storySessionPayload(
            await clearStory(decodeURIComponent(storyMatch[1] ?? ''), storyApiSource(request), cwd)
          )
        );
        return;
      }

      const storyStepActivateMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/story\/steps\/([^/]+)\/activate$/
      );
      if (method === 'POST' && storyStepActivateMatch) {
        sendJson(
          response,
          200,
          storySessionPayload(
            await activateStoryApiStep(
              decodeURIComponent(storyStepActivateMatch[1] ?? ''),
              decodeURIComponent(storyStepActivateMatch[2] ?? ''),
              storyApiSource(request),
              cwd
            )
          )
        );
        return;
      }

      const storyDirectionMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/story\/(next|previous)$/
      );
      if (method === 'POST' && storyDirectionMatch) {
        sendJson(
          response,
          200,
          storySessionPayload(
            await advanceStoryApiStep(
              decodeURIComponent(storyDirectionMatch[1] ?? ''),
              storyDirectionMatch[2] === 'previous' ? 'previous' : 'next',
              storyApiSource(request),
              cwd
            )
          )
        );
        return;
      }

      const storyQuestionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story\/questions$/);
      if (method === 'POST' && storyQuestionMatch) {
        const body = await readJson(request);
        sendJson(
          response,
          201,
          storySessionPayload(
            await addStoryApiQuestion(
              decodeURIComponent(storyQuestionMatch[1] ?? ''),
              body,
              storyApiSource(request),
              cwd
            )
          )
        );
        return;
      }

      const acceptMatch = url.pathname.match(
        /^\/api\/sessions\/([^/]+)\/suggestions\/([^/]+)\/accept$/
      );
      if (method === 'POST' && acceptMatch) {
        sendJson(
          response,
          200,
          await acceptSuggestion(
            decodeURIComponent(acceptMatch[1] ?? ''),
            decodeURIComponent(acceptMatch[2] ?? ''),
            cwd
          )
        );
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      badRequest(response, error);
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, options.host, resolve);
  });

  return server;
}
