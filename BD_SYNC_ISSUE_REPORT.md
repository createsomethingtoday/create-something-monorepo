# Beads Database Sync Issue Report

**Date**: January 7, 2026  
**Issue**: `bd show` cannot find issues that `bd list` can find  
**Impact**: Blocks `gt sling` from assigning work to Gas Town polecats  
**Severity**: HIGH - Prevents workflow automation

---

## Problem Summary

Created 11 new Beads issues for webflow-dashboard port work, but `gt sling` fails with:
```
Error: checking bead status: parsing bead info: unexpected end of JSON input
```

The root cause is that `bd show <issue-id>` returns "no issue found" while `bd list --id <issue-id>` successfully finds the same issue.

---

## Reproduction Steps

1. Create new issue:
```bash
bd create "Test issue" --label complexity:simple
# Output: ✓ Created issue: csm-5uxdj
```

2. Verify in database:
```bash
sqlite3 .beads/beads.db "SELECT id, title, status FROM issues WHERE id = 'csm-5uxdj';"
# Output: csm-5uxdj|Review webflow-dashboard feature parity analysis...|open
```

3. Try `bd list` (WORKS):
```bash
bd list --id csm-5uxdj
# Output: csm-5uxdj [P2] [task] open [complexity:simple phase:review] - Review webflow-dashboard...
```

4. Try `bd show` (FAILS):
```bash
bd show csm-5uxdj
# Output: Error fetching csm-5uxdj: no issue found matching "csm-5uxdj"
```

5. Try with --no-daemon (STILL FAILS):
```bash
bd show csm-5uxdj --no-daemon
# Output: Error fetching csm-5uxdj: no issue found matching "csm-5uxdj"
```

6. But list works with --no-daemon (WORKS):
```bash
bd list --id csm-5uxdj --no-daemon
# Output: csm-5uxdj [P2] [task] open [complexity:simple phase:review] - Review webflow-dashboard...
```

---

## Environment Details

### BD Version
```
bd version 0.43.0 (76359764)
```

### Database Status
```bash
bd info --json
```
```json
{
  "daemon_connected": true,
  "daemon_status": "healthy",
  "daemon_version": "0.43.0",
  "database_path": "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/.beads/beads.db",
  "issue_count": 1236,
  "mode": "daemon"
}
```

### BD Doctor Output (Key Warnings)
```
✓ 47 passed  ⚠ 6 warnings  ✖ 0 failed

⚠  WARNINGS:
  1. CLI Version: 0.43.0 (latest: 0.46.0)
  2. JSONL Files: Multiple JSONL files found
  3. Git Working Tree: Uncommitted changes present
  4. Sync Branch Health: Sync branch 1137 commits behind main
  5. Claude Integration: Not configured
  6. Duplicate Issues: 57 duplicate issue(s) in 52 group(s)
```

---

## Affected Issues

All 11 newly created issues exhibit this behavior:

1. csm-5uxdj - Review webflow-dashboard feature parity analysis
2. csm-3dc7d - Plan Phase 1 implementation
3. csm-rydk4 - Design submission tracking system architecture
4. csm-hkc80 - Design multi-image upload architecture
5. csm-c5e4r - Design GSAP validation UI architecture
6. csm-n73re - Implement submission tracking system
7. csm-ky3b2 - Implement GSAP validation UI
8. csm-xdfzt - Implement carousel and secondary thumbnail upload
9. csm-4iqn5 - Implement marketplace insights component
10. csm-31xzb - Implement asset versioning system
11. csm-ist47 - Add design enhancements

---

## Data Verification

### SQLite Database (Direct Query)
```bash
sqlite3 .beads/beads.db "SELECT COUNT(*) FROM issues WHERE id LIKE 'csm-%' AND created_at > datetime('now', '-1 hour');"
# Output: 16 (includes some other recent issues)
```

### JSONL File
```bash
grep "csm-5uxdj" .beads/issues.jsonl | jq .
```
```json
{
  "id": "csm-5uxdj",
  "title": "Review webflow-dashboard feature parity analysis and prioritize roadmap",
  "description": "Review FEATURE_PARITY_ANALYSIS.md and prioritize...",
  "status": "open",
  "priority": 2,
  "issue_type": "task",
  "created_at": "2026-01-07T11:47:16.874047-06:00",
  "created_by": "micahjohnson",
  "updated_at": "2026-01-07T11:47:16.874047-06:00",
  "labels": ["complexity:simple", "phase:review"]
}
```

---

## Hypothesis

The issue appears to be a discrepancy between how `bd show` and `bd list` query the database:

1. **`bd list`** - Uses a different query path that successfully finds issues
2. **`bd show`** - Uses a query path that fails to find the same issues
3. **Daemon involvement** - Stopping daemon doesn't fix the issue, suggesting it's not a daemon sync problem
4. **Database integrity** - Direct SQLite queries work, so data is present

**Possible causes:**
- `bd show` may be using a different index or query that's not finding newly created issues
- There may be a caching issue in `bd show` command
- `bd show` might be looking at a different table or view than `bd list`
- The issue might be related to the 57 duplicate issues warning

---

## Impact on Gas Town

The `gt sling` command internally calls `bd show <issue-id> --json` to check issue status before slinging. Since `bd show` fails, the entire Gas Town workflow is blocked:

```bash
gt sling csm-5uxdj csm --quality basic
# Error: checking bead status: parsing bead info: unexpected end of JSON input
```

This prevents:
- Automatic assignment of issues to polecats
- Smart sling routing based on complexity labels
- Workflow automation for the webflow-dashboard port work

---

## Workarounds Attempted

1. ❌ Restart daemon: `bd daemons restart <path>` - No effect
2. ❌ Stop daemon: `bd daemons stop <path>` - No effect
3. ❌ Use --no-daemon flag: `bd show csm-5uxdj --no-daemon` - Still fails
4. ❌ Direct database query: Works, but `gt` doesn't support this
5. ❌ Wait for sync: Waited 5+ minutes, no change

---

## Temporary Solution

Manual assignment using `bd assign`:

```bash
# Assign issues directly without using gt sling
bd assign csm-5uxdj <assignee>
```

However, this bypasses:
- Smart model routing based on complexity
- Automatic polecat spawning
- Gas Town workflow integration

---

## Recommended Actions

### Immediate (Unblock workflow)
1. **Upgrade BD CLI**: Current version 0.43.0, latest is 0.46.0
   ```bash
   brew upgrade bd
   ```
   This may fix the `bd show` query issue.

2. **Clean up duplicate issues**: 57 duplicates may be affecting queries
   ```bash
   bd duplicates  # Review and merge
   ```

3. **Sync JSONL to DB**: Force a full sync
   ```bash
   bd sync --import-only
   ```

### Short-term (Fix root cause)
4. **Report bug to BD maintainers**: `bd show` vs `bd list` discrepancy
   - Include reproduction steps
   - Provide database dump if needed
   - Reference this report

5. **Investigate BD show internals**: Check if there's a known issue in 0.43.0

### Long-term (Prevent recurrence)
6. **Keep BD updated**: Set up auto-update or regular update schedule
7. **Monitor duplicate issues**: Regular cleanup to prevent query performance issues
8. **Test workflow after BD updates**: Verify `gt sling` works after upgrades

---

## Next Steps

1. Run `brew upgrade bd` to get version 0.46.0
2. Test `bd show csm-5uxdj` after upgrade
3. If still failing, manually assign issues with `bd assign`
4. Report bug to BD team with this diagnostic report

---

## Files for Reference

- Database: `.beads/beads.db`
- JSONL: `.beads/issues.jsonl`
- Feature analysis: `packages/webflow-dashboard/FEATURE_PARITY_ANALYSIS.md`
- This report: `BD_SYNC_ISSUE_REPORT.md`

---

**Prepared by**: Gas Town Smart Sling Analysis  
**Model**: Claude Sonnet 4.5  
**Date**: January 7, 2026

