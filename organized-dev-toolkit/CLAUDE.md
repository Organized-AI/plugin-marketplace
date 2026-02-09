# Organized Dev Toolkit

A complete development methodology system for Claude Code. Choose your workflow based on project needs, then execute with structured phases, verification gates, and session management.

## Three Methodologies

| Methodology | Best For | Style |
|------------|----------|-------|
| **Boris** | Production code, team projects | Verification-first: verify before every commit |
| **GSD** | Large complex builds | Fresh-context orchestration: spawn clean contexts for heavy lifting |
| **Ralphy** | Known patterns, MVPs | Autonomous: one command, walk away |

Not sure which to use? The `methodology` skill will recommend based on your project.

## Skills (11)

| Skill | Purpose |
|-------|---------|
| `methodology` | Meta-router: picks Boris, GSD, or Ralphy based on your needs |
| `boris` | Verification-first workflow orchestrator |
| `gsd-mode` | Fresh-context orchestration for large projects |
| `ralphy-mode` | Autonomous PRD execution mode |
| `phased-planning` | Break projects into implementation phases |
| `phased-build` | Execute phases with verification and git commits |
| `phase-0-bootstrap` | Bootstrap TypeScript/Node.js project setup |
| `long-runner` | Manage sessions across multiple context windows |
| `teleport` | Transfer sessions between terminal and web |
| `git-worktree-master` | Parallel branch workflows with git worktrees |
| `organized-codebase-applicator` | Apply structured codebase templates |

## Commands (12)

### Boris Commands
| Command | Description |
|---------|-------------|
| `/boris:status` | Project health check and orientation |
| `/boris:verify` | Run all verification checks |
| `/boris:commit` | Smart commit with auto-verification |
| `/boris:review` | Self-review before creating PR |

### Organized Codebase Commands
| Command | Description |
|---------|-------------|
| `/oc:new-project` | Initialize a project with structured planning |
| `/oc:discuss` | Capture decisions before coding |
| `/oc:quick` | Ad-hoc task with OC guarantees |
| `/oc:progress` | Show current state and next steps |
| `/oc:pause` | Create handoff docs for session pause |
| `/oc:resume` | Restore context from last handoff |

### Session Commands
| Command | Description |
|---------|-------------|
| `/session:start` | Session initialization ritual |
| `/session:end` | Session closure ritual |

## Agents (2)

| Agent | Purpose |
|-------|---------|
| `verify-architecture` | Verify code follows project conventions |
| `verify-build` | Validate builds from clean state |

## Quick Start

1. Start a session: `/session:start`
2. Pick a methodology: ask "which methodology should I use for [project]?"
3. Plan phases: "create implementation phases for [feature]"
4. Build: "execute the next phase"
5. Verify: `/boris:verify`
6. Commit: `/boris:commit`
