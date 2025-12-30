# /gtm-audit

Audit GTM container for issues, duplicates, and naming violations.

## Usage

```
/gtm-audit [--container TYPE] [--fix]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| --container | No | Container type: web, server, both (default: web) |
| --fix | No | Auto-fix issues when possible |

## Examples

```
/gtm-audit
/gtm-audit --container both
/gtm-audit --fix
```

## Execution

Activates the tidy-gtm skill with 9-phase audit:

1. **Discovery** - Get container details
2. **Inventory** - List all components
3. **Analysis** - Identify issues
4. **Correlation** - Validate tag-trigger-variable relationships
5. **Naming** - Check naming conventions
6. **sGTM** - Validate web ↔ server correlation
7. **Cleanup** - Generate fix recommendations
8. **Execute** - Apply fixes (if --fix)
9. **Report** - Generate audit report

## Output

Creates:
- `AUDIT-REPORT.md` with findings
- `AUDIT-FIXES.md` with recommendations
