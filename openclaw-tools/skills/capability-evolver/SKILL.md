---
name: capability-evolver
description: >
  Self-upgrading meta-skill that analyzes agent runtime failures and rewrites
  its own code to improve. Use when asked to "evolve", "self-improve",
  "auto-upgrade agent", "continuous improvement", or "capability evolution".
  35,000+ downloads (#1 on ClawHub). Do NOT use for manual code refactoring
  or one-time bug fixes.
tags: [meta, self-improvement, automation, evolution]
---

# Capability Evolver — Self-Upgrading Meta-Skill

## Purpose

Analyzes agent runtime history, detects repeated failures, and rewrites its
own code to handle them better. Tracks evolution via a gene pool (GEP) model.

**35,000+ downloads** — #1 most downloaded skill on ClawHub.

## Modes

### Review Mode (safe)
Agent pauses and asks permission before applying any changes.
```bash
bash capability-evolver.sh evolve
```

### Mad Dog Mode (autonomous)
Zero human input — continuous self-evolution cycles. **Use with caution.**
```bash
bash capability-evolver.sh mad-dog
```

### Daemon Mode (cron)
Continuous background evolution loop with lock file to prevent recursion.
```bash
bash capability-evolver.sh loop
```

## Safety Controls

- `EVOLVE_ALLOW_SELF_MODIFY=false` (default) — **keep it this way**
- Strict single-process logic prevents infinite recursion
- Git backup recommended before enabling mad dog mode
- Review mode available for sensitive environments
- Rollback: `bash capability-evolver.sh rollback`

## ENV Vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `A2A_NODE_ID` | — | EvoMap network identity (required for sync) |
| `EVOLVE_ALLOW_SELF_MODIFY` | `false` | Allow evolver to rewrite itself |
| `EVOLVE_STRATEGY` | `balanced` | `balanced\|innovate\|harden\|repair-only\|auto` |
| `EVOLVE_LOAD_MAX` | `2.0` | Back off if system load exceeds this |
| `GITHUB_TOKEN` | — | Auto-issue reporting on repeated failures |

## Status & Rollback

```bash
bash capability-evolver.sh status    # View evolution events + active genes
bash capability-evolver.sh rollback  # Undo last evolution
```
