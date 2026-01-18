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
	const totalLessons = 5;
	const totalTriadUses =
		progress.triadApplications.dry +
		progress.triadApplications.rams +
		progress.triadApplications.heidegger +
		progress.triadApplications.full;
	const hasReflections = progress.reflections.length >= 3;
	const hasGraduationSignals = progress.graduationSignals.length >= 2;

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
			name: 'Graduation signals',
			met: hasGraduationSignals,
			current: `${progress.graduationSignals.length}/2`,
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
