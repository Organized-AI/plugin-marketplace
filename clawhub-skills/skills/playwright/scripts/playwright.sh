#!/usr/bin/env bash
# Playwright — Full Browser Automation for OpenClaw
# Click buttons, type forms, screenshots, scraping, web apps — watch AI use Chrome live.
# Snapshot system: agent understands page structure without processing screenshots.
# ClawHub: clawhub install playwright (built into OpenClaw Layer 2)

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

SCRIPTS_DIR="${PLAYWRIGHT_SCRIPTS_DIR:-$(dirname "$0")/../scripts/playwright}"

install_playwright() {
  log_info "Installing Playwright + Chromium..."
  command -v node >/dev/null 2>&1 || { log_error "Node.js required"; exit 1; }
  npm install playwright playwright-extra puppeteer-extra-plugin-stealth
  npx playwright install chromium
  log_success "Playwright + stealth plugin installed"
  log_info "Note: Built into OpenClaw Layer 2 — may already be available"
}

# --- SCRAPE (stealth mode — bypasses anti-bot) ---
scrape_url() {
  local url="${1:-}"
  local output="${2:-/tmp/playwright-scrape.html}"
  [[ -z "$url" ]] && { log_error "Usage: playwright scrape <url> [output_file]"; exit 1; }

  log_info "Stealth scraping: $url"
  log_info "Using puppeteer-extra-plugin-stealth to bypass anti-bot detection"

  node - "$url" "$output" << 'EOF' 2>/dev/null
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

(async () => {
  const [,, url, output] = process.argv;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const content = await page.content();
  require('fs').writeFileSync(output, content);
  console.log(`✓ Saved to: ${output}`);
  await browser.close();
})();
EOF
  [[ -f "$output" ]] && log_success "Scraped to: $output" || log_error "Scrape failed — check Node + Playwright install"
}

# --- SCREENSHOT ---
screenshot_url() {
  local url="${1:-}"
  local output="${2:-/tmp/screenshot.png}"
  [[ -z "$url" ]] && { log_error "Usage: playwright screenshot <url> [output.png]"; exit 1; }

  log_info "Taking screenshot: $url"
  node - "$url" "$output" << 'EOF' 2>/dev/null
const { chromium } = require('playwright');
(async () => {
  const [,, url, output] = process.argv;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: output, fullPage: true });
  console.log(`✓ Screenshot: ${output}`);
  await browser.close();
})();
EOF
  [[ -f "$output" ]] && log_success "Screenshot saved: $output" || log_error "Screenshot failed"
}

# --- HEADED MODE (watch AI use the browser live) ---
run_headed() {
  local script="${1:-}"
  [[ -z "$script" ]] && { log_error "Usage: playwright headed <script.js>"; exit 1; }
  [[ -f "$script" ]] || { log_error "Script not found: $script"; exit 1; }
  log_info "Running browser automation in HEADED mode — watch it live"
  PLAYWRIGHT_HEADLESS=false node "$script"
}

# --- SNAPSHOT (page structure without screenshots — more efficient) ---
snapshot_page() {
  local url="${1:-}"
  [[ -z "$url" ]] && { log_error "Usage: playwright snapshot <url>"; exit 1; }
  log_info "Generating page snapshot (structure without image processing): $url"
  node - "$url" << 'EOF' 2>/dev/null
const { chromium } = require('playwright');
(async () => {
  const [,, url] = process.argv;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const snapshot = await page.accessibility.snapshot();
  console.log(JSON.stringify(snapshot, null, 2));
  await browser.close();
})();
EOF
}

show_help() {
  cat << 'EOF'
Playwright — Full Browser Automation
======================================
ClawHub: Built into OpenClaw Layer 2 (may already be available)
Install: npx playwright install chromium

WHAT IT DOES:
  Full Chrome browser control: click, type, screenshot, scroll, scrape, fill forms.
  Watch AI navigate the internet live in headed mode.

  TWO MODES:
  Chrome Extension Mode  — uses your existing login sessions and cookies
  Headless Mode          — pure automation, no UI

  SNAPSHOT SYSTEM: Agent understands page structure without processing
  screenshots — far more efficient than vision-based approaches.

  STEALTH MODE: Uses puppeteer-extra-plugin-stealth to bypass anti-bot detection.

COMMANDS:
  install              Install Playwright + Chromium + stealth plugin
  scrape <url>         Stealth scrape a URL (saves HTML, bypasses bot detection)
  screenshot <url>     Full-page screenshot
  snapshot <url>       Page accessibility tree (structure, no image needed)
  headed <script.js>   Run automation script in headed mode (watch it live)

EXAMPLES:
  ./playwright.sh install
  ./playwright.sh scrape https://example.com /tmp/page.html
  ./playwright.sh screenshot https://example.com /tmp/preview.png
  ./playwright.sh snapshot https://example.com
  ./playwright.sh headed ./scripts/fill-form.js

OPENCLAWINTEGRATION:
  Load this skill and tell your agent: "Use browser automation to..."
  Agent will handle click/type/navigate automatically.
EOF
}

case "${1:-help}" in
  install)    install_playwright ;;
  scrape)     scrape_url "${2:-}" "${3:-/tmp/playwright-scrape.html}" ;;
  screenshot) screenshot_url "${2:-}" "${3:-/tmp/screenshot.png}" ;;
  snapshot)   snapshot_page "${2:-}" ;;
  headed)     run_headed "${2:-}" ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
