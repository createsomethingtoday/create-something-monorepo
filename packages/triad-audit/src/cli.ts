#!/usr/bin/env node

/**
 * Subtractive Triad Audit CLI
 *
 * Usage:
 *   npx triad-audit [path] [options]
 *
 * Options:
 *   --format, -f    Output format: json, markdown, both (default: both)
 *   --output, -o    Output file path (default: stdout)
 *   --level, -l     Run specific level: dry, rams, heidegger, all (default: all)
 *   --baseline      Save current result as baseline
 *   --compare       Compare to baseline and show delta
 *   --init          Generate example .triad-audit.json config
 *   --help, -h      Show help
 */

import { runAudit } from './audit.js';
import { formatAsJson } from './reporters/json-reporter.js';
import { formatAsMarkdown } from './reporters/markdown-reporter.js';
import {
	loadConfig,
	saveToHistory,
	saveBaseline,
	loadBaseline,
	compareToBaseline,
	generateExampleConfig,
	type ScoreDelta
} from './config.js';
import fs from 'fs';
import path from 'path';

interface CliOptions {
	path: string;
	format: 'json' | 'markdown' | 'both';
	output?: string;
	level: 'dry' | 'rams' | 'heidegger' | 'all';
	help: boolean;
	baseline: boolean;
	compare: boolean;
	init: boolean;
}

function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		path: '.',
		format: 'both',
		level: 'all',
		help: false,
		baseline: false,
		compare: false,
		init: false
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--format' || arg === '-f') {
			const value = args[++i];
			if (value === 'json' || value === 'markdown' || value === 'both') {
				options.format = value;
			}
		} else if (arg === '--output' || arg === '-o') {
			options.output = args[++i];
		} else if (arg === '--level' || arg === '-l') {
			const value = args[++i];
			if (value === 'dry' || value === 'rams' || value === 'heidegger' || value === 'all') {
				options.level = value;
			}
		} else if (arg === '--baseline') {
			options.baseline = true;
		} else if (arg === '--compare') {
			options.compare = true;
		} else if (arg === '--init') {
			options.init = true;
		} else if (!arg.startsWith('-')) {
			options.path = arg;
		}
	}

	return options;
}

function showHelp(): void {
	console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            SUBTRACTIVE TRIAD AUDIT                            ║
║                                                               ║
║  "Creation is the discipline of removing what obscures."      ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  triad-audit [path] [options]

OPTIONS:
  --format, -f <format>   Output format: json, markdown, both (default: both)
  --output, -o <path>     Write to file instead of stdout
  --level, -l <level>     Run specific level: dry, rams, heidegger, all
  --baseline              Save current result as baseline for comparison
  --compare               Compare to baseline and show delta
  --init                  Generate example .triad-audit.json config
  --help, -h              Show this help

THE TRIAD:
  ┌─────────────────┬────────────┬────────────────────────────────┐
  │ Level           │ Question   │ Action                         │
  ├─────────────────┼────────────┼────────────────────────────────┤
  │ DRY             │ Built this │ Unify                          │
  │ (Implementation)│ before?    │                                │
  ├─────────────────┼────────────┼────────────────────────────────┤
  │ Rams            │ Earns its  │ Remove                         │
  │ (Artifact)      │ existence? │                                │
  ├─────────────────┼────────────┼────────────────────────────────┤
  │ Heidegger       │ Serves the │ Reconnect                      │
  │ (System)        │ whole?     │                                │
  └─────────────────┴────────────┴────────────────────────────────┘

EXAMPLES:
  triad-audit                     # Audit current directory
  triad-audit /path/to/project    # Audit specific path
  triad-audit -f json -o out.json # Output JSON to file
  triad-audit -l dry              # Run only DRY analysis
  triad-audit --baseline          # Save current scores as baseline
  triad-audit --compare           # Compare to baseline, show trends
  triad-audit --init              # Create example config file

Reference: createsomething.ltd/ethos
`);
}

function printScoreBar(score: number, label: string): void {
	const filled = Math.round(score);
	const empty = 10 - filled;
	const bar = '█'.repeat(filled) + '░'.repeat(empty);
	const status = score >= 7 ? '✓' : score >= 5 ? '○' : '✗';
	console.log(`  ${status} ${label.padEnd(20)} ${bar} ${score.toFixed(1)}/10`);
}

function printDelta(delta: ScoreDelta): void {
	console.log('\n📊 COMPARISON TO BASELINE');
	console.log('━'.repeat(50));

	const formatDelta = (d: number) => {
		if (d > 0) return `↑ +${d.toFixed(1)}`;
		if (d < 0) return `↓ ${d.toFixed(1)}`;
		return '→ 0.0';
	};

	const getIcon = (d: number) => {
		if (d > 0) return '🟢';
		if (d < -0.5) return '🔴';
		return '🟡';
	};

	console.log(`  ${getIcon(delta.dry)} DRY:       ${formatDelta(delta.dry)}`);
	console.log(`  ${getIcon(delta.rams)} Rams:      ${formatDelta(delta.rams)}`);
	console.log(`  ${getIcon(delta.heidegger)} Heidegger: ${formatDelta(delta.heidegger)}`);
	console.log('━'.repeat(50));
	console.log(`  ${getIcon(delta.overall)} OVERALL:   ${formatDelta(delta.overall)}`);

	if (delta.improved) {
		console.log('\n  ✨ Scores have improved since baseline!');
	} else if (delta.degraded) {
		console.log('\n  ⚠️  Scores have degraded since baseline.');
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.help) {
		showHelp();
		process.exit(0);
	}

	// Handle --init
	if (options.init) {
		const configPath = path.join(options.path, '.triad-audit.json');
		fs.writeFileSync(configPath, generateExampleConfig(), 'utf-8');
		console.log(`✨ Created ${configPath}`);
		console.log('Edit this file to customize your audit configuration.');
		process.exit(0);
	}

	try {
		// Load config file if present
		const fileConfig = loadConfig(options.path);
		const config = fileConfig ? { path: options.path, ...fileConfig } : { path: options.path };

		const result = await runAudit(config);

		// Print summary to console
		console.log('\n📈 SCORES');
		console.log('━'.repeat(50));
		printScoreBar(result.scores.dry, 'DRY (Implementation)');
		printScoreBar(result.scores.rams, 'Rams (Artifact)');
		printScoreBar(result.scores.heidegger, 'Heidegger (System)');
		console.log('━'.repeat(50));
		printScoreBar(result.scores.overall, 'OVERALL');

		// Print violation summary
		console.log('\n⚠️  VIOLATIONS');
		console.log('━'.repeat(50));
		if (result.summary.criticalCount > 0) {
			console.log(`  🔴 Critical: ${result.summary.criticalCount}`);
		}
		if (result.summary.highCount > 0) {
			console.log(`  🟠 High:     ${result.summary.highCount}`);
		}
		if (result.summary.mediumCount > 0) {
			console.log(`  🟡 Medium:   ${result.summary.mediumCount}`);
		}
		if (result.summary.lowCount > 0) {
			console.log(`  🟢 Low:      ${result.summary.lowCount}`);
		}
		if (result.summary.totalViolations === 0) {
			console.log('  ✨ No violations found!');
		}

		// Print commendations
		if (result.commendations.length > 0) {
			console.log('\n✅ COMMENDATIONS');
			console.log('━'.repeat(50));
			for (const comm of result.commendations) {
				console.log(`  • ${comm.component}: ${comm.reason}`);
			}
		}

		// Output to file or stdout based on format
		if (options.output) {
			if (options.format === 'json' || options.format === 'both') {
				const jsonPath = options.format === 'both'
					? options.output.replace(/\.[^.]+$/, '.json')
					: options.output;
				fs.writeFileSync(jsonPath, formatAsJson(result), 'utf-8');
				console.log(`\n📄 JSON report written to: ${jsonPath}`);
			}

			if (options.format === 'markdown' || options.format === 'both') {
				const mdPath = options.format === 'both'
					? options.output.replace(/\.[^.]+$/, '.md')
					: options.output;
				fs.writeFileSync(mdPath, formatAsMarkdown(result), 'utf-8');
				console.log(`📄 Markdown report written to: ${mdPath}`);
			}
		} else if (options.format === 'json') {
			console.log('\n' + formatAsJson(result));
		}

		// Save to history
		saveToHistory(path.resolve(options.path), result);

		// Handle baseline comparison
		if (options.compare) {
			const baseline = loadBaseline(path.resolve(options.path));
			if (baseline) {
				const delta = compareToBaseline(result, baseline);
				printDelta(delta);
			} else {
				console.log('\n⚠️  No baseline found. Run with --baseline to create one.');
			}
		}

		// Save as baseline if requested
		if (options.baseline) {
			saveBaseline(path.resolve(options.path), result);
			console.log('\n✅ Saved current result as baseline.');
		}

		// Exit with appropriate code
		let exitCode = result.summary.criticalCount > 0 ? 2 :
			result.summary.highCount > 0 ? 1 : 0;

		// Override exit code if comparing and scores degraded
		if (options.compare) {
			const baseline = loadBaseline(path.resolve(options.path));
			if (baseline) {
				const delta = compareToBaseline(result, baseline);
				if (delta.degraded) {
					exitCode = Math.max(exitCode, 1);
				}
			}
		}

		console.log('\n' + '━'.repeat(50));
		console.log('Subtractive Triad Audit complete.');
		console.log('Reference: createsomething.ltd/ethos\n');

		process.exit(exitCode);

	} catch (error) {
		console.error('Error running audit:', error);
		process.exit(1);
	}
}

main();
