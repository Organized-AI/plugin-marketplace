# GAds & GTM Plugin

> Production-grade Google Ads & GTM automation suite for Claude Code. Audit, build, debug, and optimize conversion tracking infrastructure programmatically via MCP servers.

## Skills (6)

| Skill | Purpose |
|-------|---------|
| **gtm-ai** | Full GTM container automation — deploy, audit, manage tags/triggers/variables via MCP without touching the GTM UI |
| **data-audit** | Meta Ads account auditing — Pixel/CAPI/Stape evaluation, performance analysis, architecture diagrams |
| **tidy-gtm** | Container hygiene — duplicate removal, naming standardization, sGTM correlation validation |
| **gtm-debug-agent** | Browser-based GTM debugging — tag firing verification, dataLayer inspection, consent mode validation |
| **gads-to-gtm-programmatic** | End-to-end: create Google Ads conversion actions via API → wire labels into GTM tags/variables via MCP |
| **gads-conversion-flow** | Lightweight: create Google Ads conversions and retrieve labels for manual GTM wiring |

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

## License

MIT — Blue Highlighted Text / Organized AI
