#!/usr/bin/env bash
# BiteRover (ByteRover) — Persistent Memory Across Sessions
# Creates a context tree that survives session restarts.
# Agent queries index instead of re-reading same files. 16,000+ downloads (#3 on ClawHub).
# ClawHub: clawhub install byterover | npm install -g byterover-cli

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

CONTEXT_TREE=".brv/context-tree"

_check() { command -v brv >/dev/null 2>&1 || { log_error "brv not installed. Run: ./bite-rover.sh install"; exit 1; }; }

install_brv() {
  log_info "Installing ByteRover CLI..."
  npm install -g byterover-cli
  log_success "brv installed — no authentication needed for local ops"
  log_info "Knowledge stored in: $CONTEXT_TREE"
}

# QUERY — retrieve before every work session
query() {
  local question="${1:-}"
  [[ -z "$question" ]] && { log_error "Usage: bite-rover query <question>"; exit 1; }
  _check
  log_info "Querying context tree: $question"
  brv query "$question"
}

# CURATE — save after implementing anything meaningful
curate() {
  local observation="${1:-}"
  local files="${2:-}"  # Optional: comma-separated file paths
  [[ -z "$observation" ]] && { log_error "Usage: bite-rover curate <observation> [file1,file2]"; exit 1; }
  _check
  log_info "Curating to context tree: $observation"
  if [[ -n "$files" ]]; then
    IFS=',' read -ra file_arr <<< "$files"
    local file_flags=""
    for f in "${file_arr[@]}"; do file_flags="$file_flags -f $f"; done
    brv curate "$observation" $file_flags
  else
    brv curate "$observation"
  fi
  log_success "Curated to: $CONTEXT_TREE"
}

# SYNC — push/pull to cloud storage backup
sync_push() {
  _check
  log_info "Pushing context tree to cloud..."
  brv push 2>/dev/null || log_warn "Cloud sync requires brv login (local ops work without it)"
}

sync_pull() {
  _check
  log_info "Pulling context tree from cloud..."
  brv pull 2>/dev/null || log_warn "Cloud sync requires brv login (local ops work without it)"
}

# STATUS — show what's in the context tree
show_status() {
  log_info "BiteRover Context Tree Status"
  echo ""
  if [[ -d "$CONTEXT_TREE" ]]; then
    log_success "Context tree exists at: $CONTEXT_TREE"
    echo "Files: $(find "$CONTEXT_TREE" -type f | wc -l | tr -d ' ')"
    echo "Size:  $(du -sh "$CONTEXT_TREE" 2>/dev/null | cut -f1)"
    echo ""
    echo "Recent entries:"
    find "$CONTEXT_TREE" -name "*.md" -newer "$CONTEXT_TREE" -type f 2>/dev/null | head -5 | while read f; do
      echo "  • $(basename "$f")"
    done
  else
    log_warn "No context tree yet. Start with: ./bite-rover.sh curate 'project overview'"
  fi
}

show_help() {
  cat << 'EOF'
BiteRover — Persistent Memory Across Sessions
==============================================
ClawHub: clawhub install byterover
Downloads: 16,000+ (#3 most downloaded on ClawHub)
Install: npm install -g byterover-cli

WHAT IT DOES:
  Creates a structured context tree in .brv/context-tree/ so your agent
  never has to re-read the same files across sessions. Query → get exactly
  what's needed. Curate → save new patterns and decisions.

  No authentication needed for local ops. Login only for cloud sync.

WORKFLOW:
  1. BEFORE any work session: query to load relevant context
  2. AFTER implementing: curate to save patterns/decisions

COMMANDS:
  install              Install byterover-cli via npm
  query <question>     Retrieve relevant context from knowledge tree
  curate <obs> [files] Save observation to context tree (max 5 files)
  push                 Sync context tree to cloud (requires login)
  pull                 Fetch context tree from cloud (requires login)
  status               Show context tree size and recent entries

EXAMPLES:
  ./bite-rover.sh install
  ./bite-rover.sh query "How is auth implemented?"
  ./bite-rover.sh curate "JWT tokens stored in httpOnly cookies, 24h expiry"
  ./bite-rover.sh curate "Auth details" "src/middleware/auth.ts,src/routes/auth.ts"
  ./bite-rover.sh status

POWER TIP: Load this skill in CLAUDE.md so agent always queries before work
           and curates after every significant implementation.
EOF
}

case "${1:-help}" in
  install) install_brv ;;
  query)   query "${2:-}" ;;
  curate)  curate "${2:-}" "${3:-}" ;;
  push)    sync_push ;;
  pull)    sync_pull ;;
  status)  show_status ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
