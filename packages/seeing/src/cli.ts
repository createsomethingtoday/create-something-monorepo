#!/usr/bin/env node
/**
 * CLI for @createsomething/seeing
 *
 * Quick access to Seeing functionality outside of Gemini CLI.
 */

import { loadProgress, checkGraduationReadiness } from './progress.js';

const args = process.argv.slice(2);
const command = args[0];

function showHelp(): void {
	console.log(`
@createsomething/seeing — Learn to see through the Subtractive Triad

Usage:
  seeing init        Show setup instructions for Gemini CLI
  seeing status      Show your progress
  seeing graduate    Check if you're ready for Dwelling
  seeing help        Show this help

In Gemini CLI, use these commands:
  /triad [target]       Run a full Triad audit
  /dry [target]         Ask: Have I built this before?
  /rams [target]        Ask: Does this earn its existence?
  /heidegger [target]   Ask: Does this serve the whole?
  /lesson [name]        Read a lesson
  /reflect              Record a learning reflection
  /progress             View your journey
  /graduate             Check graduation readiness

Learn more: https://learn.createsomething.space/seeing
`);
}

function showInit(): void {
	console.log(`
# Installing @createsomething/seeing for Gemini CLI

## Option 1: Install via Gemini CLI
\`\`\`bash
gemini extensions install @createsomething/seeing
\`\`\`

## Option 2: Manual Configuration

Add to your Gemini CLI settings (~/.gemini/settings.json):

\`\`\`json
{
  "extensions": {
    "@createsomething/seeing": {
      "command": "npx",
      "args": ["@createsomething/seeing"]
    }
  }
}
\`\`\`

## Getting Started

Once installed, open Gemini CLI and say:

  "Help me learn the Subtractive Triad"

Or use the /lesson command:

  /lesson what-is-creation

## The Journey

Seeing → Dwelling

1. **Seeing** (you are here): Learn the philosophy
2. **Dwelling** (Claude Code): Execute with mastery

When you're ready, graduate with:

  /graduate

Learn more: https://learn.createsomething.space/seeing
`);
}

function showStatus(): void {
	const progress = loadProgress();

	console.log(`
# Seeing Progress

Started: ${progress.startedAt ? new Date(progress.startedAt).toLocaleDateString() : 'Not yet'}

Lessons: ${Object.values(progress.lessons).filter((l) => l.status === 'completed').length}/5 completed
Reflections: ${progress.reflections.length} recorded
Triad uses: ${
		progress.triadApplications.dry +
		progress.triadApplications.rams +
		progress.triadApplications.heidegger +
		progress.triadApplications.full
	} total

Run 'seeing graduate' to check graduation readiness.
`);
}

function showGraduate(): void {
	const result = checkGraduationReadiness();
	console.log(result);
}

// Main
switch (command) {
	case 'init':
		showInit();
		break;
	case 'status':
		showStatus();
		break;
	case 'graduate':
		showGraduate();
		break;
	case 'help':
	case '--help':
	case '-h':
	case undefined:
		showHelp();
		break;
	default:
		console.error(`Unknown command: ${command}`);
		showHelp();
		process.exit(1);
}
