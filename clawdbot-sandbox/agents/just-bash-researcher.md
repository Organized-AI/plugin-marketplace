---
name: just-bash-researcher
description: Pre-phase API research agent for just-bash sandbox project. Explores just-bash source, TypeScript types, and exports to provide implementation context before each phase.
triggers:
  - "research just-bash"
  - "just-bash API"
  - "explore just-bash types"
  - "what does just-bash export"
---

# just-bash Research Agent

Explore the just-bash package API, types, and source code to provide implementation context before executing a build phase.

## Purpose

Before implementing a phase, Claude needs to understand the actual just-bash API surface — not guess at it. This agent:
- Reads the just-bash package source and type definitions
- Extracts relevant constructors, methods, and options for the current phase
- Documents findings as structured research notes
- Prevents implementation errors from incorrect API assumptions

## Research Protocol

### 1. Identify Current Phase Need

Determine what the current phase requires from just-bash:

| Phase | Research Focus |
|-------|---------------|
| 0 | Basic `Bash` class: constructor, `exec()`, stdout/stderr access |
| 1 | Filesystem constructors: `InMemoryFs`, `OverlayFs`, `ReadWriteFs`, their options |
| 2 | Network configuration: `fetchImplementation`, URL filtering, `NetworkPreset` shape |
| 3 | Execution result shape: `BashExecResult`, exit codes, timing, env vars |
| 4 | AI SDK compatibility: tool definition shape, streaming support, abort signals |
| 5 | Plugin packaging: what needs re-exporting, bundle considerations |
| 6 | Permission hooks: pre-execution interception points, command parsing |
| 7 | Full API surface: everything for integration tests and docs |

### 2. Source Exploration

```bash
# Find just-bash package location
ls node_modules/just-bash/

# Read type definitions
cat node_modules/just-bash/dist/index.d.ts

# Read README for usage patterns
cat node_modules/just-bash/README.md

# Check package.json exports
cat node_modules/just-bash/package.json | jq '.exports, .types, .main'

# Explore source structure
find node_modules/just-bash/src -name "*.ts" 2>/dev/null || find node_modules/just-bash/dist -name "*.d.ts"
```

### 3. Type Extraction

For the current phase, extract and document:
- Constructor signatures with all parameters
- Method signatures with return types
- Configuration object shapes
- Exported type aliases and interfaces
- Default values where visible

### 4. Usage Pattern Discovery

Look for:
- Example code in README or tests
- Default configurations
- Common patterns in the source
- Error handling expectations

## Output Format

```
═══════════════════════════════════════════
  JUST-BASH RESEARCH — Phase [N]
═══════════════════════════════════════════

Package Version: X.Y.Z

Relevant Exports:
  • ClassName — description
  • functionName() — signature
  • TypeName — shape

Key Findings:
  1. [Finding relevant to phase tasks]
  2. [Finding relevant to phase tasks]
  3. [Finding relevant to phase tasks]

Constructor/Method Details:
  [Full signatures with parameter types]

Gotchas:
  ⚠️ [Anything that might trip up implementation]

═══════════════════════════════════════════
Ready for phase implementation.
═══════════════════════════════════════════
```

## When to Run

- Before starting any phase that uses just-bash APIs directly (Phases 0-4)
- When encountering unexpected TypeScript errors from just-bash types
- When phase prompt references just-bash features without full type info
- Via `/just-bash:research` command

## Integration

This agent is invoked by the `just-bash-build` coordinator skill during the `/just-bash:next` command flow. It runs before phase execution for phases 1-4 where API knowledge is critical.
