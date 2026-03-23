import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function runGit(args) {
	return execFileSync('git', ['-C', repoRoot, ...args], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	}).trim();
}

try {
	const status = runGit(['status', '--short']);
	if (!status) process.exit(0);

	console.error('Refusing to deploy from a dirty git worktree.');
	console.error('Commit, stash, or discard changes before running the production deploy.');
	console.error('');
	console.error(status);
	process.exit(1);
} catch (error) {
	console.error('Failed to verify git worktree cleanliness.');
	if (error instanceof Error && error.message) {
		console.error(error.message);
	}
	process.exit(1);
}
