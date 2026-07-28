# organized-meta-wiring

A framework for wiring Meta APIs into a Cloudflare Worker. Sibling to `organized-google-wiring`, same shape, different sharp edges.

The Google plugin exists because no API creates OAuth web clients and Testing-mode tokens die after seven days. This one exists because **no API creates a Meta app**, because a **60-day system user token that is never refreshed is forfeit with no grace period**, and because Meta's refresh returns a *replacement credential* rather than minting from a persistent refresh token — which breaks any vault ported straight from Google.

## What's inside

**Skills**

- `meta-api-wiring` — the core framework: token type, self-refreshing vault, BUC rate limits, fan-out
- `meta-app-preflight` — app, system user, asset assignment, the two irreversible choices, access tiers
- `meta-api-catalogue` — permissions, dependencies, endpoints, rate-limit buckets, versions
- `meta-worker-scaffold` — generate a deployable starter Worker
- `meta-ads-connectors` — Meta Ads CLI vs the hosted Ads MCP server vs calling Graph directly

**MCP server** — `meta-api-atlas`, zero dependencies, no network:

| Tool | Answers |
|---|---|
| `meta_api_lookup` | base URL, permissions, BUC bucket, quirks |
| `meta_auth_decision` | system user vs user token vs dataset-scoped CAPI token |
| `meta_permission_plan` | expands dependencies, reports App Review implications |
| `meta_rate_limit_decode` | turns a throttle header or error code into an action |
| `meta_app_checklist` | the dashboard steps that cannot be automated |
| `meta_failure_modes` | symptom to cause to fix |
| `meta_connector_compare` | CLI vs hosted MCP vs Worker-direct, for a stated job |
| `meta_wrangler_config` | bindings, secrets and the refresh cron |

**Agent** — `meta-token-auditor`, checks a Worker against 20 known defects, weighted toward the token lifecycle.

**Scripts** — `meta-provision.sh` (system user + asset assignment), `meta-token-refresh.sh` (rolling 60-day refresh with the zero-downtime overlap), `meta-doctor.sh` (debug_token with a days-left verdict, plus a rate-limit snapshot).

## Surfaces covered

Marketing API, Ads Insights, Conversions API, Business Management, Catalog/Commerce, Custom Audiences, Instagram, WhatsApp Business, Pages, Lead Ads — plus the Meta Ads CLI and the hosted Ads MCP server at `mcp.facebook.com/ads`.

## Where Meta differs from Google, in one table

| | Google | Meta |
|---|---|---|
| Can't be automated | OAuth web client creation | App creation, use-case choice, app-secret rotation |
| Machine credential | Service account, or refresh token per user | System user token |
| Refresh model | Refresh token persists, mints access tokens | Token refreshes into a **new token**; old stays valid during overlap |
| Silent death | Testing status expires tokens at 7 days | 60-day token unrefreshed is **forfeit** |
| Version policy | Stable, rarely breaking | Marketing API: ~90 days overlap, unversioned calls **fail** |
| Rate limits | Per-user quotas, 429 + Retry-After | Business Use Case buckets, **percentages** in headers |
| Review cost | Restricted scopes → CASA assessment | Advanced Access → App Review + Business Verification |

## A note on currency

Meta renamed the Marketing API tiers in May 2026 — "Standard Access" is now Limited access, "Advanced Access" is now Full access — and ships a new Marketing API version roughly every four months. Version numbers and tier names in the catalogue are stamped with the research date. Re-check before relying on them for a review submission.
