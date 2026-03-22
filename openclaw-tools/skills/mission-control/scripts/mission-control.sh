#!/usr/bin/env bash
# Mission Control — Daily Intel Dashboard
# Aggregates tasks, calendar events, action items, pending messages.
# Agent acts as chief of staff: morning rundown of what actually needs attention.
# Pairs with GOG + X Research for full automated morning briefing.
# ClawHub: clawhub install overkill-mission-control

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

MC_DIR="${MISSION_CONTROL_DIR:-$HOME/.openclaw/workspace-mission-control}"
MC_PORT="${MISSION_CONTROL_PORT:-3000}"
GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://localhost:3001}"

install_mc() {
  log_info "Installing Mission Control dashboard..."
  command -v npm >/dev/null 2>&1 || { log_error "npm required"; exit 1; }
  mkdir -p "$MC_DIR"
  # Clone/install from skill directory
  cd "$MC_DIR" && npm install 2>/dev/null || \
    log_error "Run from skill directory: cd skills/mission-control && npm install"
  log_success "Mission Control installed at: $MC_DIR"
}

start_dashboard() {
  log_info "Starting Mission Control dashboard on port $MC_PORT..."
  [[ -d "$MC_DIR" ]] || { log_error "Not installed. Run: ./mission-control.sh install"; exit 1; }
  cd "$MC_DIR" && npm run dev &
  sleep 2
  log_success "Dashboard: http://localhost:$MC_PORT"
  log_info "Tailscale remote access available — check skill config"
}

morning_brief() {
  log_info "=== Mission Control Morning Brief ==="
  echo ""

  # Tasks
  echo -e "${YELLOW}📋 TASKS${NC}"
  [[ -f "$HOME/.openclaw/tasks.json" ]] && \
    python3 -c "
import json
with open('$HOME/.openclaw/tasks.json') as f:
    tasks = json.load(f)
pending = [t for t in tasks if t.get('status') == 'pending']
print(f'  {len(pending)} pending tasks')
for t in pending[:5]: print(f'  • {t.get(\"title\",\"\")}')
" 2>/dev/null || echo "  No task file found"

  echo ""
  echo -e "${YELLOW}📅 CALENDAR (Today)${NC}"
  command -v gog >/dev/null 2>&1 && \
    gog calendar events primary \
      --from "$(date -u +"%Y-%m-%dT00:00:00Z")" \
      --to "$(date -u +"%Y-%m-%dT23:59:59Z")" 2>/dev/null | head -20 || \
    echo "  Run gog.sh to connect Google Calendar"

  echo ""
  echo -e "${YELLOW}📬 INBOX (Unread)${NC}"
  command -v gog >/dev/null 2>&1 && \
    gog gmail search 'is:unread newer_than:1d' --max 10 2>/dev/null | head -20 || \
    echo "  Run gog.sh to connect Gmail"

  echo ""
  echo -e "${YELLOW}⚡ ACTIONS NEEDED${NC}"
  echo "  Run ./mission-control.sh start for live dashboard with SLO tracking"

  log_success "Brief complete. Install GOG + X Research for full automated briefing."
}

show_status() {
  log_info "Mission Control Status"
  echo ""
  # Check if dashboard is running
  curl -s "http://localhost:$MC_PORT/api/health" >/dev/null 2>&1 && \
    log_success "Dashboard running: http://localhost:$MC_PORT" || \
    log_warn "Dashboard not running. Start: ./mission-control.sh start"

  # Check OpenClaw gateway
  curl -s "${GATEWAY_URL}/health" >/dev/null 2>&1 && \
    log_success "OpenClaw gateway: $GATEWAY_URL" || \
    log_warn "OpenClaw gateway not responding at: $GATEWAY_URL"
}

add_task() {
  local title="${1:-}"
  local priority="${2:-medium}"
  [[ -z "$title" ]] && { log_error "Usage: mission-control task <title> [low|medium|high]"; exit 1; }

  local task_file="$HOME/.openclaw/tasks.json"
  [[ -f "$task_file" ]] || echo "[]" > "$task_file"

  python3 << PYEOF
import json
from datetime import datetime
with open('$task_file') as f:
    tasks = json.load(f)
tasks.append({
    "id": len(tasks) + 1,
    "title": "$title",
    "priority": "$priority",
    "status": "pending",
    "created": datetime.now().isoformat()
})
with open('$task_file', 'w') as f:
    json.dump(tasks, f, indent=2)
print(f"  ✓ Task added: $title [$priority]")
PYEOF
}

show_help() {
  cat << 'EOF'
Mission Control — Daily Intel Dashboard
=========================================
ClawHub: clawhub install overkill-mission-control

WHAT IT DOES:
  Aggregates everything: tasks, calendar, inbox, action items, pending messages.
  Your agent becomes chief of staff — morning rundown of what actually needs attention.
  Features real-time dashboard, agent-to-agent messaging, SLO tracking, alerts.

POWER TRIO: Mission Control + GOG + X Research = fully automated morning briefings.
            "I've used this every morning for 3 weeks and genuinely don't know 
             how I functioned without it." — video creator

COMMANDS:
  install              Install dashboard (npm)
  start                Launch web dashboard on port 3000
  brief                Generate morning brief (CLI — no browser needed)
  task <title> [pri]   Add a task (low|medium|high priority)
  status               Check dashboard + gateway health

ENV VARS:
  MISSION_CONTROL_DIR       Installation directory
  MISSION_CONTROL_PORT      Dashboard port (default: 3000)
  OPENCLAW_GATEWAY_URL      OpenClaw gateway URL (default: localhost:3001)

DASHBOARD FEATURES:
  Real-time metrics   Live agent activity and system stats
  Agent messaging     A2A communication with LLM-powered responses
  Task execution      Run automations directly from dashboard
  Document management Browse workspace files across agents
  Tailscale access    Secure remote access from anywhere

EXAMPLES:
  ./mission-control.sh brief           # CLI morning brief
  ./mission-control.sh start           # Launch full dashboard
  ./mission-control.sh task "Review OpenbooQ tracking" high
  ./mission-control.sh status
EOF
}

case "${1:-help}" in
  install) install_mc ;;
  start)   start_dashboard ;;
  brief)   morning_brief ;;
  task)    add_task "${2:-}" "${3:-medium}" ;;
  status)  show_status ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
