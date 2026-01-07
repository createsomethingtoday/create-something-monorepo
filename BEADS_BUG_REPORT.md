# Bug Report: `bd show` Cannot Find Issues That `bd list` Can Find

**Affects versions**: 0.43.0, 0.44.0, 0.46.0 (latest as of 2026-01-07)  
**Impact**: Blocks `gt sling` workflow automation  
**Severity**: High - Prevents Gas Town integration

---

## Summary

The `bd show <issue-id>` command fails to find issues that `bd list --id <issue-id>` successfully locates, even though the issues exist in both the SQLite database and JSONL file.

## Reproduction Steps

```bash
# 1. Create a new issue
bd create "Test issue" --label complexity:simple
# Output: ✓ Created issue: csm-5uxdj

# 2. Verify with bd list (WORKS)
bd list --id csm-5uxdj
# Output: csm-5uxdj [P2] [task] open [complexity:simple phase:review] - Test issue

# 3. Try bd show (FAILS)
bd show csm-5uxdj
# Output: Error fetching csm-5uxdj: no issue found matching "csm-5uxdj"

# 4. Try with --no-daemon (STILL FAILS)
bd show csm-5uxdj --no-daemon
# Output: Error fetching csm-5uxdj: no issue found matching "csm-5uxdj"
```

## Data Verification

Issues exist in the database:
```bash
sqlite3 .beads/beads.db "SELECT id, title, status FROM issues WHERE id = 'csm-5uxdj';"
# Output: csm-5uxdj|Test issue|open
```

Issues exist in JSONL:
```bash
grep "csm-5uxdj" .beads/issues.jsonl | jq .id
# Output: "csm-5uxdj"
```

## Environment

```bash
bd --version
# bd version 0.46.0 (812f4e52)

bd info --json | jq '{daemon_status, issue_count, mode}'
# {
#   "daemon_status": "healthy",
#   "issue_count": 1236,
#   "mode": "daemon"
# }
```

## Impact on Gas Town

The `gt sling` command internally calls `bd show <issue-id> --json` and fails with:
```
Error: checking bead status: parsing bead info: unexpected end of JSON input
```

This blocks all automatic issue assignment in the Gas Town workflow.

## Hypothesis

`bd show` and `bd list` appear to use different query paths:
- `bd list --id <id>` → ✅ Successfully finds issues
- `bd show <id>` → ❌ Returns "no issue found"

The discrepancy suggests `bd show` may be:
1. Using a different index that doesn't include newly created issues
2. Querying a different table/view than `bd list`
3. Having a caching issue that `bd list` doesn't exhibit

## Workarounds

1. Use `bd list --id <issue-id>` instead of `bd show <issue-id>`
2. For `gt sling`: Manually assign with `bd assign <issue-id> <assignee>`

## Expected Behavior

`bd show <issue-id>` should return the same issue that `bd list --id <issue-id>` returns.

## Additional Context

- Stopping/restarting daemon doesn't fix the issue
- Using `--no-daemon` flag doesn't fix the issue
- Direct SQLite queries confirm data integrity
- `bd doctor` shows 47 passed checks, 6 warnings (none appear related)
- Upgraded through multiple versions (0.43.0 → 0.44.0 → 0.46.0), bug persists

---

**Repository**: https://github.com/steveyegge/beads  
**Related Tools**: [Gas Town (gt)](https://github.com/steveyegge/beads) integration  
**Reporter**: Experienced through Gas Town smart sling workflow

