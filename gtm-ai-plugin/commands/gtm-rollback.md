# /gtm-rollback

Rollback GTM container to a previous version.

## Usage

```
/gtm-rollback [--version ID] [--confirm]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| --version | No | Specific version ID (default: previous version) |
| --confirm | No | Skip confirmation prompt |

## Examples

```
/gtm-rollback
/gtm-rollback --version 41
/gtm-rollback --confirm
```

## Execution

1. Get current live version
2. Get version history
3. Identify rollback target
4. Confirm with user (unless --confirm)
5. Publish previous version

## Output

```
Rollback Summary
----------------
Current Version: 42 (LinkedIn Tracking v1.0)
Target Version: 41 (GA4 Updates)

Confirm rollback? [y/N]

Rolling back...
✅ Version 41 is now live
```

## MCP Calls

```
gtm_version action=live
gtm_version_header action=list
gtm_version action=publish containerVersionId={{targetVersion}}
```

## Safety

- Always confirms before rollback (unless --confirm)
- Stores rollback info in `ROLLBACK-LOG.md`
- Previous version noted for forward recovery
