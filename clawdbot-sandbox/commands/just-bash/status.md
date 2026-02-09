---
description: Show just-bash sandbox build progress, project health, and next step
---

# just-bash Status Command

Show phase progress, project health, and recommended next action for the just-bash sandbox build.

## Gather Information

### 1. Phase Progress

Scan for completion markers:

```bash
# Find all phase prompts
ls PLANNING/features/just-bash/implementation-phases/PHASE-*-*.md 2>/dev/null

# Find completed phases
ls PLANNING/features/just-bash/implementation-phases/PHASE-*-COMPLETE.md 2>/dev/null
```

Build a phase status table from the 8 phases:
- Phase 0: Project Setup
- Phase 1: Filesystem Tiers
- Phase 2: Network Security
- Phase 3: AgentSkill Adapter
- Phase 4: AI SDK Tool
- Phase 5: OpenClaw Plugin
- Phase 6: Permissions
- Phase 7: Integration Testing

### 2. Project Health (if project exists)

```bash
# Check if clawdbot-sandbox project exists
ls clawdbot-sandbox/package.json 2>/dev/null

# If exists, run quick health checks
cd clawdbot-sandbox
pnpm build 2>/dev/null && echo "Build: PASS" || echo "Build: FAIL"
pnpm typecheck 2>/dev/null && echo "Types: PASS" || echo "Types: FAIL"
pnpm test 2>/dev/null && echo "Tests: PASS" || echo "Tests: FAIL"
```

### 3. Git Status

```bash
git status --short
git log --oneline -5
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║              JUST-BASH SANDBOX BUILD STATUS                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Progress: [█████░░░░░░░░░░░] 3/8 phases                    ║
║                                                              ║
║  Phase 0: Project Setup          ✅ Complete                 ║
║  Phase 1: Filesystem Tiers       ✅ Complete                 ║
║  Phase 2: Network Security       ✅ Complete                 ║
║  Phase 3: AgentSkill Adapter     ⬜ Pending                  ║
║  Phase 4: AI SDK Tool            ⬜ Pending                  ║
║  Phase 5: OpenClaw Plugin        ⬜ Pending                  ║
║  Phase 6: Permissions            ⬜ Pending                  ║
║  Phase 7: Integration Testing    ⬜ Pending                  ║
║                                                              ║
║  Health:                                                     ║
║    Build:  ✅ Passing                                        ║
║    Types:  ✅ Passing                                        ║
║    Tests:  ✅ Passing (12/12)                                ║
║                                                              ║
║  Next: /just-bash:next → Phase 3: AgentSkill Adapter        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

If no project exists yet:

```
╔══════════════════════════════════════════════════════════════╗
║              JUST-BASH SANDBOX BUILD STATUS                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Progress: [░░░░░░░░░░░░░░░░] 0/8 phases                    ║
║                                                              ║
║  All phases pending. Project not yet initialized.            ║
║                                                              ║
║  Next: /just-bash:next → Phase 0: Project Setup              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Next Steps

Based on status, suggest:
- If no project: "Run `/just-bash:next` to start Phase 0"
- If health failing: "Fix build/test issues before continuing"
- If mid-phase: "Phase N in progress — continue or `/just-bash:verify` to check"
- If all complete: "All 8 phases complete! Package ready for release."
