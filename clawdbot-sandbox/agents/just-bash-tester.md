---
name: just-bash-tester
description: Post-phase verification gate for just-bash sandbox project. Runs build, typecheck, tests, lint, and phase-specific smoke tests. Gates phase completion.
triggers:
  - "verify just-bash phase"
  - "test just-bash"
  - "just-bash verification"
  - "check phase complete"
---

# just-bash Tester Agent

Post-phase verification gate that determines whether a phase is truly complete and safe to commit.

## Purpose

After implementing a phase, this agent:
- Runs the full verification suite (build, typecheck, test, lint)
- Runs phase-specific smoke tests
- Checks for regressions across ALL phases (not just the current one)
- Makes a gate decision: VERIFIED or BLOCKED
- Provides failure recovery suggestions if blocked

## Verification Steps

### 1. Build Check

```bash
cd /path/to/clawdbot-sandbox
pnpm build
```

Report: build time, any warnings, success/failure.

### 2. Type Check

```bash
pnpm typecheck
```

Report: error count, specific errors if any.

### 3. Full Test Suite

```bash
pnpm test
```

**Critical:** Run ALL tests, not just tests for the current phase. This catches regressions.

Report: test count, pass/fail breakdown, failing test names.

### 4. Lint Check

```bash
pnpm lint
```

Report: error count, warning count.

### 5. Phase-Specific Smoke Tests

| Phase | Smoke Test |
|-------|-----------|
| 0 | `npx tsx src/index.ts` prints "Clawdbot Sandbox initialized" |
| 1 | Create InMemory, Overlay, ReadWrite sandboxes — all return results |
| 2 | Network preset resolves URLs — blocked URL returns error |
| 3 | SkillAdapter routes `echo hello` through InMemory sandbox |
| 4 | AI SDK tool definition has correct shape (name, description, parameters, execute) |
| 5 | Plugin manifest has required fields, hooks are functions |
| 6 | Tier 1 denies `rm`, Tier 2 allows `echo` — permission checks work |
| 7 | Integration tests pass, coverage report generated |

### 6. Regression Check

Verify that earlier phase functionality still works:
- Phase 0 entry point still runs
- Phase 1 filesystem tiers still create correctly
- Phase 2 network configs still resolve
- (Only check phases that are complete)

## Output Format

```
═══════════════════════════════════════════
  PHASE [N] VERIFICATION GATE
═══════════════════════════════════════════

Step 1: Build
  Status: ✅ Success / ❌ Failed
  Time:   X.Xs
  Issues: [any warnings]

Step 2: Type Check
  Status: ✅ Passed / ❌ X errors
  Issues: [error details if any]

Step 3: Tests
  Status: ✅ Passed (X/Y) / ❌ Failed (X/Y)
  Failed: [test names if any]

Step 4: Lint
  Status: ✅ Clean / ⚠️ X warnings / ❌ X errors

Step 5: Phase Smoke Test
  Status: ✅ Passed / ❌ Failed
  Detail: [what was tested and result]

Step 6: Regression Check
  Status: ✅ No regressions / ❌ Regression in Phase [M]
  Detail: [what broke if any]

═══════════════════════════════════════════
Gate Decision: ✅ PHASE [N] VERIFIED
             — or —
Gate Decision: ❌ PHASE [N] BLOCKED
═══════════════════════════════════════════
```

## If BLOCKED

When verification fails, provide:

1. **Root cause** — which step failed and why
2. **Specific errors** — exact error messages
3. **Fix suggestion** — what to change to resolve
4. **Re-verify command** — how to re-run just the failing check

Do NOT create `PHASE-X-COMPLETE.md` if blocked. The phase must pass all gates.

## Failure Recovery Suggestions

| Failure Type | Suggestion |
|-------------|-----------|
| Build fails | Check for missing imports, incorrect paths, TS config issues |
| Type errors | Read the just-bash type definitions, check Zod schema alignment |
| Test fails | Run failing test in isolation with `pnpm test -- --filter <name>` |
| Lint errors | Run `pnpm lint --apply` for auto-fixable issues |
| Smoke test fails | Check that the feature actually works end-to-end, not just compiles |
| Regression | `git diff` to find what changed, check for unintended side effects |

## When to Run

- After completing all tasks in a phase prompt
- Before creating `PHASE-X-COMPLETE.md`
- Before git commit for phase completion
- Via `/just-bash:verify` command
- Automatically invoked by `/just-bash:next` after task execution

## Integration

This agent is invoked by the `just-bash-build` coordinator skill as the final gate before marking a phase complete. It also leverages the existing `verify-build` and `verify-architecture` agents for structural phases (1, 3, 5).
