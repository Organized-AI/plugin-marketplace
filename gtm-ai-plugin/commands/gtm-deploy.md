# /gtm-deploy

Deploy tracking for a platform to GTM container.

## Usage

```
/gtm-deploy [platform] [--partner-id ID]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| platform | Yes | Platform to deploy (linkedin, meta, ga4, tiktok, pinterest) |
| --partner-id | No | Partner/Pixel ID (uses config if not provided) |

## Examples

```
/gtm-deploy linkedin --partner-id 1234567
/gtm-deploy meta
/gtm-deploy ga4
```

## Execution

This command activates the gtm-automation-agent with the specified platform.

1. Read CONFIG/config.json for GTM IDs
2. Execute Phase 0-4 sequentially
3. Create and publish version
4. Generate completion report

## Prerequisites

- CONFIG/config.json exists with GTM configuration
- MCP server authenticated (google-tag-manager-mcp-server)
- Partner/Pixel ID available

## Output

Creates:
- `PHASE-X-COMPLETE.md` for each phase
- `DEPLOYMENT-COMPLETE.md` on success
