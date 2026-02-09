---
description: Deep-dive just-bash API research for the current or specified phase
---

# just-bash Research Command

Invoke the just-bash researcher agent to explore the just-bash package API for the current (or specified) phase.

## Workflow

### 1. Detect Current Phase

```bash
# Count completed phases to determine current
COMPLETED=$(ls PLANNING/features/just-bash/implementation-phases/PHASE-*-COMPLETE.md 2>/dev/null | wc -l | tr -d ' ')
echo "Current phase: $COMPLETED"
```

If user specifies a phase number (e.g., `/just-bash:research 3`), use that instead.

### 2. Determine Research Focus

| Phase | Focus Area |
|-------|-----------|
| 0 | Basic `Bash` constructor, `exec()` method, stdout/stderr |
| 1 | `InMemoryFs`, `OverlayFs`, `ReadWriteFs` constructors and options |
| 2 | Network configuration, `fetchImplementation`, URL filtering |
| 3 | Execution result types, env vars, working directory |
| 4 | AI SDK tool definition compatibility, streaming, abort |
| 5 | Package exports, bundle requirements, plugin interface |
| 6 | Command parsing, pre-execution hooks, permission patterns |
| 7 | Full API surface for comprehensive docs and integration tests |

### 3. Invoke Researcher Agent

> Invoke `just-bash-researcher` agent with:
> - Phase number
> - Research focus from table above
> - Specific questions from the phase prompt's tasks

The agent will:
1. Read just-bash package types and source
2. Extract relevant constructors, methods, options
3. Document findings in structured format
4. Flag potential gotchas

### 4. Present Findings

Display the researcher's output. If the researcher finds discrepancies between the phase prompt's assumed API and the actual API:

```
⚠️ API DISCREPANCY FOUND
Phase prompt assumes: [assumption]
Actual API provides:  [reality]
Recommendation:       [how to adapt]
```

## When to Use

- Before starting a new phase (especially Phases 1-4)
- When encountering TypeScript errors related to just-bash types
- When the phase prompt references an API you're unsure about
- When exploring what's possible with just-bash beyond the phase prompt
- To understand default behaviors and configuration options
