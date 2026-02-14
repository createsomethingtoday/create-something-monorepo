#!/usr/bin/env node
/**
 * CREATE SOMETHING Learn CLI
 *
 * Setup and configuration for Codex MCP learning integration.
 *
 * @example
 * npx @createsomething/learn init
 * npx @createsomething/learn status
 * npx @createsomething/learn clear
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { isAuthenticated, clearAuth, getCurrentUser } from './auth/storage.js';

const COMMANDS = {
	init: 'Set up CREATE SOMETHING Learn in Codex',
	status: 'Show authentication and learning status',
	clear: 'Clear authentication and cached data',
	help: 'Show this help message'
};

function printHelp() {
	console.log(`
CREATE SOMETHING Learn CLI

Usage: npx @createsomething/learn <command>

Commands:
${Object.entries(COMMANDS)
	.map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`)
	.join('\n')}

MCP Server:
  Add to your Codex settings:

  {
    "mcpServers": {
      "learn": {
        "command": "npx",
        "args": ["@createsomething/learn"]
      }
    }
  }

Learn more: https://learn.createsomething.space/paths/codex-mcp
`);
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
	console.log('  "Help me learn Codex by building an MCP"');
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

	const codexConfigDir = join(homedir(), '.config', 'claude-code');
	const codexConfigFile = join(codexConfigDir, 'settings.json');

	let existingConfig: Record<string, unknown> = {};
	let configExists = false;

	if (existsSync(codexConfigFile)) {
		try {
			existingConfig = JSON.parse(readFileSync(codexConfigFile, 'utf-8'));
			configExists = true;
		} catch {
			// Invalid JSON, start fresh
		}
	}

	const mcpServers = (existingConfig.mcpServers as Record<string, unknown>) || {};
	if (mcpServers.learn) {
		console.log('✓ MCP server already configured in Codex settings');
	} else {
		console.log('To enable the learning tools, add this to your Codex settings:\n');
		console.log(`  File: ${codexConfigFile}\n`);
		console.log(`  {
    "mcpServers": {
      "learn": {
        "command": "npx",
        "args": ["@createsomething/learn"]
      }
    }
  }`);
		console.log('');

		if (configExists) {
			console.log('  Or run: npx @createsomething/learn init --auto\n');
		}
	}

	if (isAuthenticated()) {
		const user = getCurrentUser();
		console.log(`✓ Already authenticated as: ${user?.email}`);
	} else {
		console.log('○ Not yet authenticated');
		console.log('  After configuring, use learn_authenticate in Codex');
	}

	console.log('\n--- Next Steps ---\n');
	console.log('1. Add the MCP server configuration above');
	console.log('2. Restart Codex');
	console.log('3. Ask for: "Learn Codex by building an MCP"');
	console.log('4. Complete lessons in the codex-mcp path');
}

function initAuto() {
	const codexConfigDir = join(homedir(), '.config', 'claude-code');
	const codexConfigFile = join(codexConfigDir, 'settings.json');

	if (!existsSync(codexConfigDir)) {
		mkdirSync(codexConfigDir, { recursive: true });
	}

	let config: Record<string, unknown> = {};
	if (existsSync(codexConfigFile)) {
		try {
			config = JSON.parse(readFileSync(codexConfigFile, 'utf-8'));
		} catch {
			// Invalid JSON, start fresh
		}
	}

	const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
	mcpServers.learn = {
		command: 'npx',
		args: ['@createsomething/learn']
	};
	config.mcpServers = mcpServers;

	writeFileSync(codexConfigFile, JSON.stringify(config, null, 2));

	console.log('✓ MCP server configured in Codex settings');
	console.log(`  File: ${codexConfigFile}`);
	console.log('\nRestart Codex, then ask:');
	console.log('  "Help me learn Codex by building an MCP"');
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
