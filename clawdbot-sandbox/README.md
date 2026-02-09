# Clawdbot Sandbox

`@clawdbot-ready/sandbox` — Secure sandboxed bash execution for OpenClaw AgentSkills via [just-bash](https://github.com/nichochar/just-bash).

## Features

- **Filesystem tiers** — In-memory (ephemeral), overlay (copy-on-write), read-write (persistent) sandboxes
- **Network controls** — Preset-based policies: `isolated`, `api-only`, `full-access` with URL allowlisting
- **Permission system** — Tier-based command allowlists, filesystem guards, network guards
- **AI SDK integration** — `createTieredBashTool()` for Vercel AI SDK with execution limits per tier
- **Skill adapter** — Route OpenClaw AgentSkill execution through sandboxed environments
- **Plugin system** — Full OpenClaw plugin with lifecycle hooks, config management, audit logging
- **Error hierarchy** — Typed errors: PermissionDenied, SandboxCreation, CommandExecution, NetworkBlocked

## Architecture

```
src/
├── index.ts                    # Package entry, all exports
├── plugin/                     # OpenClaw plugin lifecycle
│   ├── config.ts               # Plugin configuration
│   ├── hooks.ts                # Enable/disable/config/execute hooks
│   └── manifest.ts             # Plugin manifest definition
└── sandbox/
    ├── ai-tool/                # Vercel AI SDK bash tool
    │   ├── tool-factory.ts     # createTieredBashTool()
    │   ├── customer-tool.ts    # Customer-specific tool builder
    │   └── context-seeder.ts   # File seeding for sandbox contexts
    ├── errors.ts               # Custom error hierarchy
    ├── fs-tiers/               # Filesystem tier implementations
    ├── network/                # Network policy engine
    ├── permissions/            # Permission manager and guards
    └── skill-adapter/          # AgentSkill routing and execution
```

## Installation

```bash
claude plugin add Organized-AI/plugin-marketplace clawdbot-sandbox
cd clawdbot-sandbox
pnpm install && pnpm build
```

## Requirements

- Node.js >= 20.0.0
- pnpm

## Tests

8 test suites with 80+ tests covering filesystem tiers, network controls, permissions, AI tool integration, plugin lifecycle, skill adapter, and performance benchmarks.

```bash
pnpm test
```

## License

MIT
