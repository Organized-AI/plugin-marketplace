# GTM Page Scanner: Implementation Plan

Scan a live page with Cloudflare Browser Rendering, read every tracking-relevant
component on it, turn that into a tracking plan, and hand the plan to the existing
`gtm-AI` skill so it can build tags, triggers and variables in a GTM workspace.

Status: plan only (branch `feature/gtm-page-scanner`). No code yet.

---

## Why this shape

A page's tracking surface lives in three places, and only one of them is visible text:

| Where | Examples | How we read it |
|---|---|---|
| DOM | forms, CTAs, product blocks, checkout steps | `page.evaluate` (deterministic) |
| Scripts | JSON-LD, existing `dataLayer.push`, GTM / gtag / pixel IDs, consent defaults | `page.evaluate` + init script hooks (deterministic) |
| Runtime | events fired on click / route change, pixel beacons on the network | dataLayer hook + request log (deterministic) |

Models are used only to **label** what was found ("this button is `add_to_cart`",
"this form is `generate_lead`"). Selectors, variable paths and IDs never come from a model.

**Model note.** `jinaai/ReaderLM-v2` (on the A1) is CC BY-NC 4.0, so it is for
internal experiments only, not client containers. Its default pipeline also strips
`<script>` tags, so it never sees JSON-LD or dataLayer. Client work uses Claude for the
labeling step.

---

## Architecture

```
                         ┌──────────────────────────────────────────────┐
  /gtm-scan <url>  ───►  │  gtm-page-scanner  (Cloudflare Worker)        │
  (Claude Code skill)    │                                              │
                         │  POST /api/scan ──► Queue (multi-page)        │
                         │        │                                     │
                         │        ▼                                     │
                         │  Browser Rendering (@cloudflare/puppeteer)    │
                         │   ├─ addInitScript: wrap dataLayer.push,      │
                         │   │   history.pushState, gtag()               │
                         │   ├─ DOM: forms, CTAs, links, iframes,        │
                         │   │   stable selectors (id > data-* > aria)   │
                         │   ├─ Scripts: JSON-LD, meta/OG, GTM-/G-/AW-   │
                         │   │   IDs, consent mode defaults, CMP vendor  │
                         │   └─ Network: pixel registry match            │
                         │       (GA4, Ads, Meta, LinkedIn, TikTok,      │
                         │        Pinterest, first-party sGTM/Stape)     │
                         │        │                                     │
                         │        ▼                                     │
                         │  Page inventory JSON ──► R2 (html, png, log)  │
                         │        │                 D1 (scans, items)   │
                         │        ▼                                     │
                         │  Labeler (Claude, JSON schema)               │
                         │        │                                     │
                         │        ▼                                     │
                         │  Tracking plan JSON                          │
                         │   ├─ GET /api/scan/:id/plan                   │
                         │   └─ GET /api/scan/:id/container.json         │
                         │      (GTM import, exportFormatVersion 2)      │
                         └────────┬─────────────────────────────────────┘
                                  │
                                  ▼
            gtm-AI skill + Stape GTM MCP (gtm_variable / gtm_trigger / gtm_tag)
                                  │
                                  ▼
            tidy-gtm dedupe vs existing container ─► pre-publish-audit hook
                                  │
                                  ▼
                        workspace ready for review (never auto-publish)
```

---

## Data contracts

### Page inventory (scanner output, no model involved)

```json
{
  "url": "https://example.com/product/123",
  "scanned_at": "ISO-8601",
  "page_type_hint": "product",
  "existing_tags": {
    "gtm": ["GTM-XXXX"], "ga4": ["G-XXXX"], "ads": ["AW-123"],
    "meta_pixel": ["123"], "linkedin": ["456"], "tiktok": [], "pinterest": [],
    "sgtm_endpoints": ["https://sst.example.com/g/collect"]
  },
  "consent": { "mode_defaults": {"ad_storage": "denied"}, "cmp": "onetrust" },
  "datalayer": { "initial": [], "pushes": [{"t": 1234, "event": "view_item", "keys": ["ecommerce.items"]}] },
  "json_ld": [{"@type": "Product", "sku": "123", "offers": {"price": "49.00"}}],
  "forms": [{"selector": "#lead-form", "action": "/submit", "fields": [{"name": "email", "type": "email"}]}],
  "ctas": [{"selector": "[data-testid=add-to-cart]", "text": "Add to cart", "href": null}],
  "network": [{"vendor": "meta", "endpoint": "facebook.com/tr", "event": "PageView"}],
  "spa": { "history_api": true, "route_changes": 0 }
}
```

### Tracking plan (labeler output, validated against schema)

```json
{
  "events": [{
    "name": "add_to_cart",
    "source": "ga4_recommended",
    "trigger": { "type": "click", "selector": "[data-testid=add-to-cart]" },
    "params": { "value": "dlv:ecommerce.value", "currency": "const:USD", "items": "dlv:ecommerce.items" },
    "platforms": ["ga4", "meta:AddToCart", "tiktok:AddToCart"],
    "confidence": 0.86,
    "evidence": ["cta text", "JSON-LD Product on page"]
  }],
  "variables": [{ "name": "DLV - ecommerce.items", "type": "dlv", "path": "ecommerce.items" }],
  "gaps": ["no dataLayer ecommerce push on add_to_cart: needs dev-side push or CSS fallback"]
}
```

Rule: every selector and variable path in the plan must exist in the inventory, or the
plan fails validation.

---

## Phased roadmap

### Phase 0: Branch and scaffold
- Apply Organized Codebase agent templates to `gtm-ai-plugin/scanner/`
- `wrangler.jsonc`: Browser Rendering binding `BROWSER`, D1 `DB`, R2 `SNAPSHOTS`, Queue `SCAN_QUEUE`
- Bearer-token auth on `/api/*` (`SCANNER_TOKEN` secret)

### Phase 1: Deploy the single-page scanner (deterministic)
- `POST /api/scan {url}` → inventory JSON for one page
- DOM, scripts, consent and existing-tag extraction
- Snapshot HTML + screenshot to R2, scan row to D1
- Deploy to workers.dev, then test against 3 known sites (one ecommerce, one lead-gen, one SPA)

### Phase 2: Runtime capture
- Init script wraps `dataLayer.push`, `gtag`, `history.pushState` before page scripts run
- Network log matched against a pixel registry (`scanner/registry/pixels.json`)
- Safe interactions only: scroll, open menus, hover. **Never submit forms, never click buy/checkout.**
- Detect first-party sGTM (Stape custom domain `/g/collect`)

### Phase 3: Tracking plan
- Labeler calls Claude with the inventory + JSON schema → tracking plan
- Map to GA4 recommended events first, then platform equivalents (Meta, TikTok, LinkedIn, Pinterest, Ads)
- Validator: reject any selector/path not present in the inventory; list `gaps` instead of guessing
- Optional local lane (internal only): ReaderLM-v2 / Qwen on the Mac for visible-content summaries

### Phase 4: Container output
- `GET /api/scan/:id/container.json`: GTM import file (exportFormatVersion 2), everything in a `Scanner - <date>` folder, all tags paused
- Handoff to `gtm-AI` skill → creates the same objects in a workspace via Stape GTM MCP
- `tidy-gtm` dedupe against the existing container before creating anything
- `pre-publish-audit` hook stays the gate; scanner never publishes

### Phase 5: Plugin wiring
- New skill `skills/gtm-page-scanner/SKILL.md`
- New command `commands/gtm-scan.md`: `/gtm-scan <url> [--pages N] [--container GTM-XXXX]`
- Add a "Scan" phase ahead of Phase 0 in `gtm-automation-agent`
- README + PLUGIN.md updates; `mcp-servers.json` unchanged (reuses Stape GTM MCP)

### Phase 6: Multi-page and templates
- Queue-driven crawl of key templates (home, PLP, PDP, cart, lead form, thank-you)
- Merge per-template inventories into one plan; flag events that only exist on some templates
- Feed results into the `gtm-audit-pro` atlas (before/after signal flow)

### Phase 7: Lock down
- Cloudflare Access in front of the Worker
- Per-token rate limits, allowlist of client domains per scan token
- Scan retention policy for R2 snapshots

---

## Guardrails
- Scan only sites the client has authorized.
- Read-only on the page: no form submits, no purchases, no logins, no credentials typed.
- Never publish a container. Workspace or import file only; humans publish after `pre-publish-audit`.
- Every generated tag starts paused.

---

## Reused tools
- **Stape GTM MCP** (`gtm_template`, `gtm_variable`, `gtm_trigger`, `gtm_tag`, `gtm_version`): already in `mcp-servers.json`
- **gtm-AI**, **tidy-gtm**, **gtm-audit-pro**, `pre-publish-audit` hook: existing plugin pieces
- **Cloudflare Browser Rendering**: `@cloudflare/puppeteer`

---

## Claude Code prompt

```bash
cd /Users/supabowl/plugin-marketplace && git fetch origin && git checkout feature/gtm-page-scanner && claude --dangerously-skip-permissions
```

```
Read gtm-ai-plugin/planning/PAGE-SCANNER-PLAN.md. First, apply the Organized Codebase
agent templates to a new folder gtm-ai-plugin/scanner/ (CLAUDE.md, agents, phase docs).

Then build Phase 1 only:
- Cloudflare Worker "gtm-page-scanner" with Browser Rendering binding BROWSER
  (@cloudflare/puppeteer), D1 binding DB, R2 binding SNAPSHOTS, Queue SCAN_QUEUE.
- Bearer auth on /api/* using secret SCANNER_TOKEN.
- POST /api/scan {url} returns the "Page inventory" JSON from the plan's Data contracts
  section: existing tag IDs (GTM/GA4/Ads/Meta/LinkedIn/TikTok/Pinterest), consent mode
  defaults and CMP vendor, JSON-LD, forms with fields, CTAs with stable selectors
  (id > data-* > aria-label > text), SPA hint.
- Save HTML + full-page screenshot to R2 and a scan row to D1 (write schema.sql).
- Read-only: never submit forms or click purchase/checkout elements.
- Deploy with wrangler, then run it against three sites I name and show me the JSON.

Stop after Phase 1 and summarize what was found and what Phase 2 needs.
Commit to feature/gtm-page-scanner only; do not merge to main.
```

### Environment variables (Claude Code Web)

| Variable | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | wrangler deploy (Workers, D1, R2, Queues, Browser Rendering) |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler deploy |
| `SCANNER_TOKEN` | bearer token for `/api/*` (set as Worker secret) |
| `ANTHROPIC_API_KEY` | Phase 3 labeler (set as Worker secret) |
| `GITHUB_TOKEN` | push to `Organized-AI/plugin-marketplace` |

GTM workspace access goes through the Stape GTM MCP's own OAuth, not an env var.
