/**
 * Automation Patterns Pack
 *
 * 10 production-tested automation patterns from WORKWAY methodology.
 * Each pattern follows the Subtractive Triad: DRY → Rams → Heidegger
 *
 * Complexity Ratings:
 * - Simple: Single tool, <1 hour to implement
 * - Moderate: 2-3 tools, 1-4 hours to implement
 * - Advanced: Multi-tool orchestration, 4+ hours to implement
 */

export interface AutomationPattern {
	id: string;
	title: string;
	description: string;
	complexity: 'simple' | 'moderate' | 'advanced';
	triadLevel: 'implementation' | 'artifact' | 'system';
	timeToImplement: string;
	toolsUsed: string[];
	prerequisites: string[];
	useCase: string;
	whatItRemoves: string[];
	implementation: {
		steps: string[];
		codeExample?: string;
		harnessTip?: string;
	};
	variations: string[];
}

export const patterns: AutomationPattern[] = [
	// ============================================================================
	// SIMPLE PATTERNS (Single tool, <1 hour)
	// ============================================================================
	{
		id: 'git-commit-assistant',
		title: 'Git Commit Message Generator',
		description:
			'Automatically generate meaningful commit messages from staged changes using Claude Code conventions.',
		complexity: 'simple',
		triadLevel: 'implementation',
		timeToImplement: '15 minutes',
		toolsUsed: ['Claude Code', 'Git'],
		prerequisites: ['Claude Code installed', 'Git repository'],
		useCase:
			'You commit frequently but writing good commit messages slows you down. The pattern ensures consistent, informative messages.',
		whatItRemoves: [
			'Time spent crafting commit messages',
			'Inconsistent commit message formats',
			"Vague messages like 'fixed stuff'"
		],
		implementation: {
			steps: [
				'Stage your changes with `git add`',
				'Run Claude Code with: "Generate a commit message for these changes"',
				'Review and commit with the generated message'
			],
			codeExample: `# In Claude Code, after staging changes:
# "Commit these changes following conventional commits"

# Claude will generate:
git commit -m "$(cat <<'EOF'
feat(auth): add password reset flow

- Add forgot password endpoint
- Create reset token generation
- Send reset email via Resend
- Add token validation middleware

🤖 Generated with Claude Code
EOF
)"`,
			harnessTip:
				'Add a pre-commit hook that prompts Claude for message generation if message is empty.'
		},
		variations: [
			'Conventional Commits format (feat:, fix:, etc.)',
			'Emoji-prefixed messages',
			'Ticket number extraction from branch name'
		]
	},

	{
		id: 'code-review-checklist',
		title: 'Automated Code Review Checklist',
		description:
			'Run a structured code review against your changes using the Subtractive Triad principles.',
		complexity: 'simple',
		triadLevel: 'artifact',
		timeToImplement: '30 minutes',
		toolsUsed: ['Claude Code'],
		prerequisites: ['Claude Code installed', 'Code changes to review'],
		useCase:
			'Before PRs, run a consistent review that checks for DRY violations, unnecessary complexity, and system coherence.',
		whatItRemoves: [
			'Inconsistent code review quality',
			'Missed patterns that should be unified',
			'Unnecessary complexity that slips through'
		],
		implementation: {
			steps: [
				'Create a skill file with review criteria',
				'Run review on staged changes or specific files',
				'Address findings before committing'
			],
			codeExample: `# .claude/skills/code-review.md
---
name: code-review
description: Review code using Subtractive Triad
---

Review this code through three lenses:

1. **DRY (Implementation)**: Are there patterns duplicated?
   - Similar functions that should be unified
   - Repeated logic across files
   - Copy-pasted code blocks

2. **Rams (Artifact)**: Does each element earn its existence?
   - Unused imports or variables
   - Over-engineered abstractions
   - Comments that state the obvious

3. **Heidegger (System)**: Does it serve the whole?
   - Consistent with codebase patterns
   - Clear responsibility boundaries
   - Integration with existing systems`,
			harnessTip:
				'Make this part of your Beads workflow—run review before closing any issue.'
		},
		variations: [
			'Security-focused review',
			'Performance-focused review',
			'Accessibility-focused review'
		]
	},

	{
		id: 'daily-standup-summary',
		title: 'Beads-Powered Daily Summary',
		description:
			'Generate a standup-ready summary of yesterday\'s work and today\'s focus from Beads issues.',
		complexity: 'simple',
		triadLevel: 'implementation',
		timeToImplement: '20 minutes',
		toolsUsed: ['Beads', 'Claude Code'],
		prerequisites: ['Beads installed', 'Issues tracked in Beads'],
		useCase:
			"Start each day with context recovery. Know what you completed yesterday and what's blocked.",
		whatItRemoves: [
			'Context switching overhead',
			'Forgotten work from previous session',
			'Manual standup preparation'
		],
		implementation: {
			steps: [
				'Run Beads summary command',
				'Claude summarizes in standup format',
				'Copy to Slack/email if needed'
			],
			codeExample: `# Morning standup generation
bd list --status=closed --since=24h --format=log > /tmp/yesterday.txt
bd ready > /tmp/today.txt

# In Claude Code:
# "Generate a standup summary from /tmp/yesterday.txt (done)
#  and /tmp/today.txt (planned)"

# Output:
# Yesterday: Completed auth flow (csm-a1b2), fixed login bug (csm-c3d4)
# Today: Starting dashboard layout (csm-e5f6), unblocked by auth completion
# Blockers: None`,
			harnessTip: 'Add this to your session startup protocol in ~/.claude/settings.json'
		},
		variations: [
			'Weekly summary for planning meetings',
			'Sprint retrospective data extraction',
			'Client-facing progress report'
		]
	},

	// ============================================================================
	// MODERATE PATTERNS (2-3 tools, 1-4 hours)
	// ============================================================================
	{
		id: 'documentation-sync',
		title: 'Code-to-Documentation Sync',
		description:
			'Keep documentation in sync with code by extracting types, functions, and patterns automatically.',
		complexity: 'moderate',
		triadLevel: 'artifact',
		timeToImplement: '2 hours',
		toolsUsed: ['Claude Code', 'TypeScript', 'Markdown'],
		prerequisites: ['TypeScript codebase', 'Documentation directory'],
		useCase:
			'Documentation drifts from code. This pattern extracts type definitions and generates updated docs.',
		whatItRemoves: [
			'Stale documentation',
			'Manual documentation updates',
			'Inconsistency between code and docs'
		],
		implementation: {
			steps: [
				'Define documentation templates',
				'Extract types and interfaces from code',
				'Generate markdown from extracted data',
				'Create diff to review changes'
			],
			codeExample: `# documentation-sync.ts
import { glob } from 'glob';
import { readFile } from 'fs/promises';

// Extract exported types from TypeScript files
const files = await glob('src/**/*.ts');
for (const file of files) {
  const content = await readFile(file, 'utf-8');
  const exports = content.match(/export (interface|type|function) \\w+/g);
  // Generate markdown for each export...
}

# In Claude Code:
# "Update docs/api.md based on src/lib/types/*.ts"`,
			harnessTip: 'Run documentation sync as part of your CI pipeline or pre-commit hook.'
		},
		variations: [
			'API documentation from route handlers',
			'Component documentation from Svelte files',
			'Configuration documentation from schema'
		]
	},

	{
		id: 'error-triage-automation',
		title: 'Error Log Triage Assistant',
		description:
			'Automatically categorize and prioritize errors from logs, creating Beads issues for actionable items.',
		complexity: 'moderate',
		triadLevel: 'system',
		timeToImplement: '3 hours',
		toolsUsed: ['Claude Code', 'Beads', 'Cloudflare Workers Logs'],
		prerequisites: ['Production deployment', 'Beads installed', 'Log access'],
		useCase:
			'Production errors accumulate. This pattern triages errors, groups related issues, and creates actionable tickets.',
		whatItRemoves: [
			'Manual error log review',
			'Duplicate bug tickets for same root cause',
			'Overlooked critical errors'
		],
		implementation: {
			steps: [
				'Fetch recent error logs',
				'Claude categorizes by severity and root cause',
				'Group related errors',
				'Create Beads issues for unique problems'
			],
			codeExample: `# error-triage.sh
#!/bin/bash

# Fetch last 24h of errors
wrangler pages deployment tail --project-name=my-project \\
  --format=json --filter='{ "outcome": "exception" }' \\
  > /tmp/errors.json

# In Claude Code:
# "Analyze /tmp/errors.json and create Beads issues for unique errors.
#  Group related errors. Prioritize by frequency and severity."

# Claude creates:
bd create "Fix: Null pointer in auth middleware" --priority P1 --label bug
bd create "Fix: Rate limit exceeded on /api/search" --priority P2 --label bug`,
			harnessTip:
				'Schedule this to run daily via cron. Review created issues in morning standup.'
		},
		variations: [
			'Real-time error alerting',
			'Weekly error trend analysis',
			'Customer-reported issue correlation'
		]
	},

	{
		id: 'dependency-update-review',
		title: 'Intelligent Dependency Updates',
		description:
			'Review npm dependency updates with changelog analysis and breaking change detection.',
		complexity: 'moderate',
		triadLevel: 'implementation',
		timeToImplement: '2 hours',
		toolsUsed: ['Claude Code', 'npm/pnpm', 'GitHub API'],
		prerequisites: ['npm/pnpm project', 'GitHub access for changelogs'],
		useCase:
			'Dependency updates are risky without changelog review. This pattern analyzes updates before applying.',
		whatItRemoves: [
			'Blind dependency updates',
			'Time spent reading changelogs manually',
			'Missed breaking changes'
		],
		implementation: {
			steps: [
				'Run npm outdated to list updates',
				'Fetch changelogs from GitHub',
				'Claude analyzes breaking changes',
				'Generate update plan with migration notes'
			],
			codeExample: `# dependency-review.sh
#!/bin/bash

# List outdated dependencies
pnpm outdated --json > /tmp/outdated.json

# In Claude Code:
# "Review /tmp/outdated.json. For each major update, fetch the changelog
#  and identify breaking changes. Generate an update plan."

# Output:
# 1. svelte: 5.40 → 5.41 (minor, safe to update)
# 2. vite: 6.0 → 7.0 (major, breaking changes):
#    - Config format changed: vite.config.ts needs migration
#    - Plugin API updated: check custom plugins
# 3. stripe: 17.0 → 18.0 (major, breaking changes):
#    - API version change: update webhook handlers`,
			harnessTip:
				'Create a Beads issue for major updates with the migration plan attached.'
		},
		variations: [
			'Security-focused update prioritization',
			'Automated PR creation for safe updates',
			'Dependency license compliance check'
		]
	},

	// ============================================================================
	// ADVANCED PATTERNS (Multi-tool orchestration, 4+ hours)
	// ============================================================================
	{
		id: 'harness-workflow',
		title: 'Multi-Session Harness Orchestration',
		description:
			'Break large tasks into Beads issues and work through them across multiple Claude Code sessions.',
		complexity: 'advanced',
		triadLevel: 'system',
		timeToImplement: '4 hours',
		toolsUsed: ['Claude Code', 'Beads', 'Git'],
		prerequisites: ['Beads installed', 'Large task to complete', 'Harness skill configured'],
		useCase:
			'Work that exceeds a single session context. The harness maintains progress across sessions with checkpoints.',
		whatItRemoves: [
			'Lost context between sessions',
			'Incomplete multi-file changes',
			'Manual progress tracking'
		],
		implementation: {
			steps: [
				'Define the overall goal',
				'Claude breaks into independently-completable tasks',
				'Create Beads issues with dependencies',
				'Work through issues one at a time',
				'Checkpoint when confidence drops'
			],
			codeExample: `# Start a harness workflow
# In Claude Code:
# "Migrate all components to Canon CSS tokens. This is a multi-session task."

# Claude creates Beads issues:
bd create "Migrate Button component to Canon" --priority P1
bd create "Migrate Card component to Canon" --priority P1
bd create "Migrate Form components to Canon" --priority P2
bd dep add csm-form csm-button  # Form depends on Button patterns

# Work through issues:
bd update csm-button --status in_progress
# ... complete work ...
bd close csm-button --reason "Commit: abc123"

# Check progress anytime:
bd progress`,
			harnessTip:
				'Invoke /harness-spec when you detect work affecting >5 files or spanning multiple days.'
		},
		variations: [
			'Parallel work with multiple agents',
			'Client-facing progress reports',
			'Automatic checkpoint scheduling'
		]
	},

	{
		id: 'research-synthesis',
		title: 'Research-to-Action Pipeline',
		description:
			'Gather information from multiple sources, synthesize findings, and generate actionable recommendations.',
		complexity: 'advanced',
		triadLevel: 'system',
		timeToImplement: '6 hours',
		toolsUsed: ['Claude Code', 'Web Search', 'Beads', 'Markdown'],
		prerequisites: ['Research question', 'Output format defined'],
		useCase:
			'Technical research requires gathering from docs, GitHub, and articles. This pattern synthesizes into actionable output.',
		whatItRemoves: [
			'Context switching during research',
			'Incomplete source gathering',
			'Research that never becomes action'
		],
		implementation: {
			steps: [
				'Define research question and scope',
				'Claude gathers from multiple sources',
				'Synthesize findings with citations',
				'Generate actionable recommendations',
				'Create Beads issues for next steps'
			],
			codeExample: `# research-synthesis.md
# Research: Best practices for Cloudflare Workers caching

## Sources Gathered
1. Cloudflare docs: Workers KV vs Cache API
2. GitHub: cloudflare/workers-sdk examples
3. Blog: "Caching strategies for serverless"

## Synthesis
Cache API is preferred for dynamic content with:
- stale-while-revalidate for performance
- Key prefixing for cache busting
- TTL based on content type

## Recommendations
1. Use Cache API for API responses (TTL: 5 min)
2. Use KV for configuration (TTL: 1 hour)
3. Implement cache tags for targeted invalidation

## Next Steps
bd create "Implement Cache API wrapper" --priority P1
bd create "Add cache invalidation endpoint" --priority P2`,
			harnessTip:
				'Use web search sparingly—prioritize official docs and verified sources.'
		},
		variations: [
			'Competitive analysis',
			'Technology evaluation',
			'Architecture decision records'
		]
	},

	{
		id: 'api-integration-scaffold',
		title: 'API Integration Scaffolding',
		description:
			'Generate type-safe API clients from OpenAPI specs or documentation with error handling and retry logic.',
		complexity: 'advanced',
		triadLevel: 'implementation',
		timeToImplement: '4 hours',
		toolsUsed: ['Claude Code', 'TypeScript', 'OpenAPI/REST docs'],
		prerequisites: ['API documentation', 'TypeScript project'],
		useCase:
			'New API integrations require boilerplate: types, clients, error handling. This pattern scaffolds the entire integration.',
		whatItRemoves: [
			'Boilerplate API client code',
			'Type mismatches with API',
			'Inconsistent error handling'
		],
		implementation: {
			steps: [
				'Provide API documentation or OpenAPI spec',
				'Claude generates TypeScript types',
				'Generate client functions with error handling',
				'Add retry logic and rate limiting',
				'Generate tests for each endpoint'
			],
			codeExample: `# In Claude Code:
# "Generate a type-safe client for the Stripe API focusing on:
#  - Checkout Sessions
#  - Webhooks
#  - Customer management
#  Include retry logic and error types."

# Generated structure:
src/lib/stripe/
├── types.ts         # Stripe type definitions
├── client.ts        # API client with retry logic
├── checkout.ts      # Checkout session functions
├── webhooks.ts      # Webhook handling
└── errors.ts        # Stripe error types

# Example generated code:
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<Result<CheckoutSession, StripeError>> {
  return withRetry(async () => {
    const response = await stripe.checkout.sessions.create(params);
    return ok(response);
  }, { maxRetries: 3, backoff: 'exponential' });
}`,
			harnessTip:
				'Keep API client generation in a Beads issue so you can track integration progress.'
		},
		variations: [
			'GraphQL client generation',
			'SDK wrapper for third-party services',
			'Mock client for testing'
		]
	},

	{
		id: 'migration-orchestration',
		title: 'Database Migration Orchestration',
		description:
			'Plan and execute database migrations with rollback strategies and data validation.',
		complexity: 'advanced',
		triadLevel: 'system',
		timeToImplement: '8 hours',
		toolsUsed: ['Claude Code', 'D1/SQLite', 'Beads', 'Git'],
		prerequisites: ['Database access', 'Schema changes defined', 'Backup strategy'],
		useCase:
			'Database migrations are risky. This pattern plans migrations, generates SQL, and validates data integrity.',
		whatItRemoves: [
			'Migration-related downtime',
			'Data loss from failed migrations',
			'Manual rollback procedures'
		],
		implementation: {
			steps: [
				'Define schema changes needed',
				'Claude generates migration SQL',
				'Generate rollback SQL',
				'Create data validation queries',
				'Execute with checkpoints'
			],
			codeExample: `# migration-plan.md
## Migration: Add user preferences table

### Forward Migration (0008_user_preferences.sql)
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  theme TEXT DEFAULT 'dark',
  notifications INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

### Rollback (0008_user_preferences_rollback.sql)
DROP TABLE IF EXISTS user_preferences;

### Data Validation
-- Before migration
SELECT COUNT(*) as user_count FROM users;

-- After migration
SELECT COUNT(*) as pref_count FROM user_preferences;
-- Should equal user_count if populating defaults

### Execution
1. Backup: wrangler d1 backup DB_NAME
2. Apply: wrangler d1 migrations apply DB_NAME
3. Validate: Run validation queries
4. Checkpoint: bd close csm-migration --reason "Migration complete"`,
			harnessTip:
				'Always create a Beads issue for migrations and include rollback procedures in the description.'
		},
		variations: [
			'Zero-downtime migrations',
			'Data transformation migrations',
			'Cross-database sync'
		]
	}
];

/**
 * Get all patterns
 */
export function getAllPatterns(): AutomationPattern[] {
	return patterns;
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): AutomationPattern | undefined {
	return patterns.find((p) => p.id === id);
}

/**
 * Get patterns by complexity
 */
export function getPatternsByComplexity(
	complexity: AutomationPattern['complexity']
): AutomationPattern[] {
	return patterns.filter((p) => p.complexity === complexity);
}

/**
 * Get patterns by triad level
 */
export function getPatternsByTriadLevel(
	level: AutomationPattern['triadLevel']
): AutomationPattern[] {
	return patterns.filter((p) => p.triadLevel === level);
}
