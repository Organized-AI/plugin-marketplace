---
name: gcp-setup
description: |
  Checks for gcloud CLI (installs if missing), deploys Claude Code safety hooks,
  and installs the gcp-oauth skill. One-command GCP bootstrap for any project.
disable-model-invocation: true
---

Bootstrap GCP environment for: $ARGUMENTS

## Execution Steps

### Step 1: Check gcloud CLI

```bash
which gcloud 2>/dev/null && gcloud --version 2>/dev/null | head -3
```

If found, print version and skip to Step 3. If missing, proceed to Step 2.

### Step 2: Install gcloud CLI

#### macOS (Homebrew preferred)
```bash
brew install --cask google-cloud-sdk
```

#### macOS / Linux (fallback)
```bash
curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="$HOME"
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
[ -f "$HOME/google-cloud-sdk/path.bash.inc" ] && source "$HOME/google-cloud-sdk/path.bash.inc"
```

Verify: `gcloud --version | head -3`

### Step 3: Check gcloud auth and project

```bash
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$ACTIVE_ACCOUNT" ] || [ "$ACTIVE_ACCOUNT" = "(unset)" ]; then
  echo "Not authenticated. Run: gcloud auth login"
fi

if [ -z "$ACTIVE_PROJECT" ] || [ "$ACTIVE_PROJECT" = "(unset)" ]; then
  echo "No project set. Run: gcloud config set project PROJECT_ID"
  gcloud projects list 2>/dev/null || echo "Authenticate first"
fi
```

### Step 4: Run the plugin installer

```bash
bash .claude/plugins/google-oauth-helper/install.sh
```

This deploys hooks, the gcp-oauth skill, and patches settings.json.

### Step 5: Verify installation

```bash
gcloud --version | head -1
ls -la .claude/hooks/auto-run-task.sh .claude/hooks/auto-task-output.sh
ls -la .claude/skills/gcp-oauth/SKILL.md
cat .claude/settings.json | jq '.hooks.PostToolUse | length'
gcloud auth list 2>/dev/null || echo "No accounts authenticated"
```

Print a summary table:

```
| Component              | Status |
|------------------------|--------|
| gcloud CLI             |        |
| auto-run-task.sh hook  |        |
| auto-task-output.sh    |        |
| gcp-oauth skill        |        |
| settings.json patched  |        |
| GCP authenticated      |        |
```

## Troubleshooting

### gcloud not found after install
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
# Homebrew path:
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
# Persist: add to ~/.zshrc or ~/.bash_profile
```

### Hooks not firing
- Check `.claude/settings.json` has `hooks.PostToolUse` entries
- Run `chmod +x .claude/hooks/*.sh`
- Confirm jq is installed: `which jq || brew install jq`

### OAuth flow fails
See `.claude/skills/gcp-oauth/SKILL.md` for redirect URI config,
environment variable setup, and common error codes.
