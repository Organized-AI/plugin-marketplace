---
name: teleport
description: |
  Seamless session transfer between Claude Code terminal and web interfaces.
  Use when: (1) Sending tasks to web with "&" prefix or "--remote" flag,
  (2) Bringing web sessions back to terminal with "/teleport" or "--teleport",
  (3) Checking parallel task status with "/tasks", (4) Configuring remote
  environments with "/remote-env", (5) Troubleshooting teleport issues like
  dirty git state, wrong repo, or missing branches.
metadata:
  version: 1.0.0
  author: Organized Codebase
  source: https://code.claude.com/docs/en/claude-code-on-the-web
  integrates_with:
    - boris
    - commit
    - long-runner
    - git-worktree-master
triggers:
  - "teleport"
  - "/teleport"
  - "/tp"
  - "send to web"
  - "send to cloud"
  - "& command"
  - "--remote"
  - "run in web"
  - "parallel task"
  - "check tasks"
  - "/tasks"
  - "bring to terminal"
  - "open in CLI"
  - "remote session"
  - "web to terminal"
  - "terminal to web"
  - "remote-env"
---

# Teleport

Seamless session transfer between Claude Code terminal and web interfaces. Move your work to the cloud for parallel execution, or bring web sessions back to terminal for local development.

> **Core Philosophy:** Work where it makes sense. Execute in the cloud. Finish on your machine.

---

## Quick Reference

| Direction | Command | Description |
|-----------|---------|-------------|
| Terminal → Web | `& Fix the auth bug` | Send task to web session |
| Terminal → Web | `claude --remote "task"` | Explicit remote execution |
| Web → Terminal | `/teleport` or `/tp` | Interactive session picker |
| Web → Terminal | `claude --teleport` | CLI teleport (interactive) |
| Web → Terminal | `claude --teleport <id>` | Teleport specific session |
| Monitor | `/tasks` | View all parallel tasks |
| Monitor | Press `t` in /tasks | Teleport selected task |
| Config | `/remote-env` | Set default cloud environment |
| Config | `check-tools` | List available cloud tools |

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      TELEPORT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   TERMINAL                                        WEB           │
│   ┌──────────┐                              ┌──────────┐        │
│   │          │    & Task description        │          │        │
│   │  Claude  │ ─────────────────────────────>  Claude  │        │
│   │   CLI    │    claude --remote           │   Web    │        │
│   │          │                              │          │        │
│   │          │    /teleport                 │          │        │
│   │          │ <─────────────────────────────          │        │
│   │          │    claude --teleport         │          │        │
│   └──────────┘                              └──────────┘        │
│        │                                         │              │
│        └──────── /tasks (monitor) ───────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** Session handoff is one-way from web to terminal. The `&` prefix creates a *new* web session with your current conversation context.

---

## Protocol 1: Terminal to Web

Send tasks to run in Claude's cloud environment while you continue local work.

### Method 1: Ampersand Prefix

Start any message with `&` to send it to the web:

```
& Fix the authentication bug in src/auth/login.ts
& Refactor the database queries for better performance
& Write comprehensive tests for the API endpoints
```

### Method 2: CLI Remote Flag

```bash
claude --remote "Implement the new feature described in SPEC.md"
```

### Best Practice: Plan First, Execute Remote

For complex tasks, collaborate on the approach locally first:

```bash
# Enter plan mode
claude --permission-mode plan
```

In plan mode, Claude can only read files. Once satisfied with the plan:

```
& Execute the migration plan we discussed
```

This gives you control over strategy while Claude executes autonomously in the cloud.

### Parallel Execution

Each `&` creates a separate web session running independently:

```
& Implement user authentication
& Set up database migrations
& Create API documentation
```

Monitor all sessions with `/tasks`. When complete, teleport back or create PRs from web.

### What Happens When You Send

1. Task sent to Claude web with current conversation context
2. New web session created on Anthropic-managed VM
3. Repository cloned and environment prepared
4. Claude works autonomously (you can steer via web interface)
5. Changes pushed to a branch when complete
6. You're notified and can create a PR

---

## Protocol 2: Web to Terminal

Bring a web session back to your local terminal for continued development.

### Method 1: Interactive Picker (In Claude Code)

```
/teleport
```
or
```
/tp
```

Displays list of available sessions to choose from.

### Method 2: CLI Command

```bash
# Interactive - pick from list
claude --teleport

# Specific session by ID
claude --teleport abc123def
```

### Method 3: From Task View

```
/tasks
```

Then press `t` to teleport the selected task.

### Method 4: From Web Interface

Click "Open in CLI" button in web interface to copy a command for your terminal.

### Pre-Teleport Requirements

```
TELEPORT CHECKLIST
═══════════════════════════════════════════════════════════════

□ Clean git state
  └── No uncommitted changes (will prompt to stash if dirty)

□ Correct repository
  └── Must be the same repo as web session (not a fork)

□ Branch available
  └── Branch from web session must be pushed to remote

□ Same account
  └── Must be logged into same Claude.ai account

═══════════════════════════════════════════════════════════════
```

### Pre-Teleport Commands

```bash
# Check git status
git status

# If changes exist, stash them
git stash push -m "Pre-teleport stash"

# Or commit them
git add . && git commit -m "WIP: Pre-teleport checkpoint"

# Ensure you can access remote
git fetch --all
```

### What Happens When You Teleport

1. Claude verifies you're in the correct repository
2. Fetches and checks out the branch from remote session
3. Loads the full conversation history into your terminal
4. You continue working with full local tool access

---

## Protocol 3: Monitoring Parallel Tasks

### Check Task Status

```
/tasks
```

Shows all running web sessions with:
- Session ID
- Task description
- Status (running, completed, failed)
- Duration

### Task View Controls

| Key | Action |
|-----|--------|
| `t` | Teleport selected task to terminal |
| `Enter` | View task details |
| `↑/↓` | Navigate tasks |
| `q` | Exit task view |

### Parallel Workflow Example

```
# Morning: Kick off parallel tasks
& Fix the flaky test in auth.spec.ts
& Update the API documentation
& Refactor the logger to use structured output

# Afternoon: Check progress
/tasks

# Evening: Teleport completed work
/teleport
# Select the auth fix session
# Review, commit, push
```

---

## Protocol 4: Environment Configuration

### Select Remote Environment

```
/remote-env
```

Interactive picker for selecting which cloud environment to use when starting web sessions. Options include:
- Network access level (limited, full, none)
- Pre-installed tools
- Environment variables

### Check Available Tools

Ask Claude to run:

```bash
check-tools
```

Lists pre-installed tools in the cloud environment:
- Programming languages and versions
- Package managers
- Development tools

### Cloud Environment Includes

| Category | Tools |
|----------|-------|
| Languages | Python 3.x, Node.js LTS, Ruby 3.x, Go, Rust, Java |
| Package Managers | pip, npm, yarn, pnpm, gem, cargo |
| Databases | PostgreSQL 16, Redis 7.0 |
| Build Tools | Make, CMake, Gradle, Maven |

### Environment Variables

Set via web interface when configuring environments. Use `.env` format:

```
API_KEY=your_api_key
DEBUG=true
```

---

## Troubleshooting

### "Uncommitted changes" Error

**Problem:** Teleport blocked due to dirty git state.

**Solutions:**

```bash
# Option 1: Stash changes
git stash push -m "Pre-teleport stash"
# After teleport:
git stash pop

# Option 2: Commit changes
git add . && git commit -m "WIP: checkpoint"

# Option 3: Discard (caution!)
git checkout -- .
```

---

### "Wrong repository" Error

**Problem:** Current repo doesn't match web session.

**Solution:**

```bash
# Check current repo
git remote -v

# Navigate to correct repo
cd /path/to/correct/repo

# Verify remote matches
git remote show origin
```

---

### "Branch not found" Error

**Problem:** Web session branch not available locally.

**Solution:**

```bash
# Fetch all remote branches
git fetch --all

# List available branches
git branch -r

# Checkout the branch
git checkout -b <branch> origin/<branch>
```

---

### Session Not Appearing

**Checklist:**
1. Is the session still active?
2. Created from the same repository?
3. Correct Claude.ai account logged in?
4. Try: `claude auth status`

---

### Account Mismatch

**Problem:** Session not visible in teleport list.

**Solution:**

```bash
# Check auth status
claude auth status

# Re-authenticate if needed
claude auth login
```

For expanded troubleshooting, see [references/troubleshooting-expanded.md](references/troubleshooting-expanded.md).

---

## Integration with Other Skills

### With Boris (Verification Workflow)

**Before sending to web:**
```
/verify              # Ensure code is clean
/commit              # Commit any changes
& Execute the plan   # Send to web
```

**After teleporting back:**
```
/status              # Orient yourself
/verify              # Check Claude's work
/commit              # Finalize changes
```

### With long-runner (Multi-Session Orchestration)

```
SESSION MANAGEMENT
├── Heavy features → & Send to web
├── Continue local work on other features
├── /tasks to monitor progress
├── Teleport when ready
└── Update handoff notes with results
```

### With git-worktree-master (Branch Isolation)

Create isolated worktree for teleported session:

```bash
# Create worktree for the feature branch
git worktree add ../teleport-work feature-branch

# Teleport into worktree directory
cd ../teleport-work
claude --teleport <session-id>

# Work in isolation, then cleanup
git worktree remove ../teleport-work
```

---

## When to Use Web vs Terminal

| Scenario | Recommendation |
|----------|----------------|
| Long-running builds/tests | ✅ Web |
| Parallel feature work | ✅ Web |
| Tasks while laptop closed | ✅ Web |
| Repositories not local | ✅ Web |
| Git operations (commit, push) | ❌ Terminal |
| MCP tool integrations | ❌ Terminal |
| File system operations | ❌ Terminal |
| Quick fixes | ❌ Terminal |
| Complex debugging | ⚖️ Plan local, execute web |

---

## Command Reference

### Send to Web

| Command | Description |
|---------|-------------|
| `& <task>` | Send task with conversation context |
| `claude --remote "<task>"` | Explicit remote from CLI |

### Bring to Terminal

| Command | Description |
|---------|-------------|
| `/teleport` | Interactive picker (in Claude Code) |
| `/tp` | Short alias |
| `claude --teleport` | Interactive picker (from shell) |
| `claude --teleport <id>` | Specific session |

### Monitor

| Command | Description |
|---------|-------------|
| `/tasks` | View all parallel tasks |
| `t` key | Teleport selected (in /tasks) |

### Configure

| Command | Description |
|---------|-------------|
| `/remote-env` | Set default environment |
| `check-tools` | List cloud tools |

---

**Remember:** Teleport enables hybrid workflows. Cloud for heavy lifting and parallel execution. Terminal for precision control and local integrations.
