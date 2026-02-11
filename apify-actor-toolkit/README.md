# Apify Actor Toolkit

Complete toolkit for building, testing, and deploying Apify Actors with TypeScript in Claude Code.

## What's Included

- **`scaffold-actor` skill** — Generate a full Actor project with package.json, tsconfig.json, .actor/ config, Dockerfile, and src/ structure
- **`/gate-check` command** — Build + test + type-check verification gate
- **`/actor-local-test` command** — Run your Actor locally with test input
- **`/actor-deploy` command** — Clean build + deploy to Apify cloud
- **`apify-actor-builder` agent** — Full phased build orchestrator

## Installation

Copy the plugin directory into your project or install via the Organized AI marketplace.

## Prerequisites

```bash
brew install apify-cli   # or: npm i -g apify-cli
apify login              # authenticate with Apify
```

## Quick Start

1. Ask Claude Code to use the `scaffold-actor` skill to create your project
2. Implement your Actor logic in `src/main.ts`
3. Run `/gate-check` to verify
4. Run `/actor-local-test` to test locally
5. Run `/actor-deploy` to push to Apify cloud
