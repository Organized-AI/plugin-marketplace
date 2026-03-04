# /gtm-audit — Full GTM Container Audit

Run a comprehensive GTM container audit with health scoring.

## Usage
```
/gtm-audit <account_id> <container_id>
```

## What It Does

1. **Inventory** — Lists all tags, triggers, variables, and folders in the workspace
2. **Naming Check** — Flags tags that don't follow `[Platform] Event - Action` convention
3. **Duplicate Detection** — Identifies tags with identical type + trigger combinations
4. **Orphan Scan** — Finds triggers with no associated tags and variables referenced nowhere
5. **sGTM Correlation** — If server container detected, validates web→server tag pairing
6. **Health Score** — Outputs a 0-100 score with prioritized fix list

## Workflow

```
gtm-ai (SKILL.md) → inventory all resources
tidy-gtm (SKILL.md) → naming + duplicate analysis
gtm-debug-agent (SKILL.md) → optional browser validation
```

## Required MCP
- Stape GTM MCP (`gtm-mcp.stape.ai`)

## Example
```
/gtm-audit 6073868004 52905187
```
