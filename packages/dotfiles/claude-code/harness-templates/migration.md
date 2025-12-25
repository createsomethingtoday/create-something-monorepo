# Migration Spec: [Migration Name]

## Goal

Migrate [source] to [target] with zero downtime and full data integrity.

## Context

[Why this migration is needed. What's wrong with current state.]

## Migration Type

- [ ] Database schema migration
- [ ] Codebase migration (e.g., library upgrade)
- [ ] Data transformation
- [ ] Infrastructure migration
- [ ] API version migration

## Scope

### Source State
- [Current technology/schema/version]
- [Data volume/complexity]
- [Known issues]

### Target State
- [Target technology/schema/version]
- [Expected improvements]
- [New capabilities]

### Files Affected
- `path/to/migrations/` - Schema changes
- `path/to/models/` - Data models
- `path/to/routes/` - API changes
- `path/to/tests/` - Test updates

## Migration Strategy

### Phase 1: Preparation
1. [ ] Create rollback plan
2. [ ] Backup current state
3. [ ] Create migration scripts
4. [ ] Test in staging

### Phase 2: Execution
1. [ ] Apply forward migration
2. [ ] Verify data integrity
3. [ ] Update application code
4. [ ] Run integration tests

### Phase 3: Verification
1. [ ] E2E testing
2. [ ] Performance validation
3. [ ] Monitoring confirmation

## Rollback Plan

```bash
# Commands to rollback if migration fails
[rollback commands]
```

## Data Validation Queries

```sql
-- Before migration
[validation query 1]

-- After migration
[validation query 2]

-- Integrity check
[check query]
```

## Acceptance Criteria

- [ ] All data migrated successfully
- [ ] No data loss
- [ ] Application functions correctly
- [ ] Performance meets or exceeds baseline
- [ ] Rollback tested and documented

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | Low/Med/High | Low/Med/High | [Mitigation] |
| [Risk 2] | Low/Med/High | Low/Med/High | [Mitigation] |

---

## Harness Instructions

Migrations require extra caution:
1. Create Beads issues for each phase
2. Include rollback as explicit issue
3. Checkpoint after Phase 1 (before execution)
4. Never proceed to Phase 2 without user confirmation
5. Mark `verified` only after production validation
