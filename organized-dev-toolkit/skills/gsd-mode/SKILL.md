---
name: gsd-mode
description: |
  Fresh-context orchestration methodology for large complex projects.
  Solves "context rot" by spawning fresh 200k contexts for heavy lifting.
  Use when building complex applications with many features, when context
  freshness is critical, or when parallel execution would help.
metadata:
  version: 1.0.0
  author: glittercowboy (adapted for Organized Codebase)
  source: https://github.com/glittercowboy/get-shit-done
  integrates_with:
    - boris (skill) - verification workflow
    - long-runner (skill) - multi-session management
    - phased-build (skill) - phase execution
triggers:
  - "gsd"
  - "get shit done"
  - "fresh context"
  - "context rot"
  - "parallel execution"
  - "large project"
  - "complex build"
  - "start gsd project"
---

# GSD Mode Skill

Fresh-context orchestration for large complex projects. Keeps Claude's reasoning sharp by breaking work into atomic, verifiable units across fresh context windows.

---

## Core Philosophy

> "I don't want to play enterprise theater. I'm just a creative person trying to build great things that work."

GSD solves **context rot** - the quality degradation that happens as context fills up. Instead of fighting it, GSD embraces fresh starts for heavy lifting.

---

## When to Use GSD Mode

| Scenario | GSD Appropriate? |
|----------|------------------|
| 50+ feature complex app | ✅ Yes |
| Multi-milestone project | ✅ Yes |
| Quality degrades in long sessions | ✅ Yes |
| Need parallel execution | ✅ Yes |
| Simple CRUD app | ❌ Use Boris |
| Quick prototype | ❌ Use Ralphy |
| Bug fixes | ❌ Use Boris |

---

## The GSD Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      GSD FIVE-PHASE CYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. INITIALIZE ──► 2. DISCUSS ──► 3. PLAN ──► 4. EXECUTE      │
│         │              │              │             │           │
│         ▼              ▼              ▼             ▼           │
│   PROJECT.md      CONTEXT.md     XML Plans    Parallel         │
│   REQUIREMENTS    Lock decisions  (atomic)    Executors        │
│   ROADMAP.md                                  (fresh 200k)     │
│         │              │              │             │           │
│         └──────────────┴──────────────┴─────────────┘           │
│                              │                                  │
│                              ▼                                  │
│                    5. VERIFY (Human UAT)                        │
│                              │                                  │
│                       PASS ──┼── FAIL                           │
│                        │     │                                  │
│                        ▼     ▼                                  │
│                   Next Phase  Debug Agent                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Protocol 1: Project Initialization

Command: `/gsd:new-project`

### Step 1: Vision Extraction
Ask structured questions until vision is CLEAR:
- "What are we building?"
- "Who is the primary user?"
- "Why does this exist?"
- "What does success look like?"

### Step 2: Parallel Research (Spawn 4 Agents)
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  STACK  │  │FEATURES │  │  ARCH   │  │PITFALLS │
│ RESEARCH│  │RESEARCH │  │RESEARCH │  │RESEARCH │
│  AGENT  │  │  AGENT  │  │  AGENT  │  │  AGENT  │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     └────────────┴────────────┴────────────┘
                       │
                       ▼
                 research/
```

### Step 3: Generate Artifacts
```
.planning/
├── config.json         # mode: yolo|interactive
├── PROJECT.md          # Vision (always loaded)
├── REQUIREMENTS.md     # v1/v2/out-of-scope
├── ROADMAP.md          # Milestone breakdown
├── STATE.md            # Decisions & blockers
└── research/           # Domain knowledge
```

### Step 4: Artifact Templates

**PROJECT.md Template:**
```markdown
# [Project Name]

## Vision
[1-2 paragraphs describing what this is and why]

## Primary User
[Who uses this and what they need]

## Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Non-Goals
- [What this project will NOT do]
```

**REQUIREMENTS.md Template:**
```markdown
# Requirements

## v1 (MVP)
- [ ] [Core feature 1]
- [ ] [Core feature 2]

## v2 (Enhancement)
- [ ] [Nice-to-have 1]

## Out of Scope
- [Explicitly excluded]
```

---

## Protocol 2: Discussion Phase

Command: `/gsd:discuss-phase N`

### Purpose
Lock implementation decisions BEFORE planning begins. Capture gray areas, trade-offs, and choices.

### Step 1: Identify Gray Areas
```
For Phase [N], identify:
- Implementation choices with multiple valid approaches
- External dependencies or integrations
- Performance considerations
- Security considerations
- UX decisions
```

### Step 2: Capture Decisions
Create `{phase}-CONTEXT.md`:
```markdown
# Phase [N] Context

## Decisions Made
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth approach | JWT | Stateless, scales horizontally |
| Database | PostgreSQL | Team familiarity, ACID |

## Assumptions
- [Assumption 1]
- [Assumption 2]

## Open Questions (Resolved)
- Q: [Question]? A: [Answer]
```

### Step 3: Lock Context
Once CONTEXT.md is complete, it becomes read-only for planners. No re-litigating decisions during planning.

---

## Protocol 3: Planning Phase

Command: `/gsd:plan-phase N`

### The Planner + Checker Loop
```
┌───────┐      ┌───────┐      ┌───────┐
│PLANNER│─────►│CHECKER│─────►│ PASS? │
│ Agent │      │ Agent │      │       │
└───────┘      └───────┘      └───┬───┘
    ▲                             │
    │                      NO ────┴──── YES
    │                       │            │
    └───────────────────────┘            ▼
                                   XML Task Plans
```

### XML Plan Format
```xml
<task type="auto">
  <name>Implement user authentication</name>
  <files>
    <file action="create">src/auth/auth.service.ts</file>
    <file action="modify">src/app.module.ts</file>
  </files>
  <action>
    1. Create AuthService with login/register methods
    2. Add JWT token generation
    3. Wire up to AppModule
  </action>
  <verify>
    - npm test passes
    - POST /auth/login returns token
    - Token validates correctly
  </verify>
  <done>
    - AuthService exists and is tested
    - Integration tests pass
    - No console.log statements
  </done>
</task>
```

### Planning Rules
- 2-3 atomic tasks per plan
- Each task independently verifiable
- Tasks produce 1 commit each
- No dependencies between parallel tasks

---

## Protocol 4: Execution Phase

Command: `/gsd:execute-phase N`

### Orchestrator Pattern
```
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (lean, <30-40% context)           │
│                           │                                 │
│      ┌──────────┬─────────┼─────────┬──────────┐           │
│      ▼          ▼         ▼         ▼          ▼           │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │EXECUTOR│ │EXECUTOR│ │EXECUTOR│ │EXECUTOR│ │EXECUTOR│     │
│ │ FRESH! │ │ FRESH! │ │ FRESH! │ │ FRESH! │ │ FRESH! │     │
│ │ 200k   │ │ 200k   │ │ 200k   │ │ 200k   │ │ 200k   │     │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│      │          │         │         │          │           │
│      ▼          ▼         ▼         ▼          ▼           │
│   COMMIT     COMMIT    COMMIT    COMMIT     COMMIT         │
│   abc123     def456    ghi789    jkl012     mno345         │
└─────────────────────────────────────────────────────────────┘
```

### Execution Rules
1. **Fresh context per executor** - No context accumulation
2. **Atomic commits** - One commit per task (enables git bisect)
3. **Parallel safe** - Tasks don't conflict (planner's job)
4. **Fail-safe** - Failures don't block other executors

### Commit Message Format
```
type(phase-task): description

- Detail 1
- Detail 2

Closes: #task-id
```

---

## Protocol 5: Verification Phase

Command: `/gsd:verify-work N`

### Human UAT Flow
```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Walk through  │───►│  Pass/Fail    │───►│ Debug Agent   │
│ deliverables  │    │  each item    │    │ (if needed)   │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Verification Checklist
```markdown
## Phase [N] Verification

### Deliverables
- [ ] Feature A works as specified
- [ ] Feature B works as specified
- [ ] No regressions in existing features

### Technical Checks
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No console.log/debug code

### Documentation
- [ ] API changes documented
- [ ] README updated if needed
```

### On Failure
1. Debug agent diagnoses root cause
2. Creates fix plan (XML format)
3. Queue for re-execution
4. Don't mark phase complete until all pass

---

## GSD Artifacts Directory Structure

```
project/
├── .planning/
│   ├── config.json              # GSD configuration
│   ├── PROJECT.md               # Vision (always loaded)
│   ├── REQUIREMENTS.md          # Features by version
│   ├── ROADMAP.md               # Milestones & phases
│   ├── STATE.md                 # Current state & blockers
│   └── research/                # Research agent outputs
│
├── phases/
│   ├── phase-1/
│   │   ├── CONTEXT.md           # Locked decisions
│   │   ├── RESEARCH.md          # Ecosystem findings
│   │   ├── task-1-PLAN.md       # XML task plan
│   │   ├── task-1-SUMMARY.md    # What was built
│   │   └── VERIFICATION.md      # UAT results
│   └── phase-2/
│       └── ...
│
├── CLAUDE.md                    # Boris-style conventions
└── .claude/                     # Commands, agents, skills
```

---

## Integration with Boris Methodology

GSD + Boris work well together:

```
GSD PROVIDES:              BORIS PROVIDES:
- Fresh contexts           - /verify before commits
- Parallel execution       - /commit with verification
- XML task plans          - /review before PRs
- Milestone structure     - Anti-pattern documentation
```

### Hybrid Workflow
1. Use GSD `/gsd:plan-phase` for task planning
2. Executors run Boris `/verify` before each commit
3. Use Boris `/review` before milestone completion
4. Update CLAUDE.md "DO NOT" section from GSD learnings

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `/gsd:new-project` | Initialize full project |
| `/gsd:quick` | Skip research, jump to planning |
| `/gsd:discuss-phase N` | Lock implementation decisions |
| `/gsd:plan-phase N` | Create XML task plans |
| `/gsd:execute-phase N` | Run parallel executors |
| `/gsd:verify-work N` | Human UAT |
| `/gsd:progress` | Show current state |
| `/gsd:pause-work` | Create handoff document |
| `/gsd:resume-work` | Restore from handoff |
| `/gsd:complete-milestone` | Archive and tag |

---

## Quick Reference

```
SESSION START:
Check .planning/ → Read STATE.md → Identify current phase

PHASE CYCLE:
discuss → plan → execute → verify → (next phase)

ON CONTEXT ROT:
Spawn fresh executor → Give it XML plan → Let it work

ON FAILURE:
Debug agent → Fix plan → Re-execute → Don't skip

SESSION END:
Update STATE.md → Commit progress → Note blockers
```

---

**Source:** Adapted from [Get Shit Done](https://github.com/glittercowboy/get-shit-done) for Organized Codebase integration.
