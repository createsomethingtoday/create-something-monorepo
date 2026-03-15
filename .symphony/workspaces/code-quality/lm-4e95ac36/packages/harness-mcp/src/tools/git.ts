import { execCommand, findMonorepoRoot } from '../utils.js';

export function getGitStatus(): {
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
} {
  const root = findMonorepoRoot();

  // Get branch
  const branchResult = execCommand('git branch --show-current', root);
  const branch = branchResult.success ? branchResult.output : 'unknown';

  // Get status
  const statusResult = execCommand('git status --porcelain', root);
  const lines = statusResult.output.split('\n').filter(Boolean);

  const modified: string[] = [];
  const untracked: string[] = [];
  const staged: string[] = [];

  for (const line of lines) {
    const status = line.substring(0, 2);
    const file = line.substring(3);

    if (status.startsWith('??')) {
      untracked.push(file);
    } else if (status.startsWith(' ')) {
      modified.push(file);
    } else {
      staged.push(file);
    }
  }

  return { branch, modified, untracked, staged };
}

export function commitWithIssue(issueId: string, message: string): void {
  const root = findMonorepoRoot();

  // Stage all changes
  const addResult = execCommand('git add .', root);
  if (!addResult.success) {
    throw new Error(`Failed to stage changes: ${addResult.output}`);
  }

  // Create commit message with issue reference
  const fullMessage = `${message}\n\nRefs: ${issueId}\n\nCo-Authored-By: Harness Agent <noreply@createsomething.io>`;

  // Commit using heredoc for proper formatting
  const commitCommand = `git commit -m "$(cat <<'EOF'
${fullMessage}
EOF
)"`;

  const commitResult = execCommand(commitCommand, root);
  if (!commitResult.success) {
    throw new Error(`Failed to commit: ${commitResult.output}`);
  }
}

export function getDiff(staged: boolean = false): string {
  const root = findMonorepoRoot();
  const command = staged ? 'git diff --staged' : 'git diff';
  const result = execCommand(command, root);
  return result.output;
}

export function getCurrentCommit(): string {
  const root = findMonorepoRoot();
  const result = execCommand('git rev-parse HEAD', root);
  return result.success ? result.output : '';
}
