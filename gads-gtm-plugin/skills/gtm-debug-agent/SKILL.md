---
name: gtm-debug-agent
description: |
  Comprehensive GTM debugging and workspace validation with browser automation. Use when: testing GTM configurations, verifying tag firing, debugging dataLayer events, validating consent mode, checking tracking implementations, automating GTM container builds, validating workspace before publishing, running automated QA tests, or verifying configuration changes. Triggers on "debug GTM", "test GTM tags", "GTM preview", "verify tag firing", "check dataLayer", "monitor tags", "validate consent", "did my GTM fix work", "validate tracking", "annotate screenshot", "GTM QA", "validate workspace", "test before publish", "is this safe to publish?", "run GTM validation".
---

# GTM Debug Agent

Comprehensive GTM debugging and automated workspace validation. Includes manual debug workflows, Playwright browser automation for Preview mode testing, screenshot annotation, and MCP integration for end-to-end container management.

## Capabilities

1. **Manual Debug Workflow** - Step-by-step GTM Preview debugging with monitoring dashboards
2. **Automated Validation** - Playwright scripts for unattended workspace testing
3. **Screenshot Annotation** - Visual marking of successes/failures
4. **MCP Integration** - GTM and Stape server management

## Quick Start

### Automated Validation (Recommended)

Run the Playwright validator to test a workspace before publishing:

```bash
# First time: Set up browser profile with Google auth
cd /path/to/gtm-debug-agent
npm install
node scripts/setup-browser.js

# Run validation
node scripts/validate.js --container GTM-XXXXXXX --url https://example.com --output ./reports
```

### Manual Debug Session

1. Gather: GTM Container ID, target URL, expected tags/events
2. Open GTM Preview mode via Tag Assistant
3. Navigate to target URL
4. Monitor Tags, Variables, Consent, dataLayer tabs
5. Capture screenshots at each validation point
6. Generate pass/fail report

## Prerequisites

**Local Machine (via mcp-server-commands):**
```bash
npm install playwright
npx playwright install chromium
```

**MCP Servers:**
- mcp-server-commands - Execute validation scripts
- google-tag-manager MCP - Container operations
- Stape MCP (optional) - Server-side validation

## Automated Validation Workflow

### Phase 1: Create Test Configuration

Create `test-config.json`:
```json
{
  "containerId": "GTM-XXXXXXX",
  "targetUrl": "https://example.com/checkout",
  "expectedTags": ["GA4 - Purchase", "Meta Pixel - Purchase"],
  "expectedEvents": ["purchase", "add_payment_info"],
  "expectedDataLayer": {
    "ecommerce.transaction_id": "*",
    "ecommerce.value": "*",
    "ecommerce.items": "*"
  },
  "actions": [
    {"type": "wait", "duration": 2000},
    {"type": "click", "selector": "#complete-order"},
    {"type": "wait", "selector": ".confirmation", "timeout": 10000}
  ]
}
```

### Phase 2: Run Validation

```bash
node scripts/validate.js --config test-config.json --output ./reports
```

### Phase 3: Review & Publish

Check `reports/validation-report.md`:
- **ALL PASSED** → Safe to publish via GTM MCP
- **WARNINGS** → Review, may be acceptable
- **FAILURES** → Do NOT publish, fix first

## Test Actions Reference

| Action | Description | Parameters |
|--------|-------------|------------|
| wait | Wait for time/selector | duration (ms) or selector, timeout |
| click | Click element | selector |
| fill | Enter text | selector, value |
| scroll | Scroll page | target ("bottom" or pixels) |
| navigate | Go to URL | url |
| capture | Force dataLayer snapshot | name |

## GTM MCP Integration

### Pre-Validation: Check Workspace
```python
gtm_workspace(action="getStatus", accountId="...", containerId="...", workspaceId="...")
gtm_tag(action="list", accountId="...", containerId="...", workspaceId="...")
```

### Post-Validation: Publish if Passed
```python
gtm_workspace(action="createVersion", accountId="...", containerId="...", workspaceId="...")
gtm_version(action="publish", accountId="...", containerId="...", containerVersionId="...")
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| validate.js | Main Playwright validation automation |
| setup-browser.js | Browser profile setup with Google auth |
| browser-commands.js | Reusable browser automation functions |
| gtm_monitor.py | Python monitoring orchestration |
| annotate_screenshot.py | Screenshot annotation with red arrows |

## Resources

- references/test-templates.json - Common test configurations
- references/gtm-selectors.md - Tag Assistant DOM selectors
- references/datalayer-patterns.md - dataLayer validation patterns
- references/mcp-integration.md - Full MCP workflow guide
- assets/test-config.example.json - Example configuration
