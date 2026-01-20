---
name: phased-planning
description: Creates structured implementation plans with phase prompts for Claude Code execution. Use when building complex projects, creating implementation roadmaps, breaking work into phases, or generating Claude Code prompts for multi-step development. Triggers include "create implementation plan", "phase this project", "create phases for", "plan the build", "phased implementation", "break this into phases".
---

# Phased Planning Skill

Creates comprehensive phased implementation plans that generate copy-paste ready prompts for Claude Code execution, with success criteria and completion templates for each phase.

## Triggers

- "create implementation plan"
- "phase this project"
- "create phases for"
- "plan the build"
- "phased implementation"
- "create Claude Code prompts"
- "break this into phases"
- "implementation roadmap"

---

## Workflow

### Phase 1: Project Analysis

Before creating phases, gather information:

```
1. Identify all components to build
2. Map dependencies between components
3. Determine optimal build order
4. Estimate phase complexity (3-12 tasks each)
```

### Phase 2: Create Master Plan

Generate `PLANNING/IMPLEMENTATION-MASTER-PLAN.md`:

```markdown
# [PROJECT NAME] - Implementation Master Plan

**Created:** [DATE]
**Project Path:** [PATH]
**Runtime:** [TECHNOLOGY]

---

## Pre-Implementation Checklist

### ✅ Documentation (Complete)
| Component | Location | Status |
|-----------|----------|--------|
| [Doc 1] | [path] | ✅ |

### ⏳ Code Implementation (To Build)
| Component | Location | Status |
|-----------|----------|--------|
| [Component 1] | [path] | ⏳ |

---

## Implementation Phases Overview

| Phase | Name | Files | Dependencies |
|-------|------|-------|--------------|
| 0 | Project Setup | package.json, tsconfig | None |
| 1 | Core Infrastructure | src/lib/* | Phase 0 |
| ... | ... | ... | ... |
```

### Phase 3: Write Phase Prompts

For each phase, create `PLANNING/implementation-phases/PHASE-X-PROMPT.md`:

```markdown
# Phase [X]: [NAME]

## Objective
[One sentence describing what this phase accomplishes]

---

## Prerequisites
- Phase [X-1] complete
- [Other requirements]

---

## Context Files to Read
```
[file1.md]
[file2.md]
```

---

## Tasks

### 1. [Task Name]
[Description]

```[language]
// Complete code specification
```

### 2. [Task Name]
...

---

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Completion

Create `PHASE-[X]-COMPLETE.md` and commit:
```bash
git add -A
git commit -m "Phase [X]: [NAME] - [summary]"
```

## Next Phase Instructions

⚠️ **IMPORTANT: Start a fresh context window before the next phase!**

1. Exit this session: `/exit`
2. Open new Claude Code terminal
3. Run: `claude --dangerously-skip-permissions`
4. Execute: "Read PLANNING/implementation-phases/PHASE-[X+1]-PROMPT.md and execute all tasks"
```

### Phase 4: Create Quick-Start Prompt

Generate `CLAUDE-CODE-PHASE-0.md` at project root for easy copy-paste into Claude Code.

---

## Standard Phase Types

| Phase | Name | Purpose |
|-------|------|---------|
| 0 | Project Setup | package.json, tsconfig, dependencies, structure |
| 1 | Core Infrastructure | Config, logging, utilities, base clients |
| 2 | Framework | Base classes, types, patterns |
| 3 | Core Logic | Main business logic implementation |
| 4-N | Feature Phases | Individual features/components |
| Final | Integration | CLI, tests, end-to-end verification |

---

## File Organization

```
PROJECT/
├── PLANNING/
│   ├── IMPLEMENTATION-MASTER-PLAN.md
│   └── implementation-phases/
│       ├── PHASE-0-PROMPT.md
│       ├── PHASE-1-PROMPT.md
│       ├── PHASE-0-COMPLETE.md (created after)
│       └── PHASE-1-COMPLETE.md (created after)
├── CLAUDE-CODE-PHASE-0.md (quick-start prompt)
└── CLAUDE.md (updated with phase tracking)
```

---

## Phase Sizing Guidelines

| Complexity | Tasks | Approx. Time |
|------------|-------|--------------|
| Simple | 3-5 tasks | 10-20 min |
| Medium | 5-8 tasks | 20-40 min |
| Complex | 8-12 tasks | 40-60 min |

**Rule:** If >12 tasks, split into sub-phases.

---

## Completion Template

```markdown
# Phase [X]: [NAME] - COMPLETE

**Completed:** [DATE]

## Deliverables
- [x] [File/feature 1]
- [x] [File/feature 2]

## Verification
- `[command 1]`: ✅
- `[command 2]`: ✅

## Notes
[Any issues or deviations]

## Next Phase
⚠️ **START FRESH CONTEXT WINDOW** before proceeding!

1. Exit this session: `/exit`
2. Start new Claude Code session
3. Run: "Read PLANNING/implementation-phases/PHASE-[X+1]-PROMPT.md and execute all tasks"

Proceed to Phase [X+1]: [NAME]
```

---

## Execution Protocol

### CRITICAL: Fresh Context Per Phase

**Each phase MUST run in a fresh context window to avoid compaction during builds.**

Why fresh context per phase:
- Prevents context compaction mid-build which can lose important state
- Ensures full context budget available for each phase
- Creates cleaner phase boundaries with explicit handoff
- Allows complex phases to use maximum context without truncation

### Starting a Phase

```bash
cd [project]
claude --dangerously-skip-permissions

# In Claude Code:
"Read PLANNING/implementation-phases/PHASE-X-PROMPT.md and execute all tasks"
```

### Completing a Phase

1. Verify all success criteria checkboxes
2. Create `PHASE-X-COMPLETE.md` from template
3. Git commit with phase message
4. **EXIT Claude Code** (`/exit` or close terminal)
5. **Start NEW context window** for next phase
6. Continue with next phase prompt

### Phase Transition Protocol

After completing each phase:

```bash
# 1. Commit current phase
git add -A
git commit -m "Phase [X]: [NAME] - Complete"

# 2. Exit current Claude session
/exit

# 3. Start fresh session for next phase
claude --dangerously-skip-permissions

# 4. Begin next phase with full context
"Read PLANNING/implementation-phases/PHASE-[X+1]-PROMPT.md and execute all tasks"
```

---

## Best Practices

1. **Fresh context per phase** - Exit and restart Claude Code between phases to avoid compaction
2. **Complete code in prompts** - Don't leave implementation to inference
3. **Explicit success criteria** - Checkboxes that can be verified
4. **Clear dependencies** - State what must be complete first
5. **Git commits per phase** - Clean history with phase messages
6. **No time estimates** - Use phase order, not days/weeks
7. **Context files** - Always specify what to read first
8. **Self-contained phases** - Each phase prompt should include all context needed (don't rely on prior conversation)

---

## Integration

Works with:
- **organized-codebase-applicator** - For project structure
- **phase-0-template** - For quick project setup
- **tech-stack-orchestrator** - For component recommendations
