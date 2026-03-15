/**
 * Task Storage Layer — Simple Loom Pattern
 *
 * This file is provided complete. It demonstrates:
 * - State persistence (tasks survive process restarts)
 * - External memory for agents (Claude Code remembers your tasks)
 * - Simple data structures (no over-engineering)
 *
 * You don't need to modify this file. Focus on index.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';

// Storage location: ~/.tasks/tasks.json
const TASKS_DIR = join(homedir(), '.tasks');
const TASKS_FILE = join(TASKS_DIR, 'tasks.json');

/**
 * A task in Simple Loom.
 *
 * This is the core data structure. Notice how simple it is:
 * - id: unique identifier
 * - title: what the task is
 * - status: where it is in the lifecycle
 * - created: when it was added
 *
 * No priority, no due dates, no tags. Just the essentials.
 * Rams would approve: "Does each field earn its existence?"
 */
export interface Task {
	id: string;
	title: string;
	status: 'todo' | 'doing' | 'done';
	created: number;
}

/**
 * Ensure the tasks directory exists.
 */
function ensureDir(): void {
	if (!existsSync(TASKS_DIR)) {
		mkdirSync(TASKS_DIR, { recursive: true });
	}
}

/**
 * Generate a short, unique ID.
 */
function generateId(): string {
	return randomBytes(4).toString('hex');
}

/**
 * Load all tasks from disk.
 *
 * This is the "external memory" pattern from Loom:
 * Tasks persist even when the MCP server isn't running.
 * Claude Code can pick up where it left off.
 */
export function loadTasks(): Task[] {
	ensureDir();

	if (!existsSync(TASKS_FILE)) {
		return [];
	}

	try {
		const content = readFileSync(TASKS_FILE, 'utf-8');
		return JSON.parse(content) as Task[];
	} catch {
		// If the file is corrupted, start fresh
		return [];
	}
}

/**
 * Save all tasks to disk.
 */
export function saveTasks(tasks: Task[]): void {
	ensureDir();
	writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

/**
 * Add a new task.
 *
 * Returns the created task so Claude Code can confirm what was added.
 */
export function addTask(title: string): Task {
	const tasks = loadTasks();

	const task: Task = {
		id: generateId(),
		title,
		status: 'todo',
		created: Date.now(),
	};

	tasks.push(task);
	saveTasks(tasks);

	return task;
}

/**
 * Get all tasks, optionally filtered by status.
 */
export function getTasks(status?: Task['status']): Task[] {
	const tasks = loadTasks();

	if (status) {
		return tasks.filter((t) => t.status === status);
	}

	return tasks;
}

/**
 * Find a task by ID.
 */
export function getTask(id: string): Task | undefined {
	const tasks = loadTasks();
	return tasks.find((t) => t.id === id);
}

/**
 * Update a task's status.
 *
 * This is the task lifecycle: todo → doing → done
 * Simple state machine, no complex transitions.
 */
export function updateTaskStatus(id: string, status: Task['status']): Task | null {
	const tasks = loadTasks();
	const task = tasks.find((t) => t.id === id);

	if (!task) {
		return null;
	}

	task.status = status;
	saveTasks(tasks);

	return task;
}

/**
 * Remove a task permanently.
 */
export function removeTask(id: string): boolean {
	const tasks = loadTasks();
	const index = tasks.findIndex((t) => t.id === id);

	if (index === -1) {
		return false;
	}

	tasks.splice(index, 1);
	saveTasks(tasks);

	return true;
}

/**
 * Clear all tasks (useful for testing).
 */
export function clearAllTasks(): void {
	saveTasks([]);
}
