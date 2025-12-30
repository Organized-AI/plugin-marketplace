---
name: phase-0-template
description: Generates ready-to-use Phase 0 (Project Setup) prompts for Claude Code. Use when initializing new TypeScript/Node.js projects, bootstrapping project structure, or creating the first phase of an implementation plan. Triggers include "create phase 0", "project setup prompt", "initialize typescript project", "bootstrap project", "init project".
---

# Phase 0 Template Skill

Generates ready-to-use Phase 0 (Project Setup) prompts for Claude Code, including package.json, tsconfig.json, dependencies, and directory structure customized by project type.

## Triggers

- "create phase 0"
- "project setup prompt"
- "initialize typescript project"
- "phase 0 for"
- "create setup phase"
- "bootstrap project"
- "init project"

---

## Workflow

### Step 1: Gather Project Info

Ask for or infer:

| Field | Example |
|-------|---------|
| Project Name | `meta-media-buyer` |
| Description | "AI agent system for Meta Ads" |
| Project Type | CLI / API / Agent System / MCP Server / Library |

### Step 2: Select Preset

**CLI Application:**
```
Core deps: commander, chalk, ora, dotenv, zod
Directories: src/commands, src/lib, src/utils
```

**API Server:**
```
Core deps: fastify, zod, dotenv, pino
Directories: src/routes, src/lib, src/middleware, src/types
```

**Agent System:**
```
Core deps: zod, dotenv, commander, chalk, ora
Directories: src/agents, src/lib, src/mcp, src/types
```

**MCP Server:**
```
Core deps: @modelcontextprotocol/sdk, zod, dotenv
Directories: src/tools, src/lib, src/types
```

**Library:**
```
Core deps: zod
Directories: src/lib, src/types
```

### Step 3: Generate Phase 0 Prompt

Create `PLANNING/implementation-phases/PHASE-0-PROMPT.md` and `CLAUDE-CODE-PHASE-0.md`.

---

## Template Output

```markdown
# Phase 0: Project Setup

## Objective
Initialize the TypeScript/Node.js project with configuration, dependencies, and directory structure.

---

## Context Files to Read First
```
CLAUDE.md
[MAIN_DOCUMENTATION].md
```

---

## Tasks

### 1. Create package.json

```json
{
  "name": "[PROJECT_NAME]",
  "version": "1.0.0",
  "description": "[DESCRIPTION]",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "[PROJECT_NAME]": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist/"
  },
  "author": "Jordaan Hill",
  "license": "MIT",
  "engines": { "node": ">=20.0.0" }
}
```

### 2. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Install Dependencies

```bash
npm install [CORE_DEPS]
npm install -D typescript @types/node tsx vitest eslint
```

### 4. Create .env.example

```env
[ENV_VARS]
LOG_LEVEL=info
```

### 5. Create Directory Structure

```bash
mkdir -p src/[DIRS]
mkdir -p tests/[TEST_DIRS]
mkdir -p logs && touch logs/.gitkeep
```

### 6. Create Entry Point

```typescript
#!/usr/bin/env node
console.log('[PROJECT_NAME] - Phase 0 Complete');
console.log('Run `npm run build` to verify TypeScript setup');
```

---

## Success Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run build` compiles successfully
- [ ] `npm run typecheck` passes
- [ ] `npx tsx src/index.ts` shows welcome message

---

## Completion

Create `PHASE-0-COMPLETE.md` and commit:
```bash
git add -A
git commit -m "Phase 0: Project setup complete - TypeScript initialized"
```
```

---

## .gitignore Template

Always include:

```gitignore
node_modules/
dist/
.env
.env.local
.vscode/
.idea/
.DS_Store
logs/*.jsonl
!logs/.gitkeep
coverage/
```

---

## Quick Command for Claude Code

After generating Phase 0 prompt:

```bash
cd [project]
claude --dangerously-skip-permissions

# Paste:
"Read CLAUDE-CODE-PHASE-0.md and execute all tasks"
```

---

## Integration

Works with:
- **phased-planning** - For complete multi-phase plans
- **organized-codebase-applicator** - For project structure
- **tech-stack-orchestrator** - For component recommendations
