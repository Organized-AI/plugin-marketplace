---
name: meta-api-catalogue
description: Looks up permissions, endpoints, rate-limit buckets, API versions and quirks for a specific Meta API surface. Use when the user names a Meta product and asks what it needs — "which permissions for the Marketing API", "Conversions API from a Worker", "catalog_management", "Instagram Graph API", "WhatsApp Business API", "lead ads", "custom audiences" — or asks about Meta rate limit headers, BUC error codes, or which Graph API version to pin.
---

# Meta API catalogue

Answer permission and endpoint questions from the catalogue, not memory. Meta renames things — the Marketing API tiers changed names in May 2026 — and ships a new Marketing API version roughly every four months.

## How to use it

Prefer the MCP tools; they read the machine-readable catalogue and cannot drift:

- `meta_api_lookup` — base URL, permissions, BUC bucket, docs, quirks
- `meta_permission_plan` — expands dependencies and reports the access level implied
- `meta_auth_decision` — which token type this surface needs
- `meta_rate_limit_decode` — decode a throttle header or error code into an action
- `meta_connector_compare` — Ads CLI vs hosted MCP vs Worker-direct

Fall back to `references/catalogue.md` when MCP is unavailable.

## Permission dependencies are real and undocumented in most guides

Requesting a permission without its dependencies fails. `catalog_management` depends on `business_management`. `ads_management` and `business_management` both depend on `pages_read_engagement` and `pages_show_list`. `instagram_basic` depends on `pages_read_user_content` and `pages_show_list`. Always expand with `meta_permission_plan` rather than requesting what you think you need.

## Things the catalogue will tell you that memory will not

- **`ads_read`, not `ads_management`, is the Conversions API permission.** It grants server-side event access. People assume the opposite and waste a review cycle.
- **A dataset id is a pixel id.** Meta renamed pixels to datasets; the ids are interchangeable.
- **CAPI needs no app at all** if you use a dataset-scoped token from Events Manager.
- **Marketing API rejects unversioned calls.** Graph API falls back to a dashboard default; Marketing simply fails.
- **BUC header values are percentages**, not counts, and the time units differ between headers — minutes in `X-Business-Use-Case-Usage`, seconds in `X-Ad-Account-Usage`.
- **Rate-limit buckets are independent per type.** Throttled on `ads_management` does not mean throttled on `ads_insights`.
- **Neither Marketing API tier can create Pages** through the API.
- **System user tokens do not carry the newer `instagram_business_*` permissions.** Check the supported scope list before assuming.

## Versions

Pin explicitly. The catalogue records the version current at research time along with both deprecation policies — Graph guarantees roughly two years per version, Marketing gives about 90 days of overlap. Re-check before relying on a version number; this changes on a schedule.
