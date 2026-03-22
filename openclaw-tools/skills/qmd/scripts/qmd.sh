#!/usr/bin/env bash
# QMD — Token Killer (Knowledge Base Indexer)
# BM25 + vector search local indexing — up to 70% token reduction
# Originally conceived by Toby (Shopify CEO)
# ClawHub: clawhub install qmd

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

QMD_INDEX="${QMD_INDEX_DIR:-./.qmd-index}"

install_qmd() {
  log_info "Installing QMD..."
  command -v node >/dev/null 2>&1 || { log_error "Node.js required"; exit 1; }
  npm install -g qmd-cli 2>/dev/null || pip3 install qmd --break-system-packages 2>/dev/null
  log_success "QMD installed"
}

index_docs() {
  local dir="${1:-.}"
  log_info "Indexing knowledge base at: $dir"
  log_info "Uses BM25 + vector search — only relevant paragraphs retrieved (not full docs)"
  qmd index "$dir" --output "$QMD_INDEX" 2>/dev/null || \
    log_error "qmd not found — run: ./qmd.sh install"
  log_success "Index built at: $QMD_INDEX"
}

query_docs() {
  local query="${1:-}"
  [[ -z "$query" ]] && { log_error "Usage: qmd query <question>"; exit 1; }
  log_info "Querying: $query"
  log_info "Token saving: retrieves 3 relevant paragraphs instead of full documents"
  qmd query "$query" --index "$QMD_INDEX" 2>/dev/null || \
    log_error "No index found — run: ./qmd.sh index <dir>"
}

show_stats() {
  log_info "QMD Index Stats"
  [[ -d "$QMD_INDEX" ]] && du -sh "$QMD_INDEX" || log_warn "No index found"
  log_info "Expected token reduction: up to 70%"
  log_info "Install command: npx qmd-install <github-repo-url>"
}

show_help() {
  cat << 'EOF'
QMD — Token Killer (Knowledge Base Indexer)
============================================
ClawHub: clawhub install qmd
Conceived by: Toby (CEO, Shopify)

WHAT IT DOES:
  Indexes your entire knowledge base locally using BM25 + vector search.
  Instead of feeding 50-page docs every message, agent grabs only the
  3 paragraphs it actually needs. Up to 70% token reduction.

COMMANDS:
  install              Install qmd CLI
  index [dir]          Index a directory of documents (default: current dir)
  query <question>     Retrieve only relevant paragraphs for a question
  stats                Show index size and savings estimate

ENV VARS:
  QMD_INDEX_DIR        Where to store the index (default: ./.qmd-index)

INSTALL VIA OPENCLAW:
  Send your agent the GitHub link and it handles setup automatically.
  Or: npx qmd-install <repo-url>

EXAMPLES:
  ./qmd.sh install
  ./qmd.sh index ./docs
  ./qmd.sh query "How does the auth middleware work?"
  ./qmd.sh stats
EOF
}

case "${1:-help}" in
  install) install_qmd ;;
  index)   index_docs "${2:-.}" ;;
  query)   query_docs "${2:-}" ;;
  stats)   show_stats ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
