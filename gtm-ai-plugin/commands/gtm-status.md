# /gtm-status

Check GTM workspace status and container health.

## Usage

```
/gtm-status [--verbose]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| --verbose | No | Show detailed component counts |

## Examples

```
/gtm-status
/gtm-status --verbose
```

## Execution

1. Get workspace status
2. Check for conflicts
3. Get live version info
4. Count components

## Output

```
GTM Status
----------
Account: 4702245012
Web Container: GTM-XXXXXXX
Server Container: GTM-XXXXXXX

Workspace: Default (ID: 86)
Status: Clean / Has Changes / Conflicts

Live Version: 42 (Published: 2024-01-15)

Components:
- Tags: 25
- Triggers: 18
- Variables: 32
- Templates: 5
```

## MCP Calls

```
gtm_workspace action=getStatus
gtm_version action=live
gtm_container action=get
```
