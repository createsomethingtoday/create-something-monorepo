import http from 'node:http';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { getAtlasStudioPalette } from './atlas.js';
import { renderStudioHtml } from './html.js';
import { healSessionProductionBindings } from './production-bindings.js';
import { createWritebackProposal, exportWritebackProposalHandoffForSession, reviewWritebackProposalAction } from './writeback-proposals.js';
import { acceptSuggestion, addEdge, addNode, addObservation, createSession, exportSessionMarkdown, getSessionPath, listSessions, readSession, removeNode, updateNode, updateEdge, updateNodes } from './store.js';
import { activateStoryApiStep, addStoryApiQuestion, advanceStoryApiStep, clearStory, focusStory, getStory, storySessionPayload } from './story-api.js';
import { tidyNodeUpdates } from './client/layout.js';
const gzipAsync = promisify(gzip);
async function readJson(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (!chunks.length)
        return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function sendJson(response, status, payload) {
    response.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
    });
    response.end(JSON.stringify(payload, null, 2));
}
function storyApiSource(request) {
    return request.headers['x-atlas-story-source'] === 'tauri' ? 'tauri' : 'http';
}
function sendText(response, status, text, contentType = 'text/plain') {
    response.writeHead(status, {
        'content-type': `${contentType}; charset=utf-8`,
        'cache-control': 'no-store'
    });
    response.end(text);
}
function studioClientAssetPath(filename) {
    const studioDistDir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(studioDistDir, 'client', filename);
}
async function getStudioAssetVersion() {
    const assets = await Promise.all(['app.js', 'app.css'].map(async (filename) => {
        const info = await stat(studioClientAssetPath(filename));
        return `${filename}:${info.size}:${Math.trunc(info.mtimeMs)}`;
    }));
    return Buffer.from(assets.join('|')).toString('base64url').slice(0, 16);
}
async function sendAsset(request, response, cache, filename, contentType) {
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
    const headers = {
        'cache-control': 'public, max-age=31536000, immutable',
        'content-length': body.byteLength,
        'content-type': asset.contentType,
        vary: 'accept-encoding'
    };
    if (acceptsGzip)
        headers['content-encoding'] = 'gzip';
    response.writeHead(200, headers);
    response.end(body);
}
function badRequest(response, error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
}
function sendEvent(response, event, payload) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
}
export async function startStudioServer(options) {
    const cwd = options.cwd ?? process.cwd();
    let defaultSessionId = options.sessionId;
    const assetCache = new Map();
    const assetVersion = await getStudioAssetVersion().catch(() => 'dev');
    const sessionEventStreams = new Map();
    const publishSessionIfChanged = async (sessionId, stream) => {
        try {
            const session = await readSession(sessionId, cwd);
            if (session.updatedAt === stream.lastUpdatedAt)
                return;
            stream.lastUpdatedAt = session.updatedAt;
            for (const client of stream.clients)
                sendEvent(client, 'session', session);
        }
        catch (error) {
            for (const client of stream.clients) {
                sendEvent(client, 'error', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    };
    const publishSessionSnapshot = async (sessionId, stream, client) => {
        try {
            const session = await readSession(sessionId, cwd);
            if (session.updatedAt !== stream.lastUpdatedAt) {
                stream.lastUpdatedAt = session.updatedAt;
                for (const activeClient of stream.clients)
                    sendEvent(activeClient, 'session', session);
                return;
            }
            sendEvent(client, 'session', session);
        }
        catch (error) {
            sendEvent(client, 'error', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    };
    const scheduleSessionPublish = (sessionId, stream) => {
        if (stream.pending)
            return;
        stream.pending = setTimeout(() => {
            stream.pending = null;
            void publishSessionIfChanged(sessionId, stream);
        }, 35);
    };
    const getSessionEventStream = (sessionId) => {
        const existing = sessionEventStreams.get(sessionId);
        if (existing)
            return existing;
        const stream = {
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
        }
        catch {
            stream.watcher = null;
        }
        sessionEventStreams.set(sessionId, stream);
        return stream;
    };
    const releaseSessionEventStream = (sessionId, response) => {
        const stream = sessionEventStreams.get(sessionId);
        if (!stream)
            return;
        stream.clients.delete(response);
        if (stream.clients.size)
            return;
        if (stream.pending)
            clearTimeout(stream.pending);
        stream.watcher?.close();
        sessionEventStreams.delete(sessionId);
    };
    if (!defaultSessionId) {
        const sessions = await listSessions(cwd);
        defaultSessionId = sessions[0]?.id;
    }
    if (!defaultSessionId) {
        const session = await createSession({ client: 'Local client', workflow: 'Workflow mapping' }, cwd);
        defaultSessionId = session.id;
    }
    const server = http.createServer(async (request, response) => {
        try {
            const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${options.host}:${options.port}`}`);
            const method = request.method ?? 'GET';
            if (method === 'GET' && (url.pathname === '/' || url.pathname === '/sessions')) {
                response.writeHead(302, { location: `/sessions/${defaultSessionId}` });
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
                await sendAsset(request, response, assetCache, 'app.css.map', 'application/json; charset=utf-8');
                return;
            }
            if (method === 'GET' && url.pathname === '/api/palette') {
                sendJson(response, 200, getAtlasStudioPalette());
                return;
            }
            if (method === 'GET' && url.pathname === '/api/sessions') {
                sendJson(response, 200, await listSessions(cwd));
                return;
            }
            if (method === 'POST' && url.pathname === '/api/sessions') {
                const body = await readJson(request);
                sendJson(response, 201, await createSession({
                    client: body.client?.trim() || 'Local client',
                    workflow: body.workflow?.trim() || 'Workflow mapping',
                    owner: body.owner
                }, cwd));
                return;
            }
            const exportMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/export\.md$/);
            if (method === 'GET' && exportMatch) {
                const session = await readSession(decodeURIComponent(exportMatch[1] ?? ''), cwd);
                sendText(response, 200, exportSessionMarkdown(session), 'text/markdown');
                return;
            }
            const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
            if (method === 'GET' && sessionMatch) {
                sendJson(response, 200, await readSession(decodeURIComponent(sessionMatch[1] ?? ''), cwd));
                return;
            }
            const healMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/heal$/);
            if (method === 'POST' && healMatch) {
                const body = await readJson(request);
                sendJson(response, 200, await healSessionProductionBindings(decodeURIComponent(healMatch[1] ?? ''), {
                    cwd,
                    profile: body.profile ?? 'template-system'
                }));
                return;
            }
            const proposalMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/proposals$/);
            if (method === 'POST' && proposalMatch) {
                const body = await readJson(request);
                sendJson(response, 200, await createWritebackProposal(decodeURIComponent(proposalMatch[1] ?? ''), {
                    cwd,
                    profile: body.profile ?? 'template-system'
                }));
                return;
            }
            const proposalHandoffMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/proposals\/([^/]+)\/handoff\.md$/);
            if (method === 'GET' && proposalHandoffMatch) {
                const proposalId = decodeURIComponent(proposalHandoffMatch[2] ?? '');
                sendText(response, 200, await exportWritebackProposalHandoffForSession(decodeURIComponent(proposalHandoffMatch[1] ?? ''), {
                    cwd,
                    proposalId: proposalId === 'latest' ? undefined : proposalId
                }), 'text/markdown');
                return;
            }
            const proposalActionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/proposals\/([^/]+)\/actions\/([^/]+)$/);
            if (method === 'PATCH' && proposalActionMatch) {
                const body = await readJson(request);
                if (!body.status ||
                    body.status === 'applied' ||
                    !['approved', 'rejected', 'proposed'].includes(body.status)) {
                    throw new Error('Expected status approved, rejected, or proposed');
                }
                sendJson(response, 200, await reviewWritebackProposalAction(decodeURIComponent(proposalActionMatch[1] ?? ''), {
                    actionId: decodeURIComponent(proposalActionMatch[3] ?? ''),
                    actor: body.operator === false ? 'agent' : 'operator',
                    note: body.note,
                    proposalId: decodeURIComponent(proposalActionMatch[2] ?? ''),
                    status: body.status
                }, cwd));
                return;
            }
            const eventsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
            if (method === 'GET' && eventsMatch) {
                const sessionId = decodeURIComponent(eventsMatch[1] ?? '');
                response.writeHead(200, {
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
                const body = await readJson(request);
                sendJson(response, 201, await addNode(decodeURIComponent(addNodeMatch[1] ?? ''), body, cwd));
                return;
            }
            const updateNodeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/nodes\/([^/]+)$/);
            if (method === 'PATCH' && updateNodeMatch) {
                const body = await readJson(request);
                sendJson(response, 200, await updateNode(decodeURIComponent(updateNodeMatch[1] ?? ''), decodeURIComponent(updateNodeMatch[2] ?? ''), body, cwd));
                return;
            }
            if (method === 'DELETE' && updateNodeMatch) {
                sendJson(response, 200, await removeNode(decodeURIComponent(updateNodeMatch[1] ?? ''), decodeURIComponent(updateNodeMatch[2] ?? ''), cwd));
                return;
            }
            const tidyMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/tidy$/);
            if (method === 'POST' && tidyMatch) {
                const sessionId = decodeURIComponent(tidyMatch[1] ?? '');
                const body = await readJson(request);
                const session = await readSession(sessionId, cwd);
                const updates = tidyNodeUpdates(session, { viewportWidth: body.viewportWidth });
                const next = updates.length ? await updateNodes(sessionId, updates, cwd) : session;
                sendJson(response, 200, { session: next, updates });
                return;
            }
            const addEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges$/);
            if (method === 'POST' && addEdgeMatch) {
                const body = await readJson(request);
                sendJson(response, 201, await addEdge(decodeURIComponent(addEdgeMatch[1] ?? ''), body, cwd));
                return;
            }
            const updateEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges\/([^/]+)$/);
            if (method === 'PATCH' && updateEdgeMatch) {
                const body = await readJson(request);
                sendJson(response, 200, await updateEdge(decodeURIComponent(updateEdgeMatch[1] ?? ''), decodeURIComponent(updateEdgeMatch[2] ?? ''), body, cwd));
                return;
            }
            const observationMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/observations$/);
            if (method === 'POST' && observationMatch) {
                const body = await readJson(request);
                sendJson(response, 201, await addObservation(decodeURIComponent(observationMatch[1] ?? ''), body, cwd));
                return;
            }
            const storyMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story$/);
            if (method === 'GET' && storyMatch) {
                sendJson(response, 200, storySessionPayload(await getStory(decodeURIComponent(storyMatch[1] ?? ''), storyApiSource(request), cwd)));
                return;
            }
            if (method === 'POST' && storyMatch) {
                const body = await readJson(request);
                sendJson(response, 200, storySessionPayload(await focusStory(decodeURIComponent(storyMatch[1] ?? ''), body, storyApiSource(request), cwd)));
                return;
            }
            if (method === 'DELETE' && storyMatch) {
                sendJson(response, 200, storySessionPayload(await clearStory(decodeURIComponent(storyMatch[1] ?? ''), storyApiSource(request), cwd)));
                return;
            }
            const storyStepActivateMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story\/steps\/([^/]+)\/activate$/);
            if (method === 'POST' && storyStepActivateMatch) {
                sendJson(response, 200, storySessionPayload(await activateStoryApiStep(decodeURIComponent(storyStepActivateMatch[1] ?? ''), decodeURIComponent(storyStepActivateMatch[2] ?? ''), storyApiSource(request), cwd)));
                return;
            }
            const storyDirectionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story\/(next|previous)$/);
            if (method === 'POST' && storyDirectionMatch) {
                sendJson(response, 200, storySessionPayload(await advanceStoryApiStep(decodeURIComponent(storyDirectionMatch[1] ?? ''), storyDirectionMatch[2] === 'previous' ? 'previous' : 'next', storyApiSource(request), cwd)));
                return;
            }
            const storyQuestionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/story\/questions$/);
            if (method === 'POST' && storyQuestionMatch) {
                const body = await readJson(request);
                sendJson(response, 201, storySessionPayload(await addStoryApiQuestion(decodeURIComponent(storyQuestionMatch[1] ?? ''), body, storyApiSource(request), cwd)));
                return;
            }
            const acceptMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/suggestions\/([^/]+)\/accept$/);
            if (method === 'POST' && acceptMatch) {
                sendJson(response, 200, await acceptSuggestion(decodeURIComponent(acceptMatch[1] ?? ''), decodeURIComponent(acceptMatch[2] ?? ''), cwd));
                return;
            }
            sendJson(response, 404, { error: 'Not found' });
        }
        catch (error) {
            badRequest(response, error);
        }
    });
    await new Promise((resolve) => {
        server.listen(options.port, options.host, resolve);
    });
    return server;
}
//# sourceMappingURL=server.js.map