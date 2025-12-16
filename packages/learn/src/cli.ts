#!/usr/bin/env node
/**
 * CREATE SOMETHING Learn CLI
 *
 * Setup and configuration for Claude Code learning integration.
 *
 * @example
 * npx @createsomething/learn init
 * npx @createsomething/learn init --full
 * npx @createsomething/learn status
 * npx @createsomething/learn clear
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { isAuthenticated, clearAuth, getCurrentUser } from './auth/storage.js';
import { loadEthos } from './ethos/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMMANDS = {
	init: 'Set up CREATE SOMETHING learning in Claude Code',
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
  This package provides an MCP server for Claude Code integration.
  Add to your Claude Code settings:

  {
    "mcpServers": {
      "learn": {
        "command": "npx",
        "args": ["@createsomething/learn"]
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
        "args": ["@createsomething/learn"]
      }
    }
  }`);
		console.log('');

		// Offer to auto-configure
		if (configExists) {
			console.log('  Or run: npx @createsomething/learn init --auto\n');
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
		args: ['@createsomething/learn']
	};
	config.mcpServers = mcpServers;

	// Write config
	writeFileSync(claudeConfigFile, JSON.stringify(config, null, 2));

	console.log('✓ MCP server configured in Claude Code settings');
	console.log(`  File: ${claudeConfigFile}`);
	console.log('\nRestart Claude Code, then say:');
	console.log('  "Help me learn the CREATE SOMETHING methodology"');
}

function initFull() {
	console.log('\nCREATE SOMETHING Learn — Full Setup\n');

	const cwd = process.cwd();

	// Get project name from package.json or directory name
	let projectName = 'My Project';
	const packageJsonPath = join(cwd, 'package.json');
	if (existsSync(packageJsonPath)) {
		try {
			const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
			projectName = pkg.name || projectName;
		} catch {
			// Use directory name instead
			projectName = cwd.split('/').pop() || projectName;
		}
	} else {
		projectName = cwd.split('/').pop() || projectName;
	}

	console.log(`Project: ${projectName}\n`);

	// 1. Create .claude directory structure
	const claudeDir = join(cwd, '.claude');
	const rulesDir = join(claudeDir, 'rules');
	const skillsDir = join(claudeDir, 'skills');

	if (!existsSync(claudeDir)) {
		mkdirSync(claudeDir, { recursive: true });
		console.log('✓ Created .claude/ directory');
	}

	if (!existsSync(rulesDir)) {
		mkdirSync(rulesDir, { recursive: true });
		console.log('✓ Created .claude/rules/ directory');
	}

	if (!existsSync(skillsDir)) {
		mkdirSync(skillsDir, { recursive: true });
		console.log('✓ Created .claude/skills/ directory');
	}

	// 2. Copy templates
	const templatesDir = join(__dirname, '..', 'templates');

	// Copy CLAUDE.md
	const claudeMdTemplate = join(templatesDir, 'CLAUDE.md.template');
	const claudeMdTarget = join(cwd, 'CLAUDE.md');

	if (existsSync(claudeMdTemplate)) {
		let content = readFileSync(claudeMdTemplate, 'utf-8');

		// Interpolate project name
		content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);

		// Interpolate ethos section
		const ethos = loadEthos();
		let ethosSection = '';

		if (ethos && ethos.principles.length > 0) {
			ethosSection = `Your personal principles from CREATE SOMETHING Learn:\n\n`;
			ethos.principles.forEach((p) => {
				ethosSection += `- **${p.level.toUpperCase()}**: ${p.text}${p.domain ? ` [${p.domain}]` : ''}\n`;
			});
			ethosSection += `\nManage your ethos: \`learn_ethos action="view"\``;
		} else {
			ethosSection = `Define your personal principles using:\n\`\`\`\nlearn_ethos action="add_principle" text="Your principle" level="dry|rams|heidegger"\n\`\`\``;
		}

		content = content.replace(/\{\{ETHOS_SECTION\}\}/g, ethosSection);

		if (!existsSync(claudeMdTarget)) {
			writeFileSync(claudeMdTarget, content);
			console.log('✓ Created CLAUDE.md');
		} else {
			console.log('○ CLAUDE.md already exists (skipped)');
		}
	}

	// Copy subtractive-triad.md rule
	const triadRuleTemplate = join(templatesDir, 'rules', 'subtractive-triad.md');
	const triadRuleTarget = join(rulesDir, 'subtractive-triad.md');

	if (existsSync(triadRuleTemplate)) {
		if (!existsSync(triadRuleTarget)) {
			cpSync(triadRuleTemplate, triadRuleTarget);
			console.log('✓ Created .claude/rules/subtractive-triad.md');
		} else {
			console.log('○ subtractive-triad.md rule already exists (skipped)');
		}
	}

	// Copy methodology skill
	const methodologySkillTemplate = join(templatesDir, 'skill', 'methodology.md');
	const methodologySkillTarget = join(skillsDir, 'subtractive-triad.md');

	if (existsSync(methodologySkillTemplate)) {
		if (!existsSync(methodologySkillTarget)) {
			cpSync(methodologySkillTemplate, methodologySkillTarget);
			console.log('✓ Created .claude/skills/subtractive-triad.md');
		} else {
			console.log('○ subtractive-triad skill already exists (skipped)');
		}
	}

	// 3. Show next steps
	console.log('\n--- Setup Complete ---\n');
	console.log('Files created:');
	console.log('  CLAUDE.md                              (Project instructions)');
	console.log('  .claude/rules/subtractive-triad.md     (Methodology rules)');
	console.log('  .claude/skills/subtractive-triad.md    (Methodology skill)');

	console.log('\n--- Next Steps ---\n');
	console.log('1. Review and customize CLAUDE.md for your project');
	console.log('2. Run: npx @createsomething/learn init --auto');
	console.log('3. Restart Claude Code');
	console.log('4. Start coding with the Subtractive Triad');

	console.log('\n*The tool recedes; the methodology remains.*\n');
}

// Main CLI handler
function main() {
	const args = process.argv.slice(2);
	const command = args[0] || 'help';

	switch (command) {
		case 'init':
			if (args.includes('--full')) {
				initFull();
			} else if (args.includes('--auto')) {
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
