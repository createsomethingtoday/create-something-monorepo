/**
 * Experiment Completion Utilities for .space
 * 
 * Re-exports Canon completion utilities with space-specific tracking integration.
 */

import { browser } from '$app/environment';
import {
    markExperimentCompleted as baseMarkCompleted,
    isExperimentCompleted,
    clearExperimentCompletion,
    validateCompletionToken
} from '@create-something/canon/utils';
import { space as spaceTracking } from '@create-something/canon/utils';

// Re-export unchanged utilities
export { isExperimentCompleted, clearExperimentCompletion, validateCompletionToken };

const STORAGE_KEY_PREFIX = 'experiment_completed_';

/**
 * Marks an experiment as completed with space tracking integration.
 * @param slug The slug of the experiment
 * @param timeSpent Optional time spent in seconds
 */
export function markExperimentCompleted(slug: string, timeSpent?: number): void {
    baseMarkCompleted(slug, timeSpent, (s, t) => {
        spaceTracking.experimentCompleted(s, t);
    });
}

/**
 * Tracks when an experiment is started (first viewed).
 * Space-specific - tracks first view for analytics.
 * @param slug The slug of the experiment
 */
export function trackExperimentStart(slug: string): void {
    if (!browser) return;

    const startKey = `${STORAGE_KEY_PREFIX}${slug}_started`;
    const hasTrackedStart = localStorage.getItem(startKey);

    if (!hasTrackedStart) {
        spaceTracking.experimentStarted(slug);
        localStorage.setItem(startKey, 'true');
    }
}
