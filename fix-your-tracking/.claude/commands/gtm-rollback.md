---
description: Rollback GTM container to a previous version
---

# /gtm-rollback [--version <id>] [--confirm]

Reverts GTM container to a previous version.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--version` | No | Specific version ID to rollback to (default: previous version) |
| `--confirm` | No | Skip confirmation prompt |

## Process

1. **Get Current State**
   ```
   gtm_version action=live
   ```
   - Identify current live version
   - Record for audit trail

2. **List Available Versions**
   ```
   gtm_version_header action=list
   ```
   - Get version history
   - Find target version

3. **Identify Target Version**
   - If `--version` specified, use that
   - Otherwise, use immediately previous version

4. **Confirm Rollback** (unless --confirm)
   - Show current version details
   - Show target version details
   - Prompt for confirmation

5. **Execute Rollback**
   ```
   gtm_version action=publish containerVersionId=[TARGET_ID]
   ```
   - Publish target version as live

6. **Log Rollback**
   - Create entry in `ROLLBACK-LOG.md`
   - Record previous version for forward recovery

## Safety Features

- **Always confirms** before rollback (unless --confirm flag)
- **Maintains audit trail** in ROLLBACK-LOG.md
- **Records previous version** for forward recovery if needed

## Output

### Confirmation Prompt

```
ROLLBACK CONFIRMATION

Current Live Version: 42
  - Published: 2025-01-15 14:30
  - Name: "LinkedIn Tracking v1.0"

Target Version: 41
  - Published: 2025-01-14 10:15
  - Name: "Pre-LinkedIn baseline"

Proceed with rollback? [y/N]
```

### Success Output

```
ROLLBACK COMPLETE

Previous Version: 42
New Live Version: 41
Rolled back at:   2025-01-15 15:45

Forward recovery available:
  /gtm-rollback --version 42
```

## Rollback Log Entry

```markdown
## Rollback: 2025-01-15 15:45

| Field | Value |
|-------|-------|
| From Version | 42 |
| To Version | 41 |
| Reason | [User specified or "Manual rollback"] |
| Performed By | Claude |

### Recovery
To restore version 42:
`/gtm-rollback --version 42 --confirm`
```

## MCP Calls Used

1. `gtm_version action=live` - Get current live version
2. `gtm_version_header action=list` - List available versions
3. `gtm_version action=publish` - Publish target version

## Usage Examples

```bash
# Rollback to previous version (with confirmation)
/gtm-rollback

# Rollback to specific version
/gtm-rollback --version 38

# Rollback without confirmation (use with caution)
/gtm-rollback --confirm

# Rollback to specific version without confirmation
/gtm-rollback --version 38 --confirm
```

## Related Commands

- `/gtm-status` - Check current status
- `/gtm-audit` - Audit before/after rollback
- `/gtm-deploy` - Deploy new tracking
