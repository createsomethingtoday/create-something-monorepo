import { mkdir, lstat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { SymphonyError } from './errors.js';
import { ensure_path_within_root, sanitize_workspace_key } from './config.js';
function truncate(text) {
    return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}
async function run_script(name, script, cwd, timeout_ms, logger, fatal) {
    const child = spawn('bash', ['-lc', script], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
        stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
    });
    const result = await new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (done)
                return;
            done = true;
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 250).unref();
            resolve({ code: null, timed_out: true });
        }, timeout_ms);
        child.once('exit', (code) => {
            if (done)
                return;
            done = true;
            clearTimeout(timer);
            resolve({ code, timed_out: false });
        });
    });
    if (result.code === 0 && !result.timed_out) {
        logger.info('hook completed', {
            hook: name,
            completed: true,
            cwd,
        });
        return;
    }
    const message = result.timed_out
        ? `Hook ${name} timed out after ${timeout_ms}ms`
        : `Hook ${name} exited with code ${result.code ?? 'null'}`;
    logger.warn('hook failed', {
        hook: name,
        failed: true,
        cwd,
        stdout: truncate(stdout).trim() || undefined,
        stderr: truncate(stderr).trim() || undefined,
        reason: message,
    });
    if (fatal) {
        throw new SymphonyError('hook_failed', message);
    }
}
export class WorkspaceManager {
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    async ensure_workspace(issue_identifier) {
        const workspace_key = sanitize_workspace_key(issue_identifier);
        const root = ensure_path_within_root(this.config.workspace.root, this.config.workspace.root);
        const workspace_path = ensure_path_within_root(root, join(root, workspace_key));
        await mkdir(root, { recursive: true });
        let created_now = false;
        try {
            const stats = await lstat(workspace_path);
            if (!stats.isDirectory()) {
                throw new SymphonyError('invalid_workspace_path', `Workspace path exists but is not a directory: ${workspace_path}`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                await mkdir(workspace_path, { recursive: true });
                created_now = true;
            }
            else {
                throw error;
            }
        }
        if (created_now && this.config.hooks.after_create) {
            try {
                await run_script('after_create', this.config.hooks.after_create, workspace_path, this.config.hooks.timeout_ms, this.logger, true);
            }
            catch (error) {
                await rm(workspace_path, { recursive: true, force: true });
                throw error;
            }
        }
        return {
            path: workspace_path,
            workspace_key,
            created_now,
        };
    }
    async run_before_run(workspace) {
        if (!this.config.hooks.before_run)
            return;
        await run_script('before_run', this.config.hooks.before_run, workspace.path, this.config.hooks.timeout_ms, this.logger, true);
    }
    async run_after_run(workspace) {
        if (!this.config.hooks.after_run)
            return;
        await run_script('after_run', this.config.hooks.after_run, workspace.path, this.config.hooks.timeout_ms, this.logger, false);
    }
    async remove_workspace(issue_identifier) {
        const workspace_key = sanitize_workspace_key(issue_identifier);
        const root = ensure_path_within_root(this.config.workspace.root, this.config.workspace.root);
        const workspace_path = ensure_path_within_root(root, join(root, workspace_key));
        try {
            const stats = await lstat(workspace_path);
            if (!stats.isDirectory()) {
                throw new SymphonyError('invalid_workspace_path', `Workspace path exists but is not a directory: ${workspace_path}`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return;
            }
            throw error;
        }
        if (this.config.hooks.before_remove) {
            await run_script('before_remove', this.config.hooks.before_remove, workspace_path, this.config.hooks.timeout_ms, this.logger, false);
        }
        await rm(workspace_path, { recursive: true, force: true });
        this.logger.info('workspace removed completed', {
            issue_identifier,
            workspace_path,
        });
    }
}
//# sourceMappingURL=workspace.js.map