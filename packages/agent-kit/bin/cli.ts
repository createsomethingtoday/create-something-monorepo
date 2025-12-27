#!/usr/bin/env node
/**
 * Agent-in-a-Box CLI
 *
 * Usage: npx @createsomething/agent-kit --key=ak_xxxxx
 *
 * Philosophy: The tool recedes. One command installs everything.
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { validateLicense } from '../src/validate.js';
import { installKit, type InstallOptions } from '../src/install.js';
import { getMachineId } from '../src/machine.js';

program
	.name('agent-kit')
	.description('Complete AI development environment from CREATE SOMETHING')
	.version('1.0.0')
	.option('-k, --key <license>', 'License key (ak_xxxxx)')
	.option('-f, --force', 'Overwrite existing configuration')
	.option('--skip-wezterm', 'Skip WezTerm configuration')
	.option('--skip-claude', 'Skip Claude Code configuration')
	.option('--skip-beads', 'Skip Beads configuration')
	.option('--skip-mcp', 'Skip MCP server templates')
	.action(async (options) => {
		console.log(chalk.bold('\n  Agent-in-a-Box\n'));
		console.log(chalk.dim('  Complete AI development environment\n'));

		// Get license key
		const key = options.key || process.env.AGENT_KIT_LICENSE;
		if (!key) {
			console.error(chalk.red('  Error: License key required\n'));
			console.log('  Usage: npx @createsomething/agent-kit --key=ak_xxxxx');
			console.log('  Or set AGENT_KIT_LICENSE environment variable\n');
			process.exit(1);
		}

		// Validate license
		const spinner = ora('Validating license...').start();
		try {
			const machineId = await getMachineId();
			const license = await validateLicense(key, machineId);

			if (!license.valid) {
				spinner.fail('Invalid or expired license key');
				console.log(chalk.dim('\n  Contact support@createsomething.agency for help\n'));
				process.exit(1);
			}

			spinner.succeed(`License valid (${license.tier} tier)`);

			// Install kit
			const installOptions: InstallOptions = {
				tier: license.tier,
				force: options.force || false,
				skipWezterm: options.skipWezterm || false,
				skipClaude: options.skipClaude || false,
				skipBeads: options.skipBeads || false,
				skipMcp: options.skipMcp || false
			};

			await installKit(installOptions);

			// Success message
			console.log(chalk.green('\n  Installation complete!\n'));
			console.log('  Next steps:');
			console.log(chalk.dim('  1. Restart your terminal'));
			console.log(chalk.dim('  2. Visit https://learn.createsomething.space for tutorials'));
			console.log(chalk.dim('  3. Book office hours: https://cal.com/createsomething/agent-kit\n'));
		} catch (error) {
			spinner.fail('Installation failed');
			console.error(chalk.red(`\n  ${error instanceof Error ? error.message : 'Unknown error'}\n`));
			process.exit(1);
		}
	});

program.parse();
