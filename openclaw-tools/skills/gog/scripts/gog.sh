#!/usr/bin/env bash
# GOG — Google Workspace CLI
# Gmail, Calendar, Drive, Contacts, Sheets, Docs in one CLI
# Built by @steipete | Install: brew install steipete/tap/gogcli
# ClawHub: clawhub install gog

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

# Set default account: export GOG_ACCOUNT=you@gmail.com
ACCOUNT="${GOG_ACCOUNT:-}"

_gog() { command -v gog >/dev/null 2>&1 || { log_error "gog not installed. Run: ./gog.sh install"; exit 1; }; }
_acct() { [[ -n "$ACCOUNT" ]] && echo "--account $ACCOUNT" || echo ""; }

install_gog() {
  log_info "Installing gog via Homebrew..."
  command -v brew >/dev/null 2>&1 || { log_error "Homebrew required"; exit 1; }
  brew install steipete/tap/gogcli
  log_success "gog installed"
  log_info "Next: run './gog.sh auth setup' to connect your Google account"
}

auth_setup() {
  _gog
  log_info "Google Workspace OAuth Setup (one-time, ~5 minutes)"
  echo ""
  echo "1. Go to: https://console.cloud.google.com"
  echo "2. Create OAuth 2.0 credentials for Desktop App"
  echo "3. Download client_secret.json"
  echo "4. Run:"
  echo "   gog auth credentials /path/to/client_secret.json"
  echo "   gog auth add you@gmail.com --services gmail,calendar,drive,contacts,sheets,docs"
  echo "   gog auth list"
  echo ""
  echo "Supports multiple Google accounts. Set GOG_ACCOUNT=you@gmail.com to avoid --account flag."
}

morning_rollup() {
  _gog
  log_info "Running Morning Rollup..."
  echo ""
  echo -e "${YELLOW}=== INBOX ===${NC}"
  gog gmail search 'newer_than:1d is:unread' --max 20 $(_acct) 2>/dev/null | head -40
  echo ""
  echo -e "${YELLOW}=== TODAY'S CALENDAR ===${NC}"
  local today end_of_day
  today=$(date -u +"%Y-%m-%dT00:00:00Z")
  end_of_day=$(date -u +"%Y-%m-%dT23:59:59Z")
  gog calendar events primary --from "$today" --to "$end_of_day" $(_acct) 2>/dev/null
  log_success "Morning rollup complete"
}

search_email() {
  local query="${1:-newer_than:7d}"
  _gog
  log_info "Gmail search: $query"
  gog gmail search "$query" --max 20 $(_acct)
}

send_email() {
  local to="${1:-}"; local subject="${2:-}"; local body="${3:-}"
  [[ -z "$to" || -z "$subject" ]] && { log_error "Usage: gog send <to> <subject> <body>"; exit 1; }
  _gog
  log_warn "Sending email to: $to"
  read -p "Confirm send? [y/N] " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
  gog gmail send --to "$to" --subject "$subject" --body "$body" $(_acct)
  log_success "Email sent"
}

calendar_events() {
  local from="${1:-$(date -u +"%Y-%m-%dT00:00:00Z")}"
  local to="${2:-$(date -u -d "+7 days" +"%Y-%m-%dT23:59:59Z" 2>/dev/null || date -u -v+7d +"%Y-%m-%dT23:59:59Z")}"
  _gog
  log_info "Calendar events: $from → $to"
  gog calendar events primary --from "$from" --to "$to" $(_acct)
}

drive_search() {
  local query="${1:-}"
  [[ -z "$query" ]] && { log_error "Usage: gog drive <query>"; exit 1; }
  _gog
  log_info "Drive search: $query"
  gog drive search "$query" --max 10 $(_acct)
}

sheets_get() {
  local sheet_id="${1:-}"; local range="${2:-Sheet1!A1:Z100}"
  [[ -z "$sheet_id" ]] && { log_error "Usage: gog sheets <sheet_id> [range]"; exit 1; }
  _gog
  gog sheets get "$sheet_id" "$range" --json $(_acct)
}

docs_read() {
  local doc_id="${1:-}"
  [[ -z "$doc_id" ]] && { log_error "Usage: gog docs <doc_id>"; exit 1; }
  _gog
  gog docs cat "$doc_id" $(_acct)
}

show_help() {
  cat << 'EOF'
GOG — Google Workspace CLI
============================
ClawHub: clawhub install gog  |  Homepage: https://gogcli.sh
Built by: @steipete

COMMANDS:
  install             Install gog via Homebrew
  auth setup          One-time OAuth setup (~5 min) 
  morning             Morning rollup: inbox + today's calendar
  email <query>       Search Gmail (default: last 7 days unread)
  send <to> <sub> <body>  Send email (confirms before sending)
  calendar [from] [to]    Upcoming events
  drive <query>       Search Google Drive
  sheets <id> [range] Get spreadsheet data as JSON
  docs <id>           Read a Google Doc

ENV VARS:
  GOG_ACCOUNT         your@gmail.com (avoids --account flag on every command)

MORNING ROLLUP POWER:
  Pairs with Mission Control + X Research for full automated morning briefing.
  Install all three for a complete intel dashboard.

EXAMPLES:
  ./gog.sh morning
  ./gog.sh email "from:boss@company.com newer_than:3d"
  ./gog.sh calendar
  ./gog.sh drive "Q4 revenue report"
  ./gog.sh sheets 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms "Revenue!A1:D20"
EOF
}

case "${1:-help}" in
  install)    install_gog ;;
  auth)       auth_setup ;;
  morning)    morning_rollup ;;
  email)      search_email "${2:-newer_than:7d}" ;;
  send)       send_email "${2:-}" "${3:-}" "${4:-}" ;;
  calendar)   calendar_events "${2:-}" "${3:-}" ;;
  drive)      drive_search "${2:-}" ;;
  sheets)     sheets_get "${2:-}" "${3:-Sheet1!A1:Z100}" ;;
  docs)       docs_read "${2:-}" ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
