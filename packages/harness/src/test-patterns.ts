/**
 * @create-something/harness
 *
 * Test Patterns: Intentional code patterns for reviewer analysis.
 * This file contains deliberate issues across security, architecture, and quality
 * domains to test the peer review system.
 *
 * DO NOT USE IN PRODUCTION - This is a test fixture only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Security Patterns (for security reviewer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern: Hardcoded credential (secrets exposure)
 * Severity: critical
 */
const API_KEY = 'sk-test-1234567890abcdef';

/**
 * Pattern: SQL injection vulnerability (injection)
 * Severity: critical
 */
export function getUserByName(name: string): string {
  // Vulnerable: string concatenation in SQL query
  return `SELECT * FROM users WHERE name = '${name}'`;
}

/**
 * Pattern: Command injection risk (injection)
 * Severity: high
 */
export function runCommand(userInput: string): void {
  // Vulnerable: unsanitized user input in shell command
  const cmd = `ls -la ${userInput}`;
  console.log(`Would execute: ${cmd}`);
}

/**
 * Pattern: Missing authentication check (auth)
 * Severity: high
 */
export function deleteUser(userId: string): { deleted: boolean } {
  // Missing: No auth check before destructive operation
  return { deleted: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture Patterns (for architecture reviewer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern: DRY violation (duplicated logic)
 * Severity: medium
 */
export function formatUserA(user: { name: string; email: string }): string {
  const namePart = user.name.trim().toLowerCase();
  const emailPart = user.email.trim().toLowerCase();
  return `${namePart} <${emailPart}>`;
}

export function formatUserB(user: { name: string; email: string }): string {
  // Duplicated: Same logic as formatUserA
  const namePart = user.name.trim().toLowerCase();
  const emailPart = user.email.trim().toLowerCase();
  return `${namePart} <${emailPart}>`;
}

/**
 * Pattern: Tight coupling (dependency issues)
 * Severity: medium
 */
export function processData(data: unknown): void {
  // Tight coupling: Direct dependency on global fetch
  // Should accept fetch as a parameter for testability
  console.log('Processing:', data);
}

/**
 * Pattern: N+1 query pattern (performance)
 * Severity: high
 */
export async function getUsersWithPosts(
  userIds: string[],
  getUser: (id: string) => Promise<{ id: string; name: string }>,
  getPosts: (userId: string) => Promise<Array<{ title: string }>>
): Promise<Array<{ user: { id: string; name: string }; posts: Array<{ title: string }> }>> {
  const results = [];
  // N+1: Should batch these queries
  for (const id of userIds) {
    const user = await getUser(id);
    const posts = await getPosts(id);
    results.push({ user, posts });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Patterns (for quality reviewer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern: Missing null check (edge cases)
 * Severity: medium
 */
export function getFirstItem<T>(items: T[]): T {
  // Missing: No check for empty array
  return items[0];
}

/**
 * Pattern: Unhandled promise rejection (error handling)
 * Severity: high
 */
export function fetchData(url: string): void {
  // Missing: No .catch() or try/catch for async operation
  fetch(url).then((response) => {
    console.log('Got response:', response.status);
  });
}

/**
 * Pattern: Using 'any' type (type safety)
 * Severity: low
 */
export function processAnything(data: any): any {
  // Type safety: 'any' defeats TypeScript's benefits
  return data.someProperty?.nested?.value;
}

/**
 * Pattern: Race condition potential (edge cases)
 * Severity: medium
 */
let globalCounter = 0;

export async function incrementCounter(): Promise<number> {
  // Race condition: Not atomic, concurrent calls may lose updates
  const current = globalCounter;
  await new Promise((resolve) => setTimeout(resolve, 10));
  globalCounter = current + 1;
  return globalCounter;
}

/**
 * Pattern: Silent failure (error handling)
 * Severity: medium
 */
export function parseConfig(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    // Silent failure: Swallows error, returns empty object
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export for test usage
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_PATTERNS = {
  security: ['hardcoded-credential', 'sql-injection', 'command-injection', 'missing-auth'],
  architecture: ['dry-violation', 'tight-coupling', 'n-plus-one'],
  quality: ['missing-null-check', 'unhandled-promise', 'any-type', 'race-condition', 'silent-failure'],
};

// Intentionally unused to trigger linting (if configured)
const _unusedVariable = API_KEY;
