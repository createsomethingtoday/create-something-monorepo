/**
 * Reflection Storage
 *
 * Persists reflections and their analysis to ~/.create-something/reflections.json
 * Canon: Reflections are traces of dwelling; analysis reveals depth.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const CONFIG_DIR = join(homedir(), '.create-something');
const REFLECTIONS_FILE = join(CONFIG_DIR, 'reflections.json');

export interface ReflectionAnalysis {
	depth: 'surface' | 'applied' | 'integrated';
	triadConcepts: {
		dry: string[];
		rams: string[];
		heidegger: string[];
	};
	questions: string[];
	actionItems: string[];
	score: number; // 0-100
}

export interface StoredReflection {
	id: string;
	lessonId?: string;
	pathId?: string;
	praxisId?: string;
	text: string;
	analysis: ReflectionAnalysis;
	createdAt: number;
}

export interface ReflectionStore {
	version: 1;
	reflections: StoredReflection[];
}

/**
 * Generate a short unique ID
 */
function generateId(): string {
	return randomBytes(4).toString('hex');
}

/**
 * Ensure the config directory exists
 */
function ensureConfigDir(): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
	}
}

/**
 * Load stored reflections
 */
export function loadReflections(): ReflectionStore {
	try {
		if (!existsSync(REFLECTIONS_FILE)) {
			return { version: 1, reflections: [] };
		}

		const content = readFileSync(REFLECTIONS_FILE, 'utf-8');
		const store = JSON.parse(content) as ReflectionStore;

		if (store.version !== 1 || !Array.isArray(store.reflections)) {
			return { version: 1, reflections: [] };
		}

		return store;
	} catch {
		return { version: 1, reflections: [] };
	}
}

/**
 * Save reflections to disk
 */
export function saveReflections(store: ReflectionStore): void {
	ensureConfigDir();
	writeFileSync(REFLECTIONS_FILE, JSON.stringify(store, null, 2));
}

/**
 * Add a new reflection with analysis
 */
export function addReflection(
	text: string,
	analysis: ReflectionAnalysis,
	context?: {
		lessonId?: string;
		pathId?: string;
		praxisId?: string;
	}
): StoredReflection {
	const store = loadReflections();

	const reflection: StoredReflection = {
		id: generateId(),
		text,
		analysis,
		createdAt: Date.now(),
		...context
	};

	store.reflections.push(reflection);
	saveReflections(store);

	return reflection;
}

/**
 * Get reflections by lesson
 */
export function getReflectionsByLesson(lessonId: string): StoredReflection[] {
	const store = loadReflections();
	return store.reflections.filter((r) => r.lessonId === lessonId);
}

/**
 * Get reflections by path
 */
export function getReflectionsByPath(pathId: string): StoredReflection[] {
	const store = loadReflections();
	return store.reflections.filter((r) => r.pathId === pathId);
}

/**
 * Get recent reflections
 */
export function getRecentReflections(limit = 10): StoredReflection[] {
	const store = loadReflections();
	return store.reflections
		.sort((a, b) => b.createdAt - a.createdAt)
		.slice(0, limit);
}

/**
 * Get average reflection score over time
 */
export function getReflectionStats(): {
	totalReflections: number;
	averageScore: number;
	depthDistribution: Record<'surface' | 'applied' | 'integrated', number>;
	triadCoverage: Record<'dry' | 'rams' | 'heidegger', number>;
} {
	const store = loadReflections();
	const reflections = store.reflections;

	if (reflections.length === 0) {
		return {
			totalReflections: 0,
			averageScore: 0,
			depthDistribution: { surface: 0, applied: 0, integrated: 0 },
			triadCoverage: { dry: 0, rams: 0, heidegger: 0 }
		};
	}

	const totalScore = reflections.reduce((sum, r) => sum + r.analysis.score, 0);
	const averageScore = totalScore / reflections.length;

	const depthDistribution = reflections.reduce(
		(acc, r) => {
			acc[r.analysis.depth]++;
			return acc;
		},
		{ surface: 0, applied: 0, integrated: 0 }
	);

	const triadCoverage = reflections.reduce(
		(acc, r) => {
			if (r.analysis.triadConcepts.dry.length > 0) acc.dry++;
			if (r.analysis.triadConcepts.rams.length > 0) acc.rams++;
			if (r.analysis.triadConcepts.heidegger.length > 0) acc.heidegger++;
			return acc;
		},
		{ dry: 0, rams: 0, heidegger: 0 }
	);

	return {
		totalReflections: reflections.length,
		averageScore,
		depthDistribution,
		triadCoverage
	};
}

/**
 * Get the reflections file path (for display)
 */
export function getReflectionsPath(): string {
	return REFLECTIONS_FILE;
}
