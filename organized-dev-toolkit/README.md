# Organized Dev Toolkit

A complete development methodology system for Claude Code with 11 skills, 12 commands, and 2 verification agents.

## What's Included

### Three Development Methodologies

- **Boris** — Verification-first workflow. Verify before every commit. Best for production code and team projects.
- **GSD Mode** — Fresh-context orchestration. Spawns clean 200k contexts for heavy lifting. Solves "context rot" in large builds.
- **Ralphy Mode** — Autonomous execution. One command, walk away. Speed-optimized for known patterns and MVPs.

A meta-skill (`methodology`) automatically recommends the right approach based on your project.

### Phased Build System

- **phased-planning** — Break any project into structured implementation phases with phase prompts
- **phased-build** — Execute phases with verification gates, completion docs, and git commits
- **phase-0-bootstrap** — Initialize TypeScript/Node.js projects with proper tooling

### Session & Context Management

- **long-runner** — Orchestrate work across multiple context windows with handoff docs
- **teleport** — Transfer sessions between Claude Code terminal and web interfaces
- **git-worktree-master** — Parallel branch workflows using git worktrees

### Project Structure

- **organized-codebase-applicator** — Apply structured templates, create plugins, set up verification infrastructure

### Commands

12 slash commands for Boris verification (`/boris:verify`, `/boris:commit`), organized codebase management (`/oc:new-project`, `/oc:pause`, `/oc:resume`), and session rituals (`/session:start`, `/session:end`).

### Agents

2 verification agents that run as subprocesses: `verify-architecture` (pattern compliance) and `verify-build` (clean build validation).

## Installation

```bash
claude plugin add Organized-AI/plugin-marketplace organized-dev-toolkit
```

## License

MIT
