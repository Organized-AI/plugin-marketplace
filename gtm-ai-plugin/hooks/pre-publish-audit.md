# Pre-Publish Audit Hook

Strategic hook that performs comprehensive container analysis before publishing. Runs GTM Status and GTM Audit commands to validate container health and identify issues.

## Trigger Points

This hook runs automatically:
- **Phase 4 Entry**: Before Test & Publish phase begins
- **Pre-Publish Gate**: Before `gtm_version action=publish`
- **Major Changes**: After batch modifications (5+ components changed)
- **Manual Request**: Via `/gtm-audit --container both`

## Strategic Usage

### When to Use

| Scenario | Trigger | Severity |
|----------|---------|----------|
| Before publishing ANY version | Always | Required |
| After creating 3+ tags | Automatic | Recommended |
| After importing templates | Automatic | Recommended |
| Before rollback | Manual | Recommended |
| Debugging conversion issues | Manual | Optional |

### Bypass Conditions

Only bypass if:
- Emergency hotfix with explicit user approval
- Re-publishing same version (fingerprint match)
- Preview-only (no live publish)

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  PRE-PUBLISH AUDIT HOOK                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: GTM STATUS CHECK                                   │
│  ─────────────────────────────────────────────────────────  │
│  • Check workspace for merge conflicts                      │
│  • Verify no pending changes from other users               │
│  • Get current live version for rollback reference          │
│  • Count components (tags, triggers, variables)             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │  Status Clean?        │
               └───────────────────────┘
                    │           │
                  Yes           No
                    │           │
                    ▼           ▼
              Continue    ┌─────────────────┐
                         │ BLOCK: Resolve   │
                         │ conflicts first  │
                         └─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: WEB GTM AUDIT                                      │
│  ─────────────────────────────────────────────────────────  │
│  • Scan for duplicate tags                                  │
│  • Check naming convention violations                       │
│  • Validate tag-trigger-variable correlations               │
│  • Identify orphaned/unused components                      │
│  • Check for missing required variables                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: sGTM CORRELATION CHECK (if sGTM configured)        │
│  ─────────────────────────────────────────────────────────  │
│  • Validate event_id deduplication setup                    │
│  • Check web→server event forwarding                        │
│  • Verify CAPI endpoint configuration                       │
│  • Match client-side tags with server-side tags             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │  Issues Found?        │
               └───────────────────────┘
                    │           │
                   No          Yes
                    │           │
                    ▼           ▼
              ┌─────────┐  ┌─────────────────────────┐
              │ PROCEED │  │ Categorize Issues       │
              │ to      │  └─────────────────────────┘
              │ Publish │           │
              └─────────┘           ▼
                         ┌───────────────────────┐
                         │ Critical Issues?      │
                         └───────────────────────┘
                              │           │
                            Yes           No
                              │           │
                              ▼           ▼
                         ┌─────────┐  ┌─────────────────┐
                         │ BLOCK   │  │ WARN: Proceed   │
                         │ Publish │  │ with caution    │
                         └─────────┘  └─────────────────┘
```

---

## MCP Commands

### Step 1: Status Check

```
# Check workspace status
gtm_workspace action=getStatus
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}

# Get live version for rollback reference
gtm_version action=live
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}

# Count workspace components
gtm_tag action=list
gtm_trigger action=list
gtm_variable action=list
```

### Step 2: Web GTM Audit

```
# List all tags with details
gtm_tag action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}

# List all triggers
gtm_trigger action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}

# List all variables
gtm_variable action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.webContainer.id}}
  workspaceId={{config.gtm.workspace.id}}
```

### Step 3: sGTM Correlation (if configured)

```
# Check server container components
gtm_tag action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.serverContainer.id}}
  workspaceId={{sgtm_workspace_id}}

# Verify client configuration
gtm_client action=list
  accountId={{config.gtm.accountId}}
  containerId={{config.gtm.serverContainer.id}}
```

---

## Issue Categories

### Critical (BLOCKS Publishing)

| Issue | Detection | Resolution |
|-------|-----------|------------|
| Merge conflicts | `workspaceStatus.conflicts > 0` | Sync workspace |
| Missing required variables | Variable referenced but not found | Create variable |
| Broken trigger references | Tag references non-existent trigger | Fix trigger ID |
| Template compilation error | Template status = error | Fix template |
| Duplicate conversion tags | Same conversion ID on multiple tags | Remove duplicate |

### Warning (Allows Publishing with Confirmation)

| Issue | Detection | Resolution |
|-------|-----------|------------|
| Naming convention violations | Tag name doesn't match pattern | Rename (optional) |
| Orphaned variables | Variable not referenced by any tag | Review and remove |
| Missing event_id | CAPI enabled but no event_id variable | Add for deduplication |
| Paused tags | Tag status = paused | Enable or remove |
| sGTM correlation mismatch | Web tag without matching server tag | Add server tag |

### Info (Logged Only)

| Issue | Detection | Notes |
|-------|-----------|-------|
| High tag count | > 50 tags | May impact performance |
| Legacy template | Template version < latest | Consider updating |
| No folder organization | Tags not in folders | Organizational suggestion |

---

## Audit Report Format

Creates `AUDIT-REPORT-{{timestamp}}.md`:

```markdown
# Pre-Publish Audit Report

**Generated:** {{timestamp}}
**Container:** GTM-XXXXXXX (Web)
**Workspace:** {{workspace_name}} (ID: {{workspace_id}})

## Summary

| Category | Count |
|----------|-------|
| Critical Issues | 0 |
| Warnings | 2 |
| Info | 3 |

## Status: ✅ READY TO PUBLISH / ⛔ BLOCKED

---

## Critical Issues

None found.

---

## Warnings

### 1. Naming Convention Violation
- **Component:** Tag "facebook pixel"
- **Expected:** "Meta - PageView - All Pages"
- **Action:** Consider renaming

### 2. Missing sGTM Correlation
- **Component:** LI - Lead - FormSubmit
- **Issue:** No matching server-side tag
- **Action:** Create sGTM tag for CAPI

---

## Info

- 32 tags in workspace
- 3 templates installed
- Last publish: 2024-01-15

---

## Rollback Reference

- **Current Live Version:** 42
- **Container Fingerprint:** abc123def456
- **Rollback Command:** `gtm_version action=publish containerVersionId=42`
```

---

## Integration with GTM-AI Agent

### Phase 4 Integration

The agent MUST call this hook before publishing:

```markdown
## Phase 4: Test & Publish

### Step 1: Pre-Publish Audit (REQUIRED)
1. Execute pre-publish-audit hook
2. Review audit report
3. If BLOCKED: Stop and resolve issues
4. If READY: Proceed to Step 2

### Step 2: Generate Preview
...

### Step 3: Create Version
...

### Step 4: Publish
...
```

### Agent Decision Tree

```python
def pre_publish_check():
    # Run status check
    status = gtm_workspace_getStatus()
    if status.conflicts > 0:
        return BLOCK("Merge conflicts detected")

    # Run audit
    audit = run_audit()

    if audit.critical_count > 0:
        return BLOCK(f"{audit.critical_count} critical issues")

    if audit.warning_count > 0:
        user_confirm = prompt(
            f"{audit.warning_count} warnings found. Proceed anyway?"
        )
        if not user_confirm:
            return BLOCK("User cancelled due to warnings")

    # Capture rollback reference
    live_version = gtm_version_live()
    save_rollback_reference(live_version.id)

    return PROCEED()
```

---

## State Management

Updates `CONFIG/phase-state.json`:

```json
{
  "phases": {
    "4": {
      "name": "Test & Publish",
      "status": "in_progress",
      "prePublishAudit": {
        "executedAt": "2024-01-20T10:30:00Z",
        "status": "passed",
        "criticalCount": 0,
        "warningCount": 2,
        "infoCount": 3,
        "reportFile": "AUDIT-REPORT-20240120.md",
        "rollbackVersion": "42"
      }
    }
  }
}
```

---

## Usage Examples

### Automatic (Agent Mode)

Agent triggers automatically in Phase 4:
```
Entering Phase 4: Test & Publish...
Running pre-publish audit...
✅ Status: Clean
✅ Audit: 0 critical, 2 warnings
⚠️  Warning: 2 naming violations found (non-blocking)
Proceeding to publish...
```

### Manual (Command Mode)

```bash
# Full audit of both containers
/gtm-audit --container both

# Quick status check only
/gtm-status --verbose

# Audit with auto-fix
/gtm-audit --fix
```

### Slash Command Integration

When user runs `/gtm-deploy`, the agent:
1. Executes Phases 0-3
2. Triggers pre-publish-audit hook
3. Shows audit summary
4. Asks for confirmation if warnings exist
5. Publishes if approved

---

## Error Handling

### Audit Failures

```
ERROR: Pre-publish audit failed

Reason: 2 critical issues found

1. CRITICAL: Merge conflict in workspace
   → Run: gtm_workspace action=sync

2. CRITICAL: Missing variable "LI - Partner ID"
   → Run: gtm_variable action=create name="Const - LI - Partner ID"

Publishing blocked. Resolve issues and retry.
```

### Recovery

```bash
# Sync workspace to resolve conflicts
gtm_workspace action=sync

# Re-run audit
/gtm-audit

# Continue with publish if clean
/gtm-deploy --continue
```

---

## Best Practices

1. **Always audit before publishing** - Even for small changes
2. **Review warnings** - They indicate potential issues
3. **Save rollback reference** - Automatically captured
4. **Document exceptions** - If bypassing for emergency
5. **Run sGTM check** - When CAPI is enabled
6. **Use --fix cautiously** - Review changes before applying
