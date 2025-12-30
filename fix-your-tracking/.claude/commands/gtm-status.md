---
description: Check GTM workspace status and container health
---

# /gtm-status [--verbose]

Quick health check for GTM workspace and containers.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--verbose` | No | Show detailed component counts |

## Process

1. **Get Workspace Status**
   ```
   gtm_workspace action=getStatus
   ```
   - Check for workspace conflicts
   - Check for pending changes

2. **Get Live Version**
   ```
   gtm_version action=live
   ```
   - Get current live version number
   - Get publish timestamp

3. **Get Container Info**
   ```
   gtm_container action=get
   ```
   - Get container metadata

4. **Component Counts** (if --verbose)
   - Count all tags
   - Count all triggers
   - Count all variables
   - Count all templates

## Output

### Basic Output

```
GTM Status: HEALTHY

Account:     4702245012
Web Container:    GTM-XXXXXXX (42412215)
Server Container: GTM-XXXXXXX (175099610)
Workspace:   Default (86)
Status:      No conflicts
Live Version: 42 (published 2025-01-15)
```

### Verbose Output

```
GTM Status: HEALTHY

Account:     4702245012
Web Container:    GTM-XXXXXXX (42412215)
Server Container: GTM-XXXXXXX (175099610)
Workspace:   Default (86)
Status:      No conflicts
Live Version: 42 (published 2025-01-15)

Components:
- Tags:      72
- Triggers:  28
- Variables: 45
- Templates: 8
```

### Unhealthy Output

```
GTM Status: UNHEALTHY

Account:     4702245012
Container:   GTM-XXXXXXX (42412215)
Workspace:   Default (86)
Status:      CONFLICTS DETECTED
Live Version: 42

Issues:
- 3 workspace conflicts need resolution
- Run: gtm_workspace action=sync
```

## MCP Calls Used

1. `gtm_workspace action=getStatus` - Get workspace health
2. `gtm_version action=live` - Get live version info
3. `gtm_container action=get` - Get container metadata

## Usage Examples

```bash
# Quick status check
/gtm-status

# Detailed status with component counts
/gtm-status --verbose
```

## Related Commands

- `/gtm-audit` - Full container audit
- `/gtm-deploy` - Deploy tracking
- `/gtm-rollback` - Revert changes
