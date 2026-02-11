# Apify Actor Toolkit

A complete toolkit for building production-ready Apify Actors with TypeScript. Covers the full lifecycle: scaffolding, phased implementation, local testing, and deployment.

## Skills (1)

| Skill | Purpose |
|-------|---------|
| `scaffold-actor` | Generate a complete Apify Actor project with all config, TypeScript setup, Docker, and boilerplate |

## Commands (3)

| Command | Description |
|---------|-------------|
| `/gate-check` | Run build + test + type-check verification gate |
| `/actor-local-test` | Prepare input, run Actor locally, and display results |
| `/actor-deploy` | Clean build verification and `apify push` |

## Agents (1)

| Agent | Description |
|-------|-------------|
| `apify-actor-builder` | Full phased build orchestration — takes a plan and implements an Apify Actor phase by phase with gate checks |

## Prerequisites

- Node.js >= 22
- Apify CLI (`brew install apify-cli` or `npm i -g apify-cli`)
- Apify account (`apify login`)

## Typical Workflow

1. Use `scaffold-actor` to generate the project
2. Plan your implementation phases in `PLANNING/implementation-phases/`
3. Use `apify-actor-builder` agent to execute the phased build
4. Use `/gate-check` after each phase to verify
5. Use `/actor-local-test` to test with real data
6. Use `/actor-deploy` to push to Apify cloud

## Known TypeScript Gotchas

When extending `@apify/tsconfig`, you MUST override these in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "importHelpers": false,
    "incremental": false
  }
}
```
Without this, `tsc` silently produces no output files.
