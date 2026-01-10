import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export function execCommand(
  command: string,
  cwd: string = process.cwd()
): { success: boolean; output: string; duration: number } {
  const start = Date.now();

  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    return {
      success: true,
      output: output.trim(),
      duration: Date.now() - start
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.message + (error.stdout ? `\n${error.stdout}` : '') + (error.stderr ? `\n${error.stderr}` : ''),
      duration: Date.now() - start
    };
  }
}

export function findMonorepoRoot(startPath: string = process.cwd()): string {
  let current = startPath;

  while (current !== '/') {
    if (existsSync(join(current, '.beads'))) {
      return current;
    }
    current = join(current, '..');
  }

  throw new Error('Not in a Beads repository (no .beads directory found)');
}

export function readJsonFile<T>(path: string): T | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function writeJsonFile(path: string, data: any): void {
  const dir = join(path, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Formats a Date object into a string based on the specified format.
 * @param date The Date object to format.
 * @param format The desired format: 'short' for 'MMM DD, YYYY' or 'long' for 'Month DD, YYYY'.
 * @returns The formatted date string, or 'Invalid Date' if the provided date is invalid.
 */
export function formatDate(date: Date, format: 'short' | 'long'): string {
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'short') {
    const month = date.toLocaleString('default', { month: 'short' });
    return `${month} ${day}, ${year}`;
  } else {
    const month = date.toLocaleString('default', { month: 'long' });
    return `${month} ${day}, ${year}`;
  }
}
