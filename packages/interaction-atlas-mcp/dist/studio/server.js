import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { getAtlasStudioPalette } from './atlas.js';
import { renderStudioHtml } from './html.js';
import { healSessionProductionBindings } from './production-bindings.js';
import { createWritebackProposal, exportWritebackProposalHandoffForSession, reviewWritebackProposalAction } from './writeback-proposals.js';
import { acceptSuggestion, addEdge, addNode, addObservation, createSession, exportSessionMarkdown, listSessions, readSession, updateNode } from './store.js';
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
function sendText(response, status, text, contentType = 'text/plain') {
    response.writeHead(status, {
        'content-type': `${contentType}; charset=utf-8`,
        'cache-control': 'no-store'
    });
    response.end(text);
}
async function sendAsset(response, filename, contentType) {
    const studioDistDir = path.dirname(fileURLToPath(import.meta.url));
    const assetPath = path.join(studioDistDir, 'client', filename);
    const asset = await readFile(assetPath);
    response.writeHead(200, {
        'content-type': contentType,
        'cache-control': 'no-store'
    });
    response.end(asset);
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
                sendText(response, 200, renderStudioHtml(), 'text/html');
                return;
            }
            if (method === 'GET' && url.pathname === '/studio/assets/app.js') {
                await sendAsset(response, 'app.js', 'text/javascript; charset=utf-8');
                return;
            }
            if (method === 'GET' && url.pathname === '/studio/assets/app.css') {
                await sendAsset(response, 'app.css', 'text/css; charset=utf-8');
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
                let lastUpdatedAt = '';
                let closed = false;
                const publishIfChanged = async () => {
                    if (closed)
                        return;
                    try {
                        const session = await readSession(sessionId, cwd);
                        if (session.updatedAt === lastUpdatedAt)
                            return;
                        lastUpdatedAt = session.updatedAt;
                        sendEvent(response, 'session', session);
                    }
                    catch (error) {
                        sendEvent(response, 'error', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                };
                const timer = setInterval(() => {
                    void publishIfChanged();
                }, 650);
                request.on('close', () => {
                    closed = true;
                    clearInterval(timer);
                });
                void publishIfChanged();
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
            const addEdgeMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/edges$/);
            if (method === 'POST' && addEdgeMatch) {
                const body = await readJson(request);
                sendJson(response, 201, await addEdge(decodeURIComponent(addEdgeMatch[1] ?? ''), body, cwd));
                return;
            }
            const observationMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/observations$/);
            if (method === 'POST' && observationMatch) {
                const body = await readJson(request);
                sendJson(response, 201, await addObservation(decodeURIComponent(observationMatch[1] ?? ''), body, cwd));
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