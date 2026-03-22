#!/usr/bin/env bash
# WhatsApp CLI — OpenClaw WhatsApp Bridge
# Send/receive messages, auto-reply agents, QR pairing, message search, contact sync
# 16,400+ downloads (#2 most downloaded on ClawHub)
# ClawHub: clawhub install openclaw-whatsapp

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

_check() {
  command -v openclaw-whatsapp >/dev/null 2>&1 || { log_error "openclaw-whatsapp not installed. Run: ./whatsapp-cli.sh install"; exit 1; }
}

install_wa() {
  log_info "Installing OpenClaw WhatsApp bridge..."
  curl -fsSL https://raw.githubusercontent.com/0xs4m1337/openclaw-whatsapp/main/install.sh | bash
  log_success "openclaw-whatsapp installed"
  log_info "Next: run './whatsapp-cli.sh pair' to connect your WhatsApp"
}

pair_device() {
  _check
  log_info "Pairing WhatsApp via QR code..."
  log_warn "Keep this terminal open. Scan the QR code with WhatsApp (Linked Devices)"
  openclaw-whatsapp pair
}

check_status() {
  _check
  openclaw-whatsapp status
}

send_message() {
  local number="${1:-}"
  local message="${2:-}"
  [[ -z "$number" || -z "$message" ]] && { log_error "Usage: whatsapp-cli send <number> <message>"; exit 1; }
  _check
  # Format: 15551234567@s.whatsapp.net
  [[ "$number" != *"@"* ]] && number="${number}@s.whatsapp.net"
  log_warn "Sending WhatsApp to: $number"
  log_info "Message: $message"
  read -p "Confirm send? [y/N] " -n 1 -r; echo
  [[ $REPLY =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
  openclaw-whatsapp send "$number" "$message"
  log_success "Sent"
}

send_self() {
  local message="${1:-}"
  [[ -z "$message" ]] && { log_error "Usage: whatsapp-cli note <message>"; exit 1; }
  _check
  log_info "Sending note to yourself..."
  openclaw-whatsapp send-self "$message"
  log_success "Note sent to yourself"
}

search_history() {
  local query="${1:-}"
  [[ -z "$query" ]] && { log_error "Usage: whatsapp-cli search <query>"; exit 1; }
  _check
  log_info "Searching message history: $query"
  openclaw-whatsapp search "$query"
}

start_service() {
  _check
  log_info "Starting WhatsApp bridge as background service..."
  openclaw-whatsapp start &
  log_success "Bridge started. Logs: tail -f /tmp/openclaw-wa-agent/worker.log"
}

view_logs() {
  tail -f /tmp/openclaw-wa-agent/worker.log 2>/dev/null || \
    journalctl --user -u openclaw-whatsapp.service -f 2>/dev/null || \
    log_error "No log file found — is the bridge running?"
}

show_help() {
  cat << 'EOF'
WhatsApp CLI — OpenClaw WhatsApp Bridge
=========================================
ClawHub: clawhub install openclaw-whatsapp
Downloads: 16,400+ (#2 most downloaded on ClawHub)
Source: github.com/0xs4m1337/openclaw-whatsapp

WHAT IT DOES:
  Full WhatsApp bridge: send messages, auto-reply with AI, search history,
  sync contacts. Bridge connects your OpenClaw agent to WhatsApp.

SAFE MODE TIP: Most users only enable send-to-self (notes, reminders, summaries).
               Enable outbound only when you're confident in the automation.

COMMANDS:
  install              Install openclaw-whatsapp binary
  pair                 Connect WhatsApp via QR code (one-time)
  status               Check bridge connection status
  send <num> <msg>     Send message to a number (confirms before sending)
  note <message>       Send note/reminder to yourself
  search <query>       Search message history
  start                Start bridge as background service
  logs                 Tail bridge logs

NUMBER FORMAT: 15551234567 (country code + number, no +)

EXAMPLES:
  ./whatsapp-cli.sh install
  ./whatsapp-cli.sh pair
  ./whatsapp-cli.sh note "Remember to review OpenbooQ tracking tomorrow"
  ./whatsapp-cli.sh send 15121234567 "Meeting notes from today attached"
  ./whatsapp-cli.sh search "invoice"
  ./whatsapp-cli.sh logs
EOF
}

case "${1:-help}" in
  install) install_wa ;;
  pair)    pair_device ;;
  status)  check_status ;;
  send)    send_message "${2:-}" "${3:-}" ;;
  note)    send_self "${2:-}" ;;
  search)  search_history "${2:-}" ;;
  start)   start_service ;;
  logs)    view_logs ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
