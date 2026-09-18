# CMP Activity Audit Tools

Capture and compare browser-observable activity around a consent management platform (CMP).

The auditor runs clean browser contexts for seven consent scenarios:

- Before consent interaction
- Accept
- Reject
- Global Privacy Control (GPC)
- Accept, then reload
- Reject, then reload
- Accept, open the withdrawal flow, then reject

For each scenario it records stable evidence IDs, a timestamped event timeline, network requests and response metadata, source-frame context, request bodies when enabled, classification traces, timestamped consent commands and storage mutations, cookies, storage for every accessible frame, visible CMP markup and controls across frames, screenshots, and browser console messages. Sensitive request and response headers such as cookies and authorization are removed from the saved evidence.

By default, the auditor also compares an instrumented pre-consent run with a control run. A changed request-signature set marks the audit inconclusive so capture interference can be investigated.

The result is evidence for review, not a legal-compliance score.

## Install

Requirements:

- Node.js 20 or newer
- Google Chrome, or a Chromium executable supplied through `CHROME_PATH`

```bash
npm install
```

When installed from the marketplace, the MCP launcher installs this locked dependency before its first start. The CLI uses the same local package, so run `npm ci` from this directory before using the CLI directly.

## Run an audit

```bash
node scripts/cmp-audit.mjs \
  --url https://example.com \
  --out cmp-audits/example
```

Audit several representative pages in one run:

```bash
node scripts/cmp-audit.mjs \
  --url https://example.com/ \
  --url https://example.com/pricing \
  --url https://example.com/checkout \
  --out cmp-audits/example-batch
```

The auditor attempts to find common accept and reject controls by accessible name. For custom CMP controls, provide CSS selectors:

```bash
node scripts/cmp-audit.mjs \
  --url https://example.com \
  --accept-selector "#accept-all" \
  --reject-selector "#reject-all" \
  --withdraw-selector "a[href='/privacy-settings']"
```

Use `--headed` to watch the browser run.

## Configuration

Use [cmp-audit.example.json](./cmp-audit.example.json) to configure:

- Target URL and output directory
- Locale and timezone
- Navigation and interaction timing
- Accept and reject selectors
- Withdrawal selector and custom interaction flows
- Custom request-classification rules
- Scenario selection
- Multi-step flows, including category toggles and save actions
- Proxy routing for a real network location
- An explicit audit profile describing the expected CMP, consent model, Consent Mode, geography, and scenario behavior
- Capture-health controls (disable with `"captureHealth": false` only when necessary)

```bash
node scripts/cmp-audit.mjs --config cmp-audit.example.json
```

A flow can mix named CMP actions, selectors, and checkbox toggles:

```json
{
  "flows": {
    "category-choice": [
      "accept",
      { "action": "open-preferences", "selector": "#privacy-settings" },
      { "action": "disable-analytics", "type": "toggle", "selector": "#analytics-toggle", "checked": false },
      { "action": "save", "selector": "#save-preferences" }
    ]
  }
}
```

Use `"scenarios": ["category-choice"]` to run that flow by itself. A proxy configuration uses Playwright's browser proxy shape, such as `"proxy": { "server": "http://proxy.example:8080" }`. The audit report stores the proxy server but redacts configured credentials.

## Evidence output

Each audit directory contains:

- `audit.json`: complete structured evidence for every scenario.
- `REPORT.md`: scenario comparison and review findings.
- `<scenario>-before.png`: page state before interaction.
- `<scenario>-after.png`: page state after interaction.
- `<scenario>-reload.png`: state after reload for persistence scenarios.

Review findings currently cover:

- No visible CMP candidate detected.
- Likely analytics or advertising requests before consent.
- Accept or reject controls that could not be exercised.
- Likely analytics or advertising requests after rejection.
- Accept and reject paths with no observable request-count difference.
- Likely tracking activity while GPC is enabled.
- Consent state that does not remain after a reload.
- A withdrawal or preferences control that cannot be found after acceptance.
- A withdrawal flow that clicks reject without a denied consent update in the data layer.

Request classifications are heuristics and can be extended through the configuration file.

Every finding has a stable ID and may reference request evidence IDs. The report separates run coverage (`complete`, `partial`, or `inconclusive`) from findings. Profile mismatches are evaluated only when the profile states an expectation.

## Regression comparison

Compare a later audit against a baseline:

```bash
node scripts/cmp-audit-diff.mjs \
  cmp-audits/baseline/audit.json \
  cmp-audits/candidate/audit.json
```

The comparison reports new or removed tracking hosts, stable tracking signatures based on category/method/host/path, full request URLs, cookies, and local/session storage keys for each consent scenario. Use the stable signature for regressions when request IDs or cache-busting query parameters vary between runs.

## MCP server

Configure the stdio MCP server with an absolute command path:

```json
{
  "mcpServers": {
    "cmp-activity-audit": {
      "command": "/absolute/path/to/measureu-cmp-audit-tools/scripts/cmp-audit-mcp.mjs"
    }
  }
}
```

Available tools:

- `audit_cmp_page`
- `read_cmp_audit`
- `compare_cmp_audits`
- `validate_cmp_audit_profile`
- `inspect_cmp_request`
- `explain_cmp_finding`
- `trace_cmp_vendor`
- `query_cmp_storage_events`
- `check_cmp_capture_health`
- `get_cmp_audit_methodology`

## Interpretation limits

The auditor captures browser-observable facts. It cannot determine legal purpose, jurisdictional obligations, vendor-contract terms, undisclosed server-side collection, or every first-party proxy. Those areas require separate technical and policy review.

## Test

```bash
npm test
```
