/**
 * Kit Installation
 *
 * Installs dotfiles, configurations, and MCP templates.
 * Philosophy: The tool recedes. Configuration should be invisible.
 */

import ora from 'ora';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface InstallOptions {
	tier: 'solo' | 'team' | 'org';
	force: boolean;
	skipWezterm: boolean;
	skipClaude: boolean;
	skipBeads: boolean;
	skipMcp: boolean;
}

interface InstallStep {
	name: string;
	enabled: boolean;
	install: () => Promise<void>;
}

export async function installKit(options: InstallOptions): Promise<void> {
	const home = homedir();
	const configDir = join(home, '.config');

	// Ensure .config exists
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true });
	}

	const steps: InstallStep[] = [
		{
			name: 'WezTerm configuration',
			enabled: !options.skipWezterm,
			install: async () => installWezterm(home, options.force)
		},
		{
			name: 'Claude Code settings',
			enabled: !options.skipClaude,
			install: async () => installClaudeCode(home, options.force)
		},
		{
			name: 'Beads task management',
			enabled: !options.skipBeads,
			install: async () => installBeads(home, options.force)
		},
		{
			name: 'MCP server templates',
			enabled: !options.skipMcp,
			install: async () => installMcp(home, options.force)
		}
	];

	for (const step of steps) {
		if (!step.enabled) {
			console.log(`  ${step.name} - skipped`);
			continue;
		}

		const spinner = ora(`Installing ${step.name}...`).start();
		try {
			await step.install();
			spinner.succeed(step.name);
		} catch (error) {
			spinner.fail(`${step.name} - ${error instanceof Error ? error.message : 'failed'}`);
		}
	}
}

async function installWezterm(home: string, force: boolean): Promise<void> {
	const targetDir = join(home, '.config', 'wezterm');
	const sourceDir = join(__dirname, '..', 'configs', 'wezterm');

	if (existsSync(targetDir) && !force) {
		throw new Error('WezTerm config exists (use --force to overwrite)');
	}

	copyDir(sourceDir, targetDir);
}

async function installClaudeCode(home: string, force: boolean): Promise<void> {
	const targetDir = join(home, '.claude');
	const sourceDir = join(__dirname, '..', 'configs', 'claude-code');

	// Claude Code config can be merged, not replaced
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	// Copy skills
	const skillsSource = join(sourceDir, 'skills');
	const skillsTarget = join(targetDir, 'skills');
	if (existsSync(skillsSource)) {
		if (!existsSync(skillsTarget)) {
			mkdirSync(skillsTarget, { recursive: true });
		}
		copyDir(skillsSource, skillsTarget, force);
	}

	// Copy settings (only if doesn't exist or force)
	const settingsSource = join(sourceDir, 'settings.json');
	const settingsTarget = join(targetDir, 'settings.json');
	if (existsSync(settingsSource) && (!existsSync(settingsTarget) || force)) {
		copyFileSync(settingsSource, settingsTarget);
	}
}

async function installBeads(home: string, force: boolean): Promise<void> {
	const targetDir = join(home, '.config', 'beads');
	const sourceDir = join(__dirname, '..', 'configs', 'beads');

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	// Copy config.yaml
	const configSource = join(sourceDir, 'config.yaml');
	const configTarget = join(targetDir, 'config.yaml');
	if (existsSync(configSource) && (!existsSync(configTarget) || force)) {
		copyFileSync(configSource, configTarget);
	}
}

async function installMcp(home: string, force: boolean): Promise<void> {
	const targetDir = join(home, '.config', 'mcp-servers');
	const sourceDir = join(__dirname, '..', 'configs', 'mcp-servers');

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	// Copy template files
	copyDir(sourceDir, targetDir, force);

	// Create README with setup instructions
	const readme = `# MCP Server Templates

These templates were installed by Agent-in-a-Box.

## Available Templates

- slack/ - Slack workspace integration
- linear/ - Linear issue tracking
- stripe/ - Stripe payment integration
- github/ - GitHub repository integration
- notion/ - Notion workspace integration
- cloudflare/ - Cloudflare Workers/D1/KV integration

## Usage

1. Copy the template you need to your project's .mcp/ directory
2. Follow the README in each template for configuration
3. Add to your Claude Code settings

## Support

- Office hours: https://cal.com/createsomething/agent-kit
- LMS: https://learn.createsomething.space
- Email: support@createsomething.agency
`;

	writeFileSync(join(targetDir, 'README.md'), readme);
}

function copyDir(source: string, target: string, overwrite = true): void {
	if (!existsSync(source)) {
		return;
	}

	if (!existsSync(target)) {
		mkdirSync(target, { recursive: true });
	}

	const entries = readdirSync(source);
	for (const entry of entries) {
		const sourcePath = join(source, entry);
		const targetPath = join(target, entry);

		const stat = statSync(sourcePath);
		if (stat.isDirectory()) {
			copyDir(sourcePath, targetPath, overwrite);
		} else {
			if (!existsSync(targetPath) || overwrite) {
				copyFileSync(sourcePath, targetPath);
			}
		}
	}
}
