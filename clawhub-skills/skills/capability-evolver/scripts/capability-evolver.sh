#!/usr/bin/env bash
# Capability Evolver — Self-Upgrading AI Meta-Skill
# Analyzes agent runtime history, detects failures, rewrites own code to improve
# ClawHub: clawhub install capability-evolver | 35,000+ downloads (#1 on ClawHub)
# Source: github.com/openclaw/skills/skills/autogame-17/capability-evolver

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

EVOLVER_DIR="${EVOLVER_DIR:-$(dirname "$0")/../skills/capability-evolver}"

_check_deps() {
  command -v node >/dev/null 2>&1 || { log_error "Node.js required"; exit 1; }
  command -v git  >/dev/null 2>&1 || { log_error "git required"; exit 1; }
  [[ -n "${A2A_NODE_ID:-}" ]] || { log_warn "A2A_NODE_ID not set — EvoMap sync disabled"; }
}

# --- EVOLVE (review mode — confirms before applying) ---
evolve_review() {
  _check_deps
  log_info "Running evolution cycle in REVIEW MODE (confirms before applying)..."
  log_warn "Review mode: agent will pause and ask for confirmation before any changes"
  cd "$EVOLVER_DIR" && node index.js run --review
}

# --- MAD DOG (fully autonomous — zero human input) ---
evolve_mad_dog() {
  _check_deps
  log_warn "MAD DOG MODE: fully autonomous continuous evolution — no human input"
  log_warn "Ensure: git backup enabled | EVOLVE_ALLOW_SELF_MODIFY=false (default)"
  read -p "Confirm mad dog mode? [y/N] " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
  cd "$EVOLVER_DIR" && node index.js run
}

# --- LOOP (daemon mode via cron) ---
evolve_loop() {
  _check_deps
  log_info "Starting continuous evolution loop (daemon mode)..."
  log_info "Uses lock file to prevent infinite recursion"
  cd "$EVOLVER_DIR" && node index.js run --loop
}

# --- STATUS ---
show_status() {
  log_info "Capability Evolver Status"
  echo ""
  [[ -f "$EVOLVER_DIR/assets/gep/events.jsonl" ]] && \
    echo "Recent evolution events:" && tail -5 "$EVOLVER_DIR/assets/gep/events.jsonl" || \
    log_warn "No evolution events yet — run evolve first"
  [[ -f "$EVOLVER_DIR/assets/gep/genes.json" ]] && \
    echo "" && echo "Active genes:" && cat "$EVOLVER_DIR/assets/gep/genes.json" | python3 -m json.tool 2>/dev/null | head -20
}

# --- ROLLBACK ---
rollback() {
  log_warn "Rolling back last evolution..."
  cd "$EVOLVER_DIR" && git stash 2>/dev/null || git reset --hard HEAD~1
  log_success "Rollback complete"
}

show_help() {
  cat << 'EOF'
Capability Evolver — Self-Upgrading AI Meta-Skill
===================================================
ClawHub: clawhub install capability-evolver
Downloads: 35,000+ (#1 most downloaded on ClawHub)

COMMANDS:
  evolve              Run one evolution cycle (review mode — confirms changes)
  mad-dog             Run fully autonomous evolution (no human input)
  loop                Start continuous daemon evolution loop
  status              Show recent evolution events and active genes
  rollback            Undo last evolution (git stash/reset)

MODES:
  Review Mode  --review  Agent pauses and asks permission before changes
  Mad Dog Mode (default) Zero human input, continuous self-evolution cycles

ENV VARS:
  A2A_NODE_ID              EvoMap node identity (required for network sync)
  EVOLVE_ALLOW_SELF_MODIFY false (default) | true = evolver can rewrite itself
  EVOLVE_STRATEGY          balanced|innovate|harden|repair-only|auto
  EVOLVE_LOAD_MAX          2.0 (backs off if system load exceeds this)
  GITHUB_TOKEN             For auto-issue reporting on repeated failures

SAFETY:
  - Strict single-process logic (no infinite recursion)
  - Review mode available for sensitive environments
  - Set up git sync as backup before enabling mad dog mode
  - EVOLVE_ALLOW_SELF_MODIFY defaults to false — keep it that way

EXAMPLES:
  ./capability-evolver.sh evolve        # Safe: review before applying
  ./capability-evolver.sh mad-dog       # Autonomous: wakes up smarter
  ./capability-evolver.sh loop          # Continuous daemon
  ./capability-evolver.sh status        # Check evolution history
EOF
}

case "${1:-help}" in
  evolve)    evolve_review ;;
  mad-dog)   evolve_mad_dog ;;
  loop)      evolve_loop ;;
  status)    show_status ;;
  rollback)  rollback ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
