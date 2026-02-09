---
name: ralphy-mode
description: |
  Autonomous PRD execution mode - "one command, walk away" development.
  Use for known patterns (CRUD, REST APIs, boilerplate), fast MVPs,
  or when you have clear requirements and want minimal involvement.
  Speed-optimized workflow with automated verification and commits.
metadata:
  version: 1.0.0
  author: michaelshimeles (adapted for Organized Codebase)
  source: https://github.com/michaelshimeles/ralphy
  integrates_with:
    - boris (skill) - can apply Boris verification to Ralphy output
    - phased-build (skill) - similar phase structure
triggers:
  - "ralphy"
  - "autonomous mode"
  - "fire and forget"
  - "walk away"
  - "execute prd"
  - "fast build"
  - "auto build"
---

# Ralphy Mode Skill

Autonomous PRD execution for rapid development. Define requirements, run one command, return to working code.

---

## Core Philosophy

> "Generate PRDs, run one command, walk away."

Ralphy treats AI agents as a **build pipeline** - deterministic, autonomous, outcome-focused. You define inputs (tasks), constraints (rules), and success criteria (tests), then let agents execute.

---

## When to Use Ralphy Mode

| Scenario | Ralphy Appropriate? |
|----------|---------------------|
| CRUD application | ✅ Yes |
| REST API boilerplate | ✅ Yes |
| Known patterns (auth, forms, lists) | ✅ Yes |
| Speed is priority | ✅ Yes |
| Clear PRD exists | ✅ Yes |
| Novel/experimental architecture | ❌ Use Boris |
| Quality-critical production | ❌ Use Boris |
| Complex multi-system integration | ❌ Use GSD |

---

## The Ralphy Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPHY EXECUTION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   HUMAN CREATES:                                                │
│   ┌─────────────┐    ┌─────────────┐                           │
│   │  PRD Files  │    │  Config     │                           │
│   │  (checkbox  │    │  (rules &   │                           │
│   │   tasks)    │    │  boundaries)│                           │
│   └──────┬──────┘    └──────┬──────┘                           │
│          │                  │                                   │
│          └────────┬─────────┘                                   │
│                   │                                             │
│   ════════════════╪═════════════════════════════════════════   │
│          HUMAN WORK ENDS HERE                                   │
│   ════════════════╪═════════════════════════════════════════   │
│                   │                                             │
│                   ▼                                             │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              RALPHY EXECUTION ENGINE                     │   │
│   │                                                         │   │
│   │   Phase 0 → Phase 1 → Phase 2 → ... → Phase N           │   │
│   │      │         │         │              │               │   │
│   │      ▼         ▼         ▼              ▼               │   │
│   │   [AUTO]    [AUTO]    [AUTO]         [AUTO]             │   │
│   │   Execute   Execute   Execute        Execute            │   │
│   │   Verify    Verify    Verify         Verify             │   │
│   │   Commit    Commit    Commit         Commit             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                   │                                             │
│                   ▼                                             │
│              WORKING CODE                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Protocol 1: PRD Creation

### PRD File Format
```markdown
# Phase 0: Project Setup

## Tasks
- [ ] Initialize npm project with TypeScript
- [ ] Set up ESLint and Prettier
- [ ] Configure tsconfig.json with strict mode
- [ ] Create basic directory structure

## Success Criteria
- `npm run build` succeeds
- `npm run lint` passes
- All directories exist

---

# Phase 1: Core Implementation

## Tasks
- [ ] Create User model
- [ ] Implement UserService with CRUD operations
- [ ] Add unit tests for UserService
- [ ] Create REST endpoints for users

## Success Criteria
- All tests pass
- API endpoints respond correctly
```

### PRD Best Practices
1. **Checkbox format** - `- [ ]` for tasks (auto-marked `- [x]` when complete)
2. **One task per line** - Clear, atomic tasks
3. **Success criteria** - How to verify phase completion
4. **Phase separation** - Clear breaks between phases

---

## Protocol 2: Configuration

### Directory Structure
```
project/
├── .ralphy/
│   ├── config.yaml          # Project configuration
│   └── progress.txt         # Auto-updated progress
├── prd/
│   ├── phase-0-setup.md     # Phase 0 PRD
│   ├── phase-1-core.md      # Phase 1 PRD
│   └── phase-2-features.md  # Phase 2 PRD
└── ...
```

### config.yaml Template
```yaml
# Ralphy Configuration

version: "1.0"

project:
  name: "my-project"
  description: "Project description"
  language: "typescript"
  framework: "express"

commands:
  test: "npm test"
  lint: "npm run lint"
  build: "npm run build"

rules:
  - "Use TypeScript strict mode"
  - "All functions must have return types"
  - "Use async/await over callbacks"
  - "Follow conventional commits"

boundaries:
  never_touch:
    - "*.env*"
    - "prd/"
    - ".ralphy/"
    - "node_modules/"
    - ".git/"

capabilities:
  browser: false  # Set true for UI testing

notifications:
  discord_webhook: ""  # Optional
  slack_webhook: ""    # Optional

execution:
  max_retries: 3
  parallel: false      # Set true for parallel execution
  fast_mode: false     # Skip lint/test if true
```

---

## Protocol 3: Execution

### Single Task Mode
```bash
# Ad-hoc single task
ralphy "add login button to header"
```

### PRD Mode
```bash
# Execute all PRD files
ralphy --prd prd/
```

### Parallel Mode (Advanced)
```bash
# Execute with parallel agents
ralphy --prd prd/ --parallel

# Creates isolated worktrees:
# .ralphy-worktrees/
#   ├── agent-1-task-name/
#   ├── agent-2-task-name/
#   └── agent-3-task-name/
```

### Fast Mode
```bash
# Skip lint and tests (speed over safety)
ralphy --prd prd/ --fast
```

---

## Protocol 4: Verification

### Automatic Verification
Ralphy auto-verifies after each task:
1. Run `commands.lint` (if not `--fast`)
2. Run `commands.test` (if not `--fast`)
3. Check task completion criteria
4. Mark checkbox as complete
5. Commit changes

### Retry Logic
```
Task fails → Retry 1 → Retry 2 → Retry 3 → Skip (log failure)
```

### Progress Tracking
`.ralphy/progress.txt`:
```
=== RALPHY PROGRESS ===
Project: my-project
Started: 2024-01-15T10:00:00Z

=== PHASE 0 ===
[✓] Initialize npm project
[✓] Set up ESLint
[✓] Configure TypeScript
Time: 2m 15s

=== PHASE 1 ===
[✓] Create User model
[ ] Implement UserService (IN PROGRESS)
```

---

## Protocol 5: Boundaries

### Never Touch Files
```yaml
boundaries:
  never_touch:
    - "*.env*"           # Secrets
    - "prd/"             # Task definitions
    - ".ralphy/"         # Progress tracking
    - "credentials.*"    # Credentials
```

### Rule Enforcement
Rules in `config.yaml` are injected into agent context:
```yaml
rules:
  - "Never use any type"
  - "Always handle errors"
  - "No console.log in production code"
```

---

## Organized Codebase Integration

### Setting Up Ralphy Mode
```bash
# Use the justfile recipe
just add-ralphy

# Or manually create structure
mkdir -p .ralphy prd
```

### Hybrid Workflow: Ralphy → Boris

1. **Scaffold with Ralphy** (fast)
   ```bash
   ralphy --prd prd/phase-0-setup.md
   ```

2. **Refine with Boris** (quality)
   ```bash
   # Run Boris verification on Ralphy output
   /verify

   # Review for quality
   /review
   ```

### Converting Boris Phases to PRD
```markdown
# PHASE-0-PROMPT.md (Boris format)
## Tasks
1. Initialize project
2. Set up TypeScript

# Converts to:

# phase-0-setup.md (Ralphy format)
- [ ] Initialize project
- [ ] Set up TypeScript
```

---

## Comparison with Boris

| Aspect | Ralphy | Boris |
|--------|--------|-------|
| **Human involvement** | PRD creation only | Every commit |
| **Verification** | Automated (checkbox) | Multi-tool + human |
| **Speed** | ⚡ Fast | 🐢 Thorough |
| **Safety** | Medium | High |
| **Learning** | Minimal | High (anti-patterns) |
| **Best for** | Known patterns | Novel/quality work |

---

## Quick Reference

```
SETUP:
just add-ralphy → Create prd/*.md files → Configure .ralphy/config.yaml

EXECUTE:
ralphy --prd prd/                    # Standard execution
ralphy --prd prd/ --parallel         # Parallel agents
ralphy --prd prd/ --fast             # Skip verification
ralphy "single task description"     # Ad-hoc task

MONITOR:
tail -f .ralphy/progress.txt         # Watch progress
cat prd/phase-0-setup.md | grep "\[x\]" | wc -l  # Count complete

CLEANUP:
rm -rf .ralphy-worktrees             # Remove parallel workspaces
```

---

## When to Exit Ralphy Mode

Switch to Boris when:
- Quality issues emerge in Ralphy output
- Novel patterns not covered by PRD
- Need to debug/understand code deeply
- Team collaboration required
- Production deployment approaching

```
Ralphy (speed) ──► Boris (quality) ──► Production
```

---

**Source:** Adapted from [Ralphy](https://github.com/michaelshimeles/ralphy) for Organized Codebase integration.
