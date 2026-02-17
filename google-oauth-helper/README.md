# Google OAuth Helper

One-command GCP bootstrap for Claude Code projects. Checks for `gcloud` CLI (installs if missing), deploys safety hooks, and installs the `gcp-oauth` skill for Google Ads OAuth 2.0 integration.

## Components

| Component | Description |
|-----------|-------------|
| `SKILL.md` | Invocable `/gcp-setup` workflow with `disable-model-invocation: true` |
| `install.sh` | Standalone installer (6 steps with colored output and summary) |
| `hooks/auto-run-task.sh` | PostToolUse hook — warns on failed Bash commands, suggests output verification after 3+ sequential runs |
| `hooks/auto-task-output.sh` | PostToolUse hook — tracks background tasks, warns if unchecked >30s |
| `skills/gcp-oauth/SKILL.md` | Google Ads OAuth reference: flow diagrams, env vars, testing, troubleshooting |
| `settings-patch.json` | Permission allowlist for gcloud + hook config (deep-merged by installer) |

## Install

```bash
bash .claude/plugins/google-oauth-helper/install.sh
```

Or invoke the skill directly:

```
/gcp-setup my-project
```

## What It Does

1. Checks for `gcloud` CLI — installs via Homebrew or SDK installer
2. Verifies `jq` dependency (required by hooks)
3. Deploys `auto-run-task.sh` and `auto-task-output.sh` to `.claude/hooks/`
4. Installs `gcp-oauth` skill to `.claude/skills/gcp-oauth/`
5. Deep-merges permissions and hook config into `.claude/settings.json`
6. Checks GCP authentication status and active project

## Hooks (Best Practices)

Both hooks follow Claude Code best practices:
- **Defensive** — guard against missing `jq`, always output valid JSON
- **Deterministic** — guaranteed to run, unlike advisory CLAUDE.md instructions
- **Single output** — exactly one `{"decision": "..."}` per execution
- **Non-blocking** — 5-second timeout, approve by default

## Requirements

- macOS or Linux
- `jq` (auto-installed by `install.sh`)
- `gcloud` CLI (auto-installed by `install.sh`)

## Author

BHT Labs — [Organized AI](https://github.com/organized-ai)
