#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function findWorkspaceRoot(start) {
	let current = start;

	while (true) {
		if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return start;
		}

		current = parent;
	}
}

function parseArgs(argv) {
	const wranglerArgs = [];
	let cwd;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === '--cwd') {
			const value = argv[index + 1];
			if (!value) {
				console.error('Missing value for --cwd');
				process.exit(1);
			}

			cwd = value;
			index += 1;
			continue;
		}

		wranglerArgs.push(arg);
	}

	return { cwd, wranglerArgs };
}

const { cwd, wranglerArgs } = parseArgs(process.argv.slice(2));
const runnerCwd = cwd ? path.resolve(process.cwd(), cwd) : process.cwd();
const workspaceRoot = findWorkspaceRoot(runnerCwd);
const relativeCwd = path.relative(workspaceRoot, runnerCwd) || 'root';
const defaultLogPath = path.join(workspaceRoot, '.wrangler', 'logs', relativeCwd);
const logPath = process.env.WRANGLER_LOG_PATH ?? defaultLogPath;

fs.mkdirSync(logPath, { recursive: true });

const child = spawn('pnpm', ['exec', 'wrangler', ...wranglerArgs], {
	cwd: runnerCwd,
	stdio: 'inherit',
	env: {
		...process.env,
		WRANGLER_LOG_PATH: logPath
	}
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});
