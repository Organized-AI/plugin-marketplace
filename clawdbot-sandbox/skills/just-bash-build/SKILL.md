---
name: just-bash-build
description: |
  Coordinator skill for building the @clawdbot-ready/sandbox package — an 8-phase TypeScript
  project integrating Vercel's just-bash sandboxed shell into the OpenClaw/Clawdbot stack.
  Orchestrates specialized agents, manages phase execution, and handles session handoff.
  Use when: (1) User wants to build or continue the just-bash sandbox project,
  (2) User says "just-bash", "sandbox build", "clawdbot sandbox",
  (3) User runs any /just-bash:* command, (4) User asks about sandbox phase status.
metadata:
  version: 1.0.0
  project_path: /Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/OpenClaw/clawdbot-sandbox
  source: PLANNING/features/just-bash/MASTER-PLAN.md
  integrates_with:
    - phased-build (skill) - phase execution pattern
    - boris (skill) - verification workflow
    - gsd-mode (skill) - fresh-context executors for complex phases
    - long-runner (skill) - multi-session handoff
    - verify-architecture (agent) - structural verification
    - verify-build (agent) - build validation
    - just-bash-researcher (agent) - pre-phase API research
    - just-bash-tester (agent) - post-phase verification gate
triggers:
  - "just-bash"
  - "sandbox build"
  - "clawdbot sandbox"
  - "build sandbox"
  - "next phase"
  - "sandbox status"
  - "just-bash phase"
---

# just-bash Build Coordinator

Orchestrates the 8-phase build of `@clawdbot-ready/sandbox` — a secure execution layer for OpenClaw AgentSkills powered by Vercel's just-bash.

---

## Phase Registry

| Phase | Name | Prompt File | Completion Detection |
|-------|------|------------|---------------------|
| 0 | Project Setup | `PHASE-0-PROJECT-SETUP.md` | `PHASE-0-COMPLETE.md` exists |
| 1 | Filesystem Tiers | `PHASE-1-FILESYSTEM-TIERS.md` | `PHASE-1-COMPLETE.md` exists |
| 2 | Network Security | `PHASE-2-NETWORK-SECURITY.md` | `PHASE-2-COMPLETE.md` exists |
| 3 | AgentSkill Adapter | `PHASE-3-AGENTSKILL-ADAPTER.md` | `PHASE-3-COMPLETE.md` exists |
| 4 | AI SDK Tool | `PHASE-4-AI-SDK-TOOL.md` | `PHASE-4-COMPLETE.md` exists |
| 5 | OpenClaw Plugin | `PHASE-5-OPENCLAW-PLUGIN.md` | `PHASE-5-COMPLETE.md` exists |
| 6 | Permissions | `PHASE-6-PERMISSIONS.md` | `PHASE-6-COMPLETE.md` exists |
| 7 | Integration Testing | `PHASE-7-INTEGRATION-TESTING.md` | `PHASE-7-COMPLETE.md` exists |

**Prompt directory:** `PLANNING/features/just-bash/implementation-phases/`

---

## Agent Team Roster

| Agent | Role | When Invoked |
|-------|------|-------------|
| `just-bash-researcher` | Pre-phase API research | Before phases 1-4 (heavy just-bash API usage) |
| `just-bash-tester` | Post-phase verification gate | After every phase, before completion |
| `verify-architecture` | Structural review | After phases 1, 3, 5 (new module boundaries) |
| `verify-build` | Clean build validation | After phases 0, 5, 7 (build-critical changes) |

---

## Execution Protocol

The per-phase execution loop used by `/just-bash:next`:

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE EXECUTION LOOP                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. DETECT    /just-bash:status → find next incomplete phase  │
│       │                                                       │
│  2. RESEARCH  just-bash-researcher (phases 1-4 only)          │
│       │       Extract API types needed for this phase         │
│       │                                                       │
│  3. EXECUTE   Read PHASE-N-*.md prompt → run all tasks        │
│       │       Complex phases (1,3,4): GSD fresh executors     │
│       │       Simple phases (0,2,5,6): direct execution       │
│       │                                                       │
│  4. VERIFY    just-bash-tester → full verification gate       │
│       │       PASS → continue to step 5                       │
│       │       FAIL → stop, report, suggest fix                │
│       │                                                       │
│  5. COMPLETE  Create PHASE-N-COMPLETE.md                      │
│       │       Record deliverables and verification results    │
│       │                                                       │
│  6. COMMIT    git add + commit with phase summary             │
│       │                                                       │
│  7. REPORT    "Phase N done. /just-bash:next for Phase N+1"  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Phase Complexity Classification

| Complexity | Phases | Execution Strategy |
|-----------|--------|-------------------|
| Simple | 0, 2, 5, 6 | Direct execution in current context |
| Complex | 1, 3, 4 | GSD fresh-context executor pattern (Task tool subagents) |
| Final | 7 | Direct execution + comprehensive verification |

### When to Use GSD Fresh-Context Executors

Use Task tool subagents for phases with 5+ tasks that could exhaust context:
- **Phase 1** (7 tasks): Filesystem tier implementations are independent
- **Phase 3** (6 tasks): Registry, handler, adapter can be built in parallel
- **Phase 4** (6 tasks): AI SDK integration has multiple independent pieces

The orchestrator stays lean (< 30% context) while subagents get fresh 200k windows.

---

## Session Handoff Protocol

For multi-session builds, use the long-runner pattern:

### Progress Tracking

Maintain in the clawdbot-sandbox project root:

**`claude-progress.txt`:**
```
=== CLAUDE PROGRESS LOG ===
Project: @clawdbot-ready/sandbox
Initialized: [timestamp]
Total Phases: 8
Completed: [N]

=== SESSION LOG ===
[Session entries appended here]
```

**`feature_list.json`:**
```json
{
  "phases": [
    { "id": 0, "name": "Project Setup", "status": "complete", "completed_at": "..." },
    { "id": 1, "name": "Filesystem Tiers", "status": "pending" },
    ...
  ]
}
```

### Session Start

1. Read `claude-progress.txt` for context
2. Run `/just-bash:status` for current state
3. Check `feature_list.json` for in-progress work
4. Continue from where last session left off

### Session End

1. Run `/just-bash:verify` to confirm health
2. Update `claude-progress.txt` with session summary
3. Update `feature_list.json` with phase status
4. Git commit progress
5. Note blockers and next steps

---

## Command Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/just-bash:status` | Phase progress + project health | Session start, progress check |
| `/just-bash:next` | Execute next incomplete phase | Ready to build |
| `/just-bash:verify` | Full verification suite | Before commit, after changes |
| `/just-bash:research` | Deep-dive just-bash API | Before phases 1-4, on type errors |

---

## Integration with Existing Skills

### With Boris
- `/just-bash:verify` extends Boris `/verify` with phase-specific checks
- Every phase commit follows Boris verification-first workflow
- Errors documented in project CLAUDE.md "DO NOT" section

### With GSD Mode
- Complex phases (1, 3, 4) use GSD fresh-context executor pattern
- Orchestrator stays lean, subagents get full context windows
- XML task plans not needed — phase prompts serve as task definitions

### With Phased Build
- Follows the same Discovery → Execute → Verify → Complete → Commit loop
- Phase prompts follow phased-build format (Context, Tasks, Success Criteria, On Completion)
- `PHASE-X-COMPLETE.md` documents use phased-build completion template

### With Long-Runner
- `claude-progress.txt` for session-to-session handoff
- `feature_list.json` for phase status tracking
- Session start/end protocols from long-runner

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│              JUST-BASH BUILD QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CHECK STATUS:   /just-bash:status                            │
│                                                               │
│  BUILD NEXT:     /just-bash:next                              │
│                  (detects phase → research → build → verify)  │
│                                                               │
│  VERIFY ALL:     /just-bash:verify                            │
│                  (build + types + tests + lint + smoke)        │
│                                                               │
│  RESEARCH API:   /just-bash:research                          │
│                  (explore just-bash types for current phase)   │
│                                                               │
│  MANUAL PHASE:   Read PHASE-N-*.md → implement → verify       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  AGENT TEAM:                                                  │
│    just-bash-researcher  → API knowledge before phases 1-4    │
│    just-bash-tester      → verification gate after every phase│
│    verify-architecture   → structure check after phases 1,3,5 │
│    verify-build          → build check after phases 0,5,7     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  PHASE MAP:                                                   │
│    0 Setup → 1 FS → 2 Network → 3 Adapter → 4 AI SDK         │
│    → 5 Plugin → 6 Permissions → 7 Integration                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Resources

- **Master Plan:** `PLANNING/features/just-bash/MASTER-PLAN.md`
- **Phase Prompts:** `PLANNING/features/just-bash/implementation-phases/`
- **Status Script:** `.claude/skills/just-bash-build/scripts/check-status.sh`
- **just-bash Source:** https://github.com/vercel-labs/just-bash
