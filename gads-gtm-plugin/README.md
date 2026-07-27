# GAds & GTM Plugin

> Production-grade Google Ads & GTM automation suite for Claude Code. Audit, build, debug, and optimize conversion tracking infrastructure programmatically via MCP servers.

## Skills (9)

| Skill | Purpose |
|-------|---------|
| **gtm-ai** | Full GTM container automation — deploy, audit, manage tags/triggers/variables via MCP without touching the GTM UI |
| **data-audit** | Meta Ads account auditing — Pixel/CAPI/Stape evaluation, performance analysis, architecture diagrams |
| **tidy-gtm** | Container hygiene — duplicate removal, naming standardization, sGTM correlation validation |
| **gtm-debug-agent** | Browser-based GTM debugging — tag firing verification, dataLayer inspection, consent mode validation |
| **gads-to-gtm-programmatic** | End-to-end: create Google Ads conversion actions via API → wire labels into GTM tags/variables via MCP |
| **gads-conversion-flow** | Lightweight: create Google Ads conversions and retrieve labels for manual GTM wiring |
| **measurement-release-versioning** | Capture published GTM/sGTM versions, pixel mappings, and baseline outcomes for governed before/after comparison |
| **conversion-api-process** | Configure and validate consent-gated server-side conversion processes for Google Ads, Meta, TikTok, and X |
| **event-surface-audit** | Turn an authorized, read-only Apify DOM inventory into a consent-aware client-side and server-side event proposal |

## MCP Servers Required

| Server | URL | Purpose |
|--------|-----|---------|
| Stape GTM | `https://gtm-mcp.stape.ai/mcp` | GTM container CRUD |
| Stape | `https://mcp.stape.io/mcp` | Stape container management |
| TrueClicks Google Ads | `https://mcp.gaql.app/sse/google-ads/TOKEN` | GAQL queries, conversion data |
| Pipeboard Meta | `https://mcp.pipeboard.co/meta-ads-mcp` | Meta Ads auditing |

## Installation

```bash
# From local path
/plugin install /path/to/gads-gtm-plugin

# From marketplace (after adding)
/plugin marketplace add organized-ai/gads-gtm-plugin
/plugin install gads-gtm-plugin@organized-ai-marketplace
```

## Commands

| Command | Description |
|---------|-------------|
| `/gtm-audit` | Full GTM container audit with health score |
| `/gads-setup` | Create Google Ads conversion actions + wire into GTM |
| `/tracking-check` | Validate entire tracking stack (GTM + GAds + Meta) |
| `/event-surface-audit` | Create a GTM-ready event map from a DOM inventory dataset |
| `/measurement-release` | Capture a GTM/sGTM measurement release baseline |
| `/conversion-api-readiness` | Validate cross-platform CAPI readiness without exposing credentials |

## Agents

| Agent | Description |
|-------|-------------|
| `tracking-architect` | Plans full conversion tracking architecture for a client |
| `gtm-qa` | Pre-publish workspace validation and QA |

## Typical Workflows

**New client conversion tracking setup:**
1. `data-audit` → assess current tracking infrastructure
2. `gads-to-gtm-programmatic` → create conversion actions + wire GTM
3. `tidy-gtm` → standardize naming, remove duplicates
4. `gtm-debug-agent` → verify tag firing in preview mode

**Ongoing container maintenance:**
1. `tidy-gtm` → audit and clean
2. `gtm-ai` → bulk tag/trigger/variable operations
3. `gtm-debug-agent` → validate changes before publish
4. `measurement-release-versioning` → capture the immutable baseline before and after a published release
5. `conversion-api-process` → validate browser/server event mappings, consent, deduplication, and platform test evidence

**Website event discovery (authorized sites only):**
1. Follow [QUICKSTART.md](QUICKSTART.md) to deploy or run the included read-only Apify Actor
2. `event-surface-audit` → convert the DOM inventory into candidate events and a GTM data-layer contract
3. Configure and validate in a GTM preview workspace; do not auto-publish DOM-derived triggers
4. `measurement-release-versioning` and `conversion-api-process` → baseline the change and validate server destinations

## Measurement releases

Use `/measurement-release` before a tracking deployment. It creates a privacy-safe manifest linking published web GTM and sGTM version IDs to event-contract and pixel/destination mappings, an evaluation window, and aggregate results. It complements the existing GTM deployment flow; it does not publish or modify a container.

## Cross-platform conversion processes

Use `/conversion-api-readiness` to validate the setup plan for Google Ads, Meta CAPI, TikTok Events API, and X CAPI before production event delivery. It checks the shared event contract, consent gate, browser/server deduplication identifiers, destination IDs, secret storage, test evidence, and diagnostics ownership. It never stores or prints credentials.

## Novice quick start

Start with [QUICKSTART.md](QUICKSTART.md). It explains marketplace installation, the authorized Apify DOM inventory, GTM preview validation, sGTM/CAPI routing, and release versioning. For non-Claude agents, use the portable hand-off in [AGENT-SETUP.md](AGENT-SETUP.md). The actor only inventories public page structure; it neither clicks controls nor submits forms.

## License

MIT — Blue Highlighted Text / Organized AI
