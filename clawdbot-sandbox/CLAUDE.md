# Clawdbot Sandbox

Secure sandboxed bash execution for OpenClaw AgentSkills. Built on Vercel's [just-bash](https://github.com/nichochar/just-bash), it protects customer hardware from destructive commands while maintaining full agent capability.

## What It Does

- **Filesystem tiers**: In-memory, overlay, and read-write sandboxes depending on trust level
- **Network controls**: Preset-based network policies (isolated, api-only, full-access)
- **Permission guards**: Command allowlists, filesystem access checks, network access checks
- **AI SDK tool**: Drop-in `createTieredBashTool()` for Vercel AI SDK integration
- **Skill adapter**: Route AgentSkill execution through the sandbox with trust-level enforcement
- **OpenClaw plugin**: Full lifecycle hooks (enable, disable, config change, skill execute)

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

## Package Exports

```typescript
import { createSandbox } from "@clawdbot-ready/sandbox";
import { createTieredBashTool } from "@clawdbot-ready/sandbox/ai";
import { createPlugin } from "@clawdbot-ready/sandbox/plugin";
import { PermissionManager } from "@clawdbot-ready/sandbox/permissions";
```

## Commands

| Command | Description |
|---------|-------------|
| `/just-bash:status` | Build progress and project health |
| `/just-bash:next` | Execute the next incomplete phase |
| `/just-bash:verify` | Run full verification suite |
| `/just-bash:research` | Deep-dive API research for a phase |

## Agents

| Agent | Purpose |
|-------|---------|
| `just-bash-researcher` | Pre-phase API research for just-bash types and exports |
| `just-bash-tester` | Post-phase verification gate (build, typecheck, tests, lint) |
