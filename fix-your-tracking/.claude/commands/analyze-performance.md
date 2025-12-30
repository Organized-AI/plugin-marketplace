---
description: Get quick performance insights across all ad accounts
argument-hint: <time-range: last_7d|last_30d|last_90d>
allowed-tools: Pipeboard Meta:*, sequential-thinking:*
---

# Analyze Performance Command

Get performance insights for time range: $ARGUMENTS (default: last_7d)

## Workflow

1. **Invoke @meta-ads** for analysis
2. Pull bulk insights across all accounts
3. Identify top performers
4. Flag underperformers
5. Generate quick recommendations

## Execution

```
bulk_get_insights(level="campaign", time_range="$ARGUMENTS")
```

## Output Format

```markdown
## Performance Summary ($ARGUMENTS)

### Top Performers
| Campaign | ROAS | Spend | Revenue |
|----------|------|-------|---------|
| ...      | ...  | ...   | ...     |

### Underperformers (Action Required)
| Campaign | Issue | Recommendation |
|----------|-------|----------------|
| ...      | ...   | ...            |

### Quick Wins
1. [Action] - [Expected Impact]
2. [Action] - [Expected Impact]
```

## Claude Code Execution
```bash
claude --dangerously-skip-permissions "Analyze campaign performance for $ARGUMENTS using @meta-ads"
```
