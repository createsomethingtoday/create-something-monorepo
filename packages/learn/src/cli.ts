#!/usr/bin/env node
/**
 * CREATE SOMETHING Learn setup helper
 *
 * Setup and configuration for the Codex app MCP learning integration.
 *
 * @example
 * npx @createsomething/learn init
 * npx @createsomething/learn status
 * npx @createsomething/learn clear
 */

import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { isAuthenticated, clearAuth, getCurrentUser } from './auth/storage.js';

const COMMANDS = {
	init: 'Show Codex app MCP setup instructions',
	status: 'Show authentication and learning status',
	clear: 'Clear authentication and cached data',
	help: 'Show this help message'
};

const CODEX_MCP_ADD_ARGS = ['mcp', 'add', 'learn', '--', 'npx', '-y', '@createsomething/learn'];
const CODEX_MCP_ADD_COMMAND = `codex ${CODEX_MCP_ADD_ARGS.join(' ')}`;

function printHelp() {
	console.log(`
CREATE SOMETHING Learn CLI

Usage: npx @createsomething/learn <command>

Commands:
${Object.entries(COMMANDS)
	.map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`)
	.join('\n')}

MCP Server:
  Recommended operator setup:
  Open the Codex app -> Settings -> Integrations & MCP -> Add server

  Server fields:
  Name: learn
  Command: npx
  Args: -y @createsomething/learn

  Manual config fallback:
  [mcp_servers.learn]
  command = "npx"
  args = ["-y", "@createsomething/learn"]

  Technical CLI shortcut:
  ${CODEX_MCP_ADD_COMMAND}

Learn more: https://learn.createsomething.space/paths/codex-mcp
`);
}

function hasCodexMcpCli(): boolean {
	const result = spawnSync('codex', ['mcp', '--help'], { stdio: 'ignore' });
	return result.status === 0;
}

function isLearnServerConfigured(): boolean {
	const result = spawnSync('codex', ['mcp', 'get', 'learn'], { stdio: 'ignore' });
	return result.status === 0;
}

function printManualConfigFallback() {
	console.log('Manual fallback through Codex app config (~/.codex/config.toml):');
	console.log('');
	console.log('[mcp_servers.learn]');
	console.log('command = "npx"');
	console.log('args = ["-y", "@createsomething/learn"]');
	console.log('');
}

function printStatus() {
	console.log('\nCREATE SOMETHING Learn Status\n');

	if (isAuthenticated()) {
		const user = getCurrentUser();
		console.log(`✓ Authenticated as: ${user?.email}`);
		console.log(`  Tier: ${user?.tier || 'free'}`);
	} else {
		console.log('○ Not authenticated');
		console.log('  Use learn_authenticate in Codex to sign in');
	}

	const cacheDir = join(homedir(), '.create-something', 'cache', 'lessons');
	if (existsSync(cacheDir)) {
		console.log('\n✓ Lesson cache exists');
	} else {
		console.log('\n○ No cached lessons');
	}

	console.log('\nStart here in Codex:');
	console.log('  "Help me learn Codex by creating my first business MCP"');
	console.log('');
}

function clearData() {
	clearAuth();
	console.log('✓ Authentication cleared');

	const cacheDir = join(homedir(), '.create-something', 'cache');
	if (existsSync(cacheDir)) {
		console.log(`  Cache directory: ${cacheDir}`);
		console.log('  Remove manually if needed');
	}

	console.log('\nYou can re-authenticate using learn_authenticate in Codex.');
}

function initSetup() {
	console.log('\nCREATE SOMETHING Learn Setup\n');

	if (!hasCodexMcpCli()) {
		console.log('○ Technical CLI shortcut unavailable');
		console.log('  Use the Codex app instead: Settings -> Integrations & MCP -> Add server');
		printManualConfigFallback();
	} else if (isLearnServerConfigured()) {
		console.log('✓ MCP server already configured in Codex');
	} else {
		console.log('Recommended: add this server in the Codex app:\n');
		console.log('  Settings -> Integrations & MCP -> Add server');
		console.log('  Name: learn');
		console.log('  Command: npx');
		console.log('  Args: -y @createsomething/learn');
		console.log('');
		console.log('Technical shortcut, if you choose to use it:');
		console.log(`  ${CODEX_MCP_ADD_COMMAND}`);
		console.log('  or: npx @createsomething/learn init --auto');
		console.log('');
	}

	if (isAuthenticated()) {
		const user = getCurrentUser();
		console.log(`✓ Already authenticated as: ${user?.email}`);
	} else {
		console.log('○ Not yet authenticated');
		console.log('  After configuring, use learn_authenticate in Codex');
	}

	console.log('\n--- Next Steps ---\n');
	console.log('1. Add the MCP server in the Codex app settings');
	console.log('2. Restart the Codex app session');
	console.log('3. Ask in the Codex app: "Help me learn Codex by creating my first business MCP"');
	console.log('4. Complete lessons in the codex-mcp path');
}

function initAuto() {
	if (!hasCodexMcpCli()) {
		console.error('Error: the technical CLI shortcut is unavailable.');
		console.error('Use the Codex app instead: Settings -> Integrations & MCP -> Add server');
		console.error('');
		printManualConfigFallback();
		process.exit(1);
	}

	if (isLearnServerConfigured()) {
		console.log('✓ MCP server already configured in Codex');
		console.log('\nRestart the Codex app session, then ask:');
		console.log('  "Help me learn Codex by creating my first business MCP"');
		return;
	}

	const result = spawnSync('codex', CODEX_MCP_ADD_ARGS, {
		encoding: 'utf-8'
	});

	if (result.status !== 0) {
		console.error('Error: Failed to configure Codex MCP server automatically.');
		if (result.stderr?.trim()) {
			console.error(result.stderr.trim());
		} else if (result.stdout?.trim()) {
			console.error(result.stdout.trim());
		}
		process.exit(result.status ?? 1);
	}

	console.log('✓ MCP server configured in Codex');
	console.log('\nRestart the Codex app session, then ask:');
	console.log('  "Help me learn Codex by creating my first business MCP"');
}

function main() {
	const args = process.argv.slice(2);
	const command = args[0] || 'help';

	switch (command) {
		case 'init':
			if (args.includes('--full')) {
				console.error('Error: init --full has been removed. Use `init` or `init --auto`.');
				process.exit(1);
			}
			if (args.includes('--auto')) {
				initAuto();
			} else {
				initSetup();
			}
			break;

		case 'status':
			printStatus();
			break;

		case 'clear':
			clearData();
			break;

		case 'help':
		case '--help':
		case '-h':
			printHelp();
			break;

		default:
			console.error(`Unknown command: ${command}`);
			printHelp();
			process.exit(1);
	}
}

main();
