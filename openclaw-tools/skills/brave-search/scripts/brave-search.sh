#!/usr/bin/env bash
# Brave Search — Free Web Access for OpenClaw Agents
# Real-time web search, autosuggest, AI answers via Brave Search API
# Free tier: $5/mo credit (enough for agent use, set $5 cap = never charged)
# ClawHub: clawhub install brave-api-search

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

BRAVE_SEARCH_API_KEY="${BRAVE_SEARCH_API_KEY:-}"
BRAVE_ANSWERS_API_KEY="${BRAVE_ANSWERS_API_KEY:-}"
BRAVE_BASE="https://api.search.brave.com/res/v1"

_check_key() {
  [[ -n "$BRAVE_SEARCH_API_KEY" ]] || { log_error "BRAVE_SEARCH_API_KEY not set. Get key: https://api-dashboard.search.brave.com"; exit 1; }
}

setup_keys() {
  log_info "Brave Search API Setup"
  echo ""
  echo "1. Sign up at: https://api-dashboard.search.brave.com"
  echo "2. Go to Available Plans → Search and Answers"
  echo "3. Get started — includes \$5 FREE credits/month"
  echo "4. Set usage limit to \$5 → you're never charged beyond the free tier"
  echo "5. Add to your .env:"
  echo "   BRAVE_SEARCH_API_KEY=your_key_here"
  echo "   BRAVE_ANSWERS_API_KEY=your_key_here"
  echo ""
  log_success "Both keys can be the same if your plan supports both endpoints"
}

web_search() {
  local query="${1:-}"
  local count="${2:-10}"
  [[ -z "$query" ]] && { log_error "Usage: brave-search search <query> [count]"; exit 1; }
  _check_key
  log_info "Searching: $query"
  curl -sL \
    "${BRAVE_BASE}/web/search?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")&count=${count}" \
    -H "Accept: application/json" \
    -H "Accept-Encoding: gzip" \
    -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" | \
    python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('web',{}).get('results',[]):
    print(f\"  {r.get('title','')}\")
    print(f\"  {r.get('url','')}\")
    print(f\"  {r.get('description','')[:120]}\")
    print()
" 2>/dev/null || log_error "Search failed — check BRAVE_SEARCH_API_KEY"
}

ai_answer() {
  local query="${1:-}"
  [[ -z "$query" ]] && { log_error "Usage: brave-search answer <question>"; exit 1; }
  [[ -n "$BRAVE_ANSWERS_API_KEY" ]] || { log_error "BRAVE_ANSWERS_API_KEY not set"; exit 1; }
  log_info "AI Answer: $query"
  curl -sL \
    "${BRAVE_BASE}/summarizer/search?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")&summary=1" \
    -H "Accept: application/json" \
    -H "X-Subscription-Token: $BRAVE_ANSWERS_API_KEY" | \
    python3 -c "
import json,sys
d=json.load(sys.stdin)
summary = d.get('summary',{}).get('answer','No answer found')
print(summary)
" 2>/dev/null || log_error "Answer failed — check BRAVE_ANSWERS_API_KEY"
}

suggest() {
  local query="${1:-}"
  [[ -z "$query" ]] && { log_error "Usage: brave-search suggest <partial-query>"; exit 1; }
  _check_key
  curl -sL \
    "${BRAVE_BASE}/suggest/search?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")" \
    -H "Accept: application/json" \
    -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" | \
    python3 -c "
import json,sys
d=json.load(sys.stdin)
for s in d.get('results',[]): print(f\"  {s.get('query','')}\")
" 2>/dev/null
}

show_help() {
  cat << 'EOF'
Brave Search — Free Web Access for OpenClaw Agents
====================================================
ClawHub: clawhub install brave-api-search
API Dashboard: https://api-dashboard.search.brave.com

FREE TIER: $5/mo credit — enough for agent web search, never charged
           Set $5 usage cap in dashboard after signup

COMMANDS:
  setup                Show API key setup instructions
  search <query>       Web search with ranked results + descriptions
  answer <question>    AI-grounded answer with inline citations
  suggest <partial>    Query autosuggestions as you type

ENV VARS (add to .env):
  BRAVE_SEARCH_API_KEY    For web search + autosuggest
  BRAVE_ANSWERS_API_KEY   For AI-grounded answers (can be same key)

EXAMPLES:
  ./brave-search.sh setup
  ./brave-search.sh search "OpenClaw skill development 2026"
  ./brave-search.sh answer "What is the best way to index documents locally?"
  ./brave-search.sh suggest "openclaw sk"
EOF
}

case "${1:-help}" in
  setup)   setup_keys ;;
  search)  web_search "${2:-}" "${3:-10}" ;;
  answer)  ai_answer "${2:-}" ;;
  suggest) suggest "${2:-}" ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
