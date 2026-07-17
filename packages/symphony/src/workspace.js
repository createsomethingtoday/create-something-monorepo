import { mkdir, lstat, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { SymphonyError } from './errors.js';
import { ensure_path_within_root, sanitize_workspace_key } from './config.js';
const WORKSPACE_METADATA_DIR = '.metadata';
const WORKSPACE_METADATA_VERSION = 1;
const COMPLETION_HANDOFF_VERSION = 'symphony-evidence-handoff-marker.v1';
function truncate(text) {
    return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}
function now_iso() {
    return new Date().toISOString();
}
async function path_exists(path) {
    try {
        await lstat(path);
        return true;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
async function remove_empty_directory(path) {
    try {
        await rmdir(path);
    }
    catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTEMPTY') {
            return;
        }
        throw error;
    }
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
async function git_status_porcelain(path) {
    const child = spawn('git', ['-C', path, 'status', '--porcelain'], {
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
    const code = await new Promise((resolve) => {
        child.once('exit', resolve);
    });
    if (code !== 0) {
        throw new SymphonyError('git_status_failed', `git status failed for ${path}: ${truncate(stderr).trim() || `exit code ${code}`}`);
    }
    return stdout.trim();
}
async function git_command(path, args) {
    const child = spawn('git', ['-C', path, ...args], {
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
    const code = await new Promise((resolve) => {
        child.once('exit', resolve);
    });
    return { code, stdout, stderr };
}
async function is_linked_git_worktree(path) {
    try {
        const stats = await lstat(join(path, '.git'));
        return stats.isFile();
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}
async function remove_linked_git_worktree(path, logger) {
    if (!(await is_linked_git_worktree(path))) {
        return false;
    }
    const result = await git_command(path, ['worktree', 'remove', path]);
    if (result.code !== 0) {
        throw new SymphonyError('git_worktree_remove_failed', `git worktree remove failed for ${path}: ${truncate(result.stderr).trim() || `exit code ${result.code}`}`);
    }
    logger.info('git worktree removed completed', {
        workspace_path: path,
    });
    return true;
}
export class WorkspaceManager {
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    get_workspace_paths(issue_identifier) {
        const workspace_key = sanitize_workspace_key(issue_identifier);
        const root = ensure_path_within_root(this.config.workspace.root, this.config.workspace.root);
        const workspace_path = ensure_path_within_root(root, join(root, workspace_key));
        const metadata_root = ensure_path_within_root(root, join(root, WORKSPACE_METADATA_DIR));
        const metadata_path = ensure_path_within_root(metadata_root, join(metadata_root, `${workspace_key}.json`));
        const completion_path = ensure_path_within_root(metadata_root, join(metadata_root, `${workspace_key}.completion.json`));
        return {
            root,
            workspace_path,
            workspace_key,
            metadata_root,
            metadata_path,
            completion_path,
        };
    }
    async read_completion_handoff(issue_identifier) {
        const paths = this.get_workspace_paths(issue_identifier);
        try {
            const parsed = JSON.parse(await readFile(paths.completion_path, 'utf8'));
            if (parsed?.schema_version !== COMPLETION_HANDOFF_VERSION ||
                parsed.issue_identifier !== issue_identifier ||
                parsed.workspace_path !== paths.workspace_path) {
                throw new SymphonyError('invalid_completion_handoff', `Completion handoff does not match ${issue_identifier}: ${paths.completion_path}`);
            }
            return parsed;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            if (error instanceof SymphonyError) {
                throw error;
            }
            throw new SymphonyError('invalid_completion_handoff', `Completion handoff is unreadable for ${issue_identifier}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async write_completion_handoff(issue_identifier, handoff) {
        const paths = this.get_workspace_paths(issue_identifier);
        await mkdir(paths.metadata_root, { recursive: true });
        const record = {
            ...handoff,
            schema_version: COMPLETION_HANDOFF_VERSION,
            issue_identifier,
            workspace_path: paths.workspace_path,
            workspace_metadata_path: paths.metadata_path,
            updated_at: now_iso(),
        };
        await writeFile(paths.completion_path, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
        return record;
    }
    async read_workspace_metadata(metadata_path, workspace_key, workspace_path) {
        try {
            const parsed = JSON.parse(await readFile(metadata_path, 'utf8'));
            if (parsed?.schema_version === WORKSPACE_METADATA_VERSION &&
                parsed.workspace_key === workspace_key &&
                parsed.workspace_path === workspace_path) {
                return parsed;
            }
            return null;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            this.logger.warn('workspace metadata unreadable', {
                metadata_path,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    async write_workspace_metadata(paths, issue_identifier, created_now, recovered_stale) {
        await mkdir(paths.metadata_root, { recursive: true });
        const metadata = {
            schema_version: WORKSPACE_METADATA_VERSION,
            issue_identifier,
            workspace_key: paths.workspace_key,
            workspace_path: paths.workspace_path,
            metadata_path: paths.metadata_path,
            created_at: now_iso(),
            created_now,
            recovered_stale,
            after_create_hook_configured: Boolean(this.config.hooks.after_create),
        };
        await writeFile(paths.metadata_path, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
        return metadata;
    }
    async ensure_workspace(issue_identifier) {
        const paths = this.get_workspace_paths(issue_identifier);
        await mkdir(paths.root, { recursive: true });
        let created_now = false;
        let recovered_stale = false;
        try {
            const stats = await lstat(paths.workspace_path);
            if (!stats.isDirectory()) {
                throw new SymphonyError('invalid_workspace_path', `Workspace path exists but is not a directory: ${paths.workspace_path}`);
            }
            const metadata = await this.read_workspace_metadata(paths.metadata_path, paths.workspace_key, paths.workspace_path);
            const has_git_metadata = await path_exists(join(paths.workspace_path, '.git'));
            if (!metadata && !has_git_metadata && this.config.hooks.after_create) {
                this.logger.warn('stale workspace bootstrap detected; recreating', {
                    issue_identifier,
                    workspace_path: paths.workspace_path,
                    metadata_path: paths.metadata_path,
                });
                await rm(paths.workspace_path, { recursive: true, force: true });
                await mkdir(paths.workspace_path, { recursive: true });
                created_now = true;
                recovered_stale = true;
            }
            else if (!metadata && has_git_metadata) {
                await this.write_workspace_metadata(paths, issue_identifier, false, false);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                await mkdir(paths.workspace_path, { recursive: true });
                created_now = true;
            }
            else {
                throw error;
            }
        }
        if (created_now && this.config.hooks.after_create) {
            try {
                await run_script('after_create', this.config.hooks.after_create, paths.workspace_path, this.config.hooks.timeout_ms, this.logger, true);
                await this.write_workspace_metadata(paths, issue_identifier, created_now, recovered_stale);
            }
            catch (error) {
                await rm(paths.workspace_path, { recursive: true, force: true });
                await rm(paths.metadata_path, { force: true });
                throw error;
            }
        }
        else if (created_now) {
            await this.write_workspace_metadata(paths, issue_identifier, created_now, recovered_stale);
        }
        return {
            path: paths.workspace_path,
            workspace_key: paths.workspace_key,
            created_now,
            recovered_stale,
            metadata_path: paths.metadata_path,
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
        const paths = this.get_workspace_paths(issue_identifier);
        try {
            const stats = await lstat(paths.workspace_path);
            if (!stats.isDirectory()) {
                throw new SymphonyError('invalid_workspace_path', `Workspace path exists but is not a directory: ${paths.workspace_path}`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                await rm(paths.metadata_path, { force: true });
                await rm(paths.completion_path, { force: true });
                await remove_empty_directory(paths.metadata_root);
                return;
            }
            throw error;
        }
        if (this.config.hooks.before_remove) {
            await run_script('before_remove', this.config.hooks.before_remove, paths.workspace_path, this.config.hooks.timeout_ms, this.logger, true);
        }
        if (!(await path_exists(paths.workspace_path))) {
            await rm(paths.metadata_path, { force: true });
            await remove_empty_directory(paths.metadata_root);
            this.logger.info('workspace removed completed', {
                issue_identifier,
                workspace_path: paths.workspace_path,
            });
            return;
        }
        if (await path_exists(join(paths.workspace_path, '.git'))) {
            const status = await git_status_porcelain(paths.workspace_path);
            if (status) {
                throw new SymphonyError('dirty_workspace', `Refusing to remove dirty workspace ${paths.workspace_path}:\n${status}`);
            }
        }
        const removed_by_git = await remove_linked_git_worktree(paths.workspace_path, this.logger);
        if (!removed_by_git) {
            await rm(paths.workspace_path, { recursive: true, force: true });
        }
        await rm(paths.metadata_path, { force: true });
        await rm(paths.completion_path, { force: true });
        await remove_empty_directory(paths.metadata_root);
        this.logger.info('workspace removed completed', {
            issue_identifier,
            workspace_path: paths.workspace_path,
        });
    }
}
//# sourceMappingURL=workspace.js.map
