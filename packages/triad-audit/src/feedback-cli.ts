#!/usr/bin/env node

/**
 * PR Feedback Pattern Tracker CLI
 *
 * Track repeated feedback patterns in PR comments to identify
 * opportunities for automated lint rules.
 *
 * Philosophy: "If you say it twice, automate it."
 *
 * Usage:
 *   npx triad-feedback [command] [options]
 *
 * Commands:
 *   add       Add a feedback entry
 *   import    Import feedback from JSON
 *   analyze   Analyze patterns and show ready for automation
 *   status    Show current feedback statistics
 *   mark      Mark a pattern as automated
 *   export    Export feedback data
 */

import { FeedbackCollector } from './collectors/feedback-collector.js';
import { generateRulesFromPatterns, generateEslintConfig } from './generators/index.js';
import type { FeedbackCategory } from './types/feedback.js';
import type { Severity } from './types/base.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// =============================================================================
// CLI TYPES
// =============================================================================

interface CliOptions {
	command: 'add' | 'import' | 'analyze' | 'status' | 'mark' | 'export' | 'generate-rules' | 'help';
	storagePath: string;
	prId?: string;
	file?: string;
	line?: number;
	comment?: string;
	category?: FeedbackCategory;
	severity?: Severity;
	tags?: string[];
	patternId?: string;
	automationRef?: string;
	format: 'json' | 'table';
	minOccurrences?: number;
	inputFile?: string;
	outputFile?: string;
	rulesOutput?: string;
	configOutput?: string;
}

// =============================================================================
// ARG PARSING
// =============================================================================

function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		command: 'help',
		storagePath: '.triad-audit/feedback.json',
		format: 'table'
	};

	let i = 0;

	// First arg is command
	if (args.length > 0 && !args[0].startsWith('-')) {
		const cmd = args[0];
		if (['add', 'import', 'analyze', 'status', 'mark', 'export', 'generate-rules', 'help'].includes(cmd)) {
			options.command = cmd as CliOptions['command'];
			i = 1;
		}
	}

	// Parse remaining options
	for (; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case '--storage':
			case '-s':
				options.storagePath = args[++i];
				break;
			case '--pr':
				options.prId = args[++i];
				break;
			case '--file':
			case '-f':
				options.file = args[++i];
				break;
			case '--line':
			case '-l':
				options.line = parseInt(args[++i], 10);
				break;
			case '--comment':
			case '-c':
				options.comment = args[++i];
				break;
			case '--category':
				options.category = args[++i] as FeedbackCategory;
				break;
			case '--severity':
				options.severity = args[++i] as Severity;
				break;
			case '--tags':
			case '-t':
				options.tags = args[++i].split(',');
				break;
			case '--pattern':
			case '-p':
				options.patternId = args[++i];
				break;
			case '--automation-ref':
			case '-a':
				options.automationRef = args[++i];
				break;
			case '--format':
				options.format = args[++i] as 'json' | 'table';
				break;
			case '--min':
				options.minOccurrences = parseInt(args[++i], 10);
				break;
			case '--input':
			case '-i':
				options.inputFile = args[++i];
				break;
			case '--output':
			case '-o':
				options.outputFile = args[++i];
				break;
			case '--rules-output':
				options.rulesOutput = args[++i];
				break;
			case '--config-output':
				options.configOutput = args[++i];
				break;
			case '--help':
			case '-h':
				options.command = 'help';
				break;
		}
	}

	return options;
}

// =============================================================================
// OUTPUT HELPERS
// =============================================================================

function showHelp(): void {
	console.log(`
╔═══════════════════════════════════════════════════════════════╗
║            PR FEEDBACK PATTERN TRACKER                        ║
║                                                               ║
║  "If you say it twice, automate it." - Boris Cherny           ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  triad-feedback <command> [options]

COMMANDS:
  add              Add a single feedback entry
  import           Import feedback from JSON file
  analyze          Analyze patterns and show automation candidates
  status           Show current feedback statistics
  mark             Mark a pattern as automated
  generate-rules   Generate ESLint rules from feedback patterns
  export           Export feedback data to JSON
  help             Show this help

GLOBAL OPTIONS:
  --storage, -s <path>    Path to feedback storage (default: .triad-audit/feedback.json)
  --format <fmt>          Output format: json, table (default: table)
  --help, -h              Show this help

ADD OPTIONS:
  --pr <id>               PR number/identifier (required)
  --comment, -c <text>    The feedback comment (required)
  --file, -f <path>       File the comment was on
  --line, -l <num>        Line number
  --category <cat>        Category: style, naming, structure, performance,
                          security, accessibility, canon, documentation,
                          testing, other (default: auto-detected)
  --severity <sev>        Severity: critical, high, medium, low (default: medium)
  --tags, -t <tags>       Comma-separated tags

IMPORT OPTIONS:
  --input, -i <file>      JSON file to import (required)
                          Format: [{ prId, comment, file?, category?, ... }]

ANALYZE OPTIONS:
  --min <n>               Minimum occurrences to show (default: 3)

MARK OPTIONS:
  --pattern, -p <id>      Pattern ID to mark as automated (required)
  --automation-ref, -a    Reference to the automation (e.g., ESLint rule name)

EXPORT OPTIONS:
  --output, -o <file>     Output file (default: stdout)

GENERATE-RULES OPTIONS:
  --rules-output <dir>    Directory to write generated rule files
  --config-output <file>  File to write ESLint config snippet
  --min <n>               Minimum occurrences to generate (default: 3)

EXAMPLES:
  # Add feedback from a PR review
  triad-feedback add --pr 123 --comment "Use Canon tokens instead of hardcoded colors" \\
    --file src/components/Button.svelte --category canon

  # Import feedback from GitHub API export
  triad-feedback import --input pr-comments.json

  # Analyze patterns ready for automation
  triad-feedback analyze --min 3

  # Mark pattern as automated after creating lint rule
  triad-feedback mark --pattern missing-canon-tokens --automation-ref canon-audit

  # Generate ESLint rules from patterns ready for automation
  triad-feedback generate-rules --rules-output rules/ --config-output .eslintrc-generated.json

  # View current status
  triad-feedback status

  # Export for reporting
  triad-feedback export --output feedback-report.json

WORKFLOW:
  1. Collect feedback during PR reviews (manual or GitHub API)
  2. Periodically run 'analyze' to find repeated patterns
  3. When patterns exceed threshold, implement automation
  4. Mark patterns as 'automated' to track progress
  5. Monitor for new emerging patterns

Reference: createsomething.ltd/ethos
`);
}

function printTable(headers: string[], rows: string[][]): void {
	const widths = headers.map((h, i) => {
		const max = Math.max(h.length, ...rows.map((r) => (r[i] || '').length));
		return Math.min(max, 40);
	});

	const hr = widths.map((w) => '─'.repeat(w + 2)).join('┼');

	console.log('┌' + hr.replace(/┼/g, '┬') + '┐');
	console.log(
		'│' +
			headers.map((h, i) => ` ${h.padEnd(widths[i])} `).join('│') +
			'│'
	);
	console.log('├' + hr + '┤');

	for (const row of rows) {
		console.log(
			'│' +
				row.map((cell, i) => {
					const text = (cell || '').slice(0, widths[i]);
					return ` ${text.padEnd(widths[i])} `;
				}).join('│') +
				'│'
		);
	}

	console.log('└' + hr.replace(/┼/g, '┴') + '┘');
}

// =============================================================================
// COMMANDS
// =============================================================================

function cmdAdd(collector: FeedbackCollector, options: CliOptions): void {
	if (!options.prId || !options.comment) {
		console.error('Error: --pr and --comment are required for add command');
		process.exit(1);
	}

	const entry = collector.addFeedback({
		prId: options.prId,
		comment: options.comment,
		file: options.file,
		line: options.line,
		category: options.category || 'other',
		severity: options.severity || 'medium',
		tags: options.tags || []
	});

	collector.save();

	if (options.format === 'json') {
		console.log(JSON.stringify(entry, null, 2));
	} else {
		console.log(`✓ Added feedback ${entry.id}`);
		if (entry.pattern) {
			console.log(`  Auto-detected pattern: ${entry.pattern}`);
		}
	}
}

function cmdImport(collector: FeedbackCollector, options: CliOptions): void {
	if (!options.inputFile) {
		console.error('Error: --input is required for import command');
		process.exit(1);
	}

	try {
		const data = JSON.parse(fs.readFileSync(options.inputFile, 'utf-8'));
		const entries = Array.isArray(data) ? data : [data];

		const added = collector.importFeedback(
			entries.map((e) => ({
				prId: e.prId || e.pr_id || 'unknown',
				comment: e.comment || e.body || e.text || '',
				file: e.file || e.path,
				line: e.line,
				category: e.category || 'other',
				severity: e.severity || 'medium',
				tags: e.tags || [],
				reviewer: e.reviewer || e.user?.login
			}))
		);

		collector.save();

		console.log(`✓ Imported ${added} new feedback entries`);
		console.log(`  (${entries.length - added} duplicates skipped)`);
	} catch (error) {
		console.error('Error importing feedback:', error);
		process.exit(1);
	}
}

function cmdAnalyze(collector: FeedbackCollector, options: CliOptions): void {
	const result = collector.analyze();
	collector.save();

	if (options.format === 'json') {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log('\n📊 PATTERN ANALYSIS');
	console.log('━'.repeat(60));

	// Stats summary
	console.log(`\nTotal entries: ${result.stats.totalEntries}`);
	console.log(`Total patterns: ${result.stats.totalPatterns}`);
	console.log(`Automated: ${result.stats.automatedCount}`);
	console.log(`Pending automation: ${result.stats.pendingAutomation}`);

	// Category breakdown
	console.log('\nBy category:');
	for (const [cat, count] of Object.entries(result.stats.categoryCounts)) {
		console.log(`  ${cat}: ${count}`);
	}

	// Patterns ready for automation
	if (result.readyForAutomation.length > 0) {
		console.log('\n🔔 READY FOR AUTOMATION');
		console.log('━'.repeat(60));

		const rows = result.readyForAutomation.map((p) => [
			p.id,
			p.category,
			p.occurrences.toString(),
			p.automationSuggestion?.type || '-',
			p.automationSuggestion?.effort || '-'
		]);

		printTable(
			['Pattern ID', 'Category', 'Count', 'Automation', 'Effort'],
			rows
		);

		// Show examples for top patterns
		console.log('\nTop pattern examples:');
		for (const pattern of result.readyForAutomation.slice(0, 3)) {
			console.log(`\n  ${pattern.name} (${pattern.occurrences}x):`);
			for (const ex of pattern.examples.slice(0, 2)) {
				console.log(`    "${ex.slice(0, 60)}${ex.length > 60 ? '...' : ''}"`);
			}
		}
	} else {
		console.log('\n✨ No patterns ready for automation yet');
		console.log(`   (threshold: ${options.minOccurrences || 3} occurrences)`);
	}

	// New patterns
	if (result.newPatterns.length > 0) {
		console.log(`\n📍 ${result.newPatterns.length} new pattern(s) detected this analysis`);
	}
}

function cmdStatus(collector: FeedbackCollector, options: CliOptions): void {
	const stats = collector.getStats();
	const state = collector.getState();

	if (options.format === 'json') {
		console.log(JSON.stringify({ stats, lastAnalysis: state.lastAnalysis }, null, 2));
		return;
	}

	console.log('\n📈 FEEDBACK TRACKER STATUS');
	console.log('━'.repeat(50));
	console.log(`Total entries:       ${stats.totalEntries}`);
	console.log(`Total patterns:      ${stats.totalPatterns}`);
	console.log(`Automated:           ${stats.automatedCount}`);
	console.log(`Pending automation:  ${stats.pendingAutomation}`);
	console.log(`Last analysis:       ${state.lastAnalysis}`);

	if (Object.keys(stats.categoryCounts).length > 0) {
		console.log('\nBy category:');
		const sorted = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
		for (const [cat, count] of sorted) {
			const bar = '█'.repeat(Math.min(count, 20));
			console.log(`  ${cat.padEnd(15)} ${bar} ${count}`);
		}
	}

	// Show ready for automation
	const ready = collector.getPatternsReadyForAutomation();
	if (ready.length > 0) {
		console.log(`\n🔔 ${ready.length} pattern(s) ready for automation!`);
		console.log('   Run "triad-feedback analyze" for details.');
	}
}

function cmdMark(collector: FeedbackCollector, options: CliOptions): void {
	if (!options.patternId) {
		console.error('Error: --pattern is required for mark command');
		process.exit(1);
	}

	const success = collector.markAutomated(
		options.patternId,
		options.automationRef || 'manual'
	);

	if (success) {
		collector.save();
		console.log(`✓ Marked pattern "${options.patternId}" as automated`);
		if (options.automationRef) {
			console.log(`  Reference: ${options.automationRef}`);
		}
	} else {
		console.error(`Error: Pattern "${options.patternId}" not found`);
		process.exit(1);
	}
}

function cmdExport(collector: FeedbackCollector, options: CliOptions): void {
	const state = collector.getState();
	const output = JSON.stringify(state, null, 2);

	if (options.outputFile) {
		fs.writeFileSync(options.outputFile, output, 'utf-8');
		console.log(`✓ Exported to ${options.outputFile}`);
	} else {
		console.log(output);
	}
}

function cmdGenerateRules(collector: FeedbackCollector, options: CliOptions): void {
	// Get patterns ready for automation
	const patternsReady = collector.getPatternsReadyForAutomation();

	if (patternsReady.length === 0) {
		console.log('ℹ No patterns ready for rule generation yet');
		console.log(`  (threshold: ${options.minOccurrences || 3} occurrences)`);
		return;
	}

	// Generate rules
	const result = generateRulesFromPatterns(patternsReady);

	// Output summary
	if (options.format === 'json') {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log('\n🔧 LINT RULE GENERATION');
	console.log('━'.repeat(60));

	// Stats
	console.log(`\nGenerated: ${result.generated.length} rule(s)`);
	console.log(`  - Custom rules: ${result.stats.custom}`);
	console.log(`  - Svelte rules: ${result.stats.svelte}`);
	console.log(`  - Existing rules to enable: ${result.stats.existing}`);
	console.log(`  - Canon patterns: ${result.stats.canon}`);

	if (result.skipped.length > 0) {
		console.log(`\nSkipped: ${result.skipped.length}`);
		for (const skip of result.skipped) {
			console.log(`  - ${skip.patternId}: ${skip.reason}`);
		}
	}

	// Output generated rules
	if (options.rulesOutput) {
		if (!fs.existsSync(options.rulesOutput)) {
			fs.mkdirSync(options.rulesOutput, { recursive: true });
		}

		const customRules = result.generated.filter((r) => r.type === 'custom');
		const svelteRules = result.generated.filter((r) => r.type === 'svelte');
		const canonRules = result.generated.filter((r) => r.type === 'canon');

		console.log(`\n📝 Writing rule files to ${options.rulesOutput}/`);

		for (const rule of customRules) {
			const filePath = path.join(options.rulesOutput, rule.fileName);
			fs.writeFileSync(filePath, rule.content, 'utf-8');
			console.log(`  ✓ ${rule.fileName} (custom)`);
		}

		for (const rule of svelteRules) {
			const filePath = path.join(options.rulesOutput, rule.fileName);
			fs.writeFileSync(filePath, rule.content, 'utf-8');
			console.log(`  ✓ ${rule.fileName} (Svelte)`);
		}

		for (const rule of canonRules) {
			const filePath = path.join(options.rulesOutput, rule.fileName);
			fs.writeFileSync(filePath, rule.content, 'utf-8');
			console.log(`  ✓ ${rule.fileName} (Canon pattern)`);
		}
	}

	// Output ESLint config
	if (options.configOutput) {
		const customRules = result.generated.filter((r) => r.type !== 'canon');
		const configContent = generateEslintConfig(customRules);
		fs.writeFileSync(options.configOutput, configContent, 'utf-8');
		console.log(`\n⚙️  ESLint config snippet written to ${options.configOutput}`);
		console.log('   Add to your .eslintrc.js:');
		const lines = configContent.split('\n').slice(2, 8);
		for (const line of lines) {
			console.log(`   ${line}`);
		}
	}

	// Mark patterns as automated
	if (options.rulesOutput || options.configOutput) {
		console.log('\n✅ Marking patterns as automated...');
		for (const generated of result.generated) {
			const success = collector.markAutomated(generated.patternId, generated.ruleName);
			if (success) {
				console.log(`  ✓ ${generated.patternId}`);
			}
		}
		collector.save();
	}
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.command === 'help') {
		showHelp();
		process.exit(0);
	}

	// Ensure storage directory exists
	const storageDir = path.dirname(options.storagePath);
	if (!fs.existsSync(storageDir)) {
		fs.mkdirSync(storageDir, { recursive: true });
	}

	const collector = new FeedbackCollector(
		options.storagePath,
		options.minOccurrences ? { minOccurrences: options.minOccurrences } : {}
	);

	switch (options.command) {
		case 'add':
			cmdAdd(collector, options);
			break;
		case 'import':
			cmdImport(collector, options);
			break;
		case 'analyze':
			cmdAnalyze(collector, options);
			break;
		case 'status':
			cmdStatus(collector, options);
			break;
		case 'mark':
			cmdMark(collector, options);
			break;
		case 'export':
			cmdExport(collector, options);
			break;
		case 'generate-rules':
			cmdGenerateRules(collector, options);
			break;
		default:
			showHelp();
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
