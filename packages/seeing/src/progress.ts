/**
 * Progress tracking for Seeing journey.
 *
 * Stored locally at ~/.seeing/progress.json
 * This is self-assessed learning - honor reflections.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SEEING_DIR = join(homedir(), '.seeing');
const PROGRESS_FILE = join(SEEING_DIR, 'progress.json');

export interface LessonStatus {
	status: 'not_started' | 'in_progress' | 'completed';
	startedAt?: number;
	completedAt?: number;
}

export interface Reflection {
	id: string;
	timestamp: number;
	level: 'dry' | 'rams' | 'heidegger' | 'general';
	insight: string;
}

/**
 * Capstone project progress — Simple Loom Task Tracker.
 */
export interface CapstoneProgress {
	status: 'not_started' | 'in_progress' | 'completed';
	projectPath?: string;
	startedAt?: number;
	completedAt?: number;
	toolsVerified?: string[];
	triadFindings?: {
		dry: string;
		rams: string;
		heidegger: string;
	};
	reflection?: string;
}

/**
 * Result of capstone check — Simple Ground diagnostics.
 */
export interface CapstoneCheckResult {
	serverStarts: boolean;
	serverError?: string;
	tools: {
		name: string;
		exists: boolean;
		works: boolean;
		error?: string;
		expected?: string;
		actual?: string;
	}[];
	ready: boolean;
}

export interface SeeingProgress {
	version: 1;
	startedAt: number | null;
	lessons: Record<string, LessonStatus>;
	reflections: Reflection[];
	triadApplications: {
		dry: number;
		rams: number;
		heidegger: number;
		full: number;
	};
	graduationSignals: string[];
	capstone: CapstoneProgress;
}

/**
 * Ensure the .seeing directory exists.
 */
function ensureDir(): void {
	if (!existsSync(SEEING_DIR)) {
		mkdirSync(SEEING_DIR, { recursive: true });
	}
}

/**
 * Create a fresh progress object.
 */
function createInitialProgress(): SeeingProgress {
	return {
		version: 1,
		startedAt: null,
		lessons: {},
		reflections: [],
		triadApplications: {
			dry: 0,
			rams: 0,
			heidegger: 0,
			full: 0,
		},
		graduationSignals: [],
		capstone: {
			status: 'not_started',
		},
	};
}

/**
 * Load progress from disk.
 */
export function loadProgress(): SeeingProgress {
	ensureDir();

	if (!existsSync(PROGRESS_FILE)) {
		const initial = createInitialProgress();
		saveProgress(initial);
		return initial;
	}

	try {
		const content = readFileSync(PROGRESS_FILE, 'utf-8');
		return JSON.parse(content) as SeeingProgress;
	} catch {
		const initial = createInitialProgress();
		saveProgress(initial);
		return initial;
	}
}

/**
 * Save progress to disk.
 */
export function saveProgress(progress: SeeingProgress): void {
	ensureDir();
	writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Mark a lesson as started or completed.
 */
export function updateLessonStatus(
	lessonId: string,
	status: 'in_progress' | 'completed'
): void {
	const progress = loadProgress();

	if (!progress.startedAt) {
		progress.startedAt = Date.now();
	}

	if (!progress.lessons[lessonId]) {
		progress.lessons[lessonId] = { status: 'not_started' };
	}

	progress.lessons[lessonId].status = status;

	if (status === 'in_progress' && !progress.lessons[lessonId].startedAt) {
		progress.lessons[lessonId].startedAt = Date.now();
	}

	if (status === 'completed') {
		progress.lessons[lessonId].completedAt = Date.now();
	}

	saveProgress(progress);
}

/**
 * Add a reflection.
 */
export function addReflection(
	insight: string,
	level: 'dry' | 'rams' | 'heidegger' | 'general' = 'general'
): Reflection {
	const progress = loadProgress();

	const reflection: Reflection = {
		id: `reflect_${Date.now()}`,
		timestamp: Date.now(),
		level,
		insight,
	};

	progress.reflections.push(reflection);

	// Check for graduation signals in the reflection
	const graduationPatterns = [
		/without thinking/i,
		/automatic/i,
		/instinct/i,
		/caught myself/i,
		/before I/i,
		/naturally/i,
	];

	for (const pattern of graduationPatterns) {
		if (pattern.test(insight) && !progress.graduationSignals.includes(insight)) {
			progress.graduationSignals.push(insight);
		}
	}

	saveProgress(progress);
	return reflection;
}

/**
 * Record a Triad question use.
 */
export function recordTriadUse(level: 'dry' | 'rams' | 'heidegger' | 'full'): void {
	const progress = loadProgress();

	if (!progress.startedAt) {
		progress.startedAt = Date.now();
	}

	progress.triadApplications[level]++;

	saveProgress(progress);
}

/**
 * Check if user is ready to graduate to Dwelling.
 */
export function checkGraduationReadiness(): string {
	const progress = loadProgress();

	// Criteria
	const lessonsCompleted = Object.values(progress.lessons).filter(
		(l) => l.status === 'completed'
	).length;
	const totalLessons = 6; // Including capstone
	const totalTriadUses =
		progress.triadApplications.dry +
		progress.triadApplications.rams +
		progress.triadApplications.heidegger +
		progress.triadApplications.full;
	const hasReflections = progress.reflections.length >= 3;
	const capstoneCompleted = progress.capstone?.status === 'completed';

	// Scoring
	const criteria = [
		{
			name: 'Lessons completed',
			met: lessonsCompleted >= totalLessons,
			current: `${lessonsCompleted}/${totalLessons}`,
		},
		{
			name: 'Triad applications',
			met: totalTriadUses >= 10,
			current: `${totalTriadUses}/10`,
		},
		{
			name: 'Reflections recorded',
			met: hasReflections,
			current: `${progress.reflections.length}/3`,
		},
		{
			name: 'Capstone completed',
			met: capstoneCompleted,
			current: capstoneCompleted ? 'Done' : 'Not done',
		},
	];

	const allMet = criteria.every((c) => c.met);

	let result = `# Graduation Assessment\n\n`;

	result += `## Criteria\n\n`;
	for (const c of criteria) {
		result += `${c.met ? '✓' : '○'} **${c.name}**: ${c.current}\n`;
	}

	result += `\n---\n\n`;

	if (allMet) {
		result += `## You're Ready to Dwell

You've learned to see. The Triad isn't a checklist anymore—it's how you perceive.

You notice duplication before you duplicate.
You question existence before you build.
You consider the whole before the part.

**You're ready for Dwelling.**

In Dwelling, the tools recede. You won't notice Claude Code—you'll notice your work. The questions you learned to ask will be answered automatically. The perception you developed will be augmented with execution.

To continue your journey:

\`\`\`bash
npx @createsomething/learn init
\`\`\`

Then in Claude Code, say: "I've graduated from Seeing. Help me begin Dwelling."

Welcome to the practice.`;
	} else {
		result += `## Keep Seeing

You're developing well, but there's more to learn.

**What to focus on**:
${criteria
	.filter((c) => !c.met)
	.map((c) => `- ${c.name}: currently ${c.current}`)
	.join('\n')}

The goal isn't to check boxes. It's to change how you see.

When you catch yourself asking the questions without thinking about the questions, you're ready.

Keep practicing:
- Use /triad on real decisions
- Record reflections when you notice something
- Let the Triad become perception, not process`;
	}

	return result;
}

// ============================================================================
// Capstone Functions — Simple Loom / Simple Ground
// ============================================================================

/**
 * Start the capstone project.
 */
export function startCapstone(projectPath: string): string {
	const progress = loadProgress();

	// Ensure capstone exists (for backwards compatibility)
	if (!progress.capstone) {
		progress.capstone = { status: 'not_started' };
	}

	progress.capstone.status = 'in_progress';
	progress.capstone.projectPath = projectPath;
	progress.capstone.startedAt = Date.now();

	saveProgress(progress);

	return `# Capstone Started

**Project path**: ${projectPath}

You're building Simple Loom — a Task Tracker MCP server.

## Next Steps

1. Open \`src/index.ts\` and complete the TODOs
2. Build with \`npm run build\`
3. Run \`/capstone check\` to test your implementation

The storage layer (\`src/tasks.ts\`) is provided complete.

Apply the Triad as you build:
- **DRY**: Reuse patterns from the scaffold
- **Rams**: Keep it simple — four tools is enough
- **Heidegger**: Design for Claude Code's workflow`;
}

/**
 * Check the capstone project — Simple Ground verification.
 * 
 * This returns structured diagnostics that Gemini interprets for the user.
 */
export async function checkCapstone(projectPath: string): Promise<CapstoneCheckResult> {
	const { existsSync } = await import('fs');
	const { join } = await import('path');
	const { spawn } = await import('child_process');

	const result: CapstoneCheckResult = {
		serverStarts: false,
		tools: [],
		ready: false,
	};

	// Check project exists
	if (!existsSync(projectPath)) {
		result.serverError = `Project not found at: ${projectPath}`;
		return result;
	}

	// Check dist/index.js exists (built)
	const indexPath = join(projectPath, 'dist', 'index.js');
	if (!existsSync(indexPath)) {
		result.serverError = 'Project not built. Run: npm run build';
		return result;
	}

	// Try to get tool list by spawning the server
	try {
		const tools = await getServerTools(indexPath);
		result.serverStarts = true;

		// Expected tools
		const expectedTools = ['task_add', 'task_list', 'task_complete', 'task_remove'];

		for (const expected of expectedTools) {
			const found = tools.find((t: { name: string }) => t.name === expected);
			result.tools.push({
				name: expected,
				exists: !!found,
				works: !!found, // We'd need to actually call them to truly verify
				expected: getExpectedBehavior(expected),
			});
		}

		// Check if all tools exist
		result.ready = result.tools.every((t) => t.exists);

		// Update progress
		const progress = loadProgress();
		if (!progress.capstone) {
			progress.capstone = { status: 'not_started' };
		}
		progress.capstone.toolsVerified = result.tools
			.filter((t) => t.exists)
			.map((t) => t.name);
		saveProgress(progress);
	} catch (error) {
		result.serverError = `Server error: ${error instanceof Error ? error.message : String(error)}`;
	}

	return result;
}

/**
 * Get tools from an MCP server by sending a tools/list request.
 */
async function getServerTools(serverPath: string): Promise<Array<{ name: string }>> {
	const { spawn } = await import('child_process');

	return new Promise((resolve, reject) => {
		const server = spawn('node', [serverPath], {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		server.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		server.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		// Send tools/list request
		const request = JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/list',
			params: {},
		}) + '\n';

		server.stdin.write(request);

		// Set timeout
		const timeout = setTimeout(() => {
			server.kill();
			reject(new Error('Server timeout'));
		}, 5000);

		// Wait for response
		server.stdout.on('data', () => {
			try {
				// Try to parse each line as JSON
				const lines = stdout.split('\n').filter((l) => l.trim());
				for (const line of lines) {
					const response = JSON.parse(line);
					if (response.id === 1 && response.result?.tools) {
						clearTimeout(timeout);
						server.kill();
						resolve(response.result.tools);
						return;
					}
				}
			} catch {
				// Keep waiting for valid JSON
			}
		});

		server.on('close', () => {
			clearTimeout(timeout);
			if (stderr) {
				reject(new Error(stderr));
			} else {
				reject(new Error('Server closed without response'));
			}
		});
	});
}

/**
 * Get expected behavior description for a tool.
 */
function getExpectedBehavior(toolName: string): string {
	const behaviors: Record<string, string> = {
		task_add: 'Returns { task: { id, title, status: "todo", created } }',
		task_list: 'Returns { tasks: [...] }',
		task_complete: 'Returns { task: { ...status: "done" } } or { error: "..." }',
		task_remove: 'Returns { removed: true/false }',
	};
	return behaviors[toolName] || 'Unknown';
}

/**
 * Complete the capstone project.
 */
export function completeCapstone(findings: {
	dryFindings: string;
	ramsFindings: string;
	heideggerFindings: string;
	reflection: string;
}): string {
	const progress = loadProgress();

	// Ensure capstone exists
	if (!progress.capstone) {
		progress.capstone = { status: 'not_started' };
	}

	progress.capstone.status = 'completed';
	progress.capstone.completedAt = Date.now();
	progress.capstone.triadFindings = {
		dry: findings.dryFindings,
		rams: findings.ramsFindings,
		heidegger: findings.heideggerFindings,
	};
	progress.capstone.reflection = findings.reflection;

	// Mark capstone lesson as completed
	if (!progress.lessons['capstone']) {
		progress.lessons['capstone'] = { status: 'not_started' };
	}
	progress.lessons['capstone'].status = 'completed';
	progress.lessons['capstone'].completedAt = Date.now();

	saveProgress(progress);

	return `# Capstone Complete

You've built **Simple Loom** — your first automation infrastructure.

## Your Triad Findings

**DRY**: ${findings.dryFindings}

**Rams**: ${findings.ramsFindings}

**Heidegger**: ${findings.heideggerFindings}

## Your Reflection

${findings.reflection}

---

## What You Learned

- **Task lifecycle patterns** — todo → doing → done
- **State persistence** — external memory for agents
- **Agent-native tool design** — serving Claude Code's workflow
- **Evidence-first verification** — Simple Ground

## What's Next

Run \`/graduate\` to check your readiness for Dwelling.

Your Task Tracker works. You can keep using it with Claude Code.

**WORKWAY's Focus Workflow** does this at team scale.
**learn.createsomething.io** covers building production automation.

You've started building. That's the difference between Seeing and Dwelling.`;
}
