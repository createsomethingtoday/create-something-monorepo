import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSession, listSessions, readSession } from './store.js';
const HOST = '127.0.0.1';
const DEFAULT_PORT = 5198;
const READY_TIMEOUT_MS = 20_000;
export function getAtlasStudioAppHome() {
    return (process.env.CREATE_SOMETHING_ATLAS_HOME ??
        path.join(os.homedir(), 'Library', 'Application Support', 'CREATE SOMETHING', 'Atlas Studio'));
}
export function getAtlasPortalRuntimePath() {
    return path.join(getAtlasStudioAppHome(), 'runtime.json');
}
function getAtlasPortalLogPath() {
    return path.join(getAtlasStudioAppHome(), 'server.log');
}
function getCliPath() {
    return path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.js');
}
function isProcessAlive(pid) {
    if (!Number.isInteger(pid) || Number(pid) <= 0)
        return false;
    try {
        process.kill(Number(pid), 0);
        return true;
    }
    catch {
        return false;
    }
}
export function readAtlasPortalRuntime() {
    const runtimePath = getAtlasPortalRuntimePath();
    if (!existsSync(runtimePath))
        return undefined;
    try {
        const runtime = JSON.parse(readFileSync(runtimePath, 'utf8'));
        return runtime;
    }
    catch {
        return undefined;
    }
}
function writeAtlasPortalRuntime(runtime) {
    mkdirSync(getAtlasStudioAppHome(), { recursive: true });
    writeFileSync(getAtlasPortalRuntimePath(), `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');
}
async function chooseSession(options) {
    const cwd = options.cwd ?? process.cwd();
    process.env.CREATE_SOMETHING_ATLAS_HOME = getAtlasStudioAppHome();
    if (options.sessionId) {
        return readSession(options.sessionId, cwd);
    }
    if (options.client || options.workflow) {
        return createSession({
            client: options.client?.trim() || 'Local client',
            workflow: options.workflow?.trim() || 'Workflow mapping',
            owner: options.owner?.trim() || undefined
        }, cwd);
    }
    const sessions = await listSessions(cwd);
    if (sessions[0])
        return sessions[0];
    return createSession({ client: 'Local client', workflow: 'Workflow mapping' }, cwd);
}
function portIsFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });
        server.listen(port, HOST);
    });
}
async function choosePort() {
    for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 100; port += 1) {
        if (await portIsFree(port))
            return port;
    }
    throw new Error(`No free Atlas Studio port found from ${DEFAULT_PORT}-${DEFAULT_PORT + 99}`);
}
function waitForPort(port) {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    return new Promise((resolve) => {
        const attempt = () => {
            const socket = net.createConnection({ host: HOST, port });
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.once('error', () => {
                if (Date.now() >= deadline) {
                    resolve(false);
                }
                else {
                    setTimeout(attempt, 300);
                }
            });
            socket.setTimeout(500, () => {
                socket.destroy();
                if (Date.now() >= deadline) {
                    resolve(false);
                }
                else {
                    setTimeout(attempt, 300);
                }
            });
        };
        attempt();
    });
}
function runtimeForSession(runtime, sessionId) {
    return {
        ...runtime,
        sessionId,
        sessionUrl: `http://${runtime.host}:${runtime.port}/sessions/${sessionId}`,
        atlasHome: getAtlasStudioAppHome(),
        logPath: getAtlasPortalLogPath(),
        updatedAt: new Date().toISOString(),
        mode: 'codex-browser-portal'
    };
}
export function getAtlasBrowserPortalStatus() {
    const runtime = readAtlasPortalRuntime();
    return {
        active: Boolean(runtime?.pid && isProcessAlive(runtime.pid)),
        runtime: runtime ?? null
    };
}
export function stopAtlasBrowserPortal() {
    const runtime = readAtlasPortalRuntime();
    if (!runtime?.pid || !isProcessAlive(runtime.pid)) {
        return { stopped: false, runtime: runtime ?? null };
    }
    process.kill(runtime.pid);
    return { stopped: true, runtime };
}
export async function startAtlasBrowserPortal(options = {}) {
    const atlasHome = getAtlasStudioAppHome();
    const logPath = getAtlasPortalLogPath();
    await mkdir(atlasHome, { recursive: true });
    process.env.CREATE_SOMETHING_ATLAS_HOME = atlasHome;
    const session = await chooseSession(options);
    const existing = readAtlasPortalRuntime();
    if (options.restart) {
        stopAtlasBrowserPortal();
    }
    else if (existing?.pid && isProcessAlive(existing.pid)) {
        const runtime = runtimeForSession(existing, session.id);
        writeAtlasPortalRuntime(runtime);
        return runtime;
    }
    const port = await choosePort();
    const stdout = openSync(logPath, 'a');
    const stderr = openSync(logPath, 'a');
    const child = spawn(process.execPath, [getCliPath(), 'serve', '--host', HOST, '--port', String(port), '--session', session.id], {
        cwd: options.cwd ?? process.cwd(),
        detached: true,
        env: {
            ...process.env,
            CREATE_SOMETHING_ATLAS_HOME: atlasHome
        },
        stdio: ['ignore', stdout, stderr]
    });
    child.unref();
    closeSync(stdout);
    closeSync(stderr);
    const runtime = {
        host: HOST,
        port,
        url: `http://${HOST}:${port}/`,
        sessionId: session.id,
        sessionUrl: `http://${HOST}:${port}/sessions/${session.id}`,
        pid: child.pid ?? 0,
        atlasHome,
        logPath,
        launchedAt: new Date().toISOString(),
        mode: 'codex-browser-portal'
    };
    writeAtlasPortalRuntime(runtime);
    if (!(await waitForPort(port))) {
        throw new Error(`Atlas Studio did not become ready on ${runtime.url}; check ${logPath}`);
    }
    return runtime;
}
//# sourceMappingURL=portal.js.map