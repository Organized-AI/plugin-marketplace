---
description: Audit GTM containers for issues, duplicates, and naming violations
---

# /gtm-audit [--container <type>] [--fix]

Performs comprehensive GTM container audit using the tidy-gtm skill.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--container` | No | Container type: `web`, `server`, or `both` (default: `both`) |
| `--fix` | No | Auto-fix issues where safe |

## Process

1. **Discovery Phase**
   - Inventory all tags, triggers, variables, templates
   - Get container metadata and workspace status

2. **Analysis Phase**
   - Detect duplicate tags (same name or config)
   - Find orphaned triggers (no tags reference them)
   - Find orphaned variables (not used anywhere)
   - Identify naming convention violations
   - Check for legacy tags (UA instead of GA4)
   - Find test artifacts ("test", "copy", "DELETE ME")

3. **Correlation Check**
   - Verify tag → trigger references valid
   - Verify tag → variable references exist
   - Detect broken references

4. **sGTM Correlation** (if server container exists)
   - Verify transport URL in GA4 Config
   - Check GA4 Client enabled in server container
   - Match web conversion tags to server CAPI tags
   - Validate event_id flows through both containers
   - Check user data mapping consistency

5. **Generate Reports**
   - `GTM-AUDIT-REPORT.md` - Full audit findings
   - `GTM-AUDIT-RECOMMENDATIONS.md` - Prioritized fixes

## Issue Severity Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **CRITICAL** | Blocks publishing | Broken references, workspace conflicts |
| **WARNING** | Should fix | Naming violations, orphaned components |
| **INFO** | Nice to have | High tag count, missing folders |

## Usage Examples

```bash
# Full audit (web + server)
/gtm-audit

# Audit web container only
/gtm-audit --container web

# Audit server container only
/gtm-audit --container server

# Audit and auto-fix safe issues
/gtm-audit --fix
```

## Output

### Audit Report Structure

```markdown
# GTM Container Audit Report

## Summary
| Metric | Count |
|--------|-------|
| Tags | XX |
| Triggers | XX |
| Variables | XX |

## Issues Found

### Critical (0)
- None

### Warnings (5)
- Duplicate tag: "FB Pixel - Copy"
- Naming violation: "test tag"
...

### Info (2)
- No folders defined
...

## Web ↔ Server Correlation
| Web Tag | Server Tag | Event ID | Status |
|---------|------------|----------|--------|
| Meta - Lead | Meta CAPI - Lead | DL - event_id | OK |
...
```

## Related Commands

- `/gtm-deploy` - Deploy new tracking
- `/gtm-status` - Quick health check
- `/gtm-rollback` - Revert to previous version
