/**
 * Lesson Cache
 *
 * Caches lesson content locally with 24-hour TTL.
 * Canon: Content recedes into availability.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { CacheManifest, LessonContent } from '../types.js';

const CACHE_DIR = join(homedir(), '.create-something', 'cache', 'lessons');
const MANIFEST_FILE = join(homedir(), '.create-something', 'cache', 'manifest.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Ensure cache directories exist
 */
function ensureCacheDir(pathId: string): void {
	const pathDir = join(CACHE_DIR, pathId);
	if (!existsSync(pathDir)) {
		mkdirSync(pathDir, { recursive: true });
	}
}

/**
 * Load cache manifest
 */
function loadManifest(): CacheManifest {
	try {
		if (!existsSync(MANIFEST_FILE)) {
			return { version: 1, lessons: {} };
		}
		return JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'));
	} catch {
		return { version: 1, lessons: {} };
	}
}

/**
 * Save cache manifest
 */
function saveManifest(manifest: CacheManifest): void {
	const cacheRoot = join(homedir(), '.create-something', 'cache');
	if (!existsSync(cacheRoot)) {
		mkdirSync(cacheRoot, { recursive: true });
	}
	writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Get cache key for a lesson
 */
function getCacheKey(pathId: string, lessonId: string): string {
	return `${pathId}/${lessonId}`;
}

/**
 * Get cached lesson content
 */
export function getCachedLesson(pathId: string, lessonId: string): LessonContent | null {
	const manifest = loadManifest();
	const key = getCacheKey(pathId, lessonId);
	const entry = manifest.lessons[key];

	// Check if cached and not expired
	if (!entry || Date.now() - entry.fetchedAt > TTL_MS) {
		return null;
	}

	try {
		const filePath = join(CACHE_DIR, pathId, `${lessonId}.json`);
		if (!existsSync(filePath)) {
			return null;
		}

		return JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch {
		return null;
	}
}

/**
 * Cache lesson content
 */
export function cacheLesson(pathId: string, lessonId: string, content: LessonContent): void {
	ensureCacheDir(pathId);

	const filePath = join(CACHE_DIR, pathId, `${lessonId}.json`);
	writeFileSync(filePath, JSON.stringify(content, null, 2));

	const manifest = loadManifest();
	const key = getCacheKey(pathId, lessonId);
	manifest.lessons[key] = { fetchedAt: Date.now() };
	saveManifest(manifest);
}

/**
 * Check if lesson is cached and fresh
 */
export function isLessonCached(pathId: string, lessonId: string): boolean {
	const manifest = loadManifest();
	const key = getCacheKey(pathId, lessonId);
	const entry = manifest.lessons[key];

	if (!entry) return false;
	if (Date.now() - entry.fetchedAt > TTL_MS) return false;

	const filePath = join(CACHE_DIR, pathId, `${lessonId}.json`);
	return existsSync(filePath);
}

/**
 * Clear all cached lessons
 */
export function clearLessonCache(): void {
	saveManifest({ version: 1, lessons: {} });
}

/**
 * Get lesson content with cache fallback
 *
 * @param pathId - Path ID
 * @param lessonId - Lesson ID
 * @param fetcher - Function to fetch from network
 * @returns Lesson content
 */
export async function getLessonWithCache(
	pathId: string,
	lessonId: string,
	fetcher: () => Promise<LessonContent>
): Promise<LessonContent> {
	// Try cache first
	const cached = getCachedLesson(pathId, lessonId);
	if (cached) {
		return cached;
	}

	// Fetch from network
	const content = await fetcher();

	// Cache for next time
	cacheLesson(pathId, lessonId, content);

	return content;
}
