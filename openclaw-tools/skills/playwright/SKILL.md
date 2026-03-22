---
name: playwright
description: >
  Full Chrome browser automation with stealth mode. Use when asked to "scrape a
  website", "take a screenshot", "automate browser", "fill a form", "click buttons",
  "browser automation", or "watch AI use Chrome". Supports headed mode (watch live),
  stealth scraping (bypasses anti-bot), and accessibility snapshots. Do NOT use for
  API calls or local file operations.
tags: [browser, automation, scraping, screenshots, web]
---

# Playwright — Full Browser Automation

## Purpose

Full Chrome browser control: click, type, screenshot, scroll, scrape, fill forms.
Uses puppeteer-extra-plugin-stealth to bypass anti-bot detection.

Built into OpenClaw Layer 2 — may already be available on your device.

## Modes

### Headless (default)
Pure automation, no UI. Best for scraping and screenshots.

### Headed
Watch AI navigate the browser live. Pass `PLAYWRIGHT_HEADLESS=false`.
```bash
bash playwright.sh headed ./scripts/fill-form.js
```

### Chrome Extension Mode
Uses your existing login sessions and cookies. Useful for authenticated scraping.

## Commands

| Command | Purpose |
|---------|---------|
| `scrape <url> [output]` | Stealth scrape (saves HTML, bypasses bot detection) |
| `screenshot <url> [output.png]` | Full-page screenshot |
| `snapshot <url>` | Accessibility tree (structure without image processing) |
| `headed <script.js>` | Run automation in headed mode (watch it live) |

## Key Concept: Snapshots vs Screenshots

**Snapshots** return the page's accessibility tree as JSON — the agent understands
page structure without processing images. Far more token-efficient than vision-based
approaches. Use snapshots for navigation; screenshots only for visual verification.

## Install

```bash
npm install playwright playwright-extra puppeteer-extra-plugin-stealth
npx playwright install chromium
```
