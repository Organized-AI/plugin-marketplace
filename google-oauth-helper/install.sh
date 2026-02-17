#!/usr/bin/env bash
# ============================================================================
# Google OAuth Helper — Plugin Installer
# ============================================================================
# Checks for gcloud CLI (installs if missing), deploys Claude Code hooks,
# installs the gcp-oauth skill, and patches settings.json.
#
# Usage: bash .claude/plugins/google-oauth-helper/install.sh [TARGET_DIR]
#   TARGET_DIR defaults to current working directory
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="${1:-.}"
RESULTS=()

log()   { echo -e "${BLUE}[Google OAuth Helper]${NC} $*"; }
ok()    { echo -e "${GREEN}  ✓${NC} $*"; RESULTS+=("OK|$*"); }
warn()  { echo -e "${YELLOW}  ⚠${NC} $*"; RESULTS+=("WARN|$*"); }
fail()  { echo -e "${RED}  ✗${NC} $*"; RESULTS+=("FAIL|$*"); }

# ──────────────────────────────────────────────────────────────────────────────
# Step 1: Check / Install gcloud CLI
# ──────────────────────────────────────────────────────────────────────────────
log "Step 1: Checking gcloud CLI..."

if command -v gcloud &>/dev/null; then
  GCLOUD_VERSION=$(gcloud --version 2>/dev/null | head -1 || echo "unknown")
  ok "gcloud found: $GCLOUD_VERSION"
else
  warn "gcloud not found — installing..."

  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS: try Homebrew first
    if command -v brew &>/dev/null; then
      log "  Installing via Homebrew..."
      brew install --cask google-cloud-sdk 2>/dev/null && ok "gcloud installed via Homebrew" || {
        warn "Homebrew install failed, trying manual install..."
        curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="$HOME" 2>/dev/null
      }
    else
      log "  Installing via SDK installer..."
      curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="$HOME" 2>/dev/null
    fi
  else
    # Linux
    log "  Installing via SDK installer..."
    curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="$HOME" 2>/dev/null
  fi

  # Add to PATH for this session
  for P in "$HOME/google-cloud-sdk/bin" "/opt/homebrew/share/google-cloud-sdk/bin" "/usr/local/share/google-cloud-sdk/bin"; do
    [ -d "$P" ] && export PATH="$P:$PATH"
  done

  if command -v gcloud &>/dev/null; then
    ok "gcloud installed: $(gcloud --version 2>/dev/null | head -1)"
  else
    fail "gcloud installation failed — install manually: https://cloud.google.com/sdk/docs/install"
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# Step 2: Check jq dependency (required by hooks)
# ──────────────────────────────────────────────────────────────────────────────
log "Step 2: Checking jq dependency..."

if command -v jq &>/dev/null; then
  ok "jq found: $(jq --version 2>/dev/null)"
else
  warn "jq not found — hooks require jq"
  if command -v brew &>/dev/null; then
    brew install jq 2>/dev/null && ok "jq installed via Homebrew" || fail "jq install failed"
  else
    fail "Install jq manually: https://jqlang.github.io/jq/download/"
  fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# Step 3: Deploy hooks
# ──────────────────────────────────────────────────────────────────────────────
log "Step 3: Deploying Claude Code hooks..."

HOOKS_TARGET="$TARGET_DIR/.claude/hooks"
mkdir -p "$HOOKS_TARGET"

for HOOK in auto-run-task.sh auto-task-output.sh; do
  if [ -f "$PLUGIN_DIR/hooks/$HOOK" ]; then
    cp "$PLUGIN_DIR/hooks/$HOOK" "$HOOKS_TARGET/$HOOK"
    chmod +x "$HOOKS_TARGET/$HOOK"
    ok "$HOOK → $HOOKS_TARGET/$HOOK"
  else
    fail "Source hook not found: $PLUGIN_DIR/hooks/$HOOK"
  fi
done

# ──────────────────────────────────────────────────────────────────────────────
# Step 4: Deploy gcp-oauth skill
# ──────────────────────────────────────────────────────────────────────────────
log "Step 4: Installing gcp-oauth skill..."

SKILL_TARGET="$TARGET_DIR/.claude/skills/gcp-oauth"
mkdir -p "$SKILL_TARGET"

if [ -f "$PLUGIN_DIR/skills/gcp-oauth/SKILL.md" ]; then
  cp "$PLUGIN_DIR/skills/gcp-oauth/SKILL.md" "$SKILL_TARGET/SKILL.md"
  ok "gcp-oauth SKILL.md → $SKILL_TARGET/SKILL.md"
else
  fail "Source skill not found: $PLUGIN_DIR/skills/gcp-oauth/SKILL.md"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Step 5: Patch settings.json (merge, don't overwrite)
# ──────────────────────────────────────────────────────────────────────────────
log "Step 5: Patching settings.json..."

SETTINGS_FILE="$TARGET_DIR/.claude/settings.json"
PATCH_FILE="$PLUGIN_DIR/settings-patch.json"

if [ ! -f "$SETTINGS_FILE" ]; then
  # No existing settings — copy patch directly
  if [ -f "$PATCH_FILE" ]; then
    cp "$PATCH_FILE" "$SETTINGS_FILE"
    ok "Created settings.json from patch"
  else
    warn "No settings-patch.json found, skipping"
  fi
elif command -v jq &>/dev/null && [ -f "$PATCH_FILE" ]; then
  # Merge patch into existing settings using jq deep merge
  BACKUP="$SETTINGS_FILE.bak.$(date +%s)"
  cp "$SETTINGS_FILE" "$BACKUP"
  ok "Backed up settings.json → $BACKUP"

  jq -s '
    def deep_merge:
      if (.[0] | type) == "object" and (.[1] | type) == "object" then
        (.[0] | keys_unsorted) as $k1 |
        (.[1] | keys_unsorted) as $k2 |
        ($k1 + $k2 | unique) as $all_keys |
        reduce $all_keys[] as $key ({};
          if (.[0] | has($key)) and (.[1] | has($key)) then
            if (.[0][$key] | type) == "array" and (.[1][$key] | type) == "array" then
              .[$key] = (.[0][$key] + .[1][$key] | unique)
            elif (.[0][$key] | type) == "object" and (.[1][$key] | type) == "object" then
              .[$key] = ([.[0][$key], .[1][$key]] | deep_merge)
            else
              .[$key] = .[1][$key]
            end
          elif (.[1] | has($key)) then
            .[$key] = .[1][$key]
          else
            .[$key] = .[0][$key]
          end
        )
      else
        .[1]
      end;
    [.[0], .[1]] | deep_merge
  ' "$SETTINGS_FILE" "$PATCH_FILE" > "${SETTINGS_FILE}.tmp" \
    && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE" \
    && ok "Merged settings-patch.json into settings.json" \
    || { warn "jq merge failed — settings.json unchanged"; mv "$BACKUP" "$SETTINGS_FILE"; }
else
  warn "Cannot merge settings (jq or patch missing) — manual merge required"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Step 6: Check GCP auth status
# ──────────────────────────────────────────────────────────────────────────────
log "Step 6: Checking GCP auth status..."

if command -v gcloud &>/dev/null; then
  ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
  ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

  if [ -n "$ACTIVE_ACCOUNT" ] && [ "$ACTIVE_ACCOUNT" != "(unset)" ]; then
    ok "Authenticated as: $ACTIVE_ACCOUNT"
  else
    warn "Not authenticated — run: gcloud auth login"
  fi

  if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "(unset)" ]; then
    ok "Active project: $ACTIVE_PROJECT"
  else
    warn "No project set — run: gcloud config set project PROJECT_ID"
  fi
else
  warn "gcloud not available — skipping auth check"
fi

# ──────────────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Google OAuth Helper — Installation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

OK_COUNT=0; WARN_COUNT=0; FAIL_COUNT=0
for R in "${RESULTS[@]}"; do
  STATUS="${R%%|*}"
  MSG="${R#*|}"
  case "$STATUS" in
    OK)   echo -e "  ${GREEN}✓${NC} $MSG"; ((OK_COUNT++)) ;;
    WARN) echo -e "  ${YELLOW}⚠${NC} $MSG"; ((WARN_COUNT++)) ;;
    FAIL) echo -e "  ${RED}✗${NC} $MSG"; ((FAIL_COUNT++)) ;;
  esac
done

echo ""
echo -e "  ${GREEN}$OK_COUNT passed${NC}  ${YELLOW}$WARN_COUNT warnings${NC}  ${RED}$FAIL_COUNT failed${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}  Plugin installed successfully!${NC}"
else
  echo -e "${YELLOW}  Plugin installed with issues — review above.${NC}"
fi
echo ""
