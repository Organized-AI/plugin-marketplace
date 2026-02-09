---
description: Run full verification suite and architecture review for just-bash sandbox
---

# just-bash Verify Command

Run comprehensive verification across the entire just-bash sandbox project, including build validation and architecture review for structural phases.

## Verification Suite

### 1. Build Validation

```bash
cd clawdbot-sandbox

# Clean build
rm -rf dist/
pnpm build
```

Report: build time, output size, any warnings.

### 2. Type Check

```bash
pnpm typecheck
```

Report: error count, specific errors.

### 3. Full Test Suite

```bash
pnpm test
```

Report: total tests, passed, failed, skipped. List any failures.

### 4. Lint

```bash
pnpm lint
```

Report: errors, warnings.

### 5. Phase Smoke Tests

Run smoke tests for ALL completed phases (not just current):

| Phase | Smoke Test Command |
|-------|-------------------|
| 0 | `npx tsx src/index.ts` — prints init message |
| 1 | Run a quick filesystem tier creation test |
| 2 | Verify network preset resolution |
| 3 | Execute a skill through the adapter |
| 4 | Verify AI SDK tool shape |
| 5 | Check plugin manifest completeness |
| 6 | Test permission check for Tier 1 deny |
| 7 | Verify integration test coverage |

### 6. Architecture Review (Structural Phases)

For phases that introduce new module boundaries (1, 3, 5), also invoke the `verify-architecture` agent to check:
- Files in correct directories
- Naming conventions followed
- No circular dependencies between modules
- Export structure is clean

### 7. Coverage Report (if Phase 7+ complete)

```bash
pnpm test -- --coverage
```

Report: line coverage, branch coverage, function coverage. Flag if below 80%.

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║              JUST-BASH FULL VERIFICATION                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Build:          ✅ Passed (X.Xs)                            ║
║  Type Check:     ✅ Passed                                   ║
║  Tests:          ✅ Passed (X/Y)                             ║
║  Lint:           ✅ Clean                                    ║
║  Smoke Tests:    ✅ All passed (N phases)                    ║
║  Architecture:   ✅ Compliant                                ║
║  Coverage:       ✅ 85% (target: 80%)                       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Status: ✅ ALL CHECKS PASSING                               ║
╚══════════════════════════════════════════════════════════════╝
```

Or if issues found:

```
╠══════════════════════════════════════════════════════════════╣
║  Status: ❌ ISSUES FOUND                                     ║
║                                                              ║
║  Fix required:                                               ║
║    1. [specific issue and how to fix]                        ║
║    2. [specific issue and how to fix]                        ║
╚══════════════════════════════════════════════════════════════╝
```

## When to Run

- Before marking any phase complete (automatically called by `/just-bash:next`)
- After making changes across multiple files
- Before creating a PR or release
- When `/just-bash:status` shows health issues
- Periodically during development as a regression check
