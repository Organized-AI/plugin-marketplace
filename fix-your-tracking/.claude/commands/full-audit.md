---
description: Run comprehensive tracking and advertising audit across all platforms
allowed-tools: Bash(bash:*), Pipeboard Meta:*, stape-mcp-server:*, google-tag-manager-mcp-server:*
---

# Full Audit Command

Execute a comprehensive audit across Meta, Google, and tracking infrastructure.

## Workflow

1. **Invoke @audit-coordinator** for orchestration
2. Pull all ad account data
3. Analyze tracking infrastructure
4. Check CAPI/pixel health
5. Review CRM sync status
6. Generate unified report

## Execution

```bash
# For Claude Code execution:
claude --dangerously-skip-permissions "Run full tracking audit using @audit-coordinator"
```

## Output
Generates comprehensive audit report with:
- Platform-specific findings
- Cross-platform issues
- Prioritized recommendations
- Implementation roadmap
