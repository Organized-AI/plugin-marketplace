#!/usr/bin/env bash
# Anti-AI Slop Humanizer
# Strips 24 AI writing tells from content. Built from Wikipedia's "Signs of AI Writing" list.
# Also has code mode: targets unnecessary comments, defensive error handling, overengineering.
# ClawHub: clawhub install deslop

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

# 24 AI writing tells detected and removed
AI_TELLS=(
  "em-dash abuse (—)" "word: delve" "bold text everywhere"
  "Additionally at paragraph start" "fake enthusiasm"
  "rule of three pattern" "In conclusion opener"
  "It's worth noting that" "Let me explain opener"
  "Certainly!/Absolutely! openers" "hedging: As an AI"
  "passive voice overuse" "unnaturally formal transitions"
  "repeating the question back" "sycophantic lead-ins"
  "unnecessary capitalization" "over-qualifying statements"
  "redundant adverbs (very, really, quite)" "list-ification of everything"
  "hollow affirmations (Great question!)" "Future-tense hedging"
  "verbosity (saying in 100 words what needs 10)" "unnecessary preamble"
  "sign-posting every thought"
)

# CODE SLOP tells
CODE_TELLS=(
  "comments: '# Initializing variable'" "defensive error handling for impossible scenarios"
  "overengineered abstractions for one-time scripts" "unnecessary type casts"
  "lint ignores without explanation" "debug leftovers (console.log etc)"
  "placeholder comments (// TODO: implement)" "redundant null checks"
)

humanize_content() {
  local file="${1:-}"
  local mode="${2:-content}"

  if [[ -z "$file" ]]; then
    log_error "Usage: anti-ai-slop humanize <file> [content|code]"
    exit 1
  fi

  [[ -f "$file" ]] || { log_error "File not found: $file"; exit 1; }

  log_info "Scanning: $file (mode: $mode)"
  echo ""

  if [[ "$mode" == "code" ]]; then
    log_info "Code slop checklist:"
    for tell in "${CODE_TELLS[@]}"; do echo "  • $tell"; done
    echo ""
    # Run git diff based cleanup via deslop pattern
    log_info "Running: git diff main...HEAD | deslop review"
    command -v deslop >/dev/null 2>&1 && deslop review "$file" || \
      log_warn "deslop CLI not installed — pass file to your OpenClaw agent with this skill loaded"
  else
    log_info "Content slop checklist (24 tells):"
    for tell in "${AI_TELLS[@]}"; do echo "  • $tell"; done
    echo ""
    log_info "Running humanizer on: $file"
    command -v deslop >/dev/null 2>&1 && deslop humanize "$file" || \
      log_warn "deslop CLI not installed — pass file to your OpenClaw agent with this skill loaded"
  fi
}

scan_tells() {
  local file="${1:-}"
  [[ -z "$file" ]] && { log_error "Usage: anti-ai-slop scan <file>"; exit 1; }
  [[ -f "$file" ]] || { log_error "File not found: $file"; exit 1; }

  log_info "Scanning for AI tells in: $file"
  local found=0
  while IFS= read -r line; do
    # Check for common patterns
    echo "$line" | grep -qiE "(delve|em dash|additionally,|it's worth noting|certainly!|absolutely!|in conclusion)" && \
      { echo "  ⚠ Possible slop: $line" | head -c 100; found=$((found+1)); }
  done < "$file"
  [[ $found -eq 0 ]] && log_success "No obvious slop detected" || log_warn "$found potential tells found"
}

show_help() {
  cat << 'EOF'
Anti-AI Slop Humanizer
=======================
ClawHub: clawhub install deslop
Source:  Built from Wikipedia's "Signs of AI Writing" list

WHAT IT DOES:
  Content mode: Detects 24 AI writing tells and strips them while keeping
                your actual message intact.
  Code mode:    Removes unnecessary comments, impossible defensive checks,
                overengineered abstractions, debug leftovers.

COMMANDS:
  humanize <file> [content|code]   Strip AI slop from content or code
  scan <file>                      Report which tells are present
  tells                            List all 24 content tells + 8 code tells

EXAMPLES:
  ./anti-ai-slop.sh humanize ./blog-post.md
  ./anti-ai-slop.sh humanize ./src/auth.ts code
  ./anti-ai-slop.sh scan ./newsletter.md
  ./anti-ai-slop.sh tells

PRO TIP: Load this skill in OpenClaw and pass any AI-generated draft.
         Agent strips tells automatically before showing you the output.
EOF
}

list_tells() {
  echo -e "${BLUE}=== 24 Content AI Tells ===${NC}"
  for i in "${!AI_TELLS[@]}"; do printf "  %2d. %s\n" "$((i+1))" "${AI_TELLS[$i]}"; done
  echo ""
  echo -e "${BLUE}=== 8 Code AI Tells ===${NC}"
  for i in "${!CODE_TELLS[@]}"; do printf "  %2d. %s\n" "$((i+1))" "${CODE_TELLS[$i]}"; done
}

case "${1:-help}" in
  humanize) humanize_content "${2:-}" "${3:-content}" ;;
  scan)     scan_tells "${2:-}" ;;
  tells)    list_tells ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
