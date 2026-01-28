import { browser } from '$app/environment';

const STORAGE_KEY_PREFIX = 'experiment_completed_';

/**
 * Marks an experiment as completed in local storage.
 * @param slug The slug of the experiment
 * @param timeSpent Optional time spent in seconds
 * @param onComplete Optional callback for tracking (e.g., analytics)
 */
export function markExperimentCompleted(
    slug: string,
    timeSpent?: number,
    onComplete?: (slug: string, timeSpent?: number) => void
): void {
    if (!browser) return;
    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, 'true');
        
        // Call optional tracking callback
        if (onComplete) {
            onComplete(slug, timeSpent);
        }
    } catch (e) {
        console.warn('Failed to save completion state:', e);
    }
}

/**
 * Checks if an experiment has been completed.
 * @param slug The slug of the experiment
 * @returns True if completed, false otherwise
 */
export function isExperimentCompleted(slug: string): boolean {
    if (!browser) return false;
    try {
        return localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`) === 'true';
    } catch (e) {
        console.warn('Failed to read completion state:', e);
        return false;
    }
}

/**
 * Clears the completion state for an experiment.
 * @param slug The slug of the experiment
 */
export function clearExperimentCompletion(slug: string): void {
    if (!browser) return;
    try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slug}`);
    } catch (e) {
        console.warn('Failed to clear completion state:', e);
    }
}

/**
 * Validates a completion token from the URL.
 * For V1, this is a simple check for ?completed=true.
 * In V2, this would verify a signed JWT.
 * @param url The current URL
 * @returns True if the token is valid
 */
export function validateCompletionToken(url: URL): boolean {
    return url.searchParams.get('completed') === 'true';
}
