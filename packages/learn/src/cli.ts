#!/usr/bin/env node
/**
 * CREATE SOMETHING Learn CLI
 *
 * Setup and configuration for Claude Code learning integration.
 *
 * @example
 * npx @create-something/learn init
 * npx @create-something/learn status
 * npx @create-something/learn clear
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { isAuthenticated, clearAuth, getCurrentUser } from './auth/storage.js';

const COMMANDS = {
	init: 'Set up CREATE SOMETHING learning in Claude Code',
	status: 'Show authentication and learning status',
	clear: 'Clear authentication and cached data',
	help: 'Show this help message'
};

function printHelp() {
	console.log(`
CREATE SOMETHING Learn CLI

Usage: npx @create-something/learn <command>

Commands:
${Object.entries(COMMANDS)
	.map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`)
	.join('\n')}

MCP Server:
  This package provides an MCP server for Claude Code integration.
  Add to your Claude Code settings:

  {
    "mcpServers": {
      "learn": {
        "command": "npx",
        "args": ["@create-something/learn"]
      }
    }
  }

Learn more: https://learn.createsomething.space
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
		console.log('  Use learn_authenticate tool in Claude Code to sign in');
	}

	// Check for cached data
	const cacheDir = join(homedir(), '.create-something', 'cache', 'lessons');
	if (existsSync(cacheDir)) {
		console.log('\n✓ Lesson cache exists');
	} else {
		console.log('\n○ No cached lessons');
	}

	console.log('\nTo start learning, open Claude Code and say:');
	console.log('  "Help me learn the CREATE SOMETHING methodology"');
	console.log('');
}

function clearData() {
	clearAuth();
	console.log('✓ Authentication cleared');

	const cacheDir = join(homedir(), '.create-something', 'cache');
	if (existsSync(cacheDir)) {
		// Note: Not recursively deleting for safety
		console.log(`  Cache directory: ${cacheDir}`);
		console.log('  Remove manually if needed');
	}

	console.log('\nYou can re-authenticate using learn_authenticate in Claude Code.');
}

function initSetup() {
	console.log('\nCREATE SOMETHING Learn Setup\n');

	// 1. Check if Claude Code config exists
	const claudeConfigDir = join(homedir(), '.config', 'claude-code');
	const claudeConfigFile = join(claudeConfigDir, 'settings.json');

	let existingConfig: Record<string, unknown> = {};
	let configExists = false;

	if (existsSync(claudeConfigFile)) {
		try {
			existingConfig = JSON.parse(readFileSync(claudeConfigFile, 'utf-8'));
			configExists = true;
		} catch {
			// Invalid JSON, start fresh
		}
	}

	// 2. Check if MCP server already configured
	const mcpServers = (existingConfig.mcpServers as Record<string, unknown>) || {};
	if (mcpServers.learn) {
		console.log('✓ MCP server already configured in Claude Code settings');
	} else {
		console.log('To enable the learning tools, add this to your Claude Code settings:\n');
		console.log(`  File: ${claudeConfigFile}\n`);
		console.log(`  {
    "mcpServers": {
      "learn": {
        "command": "npx",
        "args": ["@create-something/learn"]
      }
    }
  }`);
		console.log('');

		// Offer to auto-configure
		if (configExists) {
			console.log('  Or run: npx @create-something/learn init --auto\n');
		}
	}

	// 3. Check authentication status
	if (isAuthenticated()) {
		const user = getCurrentUser();
		console.log(`✓ Already authenticated as: ${user?.email}`);
	} else {
		console.log('○ Not yet authenticated');
		console.log('  After configuring, use learn_authenticate in Claude Code');
	}

	// 4. Show next steps
	console.log('\n--- Next Steps ---\n');
	console.log('1. Add the MCP server configuration above');
	console.log('2. Restart Claude Code');
	console.log('3. Say: "Help me learn CREATE SOMETHING methodology"');
	console.log('4. Claude will guide you through authentication and learning');
	console.log('\nThe Subtractive Triad awaits.');
}

function initAuto() {
	const claudeConfigDir = join(homedir(), '.config', 'claude-code');
	const claudeConfigFile = join(claudeConfigDir, 'settings.json');

	// Ensure directory exists
	if (!existsSync(claudeConfigDir)) {
		mkdirSync(claudeConfigDir, { recursive: true });
	}

	// Load or create config
	let config: Record<string, unknown> = {};
	if (existsSync(claudeConfigFile)) {
		try {
			config = JSON.parse(readFileSync(claudeConfigFile, 'utf-8'));
		} catch {
			// Invalid JSON, start fresh
		}
	}

	// Add MCP server
	const mcpServers = (config.mcpServers as Record<string, unknown>) || {};
	mcpServers.learn = {
		command: 'npx',
		args: ['@create-something/learn']
	};
	config.mcpServers = mcpServers;

	// Write config
	writeFileSync(claudeConfigFile, JSON.stringify(config, null, 2));

	console.log('✓ MCP server configured in Claude Code settings');
	console.log(`  File: ${claudeConfigFile}`);
	console.log('\nRestart Claude Code, then say:');
	console.log('  "Help me learn the CREATE SOMETHING methodology"');
}

// Main CLI handler
function main() {
	const args = process.argv.slice(2);
	const command = args[0] || 'help';

	switch (command) {
		case 'init':
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
