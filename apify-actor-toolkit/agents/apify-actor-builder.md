---
name: apify-actor-builder
description: Full phased build orchestration for Apify Actors — takes a plan and implements it phase by phase with gate checks, completion docs, and testing
triggers:
  - "build this apify actor"
  - "implement the actor"
  - "execute the actor build plan"
---

# Apify Actor Builder Agent

Takes an implementation plan and builds a complete Apify Actor through structured phases with verification gates between each phase.

## Purpose

Orchestrate the full lifecycle of building an Apify Actor:
1. Scaffold the project (if not already done)
2. Implement each phase from the plan
3. Run gate checks (build + test + type-check) after each phase
4. Write completion documentation per phase
5. Run the Actor locally to verify end-to-end
6. Prepare for deployment

## Prerequisites

Before starting, verify:
```bash
which apify || echo "Install: brew install apify-cli"
which node || echo "Install: brew install node"
```

## Workflow

### 1. Discovery

Check if a scaffold already exists:
```bash
ls package.json tsconfig.json .actor/actor.json src/main.ts 2>/dev/null
```

If no scaffold exists, use the `scaffold-actor` skill first.

Check for an implementation plan:
```bash
ls PLANNING/implementation-phases/PHASE-*-PROMPT.md 2>/dev/null
ls PLANNING/IMPLEMENTATION-MASTER-PLAN.md 2>/dev/null
```

If no plan exists, ask the user what the Actor should do, then create:
- `PLANNING/REQUIREMENTS.md` — What the Actor must do
- `PLANNING/implementation-phases/PHASE-0-PROMPT.md` through `PHASE-N-PROMPT.md`

### 2. Determine Current State

```bash
# Find completed phases
ls PLANNING/PHASE-*-COMPLETE.md 2>/dev/null || ls PLANNING/implementation-phases/PHASE-*-COMPLETE.md 2>/dev/null

# Next phase = highest completed + 1
```

### 3. Phase Execution Loop

For each phase:

**a) Read the phase prompt:**
```
Read PLANNING/implementation-phases/PHASE-N-PROMPT.md
```

**b) Implement all tasks** described in the prompt:
- Create/edit source files in `src/`
- Create/edit test files in `tests/`
- Use `.js` extensions in all relative TypeScript imports (ESM requirement)

**c) Run the gate check:**
```bash
npm run build && npm test && npx tsc --noEmit
```

ALL THREE must pass before proceeding. If any fail:
- Fix the issue
- Re-run the gate
- Do not proceed until green

**d) Verify dist/ output:**
```bash
ls dist/
```

If `dist/` is empty after build succeeds, check `tsconfig.json`:
- `importHelpers` must be `false`
- `incremental` must be `false`

**e) Write completion file:**

Create `PLANNING/PHASE-N-COMPLETE.md`:
```markdown
# Phase N: <Phase Name> — COMPLETE

**Completed:** <date>

## What was done
- <bullet points of what was implemented>

## Gate Results
- `npm run build` — OK
- `npm test` — N/N passed
- `npx tsc --noEmit` — OK
```

**f) Continue to next phase** or stop if requested.

### 4. Final Verification

After all phases are complete, run the full clean-state verification:

```bash
rm -rf node_modules dist
npm ci
npm run build
npm test
npx tsc --noEmit
```

Then test the Actor locally:

```bash
mkdir -p storage/key_value_stores/default
# Create INPUT.json with test data
apify run
```

Verify output in `storage/datasets/default/` and `storage/key_value_stores/default/`.

### 5. Report

```
Apify Actor Build Complete
══════════════════════════════════════

Phases Completed: N/N
Total Tests:      X passing
Build Status:     ✅ Clean build verified
Local Run:        ✅ Actor produces expected output

Files Created:
  src/          — N source files
  tests/        — N test files
  .actor/       — actor.json, input_schema.json, Dockerfile
  PLANNING/     — N phase completion docs

Next Steps:
  1. Review the output from the local test run
  2. Run /actor-deploy to push to Apify cloud
  3. Configure scheduled runs in the Apify Console
```

## Apify-Specific Gotchas

| Issue | Solution |
|-------|----------|
| `tsc` produces no output | Set `importHelpers: false` and `incremental: false` in tsconfig.json |
| `apify run` rejects input | Every field in `input_schema.json` needs an `editor` property |
| `apify_storage` renamed to `storage` | Normal SDK v3 migration, happens once |
| Tests pick up `.claude/` files | Add `exclude: ['.claude/**']` to vitest.config.ts |
| ESM import errors | Use `.js` extensions in relative imports (e.g., `./parser/index.js`) |
| stale incremental build | Delete `tsconfig.tsbuildinfo` or set `incremental: false` |

## Phase Prompt Template

When creating phase prompts, use this structure:

```markdown
# Phase N: <Name>

## Objective
<1-2 sentences>

## Tasks
### 1. <Task>
<Description, files to create/edit, expected behavior>

### 2. <Task>
...

## Gate
`npm run build && npm test && npx tsc --noEmit`
```
