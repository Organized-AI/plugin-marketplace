# Pre-Publish Audit Hook

Strategic validation before publishing GTM container versions. This is a MANDATORY check that blocks publishing if critical issues are detected.

## Trigger Points

1. **Phase 4 Start** - When entering Test & Publish phase
2. **Before Publish** - Immediately before `gtm_version action=publish`
3. **Batch Changes** - After 5+ component changes in workspace
4. **Manual Request** - Via `/gtm-audit` command

## Audit Workflow

### Step 1: Workspace Validation

```
gtm_workspace action=getStatus
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

**Check for:**
- Workspace conflicts
- Pending changes count
- Merge conflicts

### Step 2: Web Container Audit

```
# List all components
gtm_tag action=list
gtm_trigger action=list
gtm_variable action=list
gtm_template action=list
```

**Check for:**
- Duplicate tags (same name or config)
- Orphaned triggers (no tags reference)
- Orphaned variables (not used anywhere)
- Broken references (variable {{X}} doesn't exist)
- Naming convention violations
- Disabled/paused tags
- Template compilation errors

### Step 3: Server Container Correlation (if applicable)

```
# Get server container components
gtm_tag action=list containerId={{config.gtm.serverContainer.id}}
gtm_variable action=list containerId={{config.gtm.serverContainer.id}}
```

**Check for:**
- Web conversion tags have matching CAPI tags
- event_id flows through both containers
- User data mapping consistent
- GA4 Client enabled and configured

## Issue Classification

### Critical (BLOCK Publishing)

| Issue | Detection | Impact |
|-------|-----------|--------|
| Workspace conflicts | `getStatus` returns conflicts | Publish will fail |
| Missing required variables | Tag references undefined var | Tag won't fire correctly |
| Broken trigger references | `firingTriggerId` invalid | Tag won't fire |
| Template compilation error | Template status = error | Tag broken |
| Duplicate conversion tags | Same config, same trigger | Double counting |

**Action**: BLOCK publishing until resolved

### Warning (Proceed with Acknowledgment)

| Issue | Detection | Recommendation |
|-------|-----------|----------------|
| Naming violations | Doesn't match standards | Rename for consistency |
| Orphaned variables | Not referenced anywhere | Remove or document |
| Missing event_id | Conversion without event_id | Add for deduplication |
| Disabled tags | Tag paused state | Remove or enable |
| Unmatched web/server tags | CAPI tag missing | Add server-side tag |

**Action**: Log warning, allow proceed

### Info (Log Only)

| Issue | Detection | Note |
|-------|-----------|------|
| High tag count | >100 tags | Consider cleanup |
| Outdated templates | Old gallery version | Update when convenient |
| No folders | Zero folders | Organize for clarity |

**Action**: Log for information

## Audit Report Output

```markdown
# Pre-Publish Audit Report

**Container**: GTM-XXXXXXX
**Workspace**: Default
**Audit Time**: 2025-01-15 10:40:00

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

## Critical Issues (0)

None - safe to publish

## Warnings (3)

1. **Naming Violation**: "FB Pixel" should be "Meta - Base Pixel"
2. **Orphaned Variable**: "test_var" not used
3. **Missing event_id**: "Meta - Lead" missing deduplication

## Info (2)

1. Tag count: 72 (consider cleanup if >100)
2. No folders defined

## Publish Decision

✅ **APPROVED** - No critical issues

Rollback reference:
- Current live version: 42
- Published: 2025-01-14 10:00:00
```

## Integration with Deployment

The GTM Automation Agent MUST complete this audit before proceeding to version creation:

```
Phase 4 Workflow:
1. Run pre-publish audit
2. IF critical issues > 0:
   - BLOCK
   - List issues
   - Suggest fixes
   - Wait for resolution
3. IF critical issues = 0:
   - Log warnings
   - Capture rollback version
   - Create version
   - Publish
```

## Rollback Reference Capture

Before publishing, always capture current live version:

```
gtm_version action=live
  accountId={{accountId}}
  containerId={{containerId}}
```

Store in phase-state.json:
```json
{
  "rollbackVersion": 42,
  "rollbackCapturedAt": "2025-01-15T10:40:00Z"
}
```

This enables emergency rollback if issues are detected post-publish.
