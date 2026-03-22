#!/usr/bin/env bash
# Larry — TikTok App Marketing Engine
# Automates TikTok slideshow content: generate → overlay → post → track → iterate
# ClawHub: skills/batsirai/larryskill
# Docs: https://postiz.pro

set -euo pipefail

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

# --- INSTALL ---
install_larry() {
  log_info "Installing Larry dependencies..."
  command -v node >/dev/null 2>&1 || { log_error "Node.js v18+ required. Install from https://nodejs.org"; exit 1; }
  npm install canvas 2>/dev/null && log_success "node-canvas installed"
  log_info "Install Postiz at: https://postiz.pro/oliverhenry"
  log_info "Set env vars: POSTIZ_API_KEY, OPENAI_API_KEY (for gpt-image-1.5)"
  log_success "Larry ready. Run: ./larry.sh generate"
}

# --- GENERATE ---
generate_slides() {
  local app="${1:-}"
  [[ -z "$app" ]] && { log_error "Usage: larry generate <app_description>"; exit 1; }
  log_info "Generating 6 slides for: $app"
  # Lock scene architecture across all 6 images, only change style
  # Font: 6.5% of image height | Text position: 30% from top
  # Line break every 4-6 words | Canvas renderer safe zones applied
  log_warn "Requires OPENAI_API_KEY (gpt-image-1.5) or STABILITY_API_KEY or REPLICATE_API_TOKEN"
  log_info "Runs: node scripts/generate.js --app \"$app\" --slides 6 --lock-scene"
  node scripts/generate.js --app "$app" --slides 6 --lock-scene 2>/dev/null || log_error "scripts/generate.js not found — run install first"
}

# --- POST ---
post_to_tiktok() {
  local draft_dir="${1:-./output}"
  log_info "Posting draft from: $draft_dir"
  log_warn "Posts as DRAFT — you add trending audio (60 sec) then publish"
  log_info "Runs: node scripts/post.js --dir \"$draft_dir\" --as-draft"
  node scripts/post.js --dir "$draft_dir" --as-draft 2>/dev/null || log_error "scripts/post.js not found"
}

# --- REPORT ---
daily_report() {
  log_info "Fetching Larry daily analytics report..."
  log_info "Cross-references: Postiz analytics → App Store downloads → RevenueCat trials → paid conversions"
  log_info "Runs: node scripts/report.js --verbose"
  node scripts/report.js --verbose 2>/dev/null || log_error "scripts/report.js not found"
}

# --- OPTIMIZE ---
optimize_hooks() {
  log_info "Analyzing hook performance and rewriting low-performers..."
  log_info "Logs failing hooks → builds formula from winners → updates hook library"
  node scripts/optimize.js 2>/dev/null || log_error "scripts/optimize.js not found"
}

# --- WARMUP CHECK ---
check_warmup() {
  log_info "TikTok Account Warmup Checklist (7-14 days required for new accounts):"
  echo "  [ ] 30-60 min/day on app (natural scrolling)"
  echo "  [ ] Like ~1 in 10 videos in your niche"
  echo "  [ ] Follow niche creators"
  echo "  [ ] Leave a few genuine comments"
  echo "  [ ] 1-2 casual (non-promotional) posts"
  echo "  ✓ READY WHEN: For You page is dominated by your niche content"
}

show_help() {
  cat << 'EOF'
Larry — TikTok App Marketing Engine
=====================================
ClawHub: clawhub install tiktok-app-marketing
Source:  github.com/openclaw/skills/skills/batsirai/larryskill

COMMANDS:
  install              Install Node deps + show Postiz setup
  generate <desc>      Generate 6-slide TikTok post for your app
  post [dir]           Push slides to TikTok as draft (you add audio)
  report               Daily funnel report: views → downloads → revenue
  optimize             Analyze hooks, log failures, update formula
  warmup               Show account warmup checklist for new accounts

ENV VARS REQUIRED:
  POSTIZ_API_KEY       Postiz account API key
  OPENAI_API_KEY       For gpt-image-1.5 image generation
  REVENUECAT_API_KEY   (Optional) For conversion tracking

EXAMPLES:
  ./larry.sh install
  ./larry.sh generate "habit tracker app for ADHD"
  ./larry.sh post ./output/2026-03-21
  ./larry.sh report
  ./larry.sh optimize

PROVEN RESULTS: 7M+ views | $670/mo MRR from AI-only pipeline
EOF
}

case "${1:-help}" in
  install)    install_larry ;;
  generate)   generate_slides "${2:-}" ;;
  post)       post_to_tiktok "${2:-./output}" ;;
  report)     daily_report ;;
  optimize)   optimize_hooks ;;
  warmup)     check_warmup ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
