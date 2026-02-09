---
description: Execute the next incomplete phase of the just-bash sandbox build
---

# just-bash Next Command

Detect the next incomplete phase, execute it end-to-end, verify, and commit.

## Workflow

### Step 1: Detect Next Phase

```bash
# Find completed phases
COMPLETED=$(ls PLANNING/features/just-bash/implementation-phases/PHASE-*-COMPLETE.md 2>/dev/null | wc -l | tr -d ' ')
echo "Completed phases: $COMPLETED"
```

Map the next phase number to its prompt file:

| Phase | Prompt File |
|-------|------------|
| 0 | `PHASE-0-PROJECT-SETUP.md` |
| 1 | `PHASE-1-FILESYSTEM-TIERS.md` |
| 2 | `PHASE-2-NETWORK-SECURITY.md` |
| 3 | `PHASE-3-AGENTSKILL-ADAPTER.md` |
| 4 | `PHASE-4-AI-SDK-TOOL.md` |
| 5 | `PHASE-5-OPENCLAW-PLUGIN.md` |
| 6 | `PHASE-6-PERMISSIONS.md` |
| 7 | `PHASE-7-INTEGRATION-TESTING.md` |

If all 8 complete, report "All phases complete!" and stop.

### Step 2: Preflight Check

Before starting the phase:
- Verify prerequisite phases are complete (check `PHASE-(N-1)-COMPLETE.md`)
- If project exists, verify health: `pnpm build && pnpm typecheck && pnpm test`
- If preflight fails, stop and report — don't start a phase on broken foundation

### Step 3: Research (Phases 1-4)

For phases that heavily use just-bash APIs (1, 2, 3, 4):

> Invoke `just-bash-researcher` agent with the current phase number.

This provides API context before implementation. Skip for phases 0, 5, 6, 7 where API knowledge is less critical.

### Step 4: Read and Execute Phase Prompt

```
Read PLANNING/features/just-bash/implementation-phases/PHASE-N-*.md
```

Execute all tasks listed under `## Tasks` in order.

**For complex phases (1, 3, 4):** Consider using GSD fresh-context executor pattern if the phase has 5+ tasks that could exhaust context. Use Task tool to spawn subagents for independent tasks.

**For simpler phases (0, 2, 5, 6):** Execute tasks directly in current context.

### Step 5: Verification Gate

After all tasks are implemented:

> Invoke `just-bash-tester` agent for the current phase.

The tester runs: build → typecheck → tests → lint → phase smoke test → regression check.

**If VERIFIED:** Continue to Step 6.
**If BLOCKED:** Stop. Report the failure. Suggest fix. Do NOT create completion doc.

### Step 6: Create Completion Document

Create `PLANNING/features/just-bash/implementation-phases/PHASE-N-COMPLETE.md`:

```markdown
# Phase N Complete: [Phase Name]

**Completed:** [ISO timestamp]
**Duration:** ~[estimated time]

## Deliverables
- [Key deliverable 1]
- [Key deliverable 2]
- [Key deliverable 3]

## Verification Results
- Build: ✅ Passed
- Typecheck: ✅ Passed
- Tests: ✅ Passed (X/Y)
- Lint: ✅ Clean
- Smoke Test: ✅ Passed

## Files Created/Modified
- [file1.ts] — [what it does]
- [file2.ts] — [what it does]

## Notes
[Any implementation decisions or deviations from the prompt]
```

### Step 7: Git Commit

```bash
git add -A
git commit -m "Phase N: [Phase name] complete

- [Key deliverable 1]
- [Key deliverable 2]
- [Key deliverable 3]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Step 8: Report

```
╔══════════════════════════════════════════════════════════════╗
║  ✅ Phase [N] Complete: [Phase Name]                         ║
║                                                              ║
║  Commit: [hash]                                              ║
║  Tests:  [X] passing                                         ║
║                                                              ║
║  Next: /just-bash:next → Phase [N+1]: [Next Phase Name]     ║
╚══════════════════════════════════════════════════════════════╝
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Prerequisite phase missing | Report which phase is needed first |
| Build fails mid-phase | Fix error, re-run build, continue |
| Verification blocked | Report failure, suggest fix, stop |
| All phases complete | Celebrate, suggest packaging/release |
| Phase prompt not found | Report missing file, stop |
