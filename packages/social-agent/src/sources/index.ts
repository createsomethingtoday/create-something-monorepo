/**
 * Source Monitor Manager
 *
 * Coordinates multiple content source monitors to feed the idea queue.
 */

import type { SourceMonitor, IdeaCandidate } from '../types';
import { RepoActivityMonitor } from './repo-monitor';
import { PaperMonitor } from './paper-monitor';
import { ExternalMonitor } from './external-monitor';

export class SourceMonitorManager {
	private monitors: SourceMonitor[] = [];

	constructor() {
		// Initialize default monitors
		this.monitors = [
			new RepoActivityMonitor(),
			new PaperMonitor(),
			new ExternalMonitor()
		];
	}

	/**
	 * Add a custom monitor
	 */
	addMonitor(monitor: SourceMonitor): void {
		this.monitors.push(monitor);
	}

	/**
	 * Remove a monitor by name
	 */
	removeMonitor(name: string): void {
		this.monitors = this.monitors.filter((m) => m.name !== name);
	}

	/**
	 * Poll all monitors and collect candidates
	 */
	async pollAll(): Promise<IdeaCandidate[]> {
		const allCandidates: IdeaCandidate[] = [];

		for (const monitor of this.monitors) {
			try {
				const candidates = await monitor.poll();
				allCandidates.push(...candidates);
			} catch (error) {
				console.error(`[SourceMonitor] Error polling ${monitor.name}:`, error);
			}
		}

		// Sort by priority (highest first)
		return allCandidates.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Poll a specific monitor by name
	 */
	async pollOne(name: string): Promise<IdeaCandidate[]> {
		const monitor = this.monitors.find((m) => m.name === name);
		if (!monitor) {
			throw new Error(`Monitor not found: ${name}`);
		}
		return monitor.poll();
	}

	/**
	 * Get list of active monitors
	 */
	getMonitors(): string[] {
		return this.monitors.map((m) => m.name);
	}
}

// Re-export individual monitors for direct use
export { RepoActivityMonitor } from './repo-monitor';
export { PaperMonitor } from './paper-monitor';
export { ExternalMonitor } from './external-monitor';
