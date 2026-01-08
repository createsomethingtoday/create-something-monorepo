# Harness Task Closure Bug Analysis

## Problem Statement

The harness logs `✅ Task completed: csm-1rihl` but the task remains in `open` status and gets selected again in the next iteration, creating an infinite loop.

## Evidence

### 1. Harness Log Shows Completion
```
✅ Task completed: csm-1rihl

📋 Next task: csm-1rihl - Pace and Tempo Analyzer

🤖 Starting session #2 [sonnet]...
```

### 2. Issue Status Remains Open
```bash
$ bd list --json | jq '.[] | select(.id == "csm-1rihl")'
{
  "id": "csm-1rihl",
  "title": "Pace and Tempo Analyzer",
  "status": "open",  # ❌ Should be "closed"
  "labels": ["complexity:standard", "harness:csm-dgneo", ...]
}
```

### 3. Database Inconsistency
```bash
$ bd show csm-1rihl
Error fetching csm-1rihl: no issue found matching "csm-1rihl"
```

The issue appears in `bd list` but NOT in `bd show`, indicating a database/JSONL sync issue.

## Root Cause Analysis

### Code Flow

1. **Session Completes Successfully**
   - Location: `packages/harness/src/runner.ts:502-510`
   ```typescript
   if (sessionResult.outcome === 'success') {
     console.log(`✅ Task completed: ${nextIssue.id}`);
     await updateIssueStatus(nextIssue.id, 'closed', options.cwd);
     harnessState.featuresCompleted++;
   }
   ```

2. **updateIssueStatus Calls bd close**
   - Location: `packages/harness/src/beads.ts:227-237`
   ```typescript
   export async function updateIssueStatus(
     issueId: string,
     status: 'open' | 'in_progress' | 'closed',
     cwd?: string
   ): Promise<void> {
     if (status === 'closed') {
       await bd(`close ${issueId}`, cwd);  // ← This executes
     } else {
       await bd(`update ${issueId} --status=${status}`, cwd);
     }
   }
   ```

3. **bd Command Executes**
   - Location: `packages/harness/src/beads.ts:30-41`
   ```typescript
   async function bd(args: string, cwd?: string): Promise<string> {
     const { stdout } = await execAsync(`bd ${args}`, {
       cwd: cwd || process.cwd(),
       env: { ...process.env },
     });
     return stdout.trim();
   }
   ```

4. **Next Iteration Fetches Pending Features**
   - Location: `packages/harness/src/runner.ts:372`
   ```typescript
   const pendingFeatures = await getPendingFeatures(harnessState.id, options.cwd);
   ```

5. **getPendingFeatures Uses bd list**
   - Location: `packages/harness/src/beads.ts:725-739`
   ```typescript
   export async function getPendingFeatures(
     harnessId: string,
     repoRoot?: string
   ): Promise<BeadsIssue[]> {
     const issues = await readAllIssues(repoRoot);  // ← Calls bd list
     
     return issues.filter(
       (issue) =>
         issue.labels?.includes(`harness:${harnessId}`) &&
         issue.status !== 'closed'  // ← Issue still shows as "open"
     );
   }
   ```

6. **readAllIssues Uses bd list**
   - Location: `packages/harness/src/beads.ts:64-82`
   ```typescript
   export async function readAllIssues(repoRoot?: string): Promise<BeadsIssue[]> {
     const output = await bd('list --json', repoRoot);
     return JSON.parse(output) as BeadsIssue[];
   }
   ```

## The Bug

**The `bd close` command succeeds but the change is not reflected in `bd list --json` output.**

This is a **Beads daemon/database synchronization issue**, not a harness bug.

### Why This Happens

Beads uses two storage mechanisms:
1. **SQLite database** (`.beads/beads.db`) - primary storage
2. **JSONL file** (`.beads/issues.jsonl`) - backup/sync format

The bug occurs when:
- `bd close` updates the SQLite database
- `bd list` reads from a stale cache or the JSONL file hasn't been flushed
- The daemon doesn't immediately sync changes

### Evidence of Sync Issue

```bash
# Issue exists in list
$ bd list --json | grep csm-1rihl
✓ Found

# But not accessible via show
$ bd show csm-1rihl
Error: no issue found matching "csm-1rihl"
```

This indicates the database index is out of sync with the actual data.

## Solutions

### Option 1: Force Sync After Close (Immediate Fix)

Modify `updateIssueStatus` to force a sync after closing:

```typescript
export async function updateIssueStatus(
  issueId: string,
  status: 'open' | 'in_progress' | 'closed',
  cwd?: string
): Promise<void> {
  if (status === 'closed') {
    await bd(`close ${issueId}`, cwd);
    // Force sync to ensure change is visible immediately
    await bd('sync', cwd);
  } else {
    await bd(`update ${issueId} --status=${status}`, cwd);
  }
}
```

**Pros**: Simple, guarantees consistency  
**Cons**: Adds latency (sync on every close)

### Option 2: Verify Closure Before Continuing (Defensive)

Add verification after closing:

```typescript
// In runner.ts after line 532
await updateIssueStatus(nextIssue.id, 'closed', options.cwd);

// Verify the issue was actually closed
const verifyIssue = await getIssue(nextIssue.id, options.cwd);
if (verifyIssue && verifyIssue.status !== 'closed') {
  console.warn(`⚠️  Issue ${nextIssue.id} closure not reflected, forcing sync...`);
  await bd('sync', options.cwd);
  
  // Re-verify
  const recheck = await getIssue(nextIssue.id, options.cwd);
  if (recheck && recheck.status !== 'closed') {
    throw new Error(`Failed to close issue ${nextIssue.id} after sync`);
  }
}

harnessState.featuresCompleted++;
```

**Pros**: Catches the issue, provides diagnostics  
**Cons**: More complex, adds overhead

### Option 3: Use Direct Database Access (Architectural)

Instead of shelling out to `bd`, use direct SQLite access:

```typescript
import Database from 'better-sqlite3';

export async function updateIssueStatus(
  issueId: string,
  status: 'open' | 'in_progress' | 'closed',
  cwd?: string
): Promise<void> {
  const dbPath = join(cwd || process.cwd(), '.beads/beads.db');
  const db = new Database(dbPath);
  
  if (status === 'closed') {
    db.prepare('UPDATE issues SET status = ?, closed_at = ? WHERE id = ?')
      .run('closed', new Date().toISOString(), issueId);
  } else {
    db.prepare('UPDATE issues SET status = ? WHERE id = ?')
      .run(status, issueId);
  }
  
  db.close();
  
  // Still call bd sync to update JSONL
  await bd('sync', cwd);
}
```

**Pros**: Eliminates shell overhead, guaranteed consistency  
**Cons**: Bypasses bd's logic, might break with bd schema changes

### Option 4: Add Delay After Close (Workaround)

```typescript
await updateIssueStatus(nextIssue.id, 'closed', options.cwd);
// Give bd daemon time to sync
await sleep(500);
harnessState.featuresCompleted++;
```

**Pros**: Minimal code change  
**Cons**: Unreliable, still racey, adds unnecessary delay

## Recommended Solution

**Combination of Option 1 + Option 2**:

1. **Always sync after close** (Option 1) - ensures consistency
2. **Add verification** (Option 2) - catches edge cases and provides diagnostics

```typescript
export async function updateIssueStatus(
  issueId: string,
  status: 'open' | 'in_progress' | 'closed',
  cwd?: string
): Promise<void> {
  if (status === 'closed') {
    await bd(`close ${issueId}`, cwd);
    await bd('sync', cwd);
  } else {
    await bd(`update ${issueId} --status=${status}`, cwd);
  }
}
```

And in `runner.ts`:

```typescript
await updateIssueStatus(nextIssue.id, 'closed', options.cwd);

// Defensive check (can be removed once bd sync is reliable)
const pendingCheck = await getPendingFeatures(harnessState.id, options.cwd);
if (pendingCheck.some(f => f.id === nextIssue.id)) {
  console.warn(`⚠️  Issue ${nextIssue.id} still appears pending after closure`);
  // This shouldn't happen with sync, but log it for debugging
}

harnessState.featuresCompleted++;
```

## Testing the Fix

1. Apply the fix to `packages/harness/src/beads.ts`
2. Run harness on a simple 2-feature spec
3. Verify:
   - First feature closes and doesn't reappear
   - Second feature is selected next
   - No infinite loops

## Related Issues

This same bug likely affects:
- `updateIssueStatus` with `in_progress` status
- Any other bd commands that modify state

Consider applying sync after ALL state-changing bd commands.

## Impact

**Current**: Harness gets stuck in infinite loops, wasting API credits and time  
**With Fix**: Harness reliably advances through features

## Timeline

- **Discovered**: 2026-01-07 during NBA analytics implementation
- **Severity**: High (blocks autonomous operation)
- **Estimated Fix Time**: 15 minutes
- **Testing Time**: 10 minutes
